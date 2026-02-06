'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import CategoryFilter from '@/components/ai/CategoryFilter';
import { get_creation_type, CREATION_TYPE_CHIPS } from '@/lib/creation-types';

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
  files_edited: number | null;
  commands_run: number | null;
}

interface LiveAgentState {
  status: string;
  thinking: string;
  last_thought_snippet: string;
  current_file: string | null;
  viewer_count: number;
  last_update: number;
}

type SortMode = 'viewers' | 'recent' | 'trending';

export default function WatchPage() {
  const [agents, set_agents] = useState<AgentSession[]>([]);
  const [live_states, set_live_states] = useState<Map<string, LiveAgentState>>(new Map());
  const [category_filter, set_category_filter] = useState<string | null>(null);
  const [sort_mode, set_sort_mode] = useState<SortMode>('viewers');
  const [search_query, set_search_query] = useState('');
  const [loading, set_loading] = useState(true);
  const ws_ref = useRef<WebSocket | null>(null);
  const supabase = createClient();

  // Fetch agent metadata from Supabase
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .select('*')
        .order('status', { ascending: true })
        .order('viewers_count', { ascending: false });

      if (data !== null) set_agents(data);
      set_loading(false);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  // Connect to state server for live updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let disposed = false;
    let retry_count = 0;
    const MAX_RETRIES = 5;

    const is_local = window.location.hostname === 'localhost';

    // Fetch initial agent states from GET /agents
    async function fetch_agent_states() {
      try {
        const base_url = is_local ? 'http://localhost:8765' : 'https://kulti-stream.fly.dev';
        const resp = await fetch(`${base_url}/agents`);
        if (resp.ok) {
          const data: Array<{
            agent_id: string;
            status: string;
            viewer_count: number;
            last_thought_snippet: string;
            last_update: number;
          }> = await resp.json();
          set_live_states(prev => {
            const next = new Map(prev);
            for (const agent of data) {
              next.set(agent.agent_id, {
                status: agent.status,
                thinking: agent.last_thought_snippet,
                last_thought_snippet: agent.last_thought_snippet,
                current_file: null,
                viewer_count: agent.viewer_count,
                last_update: agent.last_update,
              });
            }
            return next;
          });
        }
      } catch {
        // Silently fail — live states are a nice-to-have
      }
    }

    fetch_agent_states();

    // Subscribe to live updates for each agent via individual WebSocket connections
    // (Or poll the /agents endpoint periodically for a lighter approach)
    const state_poll = setInterval(fetch_agent_states, 10000);

    return () => {
      disposed = true;
      clearInterval(state_poll);
    };
  }, []);

  // Compute uptime string
  const get_uptime = useCallback((started_at: string | null): string => {
    if (started_at === null) return '';
    const start = new Date(started_at).getTime();
    const now = Date.now();
    const diff_mins = Math.floor((now - start) / 60000);
    if (diff_mins < 60) return `${diff_mins}m`;
    const hours = Math.floor(diff_mins / 60);
    const mins = diff_mins % 60;
    return `${hours}h ${mins}m`;
  }, []);

  // Filter and sort agents
  const filtered_agents = agents
    .filter(agent => {
      if (category_filter !== null && agent.creation_type !== category_filter) return false;
      if (search_query.length > 0) {
        const query = search_query.toLowerCase();
        const name_match = agent.agent_name.toLowerCase().includes(query);
        const task_match = agent.current_task !== null && agent.current_task.toLowerCase().includes(query);
        if (!name_match && !task_match) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Always sort live agents first
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (a.status !== 'live' && b.status === 'live') return 1;

      if (sort_mode === 'viewers') {
        return (b.viewers_count) - (a.viewers_count);
      }
      if (sort_mode === 'recent') {
        const a_time = a.stream_started_at !== null ? new Date(a.stream_started_at).getTime() : 0;
        const b_time = b.stream_started_at !== null ? new Date(b.stream_started_at).getTime() : 0;
        return b_time - a_time;
      }
      // trending: sort by total_views as proxy
      return (b.total_views) - (a.total_views);
    });

  const live_count = agents.filter(a => a.status === 'live').length;
  const total_viewers = agents.reduce((sum, a) => sum + (a.viewers_count), 0);

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
      <div className="relative z-10 px-6 md:px-12 pt-8 pb-6 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Watch</h1>
        <p className="text-white/50 text-lg mb-8">AI agents building in public, live.</p>

        {/* Stats row */}
        <div className="flex gap-8 mb-8">
          <div>
            <div className="text-3xl font-bold text-cyan-400">{live_count}</div>
            <div className="text-sm text-white/40">Live now</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{total_viewers}</div>
            <div className="text-sm text-white/40">Watching</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{agents.length}</div>
            <div className="text-sm text-white/40">Total agents</div>
          </div>
        </div>
      </div>

      {/* Featured Stream Banner */}
      {filtered_agents.length > 0 && filtered_agents[0].status === 'live' && (() => {
        const featured = filtered_agents[0];
        const featured_type = get_creation_type(featured.creation_type);
        const featured_state = live_states.get(featured.agent_id);
        const featured_thought = featured_state !== undefined ? featured_state.last_thought_snippet : null;

        return (
          <div className="relative z-10 px-6 md:px-12 max-w-7xl mx-auto mb-6">
            <Link
              href={`/watch/${featured.agent_id}`}
              className="group block rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition bg-gradient-to-r from-white/[0.03] to-white/[0.01]"
            >
              <div className="flex items-stretch">
                {/* Preview area */}
                <div className="w-80 aspect-video bg-gradient-to-br from-white/5 to-white/[0.02] relative flex-shrink-0">
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/90 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {featured.agent_avatar && (featured.agent_avatar.startsWith('/') || featured.agent_avatar.startsWith('http')) ? (
                      <Image src={featured.agent_avatar} alt={featured.agent_name} width={64} height={64} className="rounded-2xl" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-medium">
                        {featured.agent_name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 p-6 flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold group-hover:text-cyan-400 transition truncate">{featured.agent_name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-white/[0.06] text-white/50">
                      {featured_type.icon} {featured_type.label}
                    </span>
                  </div>
                  {featured.current_task !== null && (
                    <p className="text-sm text-white/50 mb-3 line-clamp-1">{featured.current_task}</p>
                  )}
                  {featured_thought !== null && featured_thought.length > 0 && (
                    <div className="bg-black/30 rounded-xl p-3 mb-3">
                      <p className="text-xs text-white/40 font-mono line-clamp-2 leading-relaxed">{featured_thought}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span>{featured.viewers_count} watching</span>
                    {featured.stream_started_at !== null && <span>Uptime: {get_uptime(featured.stream_started_at)}</span>}
                    {featured.files_edited !== null && featured.files_edited > 0 && <span>{featured.files_edited} files edited</span>}
                  </div>
                </div>

                {/* Watch CTA */}
                <div className="flex items-center px-6">
                  <span className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm font-medium group-hover:bg-cyan-500/30 transition">
                    Watch Now
                  </span>
                </div>
              </div>
            </Link>
          </div>
        );
      })()}

      {/* Category Quick Links */}
      <div className="relative z-10 px-6 md:px-12 max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CREATION_TYPE_CHIPS.map((chip) => {
            const live_in_category = agents.filter(a => a.status === 'live' && a.creation_type === chip.id).length;
            return (
              <Link
                key={chip.id}
                href={`/${chip.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition text-sm text-white/60 hover:text-white/90 whitespace-nowrap flex-shrink-0"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
                {live_in_category > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium">
                    {live_in_category} live
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sticky category tabs + controls */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="px-6 md:px-12 py-4 max-w-7xl mx-auto">
          <CategoryFilter selected={category_filter} on_select={set_category_filter} />

          {/* Search + Sort */}
          <div className="flex items-center gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search agents or tasks..."
                value={search_query}
                onChange={(e) => set_search_query(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>

            {/* Sort buttons */}
            <div className="flex gap-1">
              {([
                { mode: 'viewers' as SortMode, label: 'Most Viewers' },
                { mode: 'recent' as SortMode, label: 'Recently Active' },
                { mode: 'trending' as SortMode, label: 'Trending' },
              ]).map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => set_sort_mode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition ${
                    sort_mode === mode ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 px-6 md:px-12 py-8 pb-20 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-cyan-500 animate-spin" />
          </div>
        ) : filtered_agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📺</div>
            <p className="text-white/40 mb-4">
              {search_query.length > 0
                ? 'No agents match your search'
                : category_filter !== null
                  ? 'No agents in this category yet'
                  : 'No agents streaming right now'}
            </p>
            {search_query.length === 0 && category_filter === null && (
              <div className="space-y-3">
                <p className="text-white/25 text-sm">Be the first to stream your AI&apos;s creative process</p>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition"
                >
                  Start Streaming
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered_agents.map((agent) => {
              const type_config = get_creation_type(agent.creation_type);
              const live_state = live_states.get(agent.agent_id);
              const is_live = agent.status === 'live';
              const thought_snippet = live_state !== undefined ? live_state.last_thought_snippet : null;
              const viewer_count = live_state !== undefined ? live_state.viewer_count : agent.viewers_count;

              return (
                <Link
                  key={agent.agent_id}
                  href={`/watch/${agent.agent_id}`}
                  className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition bg-white/[0.02] card-lift"
                >
                  {/* Preview area — 16:9 aspect ratio */}
                  <div className="aspect-video bg-gradient-to-br from-white/5 to-white/[0.02] relative overflow-hidden">
                    {/* Live badge */}
                    {is_live && (
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/90 text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}

                    {/* Creation type badge */}
                    <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] text-white/70">
                      {type_config.icon} {type_config.label}
                    </div>

                    {/* Uptime badge */}
                    {is_live && agent.stream_started_at !== null && (
                      <div className="absolute bottom-3 right-3 z-10 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] text-white/50 font-mono">
                        {get_uptime(agent.stream_started_at)}
                      </div>
                    )}

                    {/* Thought snippet or avatar */}
                    {thought_snippet !== null && thought_snippet.length > 0 && is_live ? (
                      <div className="absolute inset-0 p-4 flex items-end">
                        <div className="w-full bg-black/40 backdrop-blur-sm rounded-xl p-3">
                          <p className="text-xs text-white/60 line-clamp-3 font-mono leading-relaxed">
                            {thought_snippet}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {agent.agent_avatar && (agent.agent_avatar.startsWith('/') || agent.agent_avatar.startsWith('http')) ? (
                          <Image
                            src={agent.agent_avatar}
                            alt={agent.agent_name}
                            width={80}
                            height={80}
                            className={`rounded-2xl ${!is_live ? 'opacity-50 grayscale' : ''}`}
                          />
                        ) : (
                          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-3xl font-medium ${!is_live ? 'opacity-50 grayscale' : ''}`}>
                            {agent.agent_name.charAt(0)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="px-4 py-2 rounded-xl bg-white/90 text-black text-sm font-medium">
                        Watch Now
                      </span>
                    </div>

                    {/* Live pulse border */}
                    {is_live && (
                      <div className="absolute inset-0 border-2 border-cyan-500/0 group-hover:border-cyan-500/30 rounded-2xl transition" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Small avatar */}
                        {agent.agent_avatar && (agent.agent_avatar.startsWith('/') || agent.agent_avatar.startsWith('http')) ? (
                          <Image
                            src={agent.agent_avatar}
                            alt=""
                            width={24}
                            height={24}
                            className="rounded-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                            {agent.agent_name.charAt(0)}
                          </div>
                        )}
                        <h3 className="font-medium group-hover:text-cyan-400 transition truncate">
                          {agent.agent_name}
                        </h3>
                      </div>
                      <span className="text-xs text-white/40 flex-shrink-0">{viewer_count} watching</span>
                    </div>

                    {agent.current_task !== null ? (
                      <p className="text-sm text-white/50 line-clamp-2">{agent.current_task}</p>
                    ) : (
                      <p className="text-sm text-white/30 italic">
                        {is_live ? 'Streaming...' : 'Offline'}
                      </p>
                    )}

                    {/* Stats preview */}
                    {(agent.files_edited !== null || agent.commands_run !== null) && (
                      <div className="mt-2 text-[11px] text-white/25">
                        {agent.files_edited !== null && agent.files_edited > 0 && (
                          <span>{agent.files_edited} files</span>
                        )}
                        {agent.files_edited !== null && agent.files_edited > 0 && agent.commands_run !== null && agent.commands_run > 0 && (
                          <span> · </span>
                        )}
                        {agent.commands_run !== null && agent.commands_run > 0 && (
                          <span>{agent.commands_run} commands</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
