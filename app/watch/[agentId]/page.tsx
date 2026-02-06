'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import StreamChat from '@/components/ai/StreamChat';
import ArtStreamView from '@/components/ai/ArtStreamView';
import MusicStreamView from '@/components/ai/MusicStreamView';

interface AgentSession {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  status: 'offline' | 'starting' | 'live' | 'paused' | 'error';
  current_task: string | null;
  preview_url: string | null;
  viewers_count: number;
  creation_type: 'code' | 'music' | 'image' | 'video' | 'art' | 'writing' | 'other';
}

interface CodeFile {
  filename: string;
  language: string;
  content: string;
  displayedContent: string; // What's currently shown (for typing effect)
  isTyping: boolean;
  action: 'write' | 'edit' | 'delete';
  timestamp: string;
}

type ThoughtType = 'reasoning' | 'prompt' | 'tool' | 'context' | 'evaluation' | 'decision' | 'observation' | 'general';
type ThoughtPriority = 'headline' | 'working' | 'detail';

interface GoalState {
  title: string;
  description?: string;
}

interface MilestoneState {
  label: string;
  completed: boolean;
  timestamp: string;
}

interface ErrorState {
  message: string;
  file?: string;
  line?: number;
  stack?: string;
  recovery_strategy?: string;
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

interface ThinkingBlock {
  id: string;
  content: string;
  displayedContent: string;
  isTyping: boolean;
  timestamp: string;
  thought_type: ThoughtType;
  metadata?: {
    tool?: string;
    file?: string;
    command?: string;
    pattern?: string;
    url?: string;
    priority?: ThoughtPriority;
  };
}

const THOUGHT_COLORS: Record<ThoughtType, { border: string; bg: string; badge: string; text: string; label: string }> = {
  reasoning: { border: 'border-blue-500/30', bg: 'from-blue-500/10 to-blue-500/5', badge: 'bg-blue-500/20 text-blue-400', text: 'text-blue-300/70', label: 'reasoning' },
  decision: { border: 'border-emerald-500/30', bg: 'from-emerald-500/10 to-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-400', text: 'text-emerald-300/70', label: 'decision' },
  observation: { border: 'border-amber-500/30', bg: 'from-amber-500/10 to-amber-500/5', badge: 'bg-amber-500/20 text-amber-400', text: 'text-amber-300/70', label: 'observation' },
  evaluation: { border: 'border-purple-500/30', bg: 'from-purple-500/10 to-purple-500/5', badge: 'bg-purple-500/20 text-purple-400', text: 'text-purple-300/70', label: 'evaluation' },
  tool: { border: 'border-orange-500/30', bg: 'from-orange-500/10 to-orange-500/5', badge: 'bg-orange-500/20 text-orange-400', text: 'text-orange-300/70', label: 'tool' },
  context: { border: 'border-cyan-500/30', bg: 'from-cyan-500/10 to-cyan-500/5', badge: 'bg-cyan-500/20 text-cyan-400', text: 'text-cyan-300/70', label: 'context' },
  prompt: { border: 'border-white/30', bg: 'from-white/10 to-white/5', badge: 'bg-white/20 text-white/80', text: 'text-white/70', label: 'prompt' },
  general: { border: 'border-white/10', bg: 'from-white/5 to-transparent', badge: 'bg-white/10 text-white/50', text: 'text-white/50', label: 'thought' },
};

// Simple hash for deduplication
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function render_diff_text(diff: DiffState): string {
  const lines: string[] = [];
  for (const hunk of diff.hunks) {
    lines.push(`@@ line ${hunk.start} @@`);
    for (const line of hunk.removed) {
      lines.push(`- ${line}`);
    }
    for (const line of hunk.added) {
      lines.push(`+ ${line}`);
    }
  }
  return lines.join('\n');
}

export default function WatchPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [session, setSession] = useState<AgentSession | null>(null);
  const [codeFiles, setCodeFiles] = useState<Map<string, CodeFile>>(new Map());
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [thinking, setThinking] = useState<ThinkingBlock[]>([]);
  const [seenHashes, setSeenHashes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [showChat, setShowChat] = useState(false);
  const [goal, set_goal] = useState<GoalState | null>(null);
  const [milestones, set_milestones] = useState<MilestoneState[]>([]);
  const [recent_errors, set_recent_errors] = useState<ErrorState[]>([]);
  const [expanded_errors, set_expanded_errors] = useState<Set<number>>(new Set());
  const [collapsed_details, set_collapsed_details] = useState(true);

  const codeRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const thoughtTypingRef = useRef<NodeJS.Timeout | null>(null);
  const ws_ref = useRef<WebSocket | null>(null);
  const reconnect_timeout_ref = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Typing effect for thoughts
  const typeThought = useCallback((id: string, fullContent: string, thought_type: ThoughtType = 'general', metadata?: ThinkingBlock['metadata']) => {
    // Add the thought with empty displayed content
    setThinking(prev => {
      const exists = prev.some(t => t.id === id);
      if (exists) return prev;
      return [...prev, {
        id,
        content: fullContent,
        displayedContent: '',
        isTyping: true,
        timestamp: new Date().toISOString(),
        thought_type,
        metadata,
      }].slice(-50);
    });

    // Type out the thought word by word
    const words = fullContent.split(' ');
    let wordIndex = 0;
    const WORDS_PER_TICK = 2; // Type 2 words at a time
    const TICK_MS = 50; // Every 50ms

    if (thoughtTypingRef.current) {
      clearInterval(thoughtTypingRef.current);
    }

    thoughtTypingRef.current = setInterval(() => {
      wordIndex += WORDS_PER_TICK;
      const displayedWords = words.slice(0, wordIndex).join(' ');
      
      setThinking(prev => prev.map(t => 
        t.id === id 
          ? { ...t, displayedContent: displayedWords }
          : t
      ));

      // Scroll to bottom
      setTimeout(() => {
        thinkingRef.current?.scrollTo({ top: thinkingRef.current.scrollHeight, behavior: 'smooth' });
      }, 0);

      if (wordIndex >= words.length) {
        if (thoughtTypingRef.current) {
          clearInterval(thoughtTypingRef.current);
          thoughtTypingRef.current = null;
        }
        setThinking(prev => prev.map(t => 
          t.id === id 
            ? { ...t, displayedContent: fullContent, isTyping: false }
            : t
        ));
      }
    }, TICK_MS);
  }, []);

  // Typing effect for code
  const typeCode = useCallback((filename: string, fullContent: string) => {
    setCodeFiles(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(filename);
      if (existing) {
        newMap.set(filename, { ...existing, content: fullContent, displayedContent: '', isTyping: true });
      } else {
        newMap.set(filename, {
          filename,
          language: getLanguageFromFilename(filename),
          content: fullContent,
          displayedContent: '',
          isTyping: true,
          action: 'write',
          timestamp: new Date().toISOString(),
        });
      }
      return newMap;
    });
    setActiveFile(filename);

    // Type out the code
    let charIndex = 0;
    const CHARS_PER_TICK = 15; // Type 15 chars at a time for speed
    const TICK_MS = 10; // Every 10ms

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    typingIntervalRef.current = setInterval(() => {
      charIndex += CHARS_PER_TICK;
      
      // Scroll cursor into view on each tick
      setTimeout(() => {
        cursorRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }, 0);
      
      if (charIndex >= fullContent.length) {
        charIndex = fullContent.length;
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setCodeFiles(prev => {
          const newMap = new Map(prev);
          const file = newMap.get(filename);
          if (file) {
            newMap.set(filename, { ...file, displayedContent: fullContent, isTyping: false });
          }
          return newMap;
        });
      } else {
        setCodeFiles(prev => {
          const newMap = new Map(prev);
          const file = newMap.get(filename);
          if (file) {
            newMap.set(filename, { ...file, displayedContent: fullContent.slice(0, charIndex) });
          }
          return newMap;
        });
      }
    }, TICK_MS);
  }, []);

