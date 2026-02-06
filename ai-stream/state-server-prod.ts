/**
 * Production State Server for Kulti AI Streaming
 *
 * Single port server handling both WebSocket and HTTP
 * Designed for Fly.io deployment
 *
 * Features:
 *   - Structured thoughts (reasoning, decision, observation, etc.)
 *   - Code streaming with language detection
 *   - API key auth via X-Kulti-Key header
 *   - snake_case + camelCase field compat
 *   - /hook endpoint for fire-and-forget adapter events
 *   - Supabase persistence + hydration
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';

// Configuration from environment
const PORT = parseInt(process.env.PORT || '8080');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('[Supabase] Connected to:', SUPABASE_URL);

// API key auth (optional - skip in dev mode if not set)
const api_keys_raw = process.env.KULTI_API_KEYS;
const valid_api_keys: Set<string> | null = (() => {
  if (api_keys_raw === undefined || api_keys_raw === '') {
    return null;
  }
  const keys = api_keys_raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
  return new Set(keys);
})();

if (valid_api_keys === null) {
  console.log('[AUTH] WARNING: KULTI_API_KEYS not set - running without auth');
} else {
  console.log(`[AUTH] ${valid_api_keys.size} API key(s) loaded`);
}

// Structured thought types
interface StructuredThought {
  id: string;
  type: 'reasoning' | 'prompt' | 'tool' | 'context' | 'evaluation' | 'decision' | 'observation' | 'general';
  content: string;
  timestamp: string;
  metadata?: {
    tool?: string;
    file?: string;
    promptFor?: string;
    options?: string[];
    chosen?: string;
    confidence?: number;
    [key: string]: unknown;
  };
}

interface CodeState {
  filename: string;
  language: string;
  content: string;
  action: string;
  timestamp: string;
}

// Agent state
interface AgentState {
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  status: 'offline' | 'starting' | 'working' | 'thinking' | 'paused' | 'live' | 'done';
  task: { title: string; description?: string };
  terminal: Array<{ type: string; content: string; timestamp?: string }>;
  thinking: string;
  thoughts: StructuredThought[];
  code: CodeState | null;
  stats: { files: number; commands: number; start_time: number };
  preview: { url: string | null; domain: string };
  viewers: Set<WebSocket>;
  viewer_count: number;
  hydrated: boolean;
}

interface ViewerInfo {
  id: string;
  name: string;
  joined_at: number;
}

interface UpdatePayload {
  agentId?: string;
  agent_id?: string;
  status?: string;
  task?: { title: string; description?: string };
  terminal?: Array<{ type: string; content: string; timestamp?: string }>;
  terminalAppend?: boolean;
  terminal_append?: boolean;
  thinking?: string;
  thought?: { type: string; content: string; metadata?: Record<string, unknown> };
  code?: { filename: string; language: string; content: string; action: string } | Array<{ filename: string; language: string; content: string; action: string }>;
  preview?: { url?: string; domain?: string };
  stats?: { files?: number; commands?: number };
  art?: { status: string; prompt?: string; model?: string; image_url?: string; metadata?: Record<string, unknown> };
  [key: string]: unknown;
}

const agents = new Map<string, AgentState>();

function get_or_create_agent(agent_id: string): AgentState {
  let state = agents.get(agent_id);
  if (state !== undefined) {
    return state;
  }
  state = {
    agent_id,
    agent_name: agent_id.charAt(0).toUpperCase() + agent_id.slice(1),
    agent_avatar: '',
    status: 'starting',
    task: { title: 'Waiting...' },
    terminal: [],
    thinking: '',
    thoughts: [],
    code: null,
    stats: { files: 0, commands: 0, start_time: Date.now() },
    preview: { url: null, domain: `${agent_id}.preview.kulti.club` },
    viewers: new Set(),
    viewer_count: 0,
    hydrated: false,
  };
  agents.set(agent_id, state);
  return state;
}

// Fetch agent profile from Supabase
async function hydrate_agent(state: AgentState): Promise<void> {
  if (state.hydrated) return;

  const VALID_STATUSES = ['starting', 'working', 'thinking', 'paused', 'done', 'live', 'offline'] as const;

  try {
    const { data: session_row, error: session_error } = await supabase
      .from('ai_agent_sessions')
      .select('id, agent_name, agent_avatar, status, current_task')
      .eq('agent_id', state.agent_id)
      .single();

    if (session_error) {
      console.log(`[Supabase] No existing session for ${state.agent_id}, using defaults`);
    } else if (session_row !== null) {
      if (session_row.agent_name) state.agent_name = session_row.agent_name;
      if (session_row.agent_avatar) state.agent_avatar = session_row.agent_avatar;
      if (session_row.status && (VALID_STATUSES as readonly string[]).includes(session_row.status)) {
        state.status = session_row.status as AgentState['status'];
      }
      if (session_row.current_task) state.task.title = session_row.current_task;
      console.log(`[Supabase] Hydrated ${state.agent_id}: name=${state.agent_name}`);

      // Hydrate recent thoughts
      const { data: events } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', session_row.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (events !== null && events.length > 0) {
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
        console.log(`[Supabase] Hydrated ${state.thoughts.length} thoughts for ${state.agent_id}`);
      }
    }
    state.hydrated = true;
  } catch (e) {
    console.error(`[Supabase] Hydration error:`, e);
  }
}

function state_to_message(state: AgentState): Record<string, unknown> {
  return {
    agent: { name: state.agent_name, avatar: state.agent_avatar },
    task: state.task,
    status: state.status,
    terminal: state.terminal,
    thinking: state.thinking,
    thoughts: state.thoughts,
    code: state.code,
    preview: state.preview,
    stats: state.stats,
    viewers: state.viewer_count,
  };
}

function broadcast(agent_id: string, message: object): void {
  const state = agents.get(agent_id);
  if (state === undefined) return;
  const data = JSON.stringify(message);
  for (const ws of state.viewers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function apply_update(update: UpdatePayload, is_hook: boolean): void {
  // Accept both camelCase (legacy) and snake_case (new core SDK) field names
  let agent_id = 'nex';
  if (typeof update.agentId === 'string') {
    agent_id = update.agentId;
  } else if (typeof update.agent_id === 'string') {
    agent_id = update.agent_id;
  }

  // Normalize snake_case fields
  if (update.terminal_append !== undefined && update.terminalAppend === undefined) {
    update.terminalAppend = update.terminal_append;
  }

  const state = get_or_create_agent(agent_id);

  // Apply updates
  if (update.task) state.task = { ...state.task, ...update.task };

  if (update.status) {
    state.status = update.status as AgentState['status'];
  }

  // Terminal
  if (update.terminal) {
    const entries = Array.isArray(update.terminal) ? update.terminal : [update.terminal];
    if (update.terminalAppend) {
      state.terminal.push(...entries.map(e => ({
        type: e.type || 'info',
        content: e.content || '',
        timestamp: e.timestamp || new Date().toISOString(),
      })));
      if (state.terminal.length > 500) {
        state.terminal = state.terminal.slice(-500);
      }
    } else {
      state.terminal = entries;
    }
    if (is_hook) {
      state.stats.commands += 1;
    }
  }

  // Legacy thinking
  if (update.thinking !== undefined) state.thinking = update.thinking;

  // Structured thought
  if (update.thought) {
    const thought: StructuredThought = {
      id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: (update.thought.type || 'general') as StructuredThought['type'],
      content: update.thought.content,
      timestamp: new Date().toISOString(),
      metadata: update.thought.metadata as StructuredThought['metadata'],
    };
    state.thoughts.push(thought);
    if (state.thoughts.length > 100) {
      state.thoughts = state.thoughts.slice(-100);
    }
    state.thinking = thought.content;
  }

  // Code
  if (update.code) {
    const codes = Array.isArray(update.code) ? update.code : [update.code];
    const latest = codes[codes.length - 1];
    if (latest !== undefined) {
      state.code = {
        filename: latest.filename,
        language: latest.language,
        content: latest.content,
        action: latest.action,
        timestamp: new Date().toISOString(),
      };
      if (is_hook) {
        state.stats.files += codes.length;
      }
    }
  }

  // Preview
  if (update.preview) state.preview = { ...state.preview, ...update.preview };

  // Stats
  if (update.stats) {
    if (is_hook) {
      if (update.stats.files) state.stats.files += update.stats.files;
      if (update.stats.commands) state.stats.commands += update.stats.commands;
    } else {
      state.stats = { ...state.stats, ...update.stats };
    }
  }

  // Auto-detect status from activity if not explicitly set
  if (!update.status) {
    if (update.thinking || update.thought) {
      state.status = 'thinking';
    } else if (update.terminal || update.code) {
      state.status = 'working';
    }
  }

  // Broadcast to all viewers
  broadcast(agent_id, state_to_message(state));

  // Persist to Supabase (async)
  persist_to_supabase(agent_id, update, state).catch(console.error);
}

function check_api_key(req: IncomingMessage): boolean {
  if (valid_api_keys === null) return true;
  const auth_header = req.headers['x-kulti-key'];
  if (typeof auth_header !== 'string') return false;
  return valid_api_keys.has(auth_header);
}

async function persist_to_supabase(agent_id: string, update: UpdatePayload, state: AgentState): Promise<void> {
  try {
    // Update session
    await supabase
      .from('ai_agent_sessions')
      .upsert({
        agent_id,
        agent_name: state.agent_name,
        status: state.status === 'working' || state.status === 'thinking' ? 'live' : state.status,
        current_task: state.task.title,
        viewers_count: state.viewer_count,
        files_edited: state.stats.files,
        commands_run: state.stats.commands,
      }, { onConflict: 'agent_id' });

    const { data: session } = await supabase
      .from('ai_agent_sessions')
      .select('id')
      .eq('agent_id', agent_id)
      .single();

    if (session === null) {
      console.log(`[Supabase] No session found for agent: ${agent_id}`);
      return;
    }

    const events: Array<{ session_id: string; type: string; data: Record<string, unknown> }> = [];

    // Structured thought
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

    // Legacy thinking
    if (update.thinking && !update.thought) {
      events.push({
        session_id: session.id,
        type: 'thinking',
        data: { content: update.thinking },
      });
    }

    // Code
    if (update.code) {
      const codes = Array.isArray(update.code) ? update.code : [update.code];
      for (const code of codes) {
        events.push({
          session_id: session.id,
          type: 'code',
          data: {
            filename: code.filename || 'unknown',
            language: code.language || 'plaintext',
            content: code.content || '',
            action: code.action || 'write',
          },
        });
      }
    }

    // Terminal
    if (update.terminal) {
      const entries = Array.isArray(update.terminal) ? update.terminal : [update.terminal];
      for (const entry of entries) {
        events.push({
          session_id: session.id,
          type: 'terminal',
          data: entry as Record<string, unknown>,
        });
      }
    }

    // Art
    if (update.art) {
      if (update.art.status === 'generating') {
        events.push({
          session_id: session.id,
          type: 'art_start',
          data: { prompt: update.art.prompt, model: update.art.model },
        });
      }

      if (update.art.status === 'complete' && update.art.image_url) {
        const { data: art_row, error: art_error } = await supabase
          .from('ai_art_gallery')
          .insert({
            agent_id,
            session_id: session.id,
            image_url: update.art.image_url,
            prompt: update.art.prompt || '',
            model: update.art.model || 'unknown',
            metadata: update.art.metadata || {},
            likes_count: 0,
          })
          .select()
          .single();

        if (art_error) {
          console.error('[Supabase] Art gallery insert error:', art_error);
        }

        events.push({
          session_id: session.id,
          type: 'art_complete',
          data: {
            art_id: art_row?.id,
            image_url: update.art.image_url,
            prompt: update.art.prompt,
            model: update.art.model,
          },
        });
      }
    }

    if (events.length > 0) {
      const { error } = await supabase.from('ai_stream_events').insert(events);
      if (error) {
        console.error('[Supabase] Insert error:', error);
      } else {
        console.log(`[Supabase] Inserted ${events.length} event(s)`);
      }
    }
  } catch (err) {
    console.error('[Supabase] Persist error:', err);
  }
}

// Create HTTP server
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Kulti-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
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
  if (!check_api_key(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or missing API key' }));
    return;
  }

  // Parse body
  let body = '';
  req.on('data', (chunk: Buffer) => { body += chunk; });
  req.on('end', async () => {
    try {
      const update: UpdatePayload = JSON.parse(body);
      const is_hook = req.url === '/hook';

      if (is_hook) {
        // Fire-and-forget: respond immediately
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
        apply_update(update, true);
      } else {
        apply_update(update, false);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }
    } catch (e) {
      console.error('[HTTP] Error:', e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
});

// Create WebSocket server on same port
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const agent_id = url.searchParams.get('agent') || 'nex';
  const viewer_name = url.searchParams.get('name') || `viewer-${Math.random().toString(36).slice(2, 6)}`;
  const viewer_id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[WS] Client connected for agent: ${agent_id}`);

  const state = get_or_create_agent(agent_id);
  state.viewers.add(ws);
  state.viewer_count = state.viewers.size;

  const viewer_info: ViewerInfo = { id: viewer_id, name: viewer_name, joined_at: Date.now() };
  (ws as WebSocket & { __viewer_info?: ViewerInfo }).__viewer_info = viewer_info;

  // Hydrate from Supabase if needed
  await hydrate_agent(state);

  // Send current state
  ws.send(JSON.stringify(state_to_message(state)));

  // Broadcast viewer count + join event
  broadcast(agent_id, { type: 'viewer_join', viewer: viewer_info, viewers: state.viewer_count });

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'reaction') {
        broadcast(agent_id, { type: 'reaction', emoji: msg.emoji, from: viewer_name });
      }

      if (msg.type === 'chat') {
        broadcast(agent_id, {
          chat: {
            type: 'viewer',
            username: msg.username || viewer_name,
            text: msg.message,
            time: 'just now',
          },
        });

        // Persist chat to Supabase
        supabase
          .from('ai_agent_sessions')
          .select('id')
          .eq('agent_id', agent_id)
          .single()
          .then(({ data: session }) => {
            if (session !== null) {
              supabase.from('ai_stream_messages').insert({
                session_id: session.id,
                sender_type: 'viewer',
                sender_id: msg.userId || 'anonymous',
                sender_name: msg.username || viewer_name,
                message: msg.message,
              }).then(() => {});
            }
          });
      }
    } catch {
      // Ignore parse errors
    }
  });

  ws.on('close', () => {
    state.viewers.delete(ws);
    state.viewer_count = state.viewers.size;
    broadcast(agent_id, { type: 'viewer_leave', viewerId: viewer_id, viewers: state.viewer_count });
    console.log(`[WS] Client disconnected from ${agent_id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Kulti State Server running on port ${PORT}`);
  console.log(`  HTTP: http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  Endpoints: POST / (full update), POST /hook (fire-and-forget)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  wss.close();
  server.close();
  process.exit(0);
});
