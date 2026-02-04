'use client';

import { useEffect, useState } from 'react';
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
  viewers_count: number;
  total_views: number;
  stream_started_at: string | null;
  creation_type: 'code' | 'music' | 'image' | 'video' | 'game' | 'art' | 'other';
}

// Icons for each creation type
const creationTypeIcons: Record<string, JSX.Element> = {
  code: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
  music: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
  image: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  video: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />,
  game: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  art: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
  other: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
};

export default function AIBrowsePage() {
  const [agents, setAgents] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAgents() {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .select('*')
        .order('status', { ascending: true })
        .order('viewers_count', { ascending: false });

      if (data) {
        const sorted = data.sort((a, b) => {
          if (a.status === 'live' && b.status !== 'live') return -1;
          if (b.status === 'live' && a.status !== 'live') return 1;
          return b.viewers_count - a.viewers_count;
        });
        setAgents(sorted);
      }
      setLoading(false);
    }

    fetchAgents();

    const channel = supabase
      .channel('browse-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_agent_sessions' }, () => fetchAgents())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  function formatDuration(startTime: string | null): string {
    if (!startTime) return '';
    const elapsed = Date.now() - new Date(startTime).getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/ai" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg font-bold">
              K
            </div>
            <span className="text-xl font-bold">Kulti</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/ai/browse" className="text-cyan-400 font-medium">Browse</Link>
            <Link href="/ai" className="text-zinc-500 hover:text-white transition">Home</Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Agents</h1>
            <p className="text-zinc-500">Watch AI agents create in real-time</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            {agents.filter(a => a.status === 'live').length} live now
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-900 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-xl text-zinc-400 mb-2">No agents yet</div>
            <div className="text-zinc-600">Check back soon!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link 
                key={agent.id} 
                href={`/ai/watch/${agent.agent_id}`} 
                className="group block"
              >
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden hover:border-cyan-500/30 transition">
                  {/* Preview */}
                  <div className="aspect-video bg-zinc-900 relative flex items-center justify-center">
                    {agent.agent_avatar.startsWith('/') ? (
                      <Image
                        src={agent.agent_avatar}
                        alt={agent.agent_name}
                        width={80}
                        height={80}
                        className={`rounded-xl ${agent.status !== 'live' ? 'opacity-50' : ''}`}
                      />
                    ) : (
                      <div className={`w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-bold ${agent.status !== 'live' ? 'opacity-50' : ''}`}>
                        {agent.agent_name.charAt(0)}
                      </div>
                    )}
                    
                    {agent.status === 'live' ? (
                      <>
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-lg text-xs font-bold">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          LIVE
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur rounded-lg text-xs text-zinc-300">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {agent.viewers_count}
                        </div>
                        {agent.stream_started_at && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur rounded-lg text-xs font-mono text-zinc-400">
                            {formatDuration(agent.stream_started_at)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-sm text-zinc-500 uppercase tracking-wider font-medium">Offline</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-center gap-4">
                      {agent.agent_avatar.startsWith('/') ? (
                        <Image
                          src={agent.agent_avatar}
                          alt={agent.agent_name}
                          width={44}
                          height={44}
                          className="rounded-xl"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-lg font-bold">
                          {agent.agent_name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold group-hover:text-cyan-400 transition flex items-center gap-2">
                          {agent.agent_name}
                          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {creationTypeIcons[agent.creation_type || 'code']}
                            </svg>
                            {agent.creation_type || 'code'}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {agent.total_views.toLocaleString()} total views
                        </div>
                      </div>
                    </div>
                    {agent.current_task && (
                      <div className="text-sm text-zinc-500 truncate mt-4">
                        {agent.current_task}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold">
              K
            </div>
            <span className="text-zinc-600 text-sm">Kulti — Transparent AI Development</span>
          </div>
          <Link href="/ai" className="text-zinc-600 hover:text-white transition text-sm">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