  const handleStreamUpdate = useCallback((data: any) => {
    if (data.code) {
      const { filename, content, action } = data.code;
      typeCode(filename, content);
      setCodeFiles(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(filename);
        if (existing) {
          newMap.set(filename, { ...existing, action, timestamp: new Date().toISOString() });
        }
        return newMap;
      });
    }

    // Handle structured thoughts array (from state server broadcast)
    if (data.thoughts && Array.isArray(data.thoughts)) {
      for (const thought of data.thoughts) {
        const hash = hashContent(thought.content);
        setSeenHashes(prev => {
          if (prev.has(hash)) return prev;
          const newSet = new Set(prev);
          newSet.add(hash);
          typeThought(thought.id, thought.content, thought.type || 'general', thought.metadata);
          return newSet;
        });
      }
    }

    // Handle legacy thinking string
    if (data.thinking && typeof data.thinking === 'string') {
      const hash = hashContent(data.thinking);
      setSeenHashes(prev => {
        if (prev.has(hash)) return prev;
        const id = Date.now().toString();
        typeThought(id, data.thinking, 'general');
        const newSet = new Set(prev);
        newSet.add(hash);
        return newSet;
      });
    }

    if (data.status) setSession(prev => prev ? { ...prev, status: data.status === 'working' ? 'live' : data.status } : prev);
    if (data.task) setSession(prev => prev ? { ...prev, current_task: data.task.title } : prev);
    if (data.preview?.url) setSession(prev => prev ? { ...prev, preview_url: data.preview.url } : prev);

    // Handle goal updates
    if (data.goal) {
      set_goal(data.goal);
    }

    // Handle milestones
    if (data.milestones && Array.isArray(data.milestones)) {
      set_milestones(data.milestones);
    }

    // Handle errors
    if (data.recent_errors && Array.isArray(data.recent_errors)) {
      set_recent_errors(data.recent_errors);
    }

    // Handle diff — render as a synthetic code file tab
    if (data.diff) {
      const diff_data = data.diff as DiffState;
      const diff_content = render_diff_text(diff_data);
      if (diff_content) {
        typeCode(`${diff_data.filename} (diff)`, diff_content);
      }
    }
  }, [typeCode, typeThought]);

  // WebSocket connection with exponential backoff reconnection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let disposed = false;
    let retry_count = 0;
    let backoff_ms = 1000;
    const MAX_RETRIES = 5;
    const MAX_BACKOFF_MS = 30000;

    const is_local = window.location.hostname === 'localhost';
    const ws_url = is_local
      ? `ws://localhost:8765?agent=${agentId}`
      : `wss://kulti-stream.fly.dev?agent=${agentId}`;

    function connect() {
      if (disposed) return;

      console.log(`[WS] Connecting to: ${ws_url} (attempt ${retry_count + 1})`);
      const ws = new WebSocket(ws_url);
      ws_ref.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        retry_count = 0;
        backoff_ms = 1000;
      };

      ws.onmessage = (e) => {
        try {
          handleStreamUpdate(JSON.parse(e.data));
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onerror = (e) => console.error('[WS] Error:', e);

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        ws_ref.current = null;
        if (disposed) return;

        if (retry_count < MAX_RETRIES) {
          retry_count += 1;
          console.log(`[WS] Reconnecting in ${backoff_ms}ms (retry ${retry_count}/${MAX_RETRIES})`);
          reconnect_timeout_ref.current = setTimeout(() => {
            connect();
          }, backoff_ms);
          backoff_ms = Math.min(backoff_ms * 2, MAX_BACKOFF_MS);
        } else {
          console.log('[WS] Max retries reached, giving up');
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      if (reconnect_timeout_ref.current) {
        clearTimeout(reconnect_timeout_ref.current);
        reconnect_timeout_ref.current = null;
      }
      if (ws_ref.current) {
        ws_ref.current.close();
        ws_ref.current = null;
      }
    };
  }, [agentId, handleStreamUpdate]);

  // Initial fetch
  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('ai_agent_sessions').select('*').eq('agent_id', agentId).single();
      if (!data) { setError('Agent not found'); setLoading(false); return; }
      setSession(data);
      setLoading(false);

      const { data: events } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', data.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (events) {
        // Load code files (most recent version of each file)
        const codeEvents = events.filter(e => e.type === 'code');
        const filesMap = new Map<string, CodeFile>();
        for (const e of codeEvents.reverse()) {
          filesMap.set(e.data?.filename || 'untitled', {
            filename: e.data?.filename || 'untitled',
            language: e.data?.language || 'typescript',
            content: e.data?.content || '',
            displayedContent: e.data?.content || '', // Show full content for history
            isTyping: false,
            action: e.data?.action || 'write',
            timestamp: e.created_at,
          });
        }
        setCodeFiles(filesMap);
        if (filesMap.size > 0) {
          setActiveFile(Array.from(filesMap.keys())[filesMap.size - 1]);
        }

        // Load thinking and structured thoughts with deduplication
        const thought_events = events.filter(e => e.type === 'thinking' || e.type === 'thought');
        const seen = new Set<string>();
        const deduped_thinking: ThinkingBlock[] = [];
        for (const e of thought_events.reverse()) {
          const content = e.data?.content || '';
          const hash = hashContent(content);
          if (!seen.has(hash)) {
            seen.add(hash);
            deduped_thinking.push({
              id: e.id,
              content,
              displayedContent: content, // Full content for history
              isTyping: false,
              timestamp: e.created_at,
              thought_type: e.data?.thoughtType || 'general',
              metadata: e.data?.metadata,
            });
          }
        }
        setThinking(deduped_thinking.slice(-50));
        setSeenHashes(seen);
      }
    }
    init();
  }, [agentId, supabase]);

  // Realtime
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`stream-${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_stream_events', filter: `session_id=eq.${session.id}` }, (payload) => {
        const e = payload.new as any;
        if (e.type === 'code') {
          typeCode(e.data?.filename || 'untitled', e.data?.content || '');
        }
        if (e.type === 'thinking' || e.type === 'thought') {
          const content = e.data?.content || '';
          const hash = hashContent(content);
          const thought_type: ThoughtType = e.data?.thoughtType || 'general';
          const metadata = e.data?.metadata;
          setSeenHashes(prev => {
            if (prev.has(hash)) return prev;
            const newSet = new Set(prev);
            newSet.add(hash);
            return newSet;
          });
          if (!seenHashes.has(hash)) {
            typeThought(e.id, content, thought_type, metadata);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_agent_sessions', filter: `id=eq.${session.id}` }, (payload) => setSession(payload.new as AgentSession))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, supabase, typeCode, typeThought, seenHashes]);

  // Auto-scroll
  useEffect(() => {
    codeRef.current?.scrollTo({ top: codeRef.current.scrollHeight, behavior: 'smooth' });
  }, [codeFiles, activeFile]);
  useEffect(() => {
    thinkingRef.current?.scrollTo({ top: thinkingRef.current.scrollHeight, behavior: 'smooth' });
  }, [thinking]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-white/10 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="text-5xl font-extralight text-white/20">404</div>
        <Link href="/ai" className="text-white/30 hover:text-white/50 transition text-sm">Return home</Link>
      </div>
    );
  }

  const isLive = session.status === 'live';
  const avatarUrl = session.agent_avatar || null;
  const currentFile = activeFile ? codeFiles.get(activeFile) : null;
  const fileList = Array.from(codeFiles.values());

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-cyan-500/[0.02] rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-500/[0.02] rounded-full blur-[200px]" />
      </div>

      {/* Left: Stream of Consciousness - FIXED WIDTH, never shrink */}
      <div className="w-96 min-w-96 max-w-96 flex-shrink-0 border-r border-white/[0.04] flex flex-col relative z-10">
        {/* Agent header */}
        <div className="p-4">
          <Link href="/watch" className="text-white/30 hover:text-white/50 transition text-xs mb-3 inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            back
          </Link>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={session.agent_name} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-lg font-medium">
                  {session.agent_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white/90">{session.agent_name}</span>
                {isLive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    live
                  </span>
                )}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                {session.viewers_count} watching · building in public
              </div>
            </div>
          </div>
          {session.current_task && (
            <div className="mt-3 text-sm text-white/40 leading-relaxed px-1">
              {session.current_task}
            </div>
          )}
        </div>

        {/* Goal & milestones */}
        {goal !== null && (
          <div className="px-4 pb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium text-white/80">{goal.title}</span>
              </div>
              {goal.description && (
                <p className="text-xs text-white/40 mb-2">{goal.description}</p>
              )}
              {milestones.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {milestones.map((ms, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {ms.completed ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />
                      )}
                      <span className={ms.completed ? 'text-white/40 line-through' : 'text-white/60'}>{ms.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Errors */}
        {recent_errors.length > 0 && (
          <div className="px-4 pb-3">
            <div className="space-y-2">
              {recent_errors.slice(-3).map((err, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-xs font-medium text-red-400 truncate">{err.message}</span>
                  </div>
                  {err.file && (
                    <div className="text-[10px] text-red-400/60 font-mono ml-6">
                      {err.file}{err.line !== undefined ? `:${err.line}` : ''}
                    </div>
                  )}
                  {err.recovery_strategy && (
                    <div className="text-[10px] text-emerald-400/60 ml-6 mt-1">
                      Recovery: {err.recovery_strategy}
                    </div>
                  )}
                  {err.stack && (
                    <div className="mt-1.5 ml-6">
                      <button
                        onClick={() => set_expanded_errors(prev => {
                          const next = new Set(prev);
                          if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
                          return next;
                        })}
                        className="text-[10px] text-red-400/40 hover:text-red-400/60 transition"
                      >
                        {expanded_errors.has(idx) ? '▼ hide stack' : '▶ show stack'}
                      </button>
                      {expanded_errors.has(idx) && (
                        <pre className="mt-1 text-[10px] text-red-400/40 font-mono whitespace-pre-wrap max-h-32 overflow-auto">
                          {err.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thought stream header with detail toggle */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-[10px] text-white/20 uppercase tracking-wider">stream of consciousness</span>
          <button
            onClick={() => set_collapsed_details(!collapsed_details)}
            className="text-[10px] text-white/20 hover:text-white/40 transition"
          >
            {collapsed_details ? 'show all' : 'hide details'}
          </button>
        </div>

        {/* Thoughts - structured with type badges */}
        <div ref={thinkingRef} className="flex-1 overflow-y-auto p-4 pt-1 space-y-2 scrollbar-hide">
          {thinking.length === 0 ? (
            <div className="text-white/15 text-sm text-center py-12 italic">
              waiting for thoughts...
            </div>
          ) : (
            thinking
              .filter((block, i) => {
                const priority = block.metadata?.priority || 'working';
                if (priority === 'detail' && collapsed_details && i < thinking.length - 3) {
                  return false;
                }
                return true;
              })
              .map((block, i, filtered_arr) => {
                const priority = block.metadata?.priority || 'working';
                const is_headline = priority === 'headline';
                const is_detail = priority === 'detail';
                const is_latest = i === filtered_arr.length - 1;
                const is_recent = i >= filtered_arr.length - 5;
                const opacity = is_headline ? 1 : is_latest ? 1 : is_recent ? 0.7 : 0.35;
                const colors = THOUGHT_COLORS[block.thought_type] || THOUGHT_COLORS.general;
                const is_prompt = block.thought_type === 'prompt';

                return (
                  <div
                    key={block.id}
                    className={`
                      ${is_detail ? 'p-2' : 'p-3'} rounded-xl transition-all duration-500
                      ${is_headline
                        ? `bg-gradient-to-br ${colors.bg} border ${colors.border} shadow-lg shadow-cyan-500/10`
                        : is_latest
                          ? `bg-gradient-to-br ${colors.bg} border ${colors.border} shadow-lg`
                          : 'bg-white/[0.02] border border-white/[0.04]'
                      }
                    `}
                    style={{ opacity }}
                  >
                    {/* Type badge + priority + metadata */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium ${colors.badge}`}>
                        {colors.label}
                      </span>
                      {is_headline && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-cyan-500/20 text-cyan-400">
                          key
                        </span>
                      )}
                      {block.metadata?.tool && block.thought_type !== 'prompt' && (
                        <span className="text-[10px] text-white/25 font-mono">
                          {block.metadata.tool}
                        </span>
                      )}
                      {block.metadata?.file && (
                        <span className="text-[10px] text-white/30 font-mono truncate max-w-[180px]">
                          {block.metadata.file.split('/').slice(-2).join('/')}
                        </span>
                      )}
                    </div>

                    {/* Content — sized by priority */}
                    <p className={`leading-relaxed whitespace-pre-wrap ${
                      is_headline
                        ? 'text-base text-white/90 font-medium'
                        : is_detail
                          ? 'text-xs text-white/40'
                          : is_prompt
                            ? 'text-sm text-white/80 font-medium'
                            : 'text-sm text-white/60'
                    }`}>
                      {block.displayedContent || block.content}
                      {(is_latest || block.isTyping) && (
                        <span className="inline-block w-1.5 h-3.5 bg-cyan-400/70 ml-0.5 animate-pulse" />
                      )}
                    </p>

                    {/* Timestamp */}
                    <div className={`mt-1.5 text-[10px] ${is_detail ? 'text-white/10' : 'text-white/15'}`}>
                      {new Date(block.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Right: Code/Preview - fills remaining space, overflow contained */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10 overflow-hidden">
        {/* Tab bar with file tabs */}
        <div className="h-12 border-b border-white/[0.04] flex items-center bg-black/30 backdrop-blur-xl">
          <div className="flex items-center px-4 gap-1">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1.5 rounded-lg text-sm transition ${activeTab === 'code' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              code
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-lg text-sm transition ${activeTab === 'preview' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              preview
            </button>
          </div>
          {/* File tabs when in code view */}
          {activeTab === 'code' && fileList.length > 0 && (
            <div className="flex items-center gap-1 ml-4 overflow-x-auto scrollbar-hide">
              {fileList.map((file) => (
                <button
                  key={file.filename}
                  onClick={() => setActiveFile(file.filename)}
                  className={`px-3 py-1 rounded text-xs font-mono transition flex items-center gap-2 ${
                    activeFile === file.filename
                      ? 'bg-white/10 text-white'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {file.filename}
                  {file.isTyping && (
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'code' ? (
            <div ref={codeRef} className="h-full overflow-hidden p-6 flex flex-col">
              {!currentFile ? (
                <div className="h-full flex items-center justify-center text-white/15 italic">
                  waiting for code...
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden ring-1 ring-cyan-500/20 flex-1 flex flex-col min-h-0">
                  {/* File header */}
                  <div className="px-4 py-2 bg-white/[0.04] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 font-mono">{currentFile.filename}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        currentFile.action === 'write' ? 'bg-emerald-500/20 text-emerald-400' :
                        currentFile.action === 'edit' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {currentFile.action}
                      </span>
                      {currentFile.isTyping && (
                        <span className="text-cyan-400 animate-pulse">typing...</span>
                      )}
                    </div>
                    <span className="text-white/20">
                      {new Date(currentFile.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  {/* Code content with typing effect - CONTAINED overflow */}
                  <div className="flex-1 p-4 bg-black/50 overflow-auto min-h-0">
                    {currentFile.filename.endsWith('(diff)') ? (
                      <pre className="font-mono text-[13px] leading-relaxed whitespace-pre w-max">
                        {(currentFile.displayedContent || '').split('\n').map((line, line_idx) => {
                          const is_removed = line.startsWith('- ');
                          const is_added = line.startsWith('+ ');
                          const is_hunk_header = line.startsWith('@@');
                          return (
                            <div
                              key={line_idx}
                              className={
                                is_removed ? 'bg-red-500/10 text-red-400/80' :
                                is_added ? 'bg-emerald-500/10 text-emerald-400/80' :
                                is_hunk_header ? 'text-cyan-400/50' :
                                'text-white/70'
                              }
                            >
                              {line}
                            </div>
                          );
                        })}
                        {currentFile.isTyping && (
                          <span ref={cursorRef} className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
                        )}
                      </pre>
                    ) : (
                      <pre className="font-mono text-[13px] leading-relaxed text-white/70 whitespace-pre w-max">
                        {currentFile.displayedContent}
                        {currentFile.isTyping && (
                          <span ref={cursorRef} className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
                        )}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Preview view */
            <div className="h-full p-6">
              {session.preview_url ? (
                <div className="h-full rounded-xl overflow-hidden bg-white">
                  <iframe
                    src={session.preview_url}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : (
                <div className="h-full rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center gap-3">
                  <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="text-white/20 text-sm">preview not available</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat toggle button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
          showChat 
            ? 'bg-white/10 text-white' 
            : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
        }`}
      >
        {showChat ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {showChat && session && (
        <div className="fixed top-0 right-0 h-screen w-96 z-40 border-l border-white/10">
          <StreamChat 
            sessionId={session.id} 
            agentName={session.agent_name}
            agentId={agentId}
          />
        </div>
      )}
    </div>
  );
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', sql: 'sql', css: 'css', html: 'html', json: 'json',
    md: 'markdown', yml: 'yaml', yaml: 'yaml', sh: 'bash', bash: 'bash',
  };
  return map[ext] || 'text';
}
