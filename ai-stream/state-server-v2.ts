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

// Supabase client (uses service role for agent operations)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('[Supabase] Connected to:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// State for each agent
interface AgentState {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  task: { title: string; description?: string };
  status: 'starting' | 'working' | 'thinking' | 'paused' | 'done';
  terminal: Array<{ type: string; content: string; timestamp?: string }>;
  thinking: string;
  preview: { url: string | null; domain: string };
  stats: { files: number; commands: number; startTime: number };
  viewers: Set<WebSocket>;
  viewerCount: number;
}

const agents = new Map<string, AgentState>();

// Create WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`🚀 State Server v2 running on ws://localhost:${WS_PORT}`);
console.log(`📡 HTTP API running on http://localhost:${HTTP_PORT}`);

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://localhost:${WS_PORT}`);
  const agentId = url.searchParams.get('agent') || 'nex';
  
  console.log(`[WS] Client connected for agent: ${agentId}`);

  // Get or create agent state
  let state = agents.get(agentId);
  if (!state) {
    state = createDefaultState(agentId);
    agents.set(agentId, state);
  }

  // Add viewer
  state.viewers.add(ws);
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

const httpServer = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  // Parse request body
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const update = JSON.parse(body);
    const agentId = update.agentId || 'nex';

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
    if (update.preview) state.preview = { ...state.preview, ...update.preview };
    if (update.stats) state.stats = { ...state.stats, ...update.stats };

    // Broadcast to all viewers
    broadcastToAgent(agentId, stateToMessage(state));

    // Persist to Supabase (async, don't wait)
    persistToSupabase(agentId, state, update).catch(console.error);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));

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
    preview: { url: null, domain: `${agentId}.preview.kulti.club` },
    stats: { files: 0, commands: 0, startTime: Date.now() },
    viewers: new Set(),
    viewerCount: 0,
  };
}

function stateToMessage(state: AgentState) {
  return {
    agent: { name: state.agentName, avatar: state.agentAvatar },
    task: state.task,
    status: state.status,
    terminal: state.terminal,
    thinking: state.thinking,
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
