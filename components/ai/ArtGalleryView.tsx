'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ArtPiece {
  id: string;
  session_id: string;
  agent_id: string;
  image_url: string;
  prompt: string;
  model: string;
  created_at: string;
  likes_count: number;
  metadata?: {
    style?: string;
    iterations?: number;
    source?: string;
  };
}

interface ArtGalleryViewProps {
  agentId: string;
  sessionId?: string;
  compact?: boolean;
  maxItems?: number;
}

export default function ArtGalleryView({ 
  agentId, 
  sessionId,
  compact = false,
  maxItems = 50 
}: ArtGalleryViewProps) {
  const [artPieces, setArtPieces] = useState<ArtPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPiece, setSelectedPiece] = useState<ArtPiece | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadArt() {
      let query = supabase
        .from('ai_art_gallery')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setArtPieces(data);
      }
      setLoading(false);
    }

    loadArt();

    // Realtime subscription for new art
    const channel = supabase
      .channel(`art-${agentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_art_gallery',
        filter: `agent_id=eq.${agentId}`
      }, (payload) => {
        setArtPieces(prev => [payload.new as ArtPiece, ...prev].slice(0, maxItems));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agentId, sessionId, maxItems, supabase]);

  const handleLike = useCallback(async (pieceId: string) => {
    await supabase
      .from('ai_art_gallery')
      .update({ likes_count: artPieces.find(p => p.id === pieceId)!.likes_count + 1 })
      .eq('id', pieceId);
    
    setArtPieces(prev => prev.map(p => 
      p.id === pieceId ? { ...p, likes_count: p.likes_count + 1 } : p
    ));
  }, [artPieces, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border border-white/10 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  if (artPieces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-white/30 text-sm">no art yet</p>
        <p className="text-white/15 text-xs mt-1">creations will appear here</p>
      </div>
    );
  }

  // Compact view for sidebar
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {artPieces.slice(0, 4).map((piece) => (
          <button
            key={piece.id}
            onClick={() => setSelectedPiece(piece)}
            className="aspect-square rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04] hover:border-cyan-500/30 transition-all group"
          >
            <img 
              src={piece.image_url} 
              alt={piece.prompt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </button>
        ))}
      </div>
    );
  }

  // Full gallery view
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {artPieces.map((piece, index) => (
          <button
            key={piece.id}
            onClick={() => setSelectedPiece(piece)}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.04] hover:border-cyan-500/20 transition-all duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Image */}
            <img 
              src={piece.image_url} 
              alt={piece.prompt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
                  {piece.prompt}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {piece.likes_count}
                  </span>
                  <span>{piece.model}</span>
                </div>
              </div>
            </div>

            {/* New badge for recent art */}
            {Date.now() - new Date(piece.created_at).getTime() < 3600000 && (
              <div className="absolute top-3 left-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                  new
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPiece && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelectedPiece(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
          
          {/* Content */}
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row gap-6 z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <img 
                src={selectedPiece.image_url}
                alt={selectedPiece.prompt}
                className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
            
            {/* Details panel */}
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col">
              <div className="glass rounded-2xl p-6 flex flex-col gap-4">
                {/* Prompt */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-white/40 mb-2">Prompt</h4>
                  <p className="text-sm text-white/80 leading-relaxed">{selectedPiece.prompt}</p>
                </div>
                
                {/* Metadata */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs bg-white/[0.04] text-white/50 border border-white/[0.06]">
                    {selectedPiece.model}
                  </span>
                  {selectedPiece.metadata?.style && (
                    <span className="px-3 py-1 rounded-lg text-xs bg-white/[0.04] text-white/50 border border-white/[0.06]">
                      {selectedPiece.metadata.style}
                    </span>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
                  <button
                    onClick={() => handleLike(selectedPiece.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition text-sm"
                  >
                    <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {selectedPiece.likes_count}
                  </button>
                  <a
                    href={selectedPiece.image_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition text-sm text-white/70"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>
                
                {/* Timestamp */}
                <p className="text-xs text-white/20">
                  {new Date(selectedPiece.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setSelectedPiece(null)}
              className="absolute top-0 right-0 md:-right-12 w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition"
            >
              <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
