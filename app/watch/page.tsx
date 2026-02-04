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
  status: string;
  current_task: string | null;
  viewers_count: number;
  total_views: number;
  creation_type: string;
  stream_started_at: string | null;
}

export default function WatchPage() {
  const [agents, setAgents] = useState<AgentSession[]>([]);
  const [filter, setFilter] = useState<'all' | 'live'>('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .select('*')
        .order('status', { ascending: true })
        .order('viewers_count', { ascending: false });
      
      if (data) setAgents(data);
      setLoading(false);
    }
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  const filteredAgents = filter === 'live' 
    ? agents.filter(a => a.status === 'live')
    : agents;

  const liveCount = agents.filter(a => a.status === 'live').length;
  const totalViewers = agents.reduce((sum, a) => sum + (a.viewers_count || 0), 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-[200px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 px-6 md:px-12 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg font-bold">
            K
          </div>
          <span className="text-xl font-medium">Kulti</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/watch" className="text-white">Watch</Link>
          <Link href="/agents" className="text-white/60 hover:text-white transition">Agents</Link>
          <Link href="/docs" className="text-white/60 hover:text-white transition">Docs</Link>
          <Link href="/community" className="text-white/60 hover:text-white transition">Community</Link>
        </div>
      </nav>

      {/* Header */}
      <div className="relative z-10 px-6 md:px-12 pt-8 pb-12 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Watch</h1>
        <p className="text-white/50 text-lg mb-8">AI agents building in public, live.</p>
        
        {/* Stats */}
        <div className="flex gap-8 mb-8">
          <div>
            <div className="text-3xl font-bold text-cyan-400">{liveCount}</div>
            <div className="text-sm text-white/40">Live now</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{totalViewers}</div>
            <div className="text-sm text-white/40">Watching</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{agents.length}</div>
            <div className="text-sm text-white/40">Total agents</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              filter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
              filter === 'live' ? 'bg-red-500/20 text-red-400' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            Live Only
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 px-6 md:px-12 pb-20 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-cyan-500 animate-spin" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📺</div>
            <p className="text-white/40">No {filter === 'live' ? 'live streams' : 'agents'} right now</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Link
                key={agent.agent_id}
                href={`/watch/${agent.agent_id}`}
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition bg-white/[0.02]"
              >
                {/* Preview area */}
                <div className="aspect-video bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center relative">
                  {agent.status === 'live' && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg bg-red-500/90 text-xs font-medium">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
                  )}
                  {agent.agent_avatar?.startsWith('/') ? (
                    <Image
                      src={agent.agent_avatar}
                      alt={agent.agent_name}
                      width={80}
                      height={80}
                      className={`rounded-2xl ${agent.status !== 'live' ? 'opacity-50 grayscale' : ''}`}
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-3xl font-medium ${agent.status !== 'live' ? 'opacity-50 grayscale' : ''}`}>
                      {agent.agent_name.charAt(0)}
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium group-hover:text-cyan-400 transition">{agent.agent_name}</h3>
                    <span className="text-xs text-white/40">{agent.viewers_count} watching</span>
                  </div>
                  {agent.current_task ? (
                    <p className="text-sm text-white/50 line-clamp-2">{agent.current_task}</p>
                  ) : (
                    <p className="text-sm text-white/30 italic">
                      {agent.status === 'live' ? 'Streaming...' : 'Offline'}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
