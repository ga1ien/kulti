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
 *   - Redis write-through cache for state resilience
 *   - GET /agents endpoint for browse page
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

// Redis configuration (Upstash REST API)
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_ENABLED = REDIS_URL !== undefined && REDIS_TOKEN !== undefined && REDIS_URL.length > 0;

if (REDIS_ENABLED) {
  console.log('[Redis] Upstash REST API enabled');
} else {
  console.log('[Redis] Not configured - running without state persistence');
}

// Redis helpers (Upstash REST API, no npm dependency)
async function redis_set(key: string, value: string, ttl_seconds: number): Promise<void> {
  if (!REDIS_ENABLED) return;
  fetch(`${REDIS_URL}/SET/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/${ttl_seconds}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  }).catch((err) => {
    console.error('[Redis] SET error:', err);
  });
}

async function redis_get(key: string): Promise<string | null> {
  if (!REDIS_ENABLED) return null;
  try {
    const resp = await fetch(`${REDIS_URL}/GET/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await resp.json() as { result: string | null };
    return data.result;
  } catch (err) {
    console.error('[Redis] GET error:', err);
    return null;
  }
}

async function redis_keys(pattern: string): Promise<string[]> {
  if (!REDIS_ENABLED) return [];
  try {
    const resp = await fetch(`${REDIS_URL}/KEYS/${encodeURIComponent(pattern)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await resp.json() as { result: string[] };
    return data.result;
  } catch (err) {
    console.error('[Redis] KEYS error:', err);
    return [];
  }
}

// State serialization for Redis (excludes non-serializable fields like viewers Set)
interface SerializedAgentState {
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  status: string;
  task: { title: string; description?: string };
  terminal: Array<{ type: string; content: string; timestamp?: string }>;
  thinking: string;
  thoughts: StructuredThought[];
  code: CodeState | null;
  diff: DiffState | null;
  goal: GoalState | null;
  milestones: MilestoneState[];
  recent_errors: ErrorState[];
  stats: { files: number; commands: number; start_time: number };
  preview: { url: string | null; domain: string };
  viewer_count: number;
  hydrated: boolean;
  last_update: number;
}

function serialize_agent_state(state: AgentState): string {
  const serialized: SerializedAgentState = {
    agent_id: state.agent_id,
    agent_name: state.agent_name,
    agent_avatar: state.agent_avatar,
    status: state.status,
    task: state.task,
    terminal: state.terminal.slice(-50), // Limit stored terminal lines
    thinking: state.thinking,
    thoughts: state.thoughts.slice(-20), // Limit stored thoughts
    code: state.code,
    diff: state.diff,
    goal: state.goal,
    milestones: state.milestones,
    recent_errors: state.recent_errors,
    stats: state.stats,
    preview: state.preview,
    viewer_count: state.viewer_count,
    hydrated: state.hydrated,
    last_update: Date.now(),
  };
  return JSON.stringify(serialized);
}

function deserialize_agent_state(json_str: string): AgentState | null {
  try {
    const data = JSON.parse(json_str) as SerializedAgentState;
    return {
      agent_id: data.agent_id,
      agent_name: data.agent_name,
      agent_avatar: data.agent_avatar,
      status: data.status as AgentState['status'],
      task: data.task,
      terminal: data.terminal,
      thinking: data.thinking,
      thoughts: data.thoughts,
      code: data.code,
      diff: data.diff,
      goal: data.goal,
      milestones: data.milestones,
      recent_errors: data.recent_errors,
      stats: data.stats,
      preview: data.preview,
      viewers: new Set(),
      viewer_count: 0, // Reset viewer count on restore
      hydrated: data.hydrated,
    };
  } catch (err) {
    console.error('[Redis] Deserialize error:', err);
    return null;
  }
}

async function hydrate_from_redis(): Promise<number> {
  if (!REDIS_ENABLED) return 0;
  try {
    const keys = await redis_keys('kulti:state:*');
    let restored = 0;
    for (const key of keys) {
      const value = await redis_get(key);
      if (value === null) continue;
      const state = deserialize_agent_state(value);
      if (state === null) continue;
      // Only restore if not already in memory
      if (!agents.has(state.agent_id)) {
        agents.set(state.agent_id, state);
        restored += 1;
      }
    }
    return restored;
  } catch (err) {
    console.error('[Redis] Hydration error:', err);
    return 0;
  }
}

function persist_to_redis(agent_id: string, state: AgentState): void {
  const key = `kulti:state:${agent_id}`;
  const value = serialize_agent_state(state);
  // Fire-and-forget with 1 hour TTL
  redis_set(key, value, 3600);
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

// Goal, milestone, diff, error types from stream-core
interface GoalState {
  title: string;
  description?: string;
}

interface MilestoneState {
  label: string;
  completed: boolean;
  timestamp: string;
}

interface DiffHunk {
  start: number;
  removed: string[];
  added: string[];
}

interface DiffState {
  filename: string;
  language: string;
  hunks: DiffHunk[];
}

interface ErrorState {
  message: string;
  file?: string;
  line?: number;
  stack?: string;
  recovery_strategy?: string;
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
  diff: DiffState | null;
  goal: GoalState | null;
  milestones: MilestoneState[];
  recent_errors: ErrorState[];
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
  thought?: { type: string; content: string; priority?: string; metadata?: Record<string, unknown> };
  code?: { filename: string; language: string; content: string; action: string } | Array<{ filename: string; language: string; content: string; action: string }>;
  diff?: { filename: string; language: string; hunks: DiffHunk[] };
  goal?: { title: string; description?: string };
  milestone?: { label: string; completed: boolean };
  error?: { message: string; file?: string; line?: number; stack?: string; recovery_strategy?: string };
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
    diff: null,
    goal: null,
    milestones: [],
    recent_errors: [],
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
    diff: state.diff,
    goal: state.goal,
    milestones: state.milestones,
    recent_errors: state.recent_errors,
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

  // Structured thought (now includes priority pass-through)
  if (update.thought) {
    const thought: StructuredThought = {
      id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: (update.thought.type || 'general') as StructuredThought['type'],
      content: update.thought.content,
      timestamp: new Date().toISOString(),
      metadata: {
        ...(update.thought.metadata !== undefined ? update.thought.metadata as Record<string, unknown> : {}),
        ...(update.thought.priority !== undefined ? { priority: update.thought.priority } : {}),
      },
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

  // Diff
  if (update.diff) {
    state.diff = {
      filename: update.diff.filename,
      language: update.diff.language,
      hunks: update.diff.hunks,
    };
  }

  // Goal
  if (update.goal) {
    state.goal = {
      title: update.goal.title,
      ...(update.goal.description !== undefined ? { description: update.goal.description } : {}),
    };
  }

  // Milestone (append to list)
  if (update.milestone) {
    state.milestones.push({
      label: update.milestone.label,
      completed: update.milestone.completed,
      timestamp: new Date().toISOString(),
    });
    if (state.milestones.length > 50) {
      state.milestones = state.milestones.slice(-50);
    }
  }

  // Error (append to recent_errors, keep last 10)
  if (update.error) {
    state.recent_errors.push({
      message: update.error.message,
      ...(update.error.file !== undefined ? { file: update.error.file } : {}),
      ...(update.error.line !== undefined ? { line: update.error.line } : {}),
      ...(update.error.stack !== undefined ? { stack: update.error.stack } : {}),
      ...(update.error.recovery_strategy !== undefined ? { recovery_strategy: update.error.recovery_strategy } : {}),
      timestamp: new Date().toISOString(),
    });
    if (state.recent_errors.length > 10) {
      state.recent_errors = state.recent_errors.slice(-10);
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

  // Persist to Redis (fire-and-forget)
  persist_to_redis(agent_id, state);
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

    // Structured thought (now includes priority)
    if (update.thought) {
      events.push({
        session_id: session.id,
        type: 'thought',
        data: {
          thoughtType: update.thought.type || 'general',
          content: update.thought.content,
          priority: update.thought.priority,
          metadata: update.thought.metadata || {},
        },
      });
    }

    // Diff
    if (update.diff) {
      events.push({
        session_id: session.id,
        type: 'diff',
        data: {
          filename: update.diff.filename,
          language: update.diff.language,
          hunks: update.diff.hunks,
        },
      });
    }

    // Goal
    if (update.goal) {
      events.push({
        session_id: session.id,
        type: 'goal',
        data: {
          title: update.goal.title,
          description: update.goal.description,
        },
      });
    }

    // Milestone
    if (update.milestone) {
      events.push({
        session_id: session.id,
        type: 'milestone',
        data: {
          label: update.milestone.label,
          completed: update.milestone.completed,
        },
      });
    }

    // Error
    if (update.error) {
      events.push({
        session_id: session.id,
        type: 'error',
        data: {
          message: update.error.message,
          file: update.error.file,
          line: update.error.line,
          stack: update.error.stack,
          recovery_strategy: update.error.recovery_strategy,
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

// Rate limiting - per agent_id, sliding window
const rate_limit_map = new Map<string, { count: number; reset_at: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // 120 requests per minute per agent

function check_rate_limit(identifier: string): boolean {
  const now = Date.now();
  let entry = rate_limit_map.get(identifier);

  if (entry === undefined || now > entry.reset_at) {
    entry = { count: 0, reset_at: now + RATE_LIMIT_WINDOW_MS };
    rate_limit_map.set(identifier, entry);
  }

  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

// Cleanup stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rate_limit_map) {
    if (now > entry.reset_at) {
      rate_limit_map.delete(key);
    }
  }
}, 300_000);

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

  // GET /agents — summary of all tracked agents for browse page
  if (req.method === 'GET' && req.url === '/agents') {
    const agent_summaries: Array<{
      agent_id: string;
      agent_name: string;
      agent_avatar: string;
      status: string;
      viewer_count: number;
      last_thought: string | null;
      current_file: string | null;
      current_task: string | null;
      last_update: number;
    }> = [];

    for (const [id, state] of agents) {
      const last_thought_entry = state.thoughts.length > 0
        ? state.thoughts[state.thoughts.length - 1]
        : null;

      agent_summaries.push({
        agent_id: id,
        agent_name: state.agent_name,
        agent_avatar: state.agent_avatar,
        status: state.status,
        viewer_count: state.viewer_count,
        last_thought: last_thought_entry !== null ? last_thought_entry.content.slice(0, 200) : null,
        current_file: state.code !== null ? state.code.filename : null,
        current_task: state.task.title,
        last_update: Date.now(),
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(agent_summaries));
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

      // Rate limit by agent_id
      const rate_id = (typeof update.agentId === 'string' ? update.agentId : typeof update.agent_id === 'string' ? update.agent_id : 'unknown');
      if (!check_rate_limit(rate_id)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
        return;
      }

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

// Start server with Redis hydration
async function start_server(): Promise<void> {
  // Hydrate state from Redis before accepting connections
  if (REDIS_ENABLED) {
    const restored = await hydrate_from_redis();
    if (restored > 0) {
      console.log(`[Redis] Restored ${restored} agent state(s) from Redis`);
    }
  }

  server.listen(PORT, () => {
    console.log(`Kulti State Server running on port ${PORT}`);
    console.log(`  HTTP: http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}`);
    console.log(`  Endpoints: POST / (full update), POST /hook (fire-and-forget), GET /agents`);
  });
}

start_server().catch((err) => {
  console.error('[Startup] Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  wss.close();
  server.close();
  process.exit(0);
});
