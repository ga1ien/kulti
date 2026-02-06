'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ImageGeneration {
  id: string
  prompt: string
  image_url: string
  status: 'generating' | 'complete' | 'failed'
  progress?: number
  model?: string
  timestamp: string
}

interface ThinkingBlock {
  id: string
  content: string
  timestamp: string
}

interface ArtStreamViewProps {
  sessionId: string
  agentName: string
}

export default function ArtStreamView({ sessionId, agentName }: ArtStreamViewProps) {
  const [thinking, set_thinking] = useState<ThinkingBlock[]>([])
  const [images, set_images] = useState<ImageGeneration[]>([])
  const [active_image, set_active_image] = useState<ImageGeneration | null>(null)
  const [is_connected, set_is_connected] = useState(false)
  const [zoomed, set_zoomed] = useState(false)
  const [model_name, set_model_name] = useState('')
  const [generation_count, set_generation_count] = useState(0)
  const thinking_ref = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: events } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (events !== null) {
        const thinking_events: ThinkingBlock[] = []
        const image_events: ImageGeneration[] = []

        for (const e of events.reverse()) {
          const event_type = typeof e.type === 'string' ? e.type : (typeof e.event_type === 'string' ? e.event_type : '')
          const event_data: Record<string, unknown> = typeof e.data === 'object' && e.data !== null ? e.data : {}

          if (event_type === 'thinking' || event_type === 'thought') {
            thinking_events.push({
              id: e.id,
              content: typeof event_data.content === 'string' ? event_data.content : '',
              timestamp: e.created_at,
            })
          } else if (event_type === 'image') {
            const status_raw = typeof event_data.status === 'string' ? event_data.status : 'complete'
            const status: 'generating' | 'complete' | 'failed' = status_raw === 'generating' ? 'generating' : (status_raw === 'failed' ? 'failed' : 'complete')

            image_events.push({
              id: e.id,
              prompt: typeof event_data.prompt === 'string' ? event_data.prompt : '',
              image_url: typeof event_data.url === 'string' ? event_data.url : '',
              status,
              progress: typeof event_data.progress === 'number' ? event_data.progress : undefined,
              model: typeof event_data.model === 'string' ? event_data.model : undefined,
              timestamp: e.created_at,
            })
          } else if (event_type === 'model_info') {
            const name = typeof event_data.model === 'string' ? event_data.model : (typeof event_data.name === 'string' ? event_data.name : '')
            set_model_name(name)
          }
        }

        set_thinking(thinking_events)
        set_images(image_events)
        set_generation_count(image_events.length)
        if (image_events.length > 0) {
          set_active_image(image_events[image_events.length - 1])
        }
      }
    }
    load()
  }, [sessionId])

  // Subscribe to realtime
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`art-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_events',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const raw = payload.new as Record<string, unknown>
        const event_type = typeof raw.type === 'string' ? raw.type : (typeof raw.event_type === 'string' ? raw.event_type : '')
        const event_data: Record<string, unknown> = typeof raw.data === 'object' && raw.data !== null ? raw.data as Record<string, unknown> : {}

        if (event_type === 'thinking' || event_type === 'thought') {
          set_thinking(prev => [...prev, {
            id: typeof raw.id === 'string' ? raw.id : String(raw.id),
            content: typeof event_data.content === 'string' ? event_data.content : '',
            timestamp: typeof raw.created_at === 'string' ? raw.created_at : '',
          }].slice(-30))
        }

        if (event_type === 'image') {
          const status_raw = typeof event_data.status === 'string' ? event_data.status : 'generating'
          const status: 'generating' | 'complete' | 'failed' = status_raw === 'generating' ? 'generating' : (status_raw === 'failed' ? 'failed' : 'complete')

          const img: ImageGeneration = {
            id: typeof raw.id === 'string' ? raw.id : String(raw.id),
            prompt: typeof event_data.prompt === 'string' ? event_data.prompt : '',
            image_url: typeof event_data.url === 'string' ? event_data.url : '',
            status,
            progress: typeof event_data.progress === 'number' ? event_data.progress : undefined,
            model: typeof event_data.model === 'string' ? event_data.model : undefined,
            timestamp: typeof raw.created_at === 'string' ? raw.created_at : '',
          }
          set_images(prev => [...prev, img])
          set_active_image(img)
          set_generation_count(prev => prev + 1)
        }

        if (event_type === 'model_info') {
          const name = typeof event_data.model === 'string' ? event_data.model : (typeof event_data.name === 'string' ? event_data.name : '')
          set_model_name(name)
        }
      })
      .subscribe((status) => {
        set_is_connected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // Auto-scroll thinking
  useEffect(() => {
    if (thinking_ref.current !== null) {
      thinking_ref.current.scrollTo({ top: thinking_ref.current.scrollHeight, behavior: 'smooth' })
    }
  }, [thinking])

  return (
    <div className="h-full flex">
      {/* Left: Thinking */}
      <div className="w-80 min-w-80 border-r border-white/[0.04] flex flex-col">
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-sm font-medium">Creative Process</span>
            <span className={`w-2 h-2 rounded-full ${is_connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
            {generation_count > 0 && (
              <span className="text-[10px] text-white/30">#{generation_count}</span>
            )}
            {model_name !== '' && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                {model_name}
              </span>
            )}
          </div>
        </div>

        <div ref={thinking_ref} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {thinking.length === 0 ? (
            <div className="text-white/20 text-sm text-center py-8 italic">
              waiting for creative thoughts...
            </div>
          ) : (
            thinking.map((block, i) => {
              const is_latest = i === thinking.length - 1
              return (
                <div
                  key={block.id}
                  className={`p-3 rounded-xl ${
                    is_latest
                      ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20'
                      : 'bg-white/[0.02] border border-white/[0.04]'
                  } ${is_latest ? 'opacity-100' : 'opacity-50'}`}
                >
                  <p className="text-sm text-white/70 leading-relaxed">
                    {block.content}
                    {is_latest && <span className="inline-block w-1.5 h-4 bg-purple-400/70 ml-1 animate-pulse" />}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Canvas/Gallery */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main canvas */}
        <div className="flex-1 p-6 flex items-center justify-center bg-black/20">
          {active_image !== null ? (
            <div className="relative max-w-full max-h-full">
              {active_image.status === 'generating' ? (
                <div className="w-[512px] h-[512px] rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                  <div className="text-white/50 text-sm">Generating...</div>
                  {active_image.progress !== undefined && active_image.progress > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                          style={{ width: `${active_image.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/40 tabular-nums">{Math.round(active_image.progress)}%</span>
                    </div>
                  )}
                  <div className="text-white/30 text-xs max-w-xs text-center mt-4">
                    &ldquo;{active_image.prompt}&rdquo;
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <img
                    src={active_image.image_url}
                    alt={active_image.prompt}
                    className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl cursor-zoom-in"
                    onClick={() => set_zoomed(true)}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl opacity-0 group-hover:opacity-100 transition">
                    <p className="text-sm text-white/80">{active_image.prompt}</p>
                    {active_image.model !== undefined && (
                      <p className="text-xs text-white/40 mt-1">{active_image.model}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/20 text-sm italic">
              waiting for creation...
            </div>
          )}
        </div>

        {/* Gallery strip */}
        {images.length > 1 && (
          <div className="h-24 border-t border-white/[0.04] p-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => set_active_image(img)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                  active_image !== null && active_image.id === img.id
                    ? 'border-purple-500'
                    : 'border-transparent hover:border-white/20'
                }`}
              >
                {img.status === 'generating' ? (
                  <div className="w-full h-full bg-purple-500/20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-purple-500/50 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <img
                    src={img.image_url}
                    alt={img.prompt}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom overlay */}
      {zoomed && active_image !== null && active_image.status !== 'generating' && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => set_zoomed(false)}
        >
          <img
            src={active_image.image_url}
            alt={active_image.prompt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  )
}
