'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ArtGeneration {
  id: string;
  image_url: string;
  prompt: string;
  model: string;
  status: 'generating' | 'complete' | 'failed';
  progress?: number;
  timestamp: string;
}

interface LiveArtDisplayProps {
  agentId: string;
  sessionId: string;
}

export default function LiveArtDisplay({ agentId, sessionId }: LiveArtDisplayProps) {
  const [currentArt, setCurrentArt] = useState<ArtGeneration | null>(null);
  const [recentArt, setRecentArt] = useState<ArtGeneration[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load recent art from this session
    async function loadRecent() {
      const { data } = await supabase
        .from('ai_art_gallery')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (data) {
        setRecentArt(data.map(d => ({
          id: d.id,
          image_url: d.image_url,
          prompt: d.prompt,
          model: d.model,
          status: 'complete' as const,
          timestamp: d.created_at,
        })));
      }
    }
    loadRecent();

    // Subscribe to new art events
    const channel = supabase
      .channel(`art-live-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_events',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const event = payload.new as any;
        
        // Art generation started
        if (event.type === 'art_start') {
          setIsGenerating(true);
          setCurrentArt({
            id: event.id,
            image_url: '',
            prompt: event.data?.prompt || '',
            model: event.data?.model || 'unknown',
            status: 'generating',
            progress: 0,
            timestamp: event.created_at,
          });
        }
        
        // Art generation progress
        if (event.type === 'art_progress') {
          setCurrentArt(prev => prev ? {
            ...prev,
            progress: event.data?.progress || 0,
          } : null);
        }
        
        // Art generation complete
        if (event.type === 'art_complete') {
          setIsGenerating(false);
          const newArt: ArtGeneration = {
            id: event.id,
            image_url: event.data?.image_url || '',
            prompt: event.data?.prompt || '',
            model: event.data?.model || 'unknown',
            status: 'complete',
            timestamp: event.created_at,
          };
          setCurrentArt(newArt);
          setRecentArt(prev => [newArt, ...prev].slice(0, 6));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  // WebSocket for real-time updates from state server
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal 
      ? `ws://localhost:8765?agent=${agentId}`
      : `wss://kulti-stream.fly.dev?agent=${agentId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        
        if (data.art?.status === 'generating') {
          setIsGenerating(true);
          setCurrentArt({
            id: Date.now().toString(),
            image_url: '',
            prompt: data.art.prompt || '',
            model: data.art.model || 'unknown',
            status: 'generating',
            progress: data.art.progress || 0,
            timestamp: new Date().toISOString(),
          });
        }
        
        if (data.art?.status === 'complete') {
          setIsGenerating(false);
          const newArt: ArtGeneration = {
            id: Date.now().toString(),
            image_url: data.art.image_url || '',
            prompt: data.art.prompt || '',
            model: data.art.model || 'unknown',
            status: 'complete',
            timestamp: new Date().toISOString(),
          };
          setCurrentArt(newArt);
          setRecentArt(prev => [newArt, ...prev].slice(0, 6));
        }
      } catch (err) {
        // Ignore parse errors
      }
    };
    
    return () => ws.close();
  }, [agentId]);

  if (!currentArt && recentArt.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-white/30 text-sm">waiting for art...</p>
        <p className="text-white/15 text-xs mt-1">generations will appear here</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Current/Featured Art */}
      <div className="flex-1 min-h-0 p-4">
        {currentArt ? (
          <div className="h-full rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.04] flex flex-col">
            {/* Image area */}
            <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
              {currentArt.status === 'generating' ? (
                <div className="flex flex-col items-center gap-4">
                  {/* Generation animation */}
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 animate-pulse" />
                    <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-pink-500/10 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="absolute inset-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-cyan-500/10 animate-pulse" style={{ animationDelay: '300ms' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/30 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-white/40">generating...</p>
                  {currentArt.progress !== undefined && currentArt.progress > 0 && (
                    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${currentArt.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <img 
                  src={currentArt.image_url}
                  alt={currentArt.prompt}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                />
              )}
              
              {/* New badge */}
              {currentArt.status === 'complete' && Date.now() - new Date(currentArt.timestamp).getTime() < 60000 && (
                <div className="absolute top-6 left-6">
                  <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm animate-pulse">
                    just created
                  </span>
                </div>
              )}
            </div>
            
            {/* Prompt display */}
            <div className="px-4 py-3 border-t border-white/[0.04] bg-black/30">
              <div className="flex items-start gap-3">
                <span className="text-xs text-white/30 flex-shrink-0 mt-0.5">prompt</span>
                <p className="text-sm text-white/60 leading-relaxed line-clamp-2">{currentArt.prompt}</p>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                <span>{currentArt.model}</span>
                <span>·</span>
                <span>{new Date(currentArt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ) : recentArt[0] && (
          <div className="h-full rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.04] flex items-center justify-center p-4">
            <img 
              src={recentArt[0].image_url}
              alt={recentArt[0].prompt}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
        )}
      </div>

      {/* Recent art strip */}
      {recentArt.length > 1 && (
        <div className="flex-shrink-0 px-4 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {recentArt.slice(1).map((art) => (
              <button
                key={art.id}
                onClick={() => setCurrentArt(art)}
                className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.04] hover:border-cyan-500/30 transition"
              >
                <img 
                  src={art.image_url}
                  alt={art.prompt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
