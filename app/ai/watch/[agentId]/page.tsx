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
  const [activeView, setActiveView] = useState<'mind' | 'creation'>('mind');

  const terminalRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Handle updates
  const handleStreamUpdate = useCallback((data: any) => {
    if (data.terminal) {
      setTerminal(prev => [...prev, ...(Array.isArray(data.terminal) ? data.terminal : [])].slice(-100));
    }
    if (data.thinking) {
      setThinking(prev => [...prev, {
        id: Date.now().toString(),
        content: data.thinking,
        timestamp: new Date().toISOString(),
      }].slice(-20));
    }
    if (data.status) {
      setSession(prev => prev ? { ...prev, status: data.status === 'working' ? 'live' : data.status } : prev);
    }
    if (data.task) {
      setSession(prev => prev ? { ...prev, current_task: data.task.title } : prev);
    }
    if (data.preview?.url) {
      setSession(prev => prev ? { ...prev, preview_url: data.preview.url } : prev);
    }
  }, []);

  // WebSocket (local)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isLocal = window.location.hostname === 'localhost';
    if (!isLocal) return;

    const ws = new WebSocket(`ws://localhost:8765?agent=${agentId}`);
    ws.onmessage = (e) => {
      try { handleStreamUpdate(JSON.parse(e.data)); } catch {}
    };
    return () => ws.close();
  }, [agentId, handleStreamUpdate]);

  // Fetch + Realtime
  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (!data) {
        setError('Agent not found');
        setLoading(false);
        return;
      }

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

  // Realtime subscription
  useEffect(() => {
    if (!session) return;
    
    const channel = supabase
      .channel(`stream-${session.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'ai_stream_events', filter: `session_id=eq.${session.id}` },
        (payload) => {
          const e = payload.new as any;
          if (e.type === 'terminal') setTerminal(prev => [...prev, ...(e.data?.lines || [])].slice(-100));
          if (e.type === 'thinking') setThinking(prev => [...prev, { id: e.id, content: e.data?.content, timestamp: e.created_at }].slice(-20));
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_agent_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as AgentSession)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id, supabase]);

  // Auto-scroll
  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
  }, [terminal]);
  
  useEffect(() => {
    thinkingRef.current?.scrollTo({ top: thinkingRef.current.scrollHeight, behavior: 'smooth' });
  }, [thinking]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border border-white/10" />
          <div className="absolute inset-0 w-24 h-24 rounded-full border-t border-cyan-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-8">
        <div className="text-6xl font-light text-white/20">404</div>
        <Link href="/ai" className="text-white/40 hover:text-white transition">Return home</Link>
      </div>
    );
  }

  const isLive = session.status === 'live';
  const avatarUrl = agentId === 'nex' ? '/avatars/nex-avatar.png' : null;
  const latestThought = thinking[thinking.length - 1]?.content || '';

  return (
    <div className="h-screen bg-black text-white overflow-hidden relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '12s' }} />
        {isLive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/3 rounded-full blur-[200px]" />}
      </div>

      {/* Navigation - Minimal */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between">
        <Link href="/ai" className="text-white/30 hover:text-white/60 transition text-sm tracking-wide">
          ← Back
        </Link>
        
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/60 uppercase tracking-wider">Live</span>
            </div>
          )}
          <div className="px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs text-white/40">
            {session.viewers_count} watching
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative h-full flex">
        {/* Left Side - The Mind */}
        <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 relative">
          {/* Agent Presence */}
          <div className="absolute top-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={session.agent_name}
                  width={120}
                  height={120}
                  className="rounded-3xl shadow-2xl shadow-cyan-500/20"
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-4xl font-light shadow-2xl shadow-cyan-500/20">
                  {session.agent_name.charAt(0)}
                </div>
              )}
              {isLive && (
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 blur-xl -z-10 animate-pulse" />
              )}
            </div>
            <div className="text-center">
              <div className="text-2xl font-light tracking-wide">{session.agent_name}</div>
              <div className="text-white/30 text-sm mt-1">{isLive ? 'Building' : 'Offline'}</div>
            </div>
          </div>

          {/* Current Task - Floating */}
          {session.current_task && (
            <div className="absolute top-64 mt-32 left-1/2 -translate-x-1/2 max-w-md text-center">
              <div className="text-white/20 text-xs uppercase tracking-widest mb-3">Current Focus</div>
              <div className="text-xl font-light text-white/80 leading-relaxed">
                {session.current_task}
              </div>
            </div>
          )}

          {/* Thinking Stream - The Mind */}
          <div 
            ref={thinkingRef}
            className="absolute bottom-12 left-12 right-12 max-h-[40vh] overflow-y-auto scrollbar-hide"
          >
            <div className="space-y-6">
              {thinking.slice(-5).map((block, i) => (
                <div 
                  key={block.id}
                  className="relative"
                  style={{ 
                    opacity: 0.3 + (i / 5) * 0.7,
                    transform: `scale(${0.9 + (i / 5) * 0.1})`,
                  }}
                >
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/5">
                    <p className="text-white/70 text-sm leading-relaxed font-light">
                      {block.content.length > 300 ? block.content.slice(0, 300) + '...' : block.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* Right Side - The Creation */}
        <div className="w-1/2 h-full flex flex-col relative">
          {/* View Toggle */}
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10 flex gap-1 p-1 rounded-full bg-white/5 backdrop-blur-xl border border-white/10">
            <button
              onClick={() => setActiveView('mind')}
              className={`px-6 py-2 rounded-full text-xs uppercase tracking-wider transition ${
                activeView === 'mind' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Process
            </button>
            <button
              onClick={() => setActiveView('creation')}
              className={`px-6 py-2 rounded-full text-xs uppercase tracking-wider transition ${
                activeView === 'creation' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Creation
            </button>
          </div>

          {activeView === 'mind' ? (
            /* Code Stream */
            <div className="flex-1 pt-48 pb-12 px-12 overflow-hidden">
              <div 
                ref={terminalRef}
                className="h-full overflow-y-auto scrollbar-hide font-mono text-sm"
              >
                {terminal.map((line, i) => (
                  <div 
                    key={i}
                    className={`py-1 transition-all ${
                      i === terminal.length - 1 ? 'opacity-100' : 
                      i >= terminal.length - 5 ? 'opacity-60' : 'opacity-30'
                    }`}
                  >
                    <span className={
                      line.type === 'command' ? 'text-cyan-400' :
                      line.type === 'error' ? 'text-red-400' :
                      line.type === 'success' ? 'text-emerald-400' :
                      line.type === 'info' ? 'text-amber-400/80' :
                      'text-white/50'
                    }>
                      {line.content}
                    </span>
                  </div>
                ))}
                <div className="h-8 flex items-center">
                  <div className="w-2 h-4 bg-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
            /* Preview */
            <div className="flex-1 pt-48 pb-12 px-12">
              {session.preview_url ? (
                <div className="h-full rounded-3xl overflow-hidden bg-white shadow-2xl shadow-black/50">
                  <iframe
                    src={session.preview_url}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : (
                <div className="h-full rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                    <div className="text-white/30 text-sm">Preparing workspace...</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
}
