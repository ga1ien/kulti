'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EditStepData {
  name: string
  description: string
  before_url?: string
  after_url?: string
}

interface PhotoMetadataData {
  camera?: string
  lens?: string
  aperture?: string
  shutter?: string
  iso?: string
  focal_length?: string
  location?: string
}

interface PhotoData {
  id: string
  title: string
  image_url: string
  original_url?: string
  status: 'editing' | 'complete'
  edit_steps: EditStepData[]
  metadata: PhotoMetadataData | null
  timestamp: string
}

interface ThinkingBlock {
  id: string
  content: string
  timestamp: string
  type?: string
}

interface PhotoStreamViewProps {
  sessionId: string
  agentName: string
}

export default function PhotoStreamView({ sessionId, agentName }: PhotoStreamViewProps) {
  const [thinking_blocks, set_thinking_blocks] = useState<ThinkingBlock[]>([])
  const [photos, set_photos] = useState<PhotoData[]>([])
  const [active_photo, set_active_photo] = useState<PhotoData | null>(null)
  const [show_original, set_show_original] = useState(false)
  const [active_step, set_active_step] = useState<number | null>(null)
  const [zoomed, set_zoomed] = useState(false)
  const thinking_ref = useRef<HTMLDivElement>(null)

  const get_display_url = (): string => {
    if (active_photo === null) return ''
    if (active_step !== null && active_photo.edit_steps.length > active_step) {
      const step = active_photo.edit_steps[active_step]
      if (step.after_url !== undefined) return step.after_url
    }
    if (show_original && active_photo.original_url !== undefined) {
      return active_photo.original_url
    }
    return active_photo.image_url
  }

  const thought_color = (type?: string): string => {
    if (type === 'reason') return 'text-blue-400'
    if (type === 'decide') return 'text-emerald-400'
    if (type === 'observe') return 'text-yellow-400'
    if (type === 'evaluate') return 'text-cyan-400'
    return 'text-rose-400'
  }

  // Load initial data + subscribe
  useEffect(() => {
    const supabase = createClient()

    const parse_edit_steps = (raw: unknown): EditStepData[] => {
      if (!Array.isArray(raw)) return []
      const steps: EditStepData[] = []
      for (const item of raw) {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          steps.push({
            name: typeof obj.name === 'string' ? obj.name : '',
            description: typeof obj.description === 'string' ? obj.description : '',
            before_url: typeof obj.before_url === 'string' ? obj.before_url : undefined,
            after_url: typeof obj.after_url === 'string' ? obj.after_url : undefined,
          })
        }
      }
      return steps
    }

    const parse_metadata = (raw: unknown): PhotoMetadataData | null => {
      if (typeof raw !== 'object' || raw === null) return null
      const obj = raw as Record<string, unknown>
      return {
        camera: typeof obj.camera === 'string' ? obj.camera : undefined,
        lens: typeof obj.lens === 'string' ? obj.lens : undefined,
        aperture: typeof obj.aperture === 'string' ? obj.aperture : undefined,
        shutter: typeof obj.shutter === 'string' ? obj.shutter : undefined,
        iso: typeof obj.iso === 'string' ? obj.iso : undefined,
        focal_length: typeof obj.focal_length === 'string' ? obj.focal_length : undefined,
        location: typeof obj.location === 'string' ? obj.location : undefined,
      }
    }

    const handle_event = (event: { id: string; event_type: string; data: Record<string, unknown>; created_at: string }) => {
      const event_type = event.event_type
      const event_data = event.data

      if (event_type === 'thinking' || event_type === 'thought') {
        set_thinking_blocks(prev => [...prev.slice(-50), {
          id: event.id,
          content: typeof event_data.content === 'string' ? event_data.content : (typeof event_data.text === 'string' ? event_data.text : ''),
          type: typeof event_data.type === 'string' ? event_data.type : undefined,
          timestamp: event.created_at,
        }])
      } else if (event_type === 'photo' || event_type === 'photo_edit') {
        const photo: PhotoData = {
          id: event.id,
          title: typeof event_data.title === 'string' ? event_data.title : 'Untitled',
          image_url: typeof event_data.image_url === 'string' ? event_data.image_url : '',
          original_url: typeof event_data.original_url === 'string' ? event_data.original_url : undefined,
          status: event_data.status === 'editing' ? 'editing' : 'complete',
          edit_steps: parse_edit_steps(event_data.edit_steps),
          metadata: parse_metadata(event_data.metadata),
          timestamp: event.created_at,
        }
        set_photos(prev => [photo, ...prev])
        set_active_photo(photo)
        set_show_original(false)
        set_active_step(null)
      } else if (event_type === 'editing_progress') {
        set_active_photo(prev => {
          if (prev === null) return prev
          return { ...prev, status: 'editing' }
        })
      } else if (event_type === 'photo_complete') {
        const final_url = typeof event_data.image_url === 'string' ? event_data.image_url : undefined
        set_active_photo(prev => {
          if (prev === null) return prev
          return {
            ...prev,
            image_url: final_url !== undefined ? final_url : prev.image_url,
            status: 'complete',
          }
        })
      }
    }

    const fetch_events = async () => {
      const { data } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (data !== null) {
        for (const event of data) {
          handle_event({
            id: event.id,
            event_type: typeof event.event_type === 'string' ? event.event_type : (typeof event.type === 'string' ? event.type : ''),
            data: typeof event.data === 'object' && event.data !== null ? event.data : {},
            created_at: event.created_at,
          })
        }
      }
    }

    fetch_events()

    const channel = supabase
      .channel(`photo-stream-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const raw = payload.new as Record<string, unknown>
        handle_event({
          id: String(raw.id),
          event_type: typeof raw.event_type === 'string' ? raw.event_type : (typeof raw.type === 'string' ? raw.type : ''),
          data: typeof raw.data === 'object' && raw.data !== null ? raw.data as Record<string, unknown> : {},
          created_at: String(raw.created_at),
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // Auto-scroll thinking
  useEffect(() => {
    if (thinking_ref.current !== null) {
      thinking_ref.current.scrollTop = thinking_ref.current.scrollHeight
    }
  }, [thinking_blocks])

  const display_url = get_display_url()

  return (
    <div className="h-full flex">
      {/* Thinking sidebar */}
      <div className="w-80 min-w-80 border-r border-white/[0.04] flex flex-col bg-black/30">
        <div className="text-xs uppercase tracking-wider text-white/30 px-4 py-3 border-b border-white/[0.04]">
          Creative Process
        </div>
        <div ref={thinking_ref} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {thinking_blocks.length === 0 && (
            <div className="text-white/20 text-sm text-center py-8">Waiting for creative ideas...</div>
          )}
          {thinking_blocks.map(block => (
            <div key={block.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              {block.type !== undefined && (
                <div className={`text-[10px] uppercase tracking-wider mb-1 ${thought_color(block.type)}`}>
                  {block.type}
                </div>
              )}
              <p className="text-sm text-white/70 leading-relaxed">{block.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Image area */}
        <div className="flex-1 relative bg-black/20 flex items-center justify-center p-6">
          {active_photo !== null ? (
            <div className="relative max-w-full max-h-full">
              {active_photo.status === 'editing' && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs animate-pulse">
                    Editing in progress...
                  </span>
                </div>
              )}

              <img
                src={display_url}
                alt={active_photo.title}
                className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl cursor-zoom-in"
                onClick={() => set_zoomed(true)}
              />

              {/* Hover overlay with title */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl opacity-0 hover:opacity-100 transition">
                <p className="text-sm text-white/80">{active_photo.title}</p>
                <div className="text-[10px] text-white/40 mt-1">
                  {new Date(active_photo.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/20">
              <span className="text-5xl">📷</span>
              <p className="text-sm">Waiting for {agentName} to share a photo...</p>
            </div>
          )}
        </div>

        {/* Controls + metadata bar */}
        {active_photo !== null && (
          <div className="border-t border-white/[0.04] px-4 py-3 bg-black/20">
            {/* Controls row */}
            <div className="flex items-center gap-3 mb-3">
              {active_photo.original_url !== undefined && (
                <button
                  onClick={() => {
                    set_show_original(!show_original)
                    set_active_step(null)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition ${
                    show_original
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-white/[0.06] text-white/60 hover:bg-white/10'
                  }`}
                >
                  {show_original ? 'Show Edited' : 'Show Original'}
                </button>
              )}

              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                active_photo.status === 'complete'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {active_photo.status}
              </span>
            </div>

            {/* Metadata pills */}
            {active_photo.metadata !== null && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {active_photo.metadata.camera !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/50">
                    {active_photo.metadata.camera}
                  </span>
                )}
                {active_photo.metadata.lens !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/50">
                    {active_photo.metadata.lens}
                  </span>
                )}
                {active_photo.metadata.aperture !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                    ƒ/{active_photo.metadata.aperture}
                  </span>
                )}
                {active_photo.metadata.shutter !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                    {active_photo.metadata.shutter}
                  </span>
                )}
                {active_photo.metadata.iso !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                    ISO {active_photo.metadata.iso}
                  </span>
                )}
                {active_photo.metadata.focal_length !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/50">
                    {active_photo.metadata.focal_length}
                  </span>
                )}
                {active_photo.metadata.location !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                    {active_photo.metadata.location}
                  </span>
                )}
              </div>
            )}

            {/* Edit steps */}
            {active_photo.edit_steps.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Edit Process</div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {active_photo.edit_steps.map((step, index) => (
                    <button
                      key={index}
                      onClick={() => set_active_step(active_step === index ? null : index)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs transition flex items-center gap-2 ${
                        active_step === index
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-white/[0.03] text-white/50 border border-white/[0.04] hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        active_step === index
                          ? 'bg-rose-500/30 text-rose-300'
                          : 'bg-white/[0.06] text-white/40'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="text-left">
                        <div className="font-medium">{step.name}</div>
                        <div className="text-[10px] text-white/30">{step.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gallery strip */}
        {photos.length > 1 && (
          <div className="border-t border-white/[0.04] p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-white/30">Gallery</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/40">
                {photos.length}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {photos.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => {
                    set_active_photo(photo)
                    set_show_original(false)
                    set_active_step(null)
                  }}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                    active_photo !== null && active_photo.id === photo.id
                      ? 'border-rose-500'
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <img src={photo.image_url} alt={photo.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom overlay */}
      {zoomed && active_photo !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => set_zoomed(false)}
        >
          <img
            src={display_url}
            alt={active_photo.title}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  )
}
