'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface AgentSession {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  status: 'offline' | 'starting' | 'live' | 'paused' | 'error';
  current_task: string | null;
  preview_url: string | null;
  viewers_count: number;
  files_edited: number;
  commands_run: number;
  stream_started_at: string | null;
}

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
}

interface ThinkingBlock {
  id: string;
  content: string;
  timestamp: string;
}

export default function WatchPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [session, setSession] = useState<AgentSession | null>(null);
  const [terminal, setTerminal] = useState<TerminalLine[]>([]);
  const [thinking, setThinking] = useState<ThinkingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'process' | 'creation'>('process');

  const terminalRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const handleStreamUpdate = useCallback((data: any) => {
    if (data.terminal) {
      setTerminal(prev => [...prev, ...(Array.isArray(data.terminal) ? data.terminal : [])].slice(-150));
    }
    if (data.thinking) {
      setThinking(prev => [...prev, {
        id: Date.now().toString(),
        content: data.thinking,
        timestamp: new Date().toISOString(),
      }].slice(-30));
    }
    if (data.status) setSession(prev => prev ? { ...prev, status: data.status === 'working' ? 'live' : data.status } : prev);
    if (data.task) setSession(prev => prev ? { ...prev, current_task: data.task.title } : prev);
    if (data.preview?.url) setSession(prev => prev ? { ...prev, preview_url: data.preview.url } : prev);
  }, []);

  // WebSocket
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hostname !== 'localhost') return;
    const ws = new WebSocket(`ws://localhost:8765?agent=${agentId}`);
    ws.onmessage = (e) => { try { handleStreamUpdate(JSON.parse(e.data)); } catch {} };
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
        setTerminal(events.filter(e => e.type === 'terminal').flatMap(e => e.data?.lines || []).reverse());
        setThinking(events.filter(e => e.type === 'thinking').map(e => ({
          id: e.id, content: e.data?.content || '', timestamp: e.created_at
        })).reverse());
      }
    }
    init();
  }, [agentId, supabase]);

  // Realtime
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`stream-${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_stream_events', filter: `session_id=eq.${session.id}` },
        (payload) => {
          const e = payload.new as any;
          if (e.type === 'terminal') setTerminal(prev => [...prev, ...(e.data?.lines || [])].slice(-150));
          if (e.type === 'thinking') setThinking(prev => [...prev, { id: e.id, content: e.data?.content, timestamp: e.created_at }].slice(-30));
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_agent_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as AgentSession))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, supabase]);

  // Auto-scroll
  useEffect(() => { terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' }); }, [terminal]);
  useEffect(() => { thinkingRef.current?.scrollTo({ top: thinkingRef.current.scrollHeight, behavior: 'smooth' }); }, [thinking]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border border-white/10 border-t-cyan-500 animate-spin" />
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
  const avatarUrl = agentId === 'nex' ? '/avatars/nex-v4.png' : (session.agent_avatar.startsWith('/') ? session.agent_avatar : null);

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[150px]" />
      </div>

      {/* Left Sidebar - Compact Agent Info + Stream of Consciousness */}
      <div className="w-80 flex-shrink-0 border-r border-white/[0.06] flex flex-col relative z-10">
        {/* Agent Header - Compact */}
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/ai" className="text-white/30 hover:text-white/50 transition text-xs mb-4 block">← Back</Link>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={session.agent_name} width={48} height={48} className="rounded-xl" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg font-medium">
                  {session.agent_name.charAt(0)}
                </div>
              )}
              {isLive && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white/90">{session.agent_name}</div>
              <div className="text-xs text-white/30 flex items-center gap-2">
                {isLive && <span className="text-emerald-400">Live</span>}
                <span>{session.viewers_count} watching</span>
              </div>
            </div>
          </div>
          
          {session.current_task && (
            <div className="mt-4 text-sm text-white/50 leading-relaxed">
              {session.current_task}
            </div>
          )}
        </div>

        {/* Stream of Consciousness */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Stream of Consciousness</span>
          </div>
          
          <div ref={thinkingRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {thinking.length === 0 ? (
              <div className="text-white/20 text-sm text-center py-8">Waiting for thoughts...</div>
            ) : (
              thinking.map((block, i) => {
                const isLatest = i === thinking.length - 1;
                const isRecent = i >= thinking.length - 3;
                return (
                  <div 
                    key={block.id}
                    className={`
                      p-4 rounded-2xl transition-all duration-500
                      ${isLatest 
                        ? 'bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 border border-cyan-500/20' 
                        : isRecent 
                          ? 'bg-white/[0.03] border border-white/[0.06]'
                          : 'bg-white/[0.02] border border-transparent'
                      }
                    `}
                    style={{ opacity: isLatest ? 1 : isRecent ? 0.7 : 0.4 }}
                  >
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                      {block.content.length > 400 ? block.content.slice(0, 400) + '...' : block.content}
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
      </div>

      {/* Main Content - Wide */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Tabs */}
        <div className="h-14 border-b border-white/[0.06] flex items-center justify-center gap-1 bg-black/50 backdrop-blur-xl">
          <button
            onClick={() => setActiveView('process')}
            className={`px-8 py-2 rounded-full text-sm transition ${
              activeView === 'process' 
                ? 'bg-white/10 text-white' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Process
          </button>
          <button
            onClick={() => setActiveView('creation')}
            className={`px-8 py-2 rounded-full text-sm transition ${
              activeView === 'creation' 
                ? 'bg-white/10 text-white' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Creation
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'process' ? (
            <div 
              ref={terminalRef}
              className="h-full overflow-y-auto p-8 font-mono text-[13px] leading-relaxed"
            >
              {terminal.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20">
                  Waiting for activity...
                </div>
              ) : (
                <>
                  {terminal.map((line, i) => {
                    const isRecent = i >= terminal.length - 10;
                    const isLatest = i >= terminal.length - 3;
                    return (
                      <div 
                        key={i}
                        className="py-0.5"
                        style={{ opacity: isLatest ? 1 : isRecent ? 0.7 : 0.35 }}
                      >
                        <span className={
                          line.type === 'command' ? 'text-cyan-400' :
                          line.type === 'error' ? 'text-red-400' :
                          line.type === 'success' ? 'text-emerald-400' :
                          line.type === 'info' ? 'text-amber-300/80' :
                          'text-white/60'
                        }>
                          {line.content}
                        </span>
                      </div>
                    );
                  })}
                  <div className="h-8 flex items-center">
                    <span className="w-2 h-5 bg-cyan-400 animate-pulse" />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full p-6">
              {session.preview_url ? (
                <div className="h-full rounded-2xl overflow-hidden bg-white shadow-2xl shadow-black/50">
                  <iframe
                    src={session.preview_url}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : (
                <div className="h-full rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                    <div className="text-white/30 text-sm">Preparing workspace...</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
