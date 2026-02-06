/**
 * State Server v2 for Kulti AI Streaming
 * 
 * Bridges OpenClaw agent events → WebSocket → Workspace UI
 * Also syncs to Supabase for persistence and multi-viewer support
 * 
 * Run: npx tsx state-server-v2.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment from .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Configuration
const WS_PORT = 8765;
const HTTP_PORT = 8766;

// API key auth (optional - skip in dev mode if not set)
const api_keys_raw = process.env.KULTI_API_KEYS;
const valid_api_keys: Set<string> | null = (() => {
  if (api_keys_raw === undefined || api_keys_raw === '') {
    return null;
  }
  const keys = api_keys_raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
  return new Set(keys);
})();

// Supabase client (uses service role for agent operations)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('[Supabase] Connected to:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Structured thought types for richer streaming
interface StructuredThought {
  id: string;
  type: 'reasoning' | 'prompt' | 'tool' | 'context' | 'evaluation' | 'decision' | 'observation' | 'general';
  content: string;
  timestamp: string;
  metadata?: {
    tool?: string;           // Which tool being used
    file?: string;           // File being read/written
    promptFor?: string;      // What the prompt is for (image gen, API, etc.)
    options?: string[];      // Options being considered
    chosen?: string;         // Which option was chosen
    confidence?: number;     // How confident in decision (0-1)
  };
}

// State for each agent
interface AgentState {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  task: { title: string; description?: string };
  status: 'starting' | 'working' | 'thinking' | 'paused' | 'done';
  terminal: Array<{ type: string; content: string; timestamp?: string }>;
  thinking: string;  // Legacy: simple string
  thoughts: StructuredThought[];  // New: structured thoughts
  code: {
    filename: string;
    language: string;
    content: string;
    action: string;
    timestamp: string;
  } | null;
  preview: { url: string | null; domain: string };
  stats: { files: number; commands: number; startTime: number };
  viewers: Set<WebSocket>;
  viewerCount: number;
}

const agents = new Map<string, AgentState>();

// Create WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`State Server v2 running on ws://localhost:${WS_PORT}`);
console.log(`HTTP API running on http://localhost:${HTTP_PORT}`);
if (valid_api_keys === null) {
  console.log('[AUTH] WARNING: KULTI_API_KEYS not set - running in dev mode (no auth)');
} else {
  console.log(`[AUTH] ${valid_api_keys.size} API key(s) loaded`);
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://localhost:${WS_PORT}`);
  const agentId = url.searchParams.get('agent') || 'nex';
  
  console.log(`[WS] Client connected for agent: ${agentId}`);

  // Get or create agent state
  let state = agents.get(agentId);
  let needsHydration = false;
  if (!state) {
    state = createDefaultState(agentId);
    agents.set(agentId, state);
    needsHydration = true;
  }

  // Add viewer
  state.viewers.add(ws);
  
  // Hydrate from Supabase if this is a new agent
  if (needsHydration) {
    hydrateAgentFromSupabase(agentId, state).then(() => {
      // Send updated state after hydration
      ws.send(JSON.stringify(stateToMessage(state!)));
    });
  }
  state.viewerCount = state.viewers.size;
  
  // Send current state
  ws.send(JSON.stringify(stateToMessage(state)));

  // Broadcast updated viewer count
  broadcastToAgent(agentId, { viewers: state.viewerCount });

  // Handle messages from client (chat, etc.)
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleClientMessage(agentId, ws, message);
    } catch (e) {
      console.error('[WS] Invalid message:', e);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    const state = agents.get(agentId);
    if (state) {
      state.viewers.delete(ws);
      state.viewerCount = state.viewers.size;
      broadcastToAgent(agentId, { viewers: state.viewerCount });
    }
    console.log(`[WS] Client disconnected from ${agentId}`);
  });
});

// HTTP API for agents to push state updates
import { createServer } from 'http';

// Apply an update payload to agent state, broadcast, and persist
function applyUpdate(update: any, isHook = false) {
  // Accept both camelCase (legacy) and snake_case (new core SDK) field names
  const agentId = update.agentId || update.agent_id || 'nex';

  // Normalize snake_case fields from @kulti/stream-core adapters
  if (update.terminal_append !== undefined && update.terminalAppend === undefined) {
    update.terminalAppend = update.terminal_append;
  }

  // Get or create state
  let state = agents.get(agentId);
  if (!state) {
    state = createDefaultState(agentId);
    agents.set(agentId, state);
  }

  // Apply updates
  if (update.task) state.task = { ...state.task, ...update.task };
  if (update.status) state.status = update.status;
  if (update.terminal) {
    // Append terminal lines or replace
    if (update.terminalAppend) {
      state.terminal.push(...update.terminal);
      // Keep last 500 lines
      if (state.terminal.length > 500) {
        state.terminal = state.terminal.slice(-500);
      }
    } else {
      state.terminal = update.terminal;
    }
  }
  if (update.thinking !== undefined) state.thinking = update.thinking;

  // Handle structured thoughts
  if (update.thought) {
    const thought: StructuredThought = {
      id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: update.thought.type || 'general',
      content: update.thought.content,
      timestamp: new Date().toISOString(),
      metadata: update.thought.metadata,
    };
    state.thoughts.push(thought);
    // Keep last 100 thoughts
    if (state.thoughts.length > 100) {
      state.thoughts = state.thoughts.slice(-100);
    }
    // Also update legacy thinking field with latest content
    state.thinking = thought.content;
  }

  // Handle code updates
  if (update.code) {
    state.code = {
      filename: update.code.filename,
      language: update.code.language,
      content: update.code.content,
      action: update.code.action,
      timestamp: new Date().toISOString(),
    };
    if (isHook) {
      state.stats.files += 1;
    }
  }

  if (update.preview) state.preview = { ...state.preview, ...update.preview };

  // Stats: for hook events, increment counters instead of replacing
  if (update.stats) {
    if (isHook) {
      if (update.stats.files) state.stats.files += update.stats.files;
      if (update.stats.commands) state.stats.commands += update.stats.commands;
    } else {
      state.stats = { ...state.stats, ...update.stats };
    }
  }

  // Broadcast to all viewers
  broadcastToAgent(agentId, stateToMessage(state));

  // Persist to Supabase (async, don't wait)
  persistToSupabase(agentId, state, update).catch(console.error);
}

const httpServer = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${HTTP_PORT}`);

  // GET /health - simple health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', agents: agents.size }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  // API key auth on POST endpoints
  if (valid_api_keys !== null) {
    const auth_header = req.headers['x-kulti-key'];
    const api_key = typeof auth_header === 'string' ? auth_header : undefined;
    if (api_key === undefined || !valid_api_keys.has(api_key)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing API key' }));
      return;
    }
  }

  // Parse request body
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const update = JSON.parse(body);
    const isHook = url.pathname === '/hook';

    if (isHook) {
      // /hook endpoint: optimized for Claude Code hooks
      // Respond immediately, process async
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
      applyUpdate(update, true);
    } else {
      // Default endpoint: existing behavior
      applyUpdate(update, false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }

  } catch (e) {
    console.error('[HTTP] Error:', e);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request' }));
  }
});

httpServer.listen(HTTP_PORT);

// ==================== HELPERS ====================

function createDefaultState(agentId: string): AgentState {
  return {
    agentId,
    agentName: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    agentAvatar: '🤖',
    task: { title: 'Starting...' },
    status: 'starting',
    terminal: [],
    thinking: '',
    thoughts: [],
    code: null,
    preview: { url: null, domain: `${agentId}.preview.kulti.club` },
    stats: { files: 0, commands: 0, startTime: Date.now() },
    viewers: new Set(),
    viewerCount: 0,
  };
}

// Fetch agent profile and recent events from Supabase and update state
async function hydrateAgentFromSupabase(agentId: string, state: AgentState): Promise<void> {
  const VALID_STATUSES = ['starting', 'working', 'thinking', 'paused', 'done'] as const;
  type ValidStatus = typeof VALID_STATUSES[number];

  try {
    const { data: session_row, error: session_error } = await supabase
      .from('ai_agent_sessions')
      .select('id, agent_name, agent_avatar, status, current_task')
      .eq('agent_id', agentId)
      .single();

    if (session_error || !session_row) {
      console.log(`[Supabase] No existing session for ${agentId}, using defaults`);
      return;
    }

    // Hydrate session metadata
    if (session_row.agent_name) state.agentName = session_row.agent_name;
    if (session_row.agent_avatar) state.agentAvatar = session_row.agent_avatar;
    if (session_row.status && VALID_STATUSES.includes(session_row.status as ValidStatus)) {
      state.status = session_row.status as ValidStatus;
    }
    if (session_row.current_task) state.task.title = session_row.current_task;
    console.log(`[Supabase] Hydrated agent ${agentId}: name=${state.agentName}, avatar=${state.agentAvatar ? '✓' : '✗'}`);

    // Hydrate recent events (thoughts, terminal, code)
    const { data: events } = await supabase
      .from('ai_stream_events')
      .select('*')
      .eq('session_id', session_row.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (events && events.length > 0) {
      const chronological = events.reverse();
      for (const e of chronological) {
        if (e.type === 'thought' || e.type === 'thinking') {
          const thought: StructuredThought = {
            id: e.id,
            type: e.data?.thoughtType || 'general',
            content: e.data?.content || '',
            timestamp: e.created_at,
            metadata: e.data?.metadata,
          };
          state.thoughts.push(thought);
          state.thinking = thought.content;
        }
      }
      console.log(`[Supabase] Hydrated ${state.thoughts.length} thoughts for ${agentId}`);
    }
  } catch (e) {
    console.error(`[Supabase] Error hydrating agent ${agentId}:`, e);
  }
}

function stateToMessage(state: AgentState) {
  return {
    agent: { name: state.agentName, avatar: state.agentAvatar },
    task: state.task,
    status: state.status,
    terminal: state.terminal,
    thinking: state.thinking,
    thoughts: state.thoughts,
    code: state.code,
    preview: state.preview,
    stats: state.stats,
    viewers: state.viewerCount,
  };
}

function broadcastToAgent(agentId: string, message: object) {
  const state = agents.get(agentId);
  if (!state) return;

  const data = JSON.stringify(message);
  for (const ws of state.viewers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

async function handleClientMessage(agentId: string, ws: WebSocket, message: any) {
  if (message.type === 'chat') {
    // Handle chat message from viewer
    console.log(`[Chat] ${agentId}: ${message.message}`);
    
    // Save to Supabase
    const { data: session } = await supabase
      .from('ai_agent_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .single();

    if (session) {
      await supabase.from('ai_stream_messages').insert({
        session_id: session.id,
        sender_type: 'viewer',
        sender_id: message.userId || 'anonymous',
        sender_name: message.username || 'Viewer',
        message: message.message,
      });
    }

    // Broadcast to all viewers
    broadcastToAgent(agentId, {
      chat: {
        type: 'viewer',
        username: message.username || 'Viewer',
        text: message.message,
        time: 'just now',
      },
    });

    // TODO: Forward to agent (OpenClaw) for response
  }
}

async function persistToSupabase(agentId: string, state: AgentState, update: any) {
  try {
    // Update session (don't overwrite avatar - that's set separately)
    const { error: sessionError } = await supabase
      .from('ai_agent_sessions')
      .upsert({
        agent_id: agentId,
        agent_name: state.agentName,
        // agent_avatar: NOT included - preserve what's in DB
        status: state.status === 'working' ? 'live' : state.status,
        current_task: state.task.title,
        viewers_count: state.viewerCount,
        files_edited: state.stats.files,
        commands_run: state.stats.commands,
      }, { onConflict: 'agent_id' });

    if (sessionError) {
      console.error('[Supabase] Session update error:', sessionError);
    }

    // Insert events for terminal/thinking
    const { data: session, error: fetchError } = await supabase
      .from('ai_agent_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .single();

    if (fetchError) {
      console.error('[Supabase] Session fetch error:', fetchError);
      return;
    }

    if (!session) {
      console.error('[Supabase] No session found for:', agentId);
      return;
    }

    const events: any[] = [];

    if (update.terminal) {
      events.push({
        session_id: session.id,
        type: 'terminal',
        data: { lines: update.terminal },
      });
    }

    if (update.thinking) {
      events.push({
        session_id: session.id,
        type: 'thinking',
        data: { content: update.thinking },
      });
    }

    // Handle structured thought
    if (update.thought) {
      events.push({
        session_id: session.id,
        type: 'thought',
        data: {
          thoughtType: update.thought.type || 'general',
          content: update.thought.content,
          metadata: update.thought.metadata || {},
        },
      });
    }

    if (update.code) {
      events.push({
        session_id: session.id,
        type: 'code',
        data: {
          filename: update.code.filename,
          language: update.code.language,
          content: update.code.content,
          action: update.code.action || 'write',
        },
      });
    }

    if (events.length > 0) {
      const { error: insertError } = await supabase.from('ai_stream_events').insert(events);
      if (insertError) {
        console.error('[Supabase] Event insert error:', insertError);
      } else {
        console.log(`[Supabase] Inserted ${events.length} event(s)`);
      }
    }
  } catch (e) {
    console.error('[Supabase] Unexpected error:', e);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  wss.close();
  httpServer.close();
  process.exit(0);
});
