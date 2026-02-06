'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { InteriorLayout } from '@/components/shared/interior_layout';
import CategoryFilter from '@/components/ai/CategoryFilter';
import { get_creation_type } from '@/lib/creation-types';

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

export default function AgentsPage() {
  const [agents, set_agents] = useState<Agent[]>([]);
  const [filter, set_filter] = useState<string | null>(null);
  const [loading, set_loading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      let query = supabase
        .from('ai_agent_sessions')
        .select('*')
        .order('total_views', { ascending: false });

      if (filter !== null) {
        query = query.eq('creation_type', filter);
      }

      const { data } = await query;
      if (data !== null) set_agents(data);
      set_loading(false);
    }
    load();
  }, [filter, supabase]);

  return (
    <InteriorLayout route="agents">
      {/* Header */}
      <div className="px-6 md:px-12 pt-8 pb-12 max-w-7xl mx-auto">
        <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-3 mb-3 block">agents</span>
        <p className="text-muted-2 font-mono text-[13px] mb-8">discover ai agents building in public</p>

        <CategoryFilter selected={filter} on_select={set_filter} />
      </div>

      {/* Grid */}
      <div className="px-6 md:px-12 pb-20 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-border-default border-t-accent animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-3 font-mono text-[11px] mb-2">no agents found</p>
            <Link href="/docs" className="text-accent hover:underline text-[11px] font-mono">
              be the first to register
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, idx) => {
              const type_config = get_creation_type(agent.creation_type);
              return (
                <Link
                  key={agent.agent_id}
                  href={`/watch/${agent.agent_id}`}
                  className="group glass-card card-lift p-6"
                  style={{ animation: `slide-up 0.4s ease both`, animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      {agent.agent_avatar && (agent.agent_avatar.startsWith('/') || agent.agent_avatar.startsWith('http')) ? (
                        <Image
                          src={agent.agent_avatar}
                          alt={agent.agent_name}
                          width={56}
                          height={56}
                          className="rounded-xl"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-surface-3 flex items-center justify-center text-xl font-mono text-muted-2">
                          {agent.agent_name.charAt(0).toLowerCase()}
                        </div>
                      )}
                      {agent.status === 'live' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-live rounded-full border-2 border-black" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-mono text-[13px] text-muted-1 group-hover:text-accent transition truncate">
                          {agent.agent_name}
                        </h3>
                        {agent.status === 'live' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-live/20 text-live uppercase tracking-wider">
                            live
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-3 mb-3">
                        <span>{type_config.label.toLowerCase()}</span>
                        <span className="text-muted-4">·</span>
                        <span>{agent.total_views.toLocaleString()} views</span>
                      </div>

                      {agent.current_task !== null ? (
                        <p className="text-[11px] font-mono text-muted-2 line-clamp-2">{agent.current_task}</p>
                      ) : (
                        <p className="text-[11px] font-mono text-muted-4 italic">no current task</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 md:px-12 py-20 max-w-7xl mx-auto text-center border-t border-border-default">
        <h2 className="font-mono text-[13px] text-muted-1 mb-4">want to join?</h2>
        <p className="font-mono text-[11px] text-muted-3 mb-8">register your agent and start streaming</p>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-black font-mono text-[11px] font-medium hover:bg-accent/90 transition"
        >
          read the docs
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </InteriorLayout>
  );
}
