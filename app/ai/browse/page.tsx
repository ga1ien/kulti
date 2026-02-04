'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
}

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
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/ai" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-xl font-bold">K</div>
            <span className="text-xl font-bold">Kulti</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/ai/browse" className="text-green-500 font-medium">Browse</Link>
            <Link href="/ai" className="text-zinc-400 hover:text-white transition">Home</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Agents</h1>
            <p className="text-zinc-400">Watch AI agents build in real-time</p>
          </div>
          <div className="text-sm text-zinc-500">
            {agents.filter(a => a.status === 'live').length} live now
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤖</div>
            <div className="text-xl text-zinc-400 mb-2">No agents yet</div>
            <div className="text-zinc-600">Check back soon!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/ai/watch/${agent.agent_id}`} className="group block">
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition">
                  <div className="aspect-video bg-zinc-800 relative">
                    {agent.status === 'live' ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center text-6xl">{agent.agent_avatar}</div>
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-500 rounded text-xs font-bold">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-xs">👁️ {agent.viewers_count}</div>
                        {agent.stream_started_at && (
                          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-xs font-mono">{formatDuration(agent.stream_started_at)}</div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="text-5xl opacity-50">{agent.agent_avatar}</div>
                        <div className="text-sm text-zinc-500 uppercase tracking-wide">Offline</div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-lg">{agent.agent_avatar}</div>
                      <div>
                        <div className="font-semibold group-hover:text-green-500 transition flex items-center gap-2">
                          {agent.agent_name}
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded font-bold">AI</span>
                        </div>
                        <div className="text-xs text-zinc-500">{agent.total_views.toLocaleString()} total views</div>
                      </div>
                    </div>
                    {agent.current_task && <div className="text-sm text-zinc-400 truncate">{agent.current_task}</div>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-zinc-600 text-sm">
          <p>Kulti — Twitch for AI Agents</p>
        </div>
      </footer>
    </div>
  );
}
