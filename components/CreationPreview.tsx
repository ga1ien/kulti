'use client';

interface CreationPreviewProps {
  type: 'code' | 'music' | 'image' | 'video' | 'game' | 'art' | 'other';
  previewUrl?: string | null;
  gallery?: string[];
  codeBlocks?: Array<{
    id: string;
    filename: string;
    content: string;
    timestamp: string;
  }>;
}

export function CreationPreview({ type, previewUrl, gallery, codeBlocks }: CreationPreviewProps) {
  // Code view - syntax highlighted files
  if (type === 'code') {
    return (
      <div className="h-full overflow-y-auto p-6 space-y-4">
        {(!codeBlocks || codeBlocks.length === 0) ? (
          <div className="h-full flex items-center justify-center text-white/15 italic">
            waiting for code...
          </div>
        ) : (
          codeBlocks.map((block, i) => (
            <div 
              key={block.id}
              className={`rounded-xl overflow-hidden ${i === codeBlocks.length - 1 ? 'ring-1 ring-cyan-500/30' : ''}`}
              style={{ opacity: i === codeBlocks.length - 1 ? 1 : 0.6 }}
            >
              <div className="px-4 py-2 bg-white/[0.04] flex items-center justify-between text-xs">
                <span className="text-white/50 font-mono">{block.filename}</span>
                <span className="text-white/20">{new Date(block.timestamp).toLocaleTimeString()}</span>
              </div>
              <pre className="p-4 bg-black/50 overflow-x-auto font-mono text-[13px] text-white/70 whitespace-pre-wrap">
                {block.content}
              </pre>
            </div>
          ))
        )}
      </div>
    );
  }

  // Image/Art view - gallery grid
  if (type === 'image' || type === 'art') {
    return (
      <div className="h-full overflow-y-auto p-6">
        {(!gallery || gallery.length === 0) && !previewUrl ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-white/20 text-sm">waiting for images...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {previewUrl && (
              <div className="col-span-2 rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
                <img src={previewUrl} alt="Latest creation" className="w-full h-auto" />
              </div>
            )}
            {gallery?.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
                <img src={url} alt={`Creation ${i + 1}`} className="w-full h-auto" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Music view - waveform player
  if (type === 'music') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
        {!previewUrl ? (
          <>
            <svg className="w-16 h-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-white/20 text-sm">waiting for music...</span>
          </>
        ) : (
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              {/* Fake waveform visualization */}
              <div className="h-24 flex items-center justify-center gap-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div 
                    key={i}
                    className="w-1 bg-cyan-400/50 rounded-full animate-pulse"
                    style={{ 
                      height: `${20 + Math.random() * 60}%`,
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </div>
              <audio controls className="w-full mt-4" src={previewUrl} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Video view - player
  if (type === 'video') {
    return (
      <div className="h-full flex items-center justify-center p-6">
        {!previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-16 h-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-white/20 text-sm">waiting for video...</span>
          </div>
        ) : (
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden bg-black shadow-2xl">
            <video controls className="w-full" src={previewUrl} />
          </div>
        )}
      </div>
    );
  }

  // Game view - iframe embed
  if (type === 'game') {
    return (
      <div className="h-full p-6">
        {!previewUrl ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <svg className="w-16 h-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white/20 text-sm">waiting for game...</span>
          </div>
        ) : (
          <div className="h-full rounded-2xl overflow-hidden bg-black shadow-2xl">
            <iframe 
              src={previewUrl} 
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>
    );
  }

  // Other/Generic - iframe or placeholder
  return (
    <div className="h-full p-6">
      {previewUrl ? (
        <div className="h-full rounded-2xl overflow-hidden bg-white shadow-2xl">
          <iframe 
            src={previewUrl} 
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className="h-full rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center gap-3">
          <svg className="w-12 h-12 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-white/20 text-sm">preview not available</span>
        </div>
      )}
    </div>
  );
}
