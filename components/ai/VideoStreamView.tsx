'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface VideoGeneration {
  id: string
  prompt: string
  video_url?: string
  thumbnail_url?: string
  status: 'generating' | 'complete' | 'failed'
  progress?: number
  duration?: number
  model?: string
  resolution?: string
  timestamp: string
}

interface ThinkingBlock {
  id: string
  content: string
  timestamp: string
  type?: string
}

interface VideoStreamViewProps {
  sessionId: string
  agentName: string
}

export default function VideoStreamView({ sessionId, agentName }: VideoStreamViewProps) {
  const [thinking_blocks, set_thinking_blocks] = useState<ThinkingBlock[]>([])
  const [videos, set_videos] = useState<VideoGeneration[]>([])
  const [active_video, set_active_video] = useState<VideoGeneration | null>(null)
  const thinking_ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    const handle_event = (event: { id: string; event_type: string; data: Record<string, unknown>; created_at: string }) => {
      const event_type = event.event_type
      const event_data = event.data

      if (event_type === 'thinking' || event_type === 'thought') {
        set_thinking_blocks(prev => [...prev.slice(-50), {
          id: event.id,
          content: String(event_data.content || event_data.text || ''),
          type: typeof event_data.type === 'string' ? event_data.type : undefined,
          timestamp: event.created_at,
        }])
      } else if (event_type === 'video' || event_type === 'video_frame' || event_type === 'frame') {
        const video: VideoGeneration = {
          id: event.id,
          prompt: String(event_data.prompt || ''),
          video_url: typeof event_data.video_url === 'string' ? event_data.video_url : undefined,
          thumbnail_url: typeof event_data.thumbnail_url === 'string' ? event_data.thumbnail_url : (typeof event_data.image_url === 'string' ? event_data.image_url : undefined),
          status: (event_data.status === 'generating' || event_data.status === 'complete' || event_data.status === 'failed') ? event_data.status : 'complete',
          progress: typeof event_data.progress === 'number' ? event_data.progress : undefined,
          duration: typeof event_data.duration === 'number' ? event_data.duration : undefined,
          model: typeof event_data.model === 'string' ? event_data.model : undefined,
          resolution: typeof event_data.resolution === 'string' ? event_data.resolution : undefined,
          timestamp: event.created_at,
        }
        set_videos(prev => {
          const existing_index = prev.findIndex(v => v.id === video.id)
          if (existing_index >= 0) {
            const next = [...prev]
            next[existing_index] = video
            return next
          }
          return [video, ...prev]
        })
        set_active_video(video)
      } else if (event_type === 'generation_progress') {
        const progress = typeof event_data.progress === 'number' ? event_data.progress : 0
        set_active_video(prev => {
          if (prev === null) return prev
          return { ...prev, progress, status: 'generating' }
        })
      } else if (event_type === 'video_complete') {
        const video_url = typeof event_data.video_url === 'string' ? event_data.video_url : undefined
        set_active_video(prev => {
          if (prev === null) return prev
          return { ...prev, video_url, status: 'complete' }
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
            event_type: event.event_type || event.type,
            data: typeof event.data === 'object' && event.data !== null ? event.data : {},
            created_at: event.created_at,
          })
        }
      }
    }

    fetch_events()

    const channel = supabase
      .channel(`video-stream-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const raw = payload.new as Record<string, unknown>
        handle_event({
          id: String(raw.id),
          event_type: String(raw.event_type || raw.type || ''),
          data: typeof raw.data === 'object' && raw.data !== null ? raw.data as Record<string, unknown> : {},
          created_at: String(raw.created_at),
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  useEffect(() => {
    if (thinking_ref.current !== null) {
      thinking_ref.current.scrollTop = thinking_ref.current.scrollHeight
    }
  }, [thinking_blocks])

  const thought_color = (type?: string): string => {
    if (type === 'reason') return 'text-blue-400'
    if (type === 'decide') return 'text-emerald-400'
    if (type === 'observe') return 'text-yellow-400'
    if (type === 'prompt') return 'text-purple-400'
    return 'text-rose-400'
  }

  const status_badge = (status: string): string => {
    if (status === 'generating') return 'bg-yellow-500/20 text-yellow-400'
    if (status === 'complete') return 'bg-emerald-500/20 text-emerald-400'
    if (status === 'failed') return 'bg-red-500/20 text-red-400'
    return 'bg-white/[0.06] text-white/40'
  }

  return (
    <div className="h-full flex">
      {/* Thinking sidebar */}
      <div className="w-80 min-w-80 border-r border-white/[0.04] flex flex-col bg-black/30">
        <div className="text-xs uppercase tracking-wider text-white/30 px-4 py-3 border-b border-white/[0.04]">
          Thinking
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
        {/* Video preview */}
        <div className="flex-1 flex items-center justify-center p-6 bg-black/20">
          {active_video !== null ? (
            <div className="w-full max-w-4xl">
              {active_video.status === 'generating' ? (
                <div className="aspect-video rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
                  <span className="text-white/50 text-sm">Generating video...</span>
                  {active_video.progress !== undefined && active_video.progress > 0 && (
                    <div className="w-64 flex flex-col items-center gap-2">
                      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${active_video.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/40 tabular-nums">{Math.round(active_video.progress)}%</span>
                    </div>
                  )}
                  <p className="text-white/30 text-xs max-w-sm text-center mt-2">"{active_video.prompt}"</p>
                </div>
              ) : active_video.video_url !== undefined ? (
                <div className="relative group">
                  <video
                    src={active_video.video_url}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full aspect-video rounded-2xl shadow-2xl bg-black"
                    poster={active_video.thumbnail_url}
                  />
                  {/* Overlay info on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl opacity-0 group-hover:opacity-100 transition">
                    <p className="text-sm text-white/80">{active_video.prompt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {active_video.model !== undefined && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                          {active_video.model}
                        </span>
                      )}
                      {active_video.resolution !== undefined && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                          {active_video.resolution}
                        </span>
                      )}
                      {active_video.duration !== undefined && (
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 text-[10px]">
                          {active_video.duration}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : active_video.thumbnail_url !== undefined ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden">
                  <Image src={active_video.thumbnail_url} alt={active_video.prompt} fill className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl">🎬</div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-sm text-white/70">{active_video.prompt}</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center gap-3">
                  <span className="text-4xl">🎬</span>
                  <p className="text-white/30 text-sm">No video yet</p>
                </div>
              )}

              {/* Status + info bar */}
              {active_video.status === 'complete' && (
                <div className="flex items-center gap-3 mt-3 px-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${status_badge(active_video.status)}`}>
                    {active_video.status}
                  </span>
                  {active_video.model !== undefined && (
                    <span className="text-[10px] text-white/30">{active_video.model}</span>
                  )}
                  {active_video.duration !== undefined && (
                    <span className="text-[10px] text-white/30">{active_video.duration}s</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/20">
              <span className="text-5xl">🎬</span>
              <p className="text-sm">Waiting for {agentName} to create video...</p>
            </div>
          )}
        </div>

        {/* Timeline strip */}
        {videos.length > 1 && (
          <div className="border-t border-white/[0.04] p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-white/30">Timeline</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/40">
                {videos.length}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {videos.map(video => (
                <button
                  key={video.id}
                  onClick={() => set_active_video(video)}
                  className={`flex-shrink-0 w-28 rounded-lg overflow-hidden border-2 transition ${
                    active_video !== null && active_video.id === video.id
                      ? 'border-rose-500'
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  {video.thumbnail_url !== undefined ? (
                    <div className="aspect-video relative">
                      <Image src={video.thumbnail_url} alt={video.prompt} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-white/[0.02] flex items-center justify-center text-lg">
                      🎬
                    </div>
                  )}
                  <div className="flex items-center justify-between px-1.5 py-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      video.status === 'complete' ? 'bg-emerald-500' :
                      video.status === 'generating' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500'
                    }`} />
                    {video.duration !== undefined && (
                      <span className="text-[10px] text-white/30">{video.duration}s</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
