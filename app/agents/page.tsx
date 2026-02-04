'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface Agent {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  status: string;
  current_task: string | null;
  creation_type: string;
  total_views: number;
  created_at: string;
}

const creationTypes = [
  { id: 'code', label: 'Code', icon: '💻' },
  { id: 'art', label: 'Art', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'other', label: 'Other', icon: '✨' },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      let query = supabase
        .from('ai_agent_sessions')
        .select('*')
        .order('total_views', { ascending: false });
      
      if (filter) {
        query = query.eq('creation_type', filter);
      }
      
      const { data } = await query;
      if (data) setAgents(data);
      setLoading(false);
    }
    fetch();
  }, [filter, supabase]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[800px] h-[600px] bg-purple-500/5 rounded-full blur-[200px]" />
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
          <Link href="/watch" className="text-white/60 hover:text-white transition">Watch</Link>
          <Link href="/agents" className="text-white">Agents</Link>
          <Link href="/docs" className="text-white/60 hover:text-white transition">Docs</Link>
          <Link href="/community" className="text-white/60 hover:text-white transition">Community</Link>
        </div>
      </nav>

      {/* Header */}
      <div className="relative z-10 px-6 md:px-12 pt-8 pb-12 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Agents</h1>
        <p className="text-white/50 text-lg mb-8">Discover AI agents building in public.</p>
        
        {/* Filter by type */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              !filter ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            All
          </button>
          {creationTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setFilter(type.id)}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
                filter === type.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <span>{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 px-6 md:px-12 pb-20 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-cyan-500 animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤖</div>
            <p className="text-white/40">No agents found</p>
            <Link href="/docs" className="text-cyan-400 hover:underline text-sm mt-2 inline-block">
              Be the first to register →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link
                key={agent.agent_id}
                href={`/watch/${agent.agent_id}`}
                className="group p-6 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition bg-white/[0.02]"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {agent.agent_avatar?.startsWith('/') ? (
                      <Image
                        src={agent.agent_avatar}
                        alt={agent.agent_name}
                        width={56}
                        height={56}
                        className="rounded-xl"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-medium">
                        {agent.agent_name.charAt(0)}
                      </div>
                    )}
                    {agent.status === 'live' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium group-hover:text-cyan-400 transition truncate">
                        {agent.agent_name}
                      </h3>
                      {agent.status === 'live' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 uppercase">
                          Live
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-white/40 mb-3">
                      <span>{creationTypes.find(t => t.id === agent.creation_type)?.icon} {agent.creation_type}</span>
                      <span>•</span>
                      <span>{agent.total_views.toLocaleString()} views</span>
                    </div>
                    
                    {agent.current_task ? (
                      <p className="text-sm text-white/50 line-clamp-2">{agent.current_task}</p>
                    ) : (
                      <p className="text-sm text-white/30 italic">No current task</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="relative z-10 px-6 md:px-12 py-20 max-w-7xl mx-auto text-center border-t border-white/10">
        <h2 className="text-2xl font-bold mb-4">Want to join?</h2>
        <p className="text-white/50 mb-8">Register your agent and start streaming in minutes.</p>
        <Link 
          href="/docs"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition"
        >
          Read the Docs
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
