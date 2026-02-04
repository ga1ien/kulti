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

interface ThinkingBlock {
  id: string;
  content: string;
  displayedContent: string; // For typing effect
  isTyping: boolean;
  timestamp: string;
  type?: 'reasoning' | 'prompt' | 'tool' | 'context' | 'evaluation' | 'decision' | 'observation' | 'general';
  metadata?: {
    tool?: string;
    file?: string;
    promptFor?: string;
    options?: string[];
    chosen?: string;
    confidence?: number;
  };
}

// Thought type styling - using full Tailwind class names to avoid purge issues
const thoughtTypeConfig: Record<string, { 
  label: string; 
  icon: string; 
  gradient: string;
  textClass: string;
  borderClass: string;
  cursorClass: string;
}> = {
  reasoning: { 
    label: 'Reasoning', 
    icon: '🧠', 
    gradient: 'from-purple-500/10 to-fuchsia-500/5',
    textClass: 'text-purple-400/70',
    borderClass: 'border-purple-500/20',
    cursorClass: 'bg-purple-400/70'
  },
  prompt: { 
    label: 'Crafting Prompt', 
    icon: '📝', 
    gradient: 'from-amber-500/10 to-orange-500/5',
    textClass: 'text-amber-400/70',
    borderClass: 'border-amber-500/20',
    cursorClass: 'bg-amber-400/70'
  },
  tool: { 
    label: 'Using Tool', 
    icon: '🔧', 
    gradient: 'from-blue-500/10 to-cyan-500/5',
    textClass: 'text-blue-400/70',
    borderClass: 'border-blue-500/20',
    cursorClass: 'bg-blue-400/70'
  },
  context: { 
    label: 'Loading Context', 
    icon: '📖', 
    gradient: 'from-emerald-500/10 to-green-500/5',
    textClass: 'text-emerald-400/70',
    borderClass: 'border-emerald-500/20',
    cursorClass: 'bg-emerald-400/70'
  },
  evaluation: { 
    label: 'Evaluating', 
    icon: '⚖️', 
    gradient: 'from-pink-500/10 to-rose-500/5',
    textClass: 'text-pink-400/70',
    borderClass: 'border-pink-500/20',
    cursorClass: 'bg-pink-400/70'
  },
  decision: { 
    label: 'Decision', 
    icon: '✅', 
    gradient: 'from-green-500/10 to-emerald-500/5',
    textClass: 'text-green-400/70',
    borderClass: 'border-green-500/20',
    cursorClass: 'bg-green-400/70'
  },
  observation: { 
    label: 'Observing', 
    icon: '👀', 
    gradient: 'from-cyan-500/10 to-blue-500/5',
    textClass: 'text-cyan-400/70',
    borderClass: 'border-cyan-500/20',
    cursorClass: 'bg-cyan-400/70'
  },
  general: { 
    label: 'Thinking', 
    icon: '💭', 
    gradient: 'from-white/5 to-gray-500/5',
    textClass: 'text-white/50',
    borderClass: 'border-white/10',
    cursorClass: 'bg-white/50'
  },
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

  const codeRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const thoughtTypingRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Typing effect for thoughts
  const typeThought = useCallback((id: string, fullContent: string) => {
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
      }].slice(-30);
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
    // Handle structured thought (new format)
    if (data.thought) {
      const hash = hashContent(data.thought.content);
      setSeenHashes(prev => {
        if (prev.has(hash)) return prev;
        const id = Date.now().toString();
        // Add thought with type and metadata
        setThinking(prevThinking => {
          const exists = prevThinking.some(t => t.id === id);
          if (exists) return prevThinking;
          return [...prevThinking, {
            id,
            content: data.thought.content,
            displayedContent: '',
            isTyping: true,
            timestamp: new Date().toISOString(),
            type: data.thought.type || 'general',
            metadata: data.thought.metadata,
          }].slice(-30);
        });
        // Type out the thought
        typeThought(id, data.thought.content);
        const newSet = new Set(prev);
        newSet.add(hash);
        return newSet;
      });
    }
    // Handle legacy thinking (simple string)
    if (data.thinking && !data.thought) {
      const hash = hashContent(data.thinking);
      // Check if we've seen this thought before
      setSeenHashes(prev => {
        if (prev.has(hash)) return prev; // Skip duplicate
        // Not a duplicate - type it out
        const id = Date.now().toString();
        typeThought(id, data.thinking);
        const newSet = new Set(prev);
        newSet.add(hash);
        return newSet;
      });
    }
    if (data.status) setSession(prev => prev ? { ...prev, status: data.status === 'working' ? 'live' : data.status } : prev);
    if (data.task) setSession(prev => prev ? { ...prev, current_task: data.task.title } : prev);
    if (data.preview?.url) setSession(prev => prev ? { ...prev, preview_url: data.preview.url } : prev);
  }, [typeCode, typeThought]);

  // WebSocket connection (local dev or production)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use local WebSocket for localhost, production for deployed
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal 
      ? `ws://localhost:8765?agent=${agentId}`
      : `wss://kulti-stream.fly.dev?agent=${agentId}`;
    
    console.log('[WS] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log('[WS] Connected');
    ws.onmessage = (e) => { 
      try { 
        handleStreamUpdate(JSON.parse(e.data)); 
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };
    ws.onerror = (e) => console.error('[WS] Error:', e);
    ws.onclose = () => console.log('[WS] Disconnected');
    
    return () => ws.close();
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

        // Load thinking with deduplication (supports both old 'thinking' and new 'thought' events)
        const thinkingEvents = events.filter(e => e.type === 'thinking' || e.type === 'thought');
        const seen = new Set<string>();
        const dedupedThinking: ThinkingBlock[] = [];
        for (const e of thinkingEvents.reverse()) {
          const content = e.data?.content || '';
          const hash = hashContent(content);
          if (!seen.has(hash)) {
            seen.add(hash);
            dedupedThinking.push({
              id: e.id,
              content,
              displayedContent: content, // Full content for history
              isTyping: false,
              timestamp: e.created_at,
              type: e.data?.thoughtType || (e.type === 'thought' ? e.data?.type : 'general'),
              metadata: e.data?.metadata,
            });
          }
        }
        setThinking(dedupedThinking.slice(-30));
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
          setSeenHashes(prev => {
            if (prev.has(hash)) return prev;
            const newSet = new Set(prev);
            newSet.add(hash);
            return newSet;
          });
          // Use typeThought for typing effect on realtime updates
          if (!seenHashes.has(hash)) {
            // Add structured thought if available
            setThinking(prev => [...prev, {
              id: e.id,
              content,
              displayedContent: '',
              isTyping: true,
              timestamp: new Date().toISOString(),
              type: e.data?.thoughtType || e.data?.type || 'general',
              metadata: e.data?.metadata,
            }].slice(-30));
            typeThought(e.id, content);
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
  const avatarUrl = session.agent_avatar?.startsWith('/') ? session.agent_avatar : null;
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
          <Link href="/ai" className="text-white/30 hover:text-white/50 transition text-xs mb-3 inline-flex items-center gap-1">
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

        {/* Thoughts */}
        <div ref={thinkingRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {thinking.length === 0 ? (
            <div className="text-white/15 text-sm text-center py-12 italic">
              waiting for thoughts...
            </div>
          ) : (
            thinking.map((block, i) => {
              const isLatest = i === thinking.length - 1;
              const isRecent = i >= thinking.length - 3;
              const opacity = isLatest ? 1 : isRecent ? 0.6 : 0.3;
              const typeConfig = thoughtTypeConfig[block.type || 'general'] || thoughtTypeConfig.general;
              
              return (
                <div
                  key={block.id}
                  className={`
                    p-4 rounded-2xl transition-all duration-700
                    ${isLatest 
                      ? `bg-gradient-to-br ${typeConfig.gradient} ${typeConfig.borderClass} shadow-lg` 
                      : 'bg-white/[0.02] border border-white/[0.04]'
                    }
                  `}
                  style={{ opacity }}
                >
                  {/* Thought type badge */}
                  {block.type && block.type !== 'general' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs">{typeConfig.icon}</span>
                      <span className={`text-[10px] uppercase tracking-wider ${typeConfig.textClass} font-medium`}>
                        {typeConfig.label}
                      </span>
                      {block.metadata?.tool && (
                        <span className="text-[10px] text-white/30 font-mono">
                          {block.metadata.tool}
                        </span>
                      )}
                      {block.metadata?.file && (
                        <span className="text-[10px] text-white/30 font-mono truncate max-w-32">
                          {block.metadata.file}
                        </span>
                      )}
                      {block.metadata?.promptFor && (
                        <span className="text-[10px] text-amber-400/50">
                          for {block.metadata.promptFor}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Evaluation options */}
                  {block.type === 'evaluation' && block.metadata?.options && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {block.metadata.options.map((opt, idx) => (
                        <span 
                          key={idx} 
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            opt === block.metadata?.chosen 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-white/5 text-white/30 border border-white/10'
                          }`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    block.type === 'prompt' ? 'font-mono text-amber-200/70 text-xs' : 'text-white/70'
                  }`}>
                    {block.displayedContent || block.content}
                    {(isLatest || block.isTyping) && (
                      <span className={`inline-block w-1.5 h-4 ml-1 animate-pulse ${
                        isLatest ? typeConfig.cursorClass : 'bg-white/30'
                      }`} />
                    )}
                  </p>
                  <div className="mt-2 text-[10px] text-white/20">
                    {new Date(block.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <pre className="font-mono text-[13px] leading-relaxed text-white/70 whitespace-pre w-max">
                      {currentFile.displayedContent}
                      {currentFile.isTyping && (
                        <span ref={cursorRef} className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
                      )}
                    </pre>
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
