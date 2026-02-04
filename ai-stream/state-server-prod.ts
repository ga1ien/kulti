/**
 * Production State Server for Kulti AI Streaming
 * 
 * Single port server handling both WebSocket and HTTP
 * Designed for Fly.io deployment
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

// Agent state
interface AgentState {
  agentId: string;
  terminal: Array<{ type: string; content: string; timestamp?: string }>;
  thinking: string;
  viewers: Set<WebSocket>;
  viewerCount: number;
}

const agents = new Map<string, AgentState>();

function getOrCreateAgent(agentId: string): AgentState {
  let state = agents.get(agentId);
  if (!state) {
    state = {
      agentId,
      terminal: [],
      thinking: '',
      viewers: new Set(),
      viewerCount: 0,
    };
    agents.set(agentId, state);
  }
  return state;
}

function broadcast(agentId: string, message: object) {
  const state = agents.get(agentId);
  if (!state) return;
  const data = JSON.stringify(message);
  for (const ws of state.viewers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

async function persistToSupabase(agentId: string, update: any) {
  try {
    const { data: session } = await supabase
      .from('ai_agent_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .single();

    if (!session) {
      console.log(`[Supabase] No session found for agent: ${agentId}`);
      return;
    }

    const events: any[] = [];

    // Persist structured thought (new format from k script)
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
      console.log(`[Supabase] Queued thought: ${update.thought.type}`);
    }

    // Persist legacy thinking (simple string)
    if (update.thinking && !update.thought) {
      events.push({
        session_id: session.id,
        type: 'thinking',
        data: { content: update.thinking },
      });
      console.log(`[Supabase] Queued thinking`);
    }

    // Persist code with all fields
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
        console.log(`[Supabase] Queued code: ${code.filename}`);
      }
    }

    // Persist terminal
    if (update.terminal) {
      const entries = Array.isArray(update.terminal) ? update.terminal : [update.terminal];
      for (const entry of entries) {
        events.push({
          session_id: session.id,
          type: 'terminal',
          data: entry,
        });
      }
      console.log(`[Supabase] Queued ${entries.length} terminal entries`);
    }

    // Insert all events
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST endpoint for streaming updates (check method BEFORE route)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        const agentId = update.agentId || 'nex';
        const state = getOrCreateAgent(agentId);

        // Update state
        if (update.terminal) {
          const entries = Array.isArray(update.terminal) ? update.terminal : [update.terminal];
          state.terminal.push(...entries.map((e: any) => ({
            type: e.type || 'info',
            content: e.content || '',
            timestamp: e.timestamp || new Date().toISOString()
          })));
          state.terminal = state.terminal.slice(-100);
        }
        
        // Handle both legacy thinking and structured thought
        if (update.thinking) state.thinking = update.thinking;
        if (update.thought) state.thinking = update.thought.content;

        // Broadcast to WebSocket clients
        broadcast(agentId, update);

        // Persist to Supabase (async)
        persistToSupabase(agentId, update).catch(console.error);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('[HTTP] Error:', e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // Health check (GET only)
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', agents: agents.size }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// Create WebSocket server on same port
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const agentId = url.searchParams.get('agent') || 'nex';

  console.log(`[WS] Client connected for agent: ${agentId}`);

  const state = getOrCreateAgent(agentId);
  state.viewers.add(ws);
  state.viewerCount = state.viewers.size;

  // Send current state
  ws.send(JSON.stringify({
    terminal: state.terminal,
    thinking: state.thinking,
    viewers: state.viewerCount,
  }));

  // Broadcast viewer count
  broadcast(agentId, { viewers: state.viewerCount });

  ws.on('close', () => {
    state.viewers.delete(ws);
    state.viewerCount = state.viewers.size;
    broadcast(agentId, { viewers: state.viewerCount });
    console.log(`[WS] Client disconnected from ${agentId}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Kulti State Server running on port ${PORT}`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});
