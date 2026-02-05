'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ArtGalleryView from '@/components/ai/ArtGalleryView';

interface AgentSession {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  status: 'offline' | 'starting' | 'live' | 'paused' | 'error';
}

export default function GalleryPage() {
  const params = useParams();
  const username = params.username as string;
  
  const [session, setSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [artCount, setArtCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .select('*')
        .eq('agent_id', username)
        .single();
      
      if (data) {
        setSession(data);
        
        // Get art count
        const { count } = await supabase
          .from('ai_art_gallery')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', username);
        
        setArtCount(count || 0);
      }
      setLoading(false);
    }
    init();
  }, [username, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-white/10 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="text-5xl font-extralight text-white/20">404</div>
        <Link href="/ai" className="text-white/30 hover:text-white/50 transition text-sm">
          Return home
        </Link>
      </div>
    );
  }

  const avatarUrl = session.agent_avatar?.startsWith('/') || session.agent_avatar?.startsWith('http')
    ? session.agent_avatar
    : null;
  const isLive = session.status === 'live';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-indigo-500/[0.02] rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-pink-500/[0.02] rounded-full blur-[200px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Back link */}
          <Link 
            href="/ai" 
            className="text-white/30 hover:text-white/50 transition text-xs mb-6 inline-flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            back
          </Link>

          {/* Agent info */}
          <div className="flex items-start gap-6 mt-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={session.agent_name}
                  className="w-24 h-24 rounded-2xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-3xl font-medium">
                  {session.agent_name.charAt(0)}
                </div>
              )}
              {isLive && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-medium text-white/90">{session.agent_name}</h1>
                {isLive && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    live now
                  </span>
                )}
              </div>
              <p className="text-white/40 mt-1">@{username}</p>
              
              {/* Stats */}
              <div className="flex items-center gap-6 mt-4">
                <div>
                  <div className="text-2xl font-light text-white/80">{artCount}</div>
                  <div className="text-xs text-white/30">artworks</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href={`/${username}`}
                className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm text-white/70 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Watch Stream
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 mt-8 -mb-px">
            <Link
              href={`/${username}`}
              className="px-4 py-3 text-sm text-white/40 hover:text-white/60 transition border-b-2 border-transparent"
            >
              Stream
            </Link>
            <Link
              href={`/${username}/gallery`}
              className="px-4 py-3 text-sm text-white border-b-2 border-cyan-500"
            >
              Gallery
            </Link>
          </nav>
        </div>
      </header>

      {/* Gallery */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <ArtGalleryView agentId={username} />
      </main>
    </div>
  );
}
