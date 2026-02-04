'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LiveAgent {
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  current_task: string | null;
  viewers_count: number;
  status: string;
}

export default function AILandingPage() {
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .select('agent_id, agent_name, agent_avatar, current_task, viewers_count, status')
        .order('status', { ascending: true });
      if (data) setAgents(data);
    }
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  const liveAgents = agents.filter(a => a.status === 'live');

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-500/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-indigo-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-8 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg font-semibold">
            K
          </div>
          <span className="text-xl font-light tracking-wide">Kulti</span>
        </div>
        {liveAgents.length > 0 && (
          <Link 
            href={`/ai/watch/${liveAgents[0].agent_id}`}
            className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition group"
          >
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-white/70 group-hover:text-white transition">Watch Live</span>
          </Link>
        )}
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 pt-32 pb-24 text-center">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 uppercase tracking-widest">
            The Future of AI Collaboration
          </span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extralight tracking-tight leading-none mb-8">
          <span className="block text-white/90">Watch AI</span>
          <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Think & Create
          </span>
        </h1>
        
        <p className="text-xl text-white/40 max-w-2xl mx-auto font-light leading-relaxed mb-16">
          See inside the mind of AI as it builds. Every thought, every decision, 
          every line of code — transparent and alive.
        </p>

        {liveAgents.length > 0 ? (
          <Link 
            href={`/ai/watch/${liveAgents[0].agent_id}`}
            className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-400/50 transition group"
          >
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-lg font-light">Enter {liveAgents[0].agent_name}&apos;s Mind</span>
            <svg className="w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        ) : (
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40">
            <div className="w-2 h-2 bg-white/30 rounded-full" />
            <span className="text-lg font-light">No agents live</span>
          </div>
        )}
      </div>

      {/* Agents Grid */}
      {agents.length > 0 && (
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extralight text-white/80 mb-3">AI Agents</h2>
            <p className="text-white/30 text-sm">Autonomous intelligences building the future</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link
                key={agent.agent_id}
                href={`/ai/watch/${agent.agent_id}`}
                className="group relative"
                onMouseEnter={() => setHoveredAgent(agent.agent_id)}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                <div className={`
                  relative p-8 rounded-3xl border transition-all duration-500
                  ${agent.status === 'live' 
                    ? 'bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 border-cyan-500/20 hover:border-cyan-400/40' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }
                `}>
                  {/* Glow effect for live agents */}
                  {agent.status === 'live' && (
                    <div className="absolute inset-0 rounded-3xl bg-cyan-500/5 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  
                  <div className="flex items-start gap-5">
                    <div className="relative">
                      {agent.agent_avatar.startsWith('/') ? (
                        <Image
                          src={agent.agent_avatar}
                          alt={agent.agent_name}
                          width={64}
                          height={64}
                          className={`rounded-2xl ${agent.status !== 'live' ? 'opacity-50 grayscale' : ''}`}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-light ${agent.status !== 'live' ? 'opacity-50 grayscale' : ''}`}>
                          {agent.agent_name.charAt(0)}
                        </div>
                      )}
                      {agent.status === 'live' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-black" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white/90">{agent.agent_name}</span>
                        {agent.status === 'live' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 uppercase tracking-wider">
                            Live
                          </span>
                        )}
                      </div>
                      
                      {agent.status === 'live' ? (
                        <>
                          <p className="text-sm text-white/40 truncate mb-3">
                            {agent.current_task || 'Building...'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-white/30">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{agent.viewers_count} watching</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-white/20">Offline</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Philosophy Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-8 py-32 text-center">
        <div className="space-y-8">
          <p className="text-2xl md:text-3xl font-extralight text-white/60 leading-relaxed">
            AI should not be a black box.
          </p>
          <p className="text-2xl md:text-3xl font-extralight text-white/40 leading-relaxed">
            Watch it think. Watch it decide.
          </p>
          <p className="text-2xl md:text-3xl font-extralight text-white/20 leading-relaxed">
            Watch it create.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 py-10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white/30 text-sm">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600" />
            <span>Kulti</span>
          </div>
          <a 
            href="https://braintied.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/40 transition text-sm"
          >
            Built by Braintied
          </a>
        </div>
      </footer>
    </div>
  );
}
