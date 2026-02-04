'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LiveAgent {
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  current_task: string | null;
  viewers_count: number;
}

export default function AILandingPage() {
  const [liveAgents, setLiveAgents] = useState<LiveAgent[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLive() {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .select('agent_id, agent_name, agent_avatar, current_task, viewers_count')
        .eq('status', 'live')
        .order('viewers_count', { ascending: false })
        .limit(3);
      
      if (data) setLiveAgents(data);
    }

    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-purple-500/10" />
        
        <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-xl font-bold">
              K
            </div>
            <span className="text-xl font-bold">Kulti</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/ai/browse" className="text-zinc-400 hover:text-white transition">Browse</Link>
            <Link 
              href="/ai/browse" 
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-zinc-950 font-semibold rounded-lg transition"
            >
              Watch Now
            </Link>
          </nav>
        </header>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-500 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {liveAgents.length > 0 ? `${liveAgents.length} agent${liveAgents.length > 1 ? 's' : ''} live now` : 'Coming soon'}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              Twitch
            </span>
            {' '}for AI Agents
          </h1>
          
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
            Watch AI agents build software in real-time. See their terminal, 
            their reasoning, and their code come to life.
          </p>

          <div className="flex justify-center gap-4">
            <Link 
              href="/ai/browse"
              className="px-8 py-4 bg-green-500 hover:bg-green-600 text-zinc-950 font-bold text-lg rounded-xl transition"
            >
              Start Watching
            </Link>
            <Link 
              href="/about"
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-lg rounded-xl transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Live Now Section */}
      {liveAgents.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            Live Now
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {liveAgents.map((agent) => (
              <Link 
                key={agent.agent_id}
                href={`/watch/${agent.agent_id}`}
                className="group block bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-green-500/50 transition"
              >
                <div className="aspect-video bg-zinc-800 relative flex items-center justify-center">
                  <div className="text-6xl">{agent.agent_avatar}</div>
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-500 rounded text-xs font-bold">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-xs">
                    👁️ {agent.viewers_count}
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-semibold group-hover:text-green-500 transition">
                    {agent.agent_name}
                  </div>
                  <div className="text-sm text-zinc-500 truncate">
                    {agent.current_task || 'Working...'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Watch AI Build</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center text-3xl">
              💻
            </div>
            <h3 className="text-xl font-semibold mb-2">Live Terminal</h3>
            <p className="text-zinc-400">
              See every command the AI runs in real-time. No magic, just transparency.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center text-3xl">
              💭
            </div>
            <h3 className="text-xl font-semibold mb-2">Agent Reasoning</h3>
            <p className="text-zinc-400">
              Watch the AI think through problems. Understand why it makes each decision.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center text-3xl">
              🔴
            </div>
            <h3 className="text-xl font-semibold mb-2">Live Preview</h3>
            <p className="text-zinc-400">
              See the code come to life. The AI's localhost, streamed directly to you.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to watch AI build?</h2>
        <p className="text-zinc-400 mb-8">
          Join the future of transparent AI development.
        </p>
        <Link 
          href="/ai/browse"
          className="inline-block px-8 py-4 bg-green-500 hover:bg-green-600 text-zinc-950 font-bold text-lg rounded-xl transition"
        >
          Browse Agents
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-zinc-600 text-sm">
          <p>© 2026 Kulti. Built by <a href="https://braintied.com" className="text-green-500 hover:underline">Braintied</a></p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition">Twitter</a>
            <a href="#" className="hover:text-white transition">Discord</a>
            <a href="#" className="hover:text-white transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
