'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MusicTrack {
  id: string
  title: string
  audio_url: string
  status: 'generating' | 'complete' | 'playing'
  duration?: number
  progress?: number
  prompt?: string
  model?: string
  bpm?: number
  music_key?: string
  timestamp: string
}

interface ThinkingBlock {
  id: string
  content: string
  timestamp: string
}

interface MusicStreamViewProps {
  sessionId: string
  agentName: string
}

const stem_color = (stem: string): string => {
  if (stem === 'drums' || stem === 'percussion') return 'bg-red-500/20 text-red-400'
  if (stem === 'bass') return 'bg-purple-500/20 text-purple-400'
  if (stem === 'melody' || stem === 'lead') return 'bg-cyan-500/20 text-cyan-400'
  if (stem === 'harmony' || stem === 'chords' || stem === 'pads') return 'bg-emerald-500/20 text-emerald-400'
  if (stem === 'vocals' || stem === 'voice') return 'bg-amber-500/20 text-amber-400'
  return 'bg-white/[0.06] text-white/40'
}

export default function MusicStreamView({ sessionId, agentName }: MusicStreamViewProps) {
  const [thinking, set_thinking] = useState<ThinkingBlock[]>([])
  const [tracks, set_tracks] = useState<MusicTrack[]>([])
  const [active_track, set_active_track] = useState<MusicTrack | null>(null)
  const [is_playing, set_is_playing] = useState(false)
  const [playback_progress, set_playback_progress] = useState(0)
  const [model_name, set_model_name] = useState('')
  const [stems, set_stems] = useState<string[]>([])
  const audio_ref = useRef<HTMLAudioElement>(null)
  const thinking_ref = useRef<HTMLDivElement>(null)

  // Load initial data + subscribe
  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: events } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (events !== null) {
        const thinking_events: ThinkingBlock[] = []
        const track_events: MusicTrack[] = []

        for (const e of events) {
          const event_type = typeof e.type === 'string' ? e.type : (typeof e.event_type === 'string' ? e.event_type : '')
          const event_data: Record<string, unknown> = typeof e.data === 'object' && e.data !== null ? e.data : {}

          if (event_type === 'thinking' || event_type === 'thought') {
            thinking_events.push({
              id: e.id,
              content: typeof event_data.content === 'string' ? event_data.content : '',
              timestamp: e.created_at,
            })
          } else if (event_type === 'music') {
            const status_raw = typeof event_data.status === 'string' ? event_data.status : 'complete'
            const status: MusicTrack['status'] = status_raw === 'generating' ? 'generating' : (status_raw === 'playing' ? 'playing' : 'complete')

            track_events.push({
              id: e.id,
              title: typeof event_data.title === 'string' ? event_data.title : 'Untitled',
              audio_url: typeof event_data.url === 'string' ? event_data.url : '',
              status,
              duration: typeof event_data.duration === 'number' ? event_data.duration : undefined,
              progress: typeof event_data.progress === 'number' ? event_data.progress : undefined,
              prompt: typeof event_data.prompt === 'string' ? event_data.prompt : undefined,
              model: typeof event_data.model === 'string' ? event_data.model : undefined,
              bpm: typeof event_data.bpm === 'number' ? event_data.bpm : undefined,
              music_key: typeof event_data.key === 'string' ? event_data.key : undefined,
              timestamp: e.created_at,
            })
          } else if (event_type === 'model_info') {
            const name = typeof event_data.model === 'string' ? event_data.model : (typeof event_data.name === 'string' ? event_data.name : '')
            set_model_name(name)
          } else if (event_type === 'stems') {
            if (Array.isArray(event_data.stems)) {
              const stem_list: string[] = []
              for (const s of event_data.stems) {
                if (typeof s === 'string') {
                  stem_list.push(s)
                }
              }
              set_stems(stem_list)
            }
          } else if (event_type === 'track_info') {
            if (typeof event_data.bpm === 'number') {
              set_active_track(prev => {
                if (prev === null) return prev
                return { ...prev, bpm: event_data.bpm as number }
              })
            }
            if (typeof event_data.key === 'string') {
              set_active_track(prev => {
                if (prev === null) return prev
                return { ...prev, music_key: event_data.key as string }
              })
            }
          }
        }

        set_thinking(thinking_events.slice(-30))
        set_tracks(track_events)
        if (track_events.length > 0) {
          set_active_track(track_events[track_events.length - 1])
        }
      }
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel(`music-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_events',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const raw = payload.new as Record<string, unknown>
        const event_type = typeof raw.type === 'string' ? raw.type : (typeof raw.event_type === 'string' ? raw.event_type : '')
        const event_data: Record<string, unknown> = typeof raw.data === 'object' && raw.data !== null ? raw.data as Record<string, unknown> : {}
        const created_at = typeof raw.created_at === 'string' ? raw.created_at : ''

        if (event_type === 'thinking' || event_type === 'thought') {
          set_thinking(prev => [...prev, {
            id: typeof raw.id === 'string' ? raw.id : String(raw.id),
            content: typeof event_data.content === 'string' ? event_data.content : '',
            timestamp: created_at,
          }].slice(-30))
        }

        if (event_type === 'music') {
          const status_raw = typeof event_data.status === 'string' ? event_data.status : 'generating'
          const status: MusicTrack['status'] = status_raw === 'generating' ? 'generating' : (status_raw === 'playing' ? 'playing' : 'complete')

          const track: MusicTrack = {
            id: typeof raw.id === 'string' ? raw.id : String(raw.id),
            title: typeof event_data.title === 'string' ? event_data.title : 'Untitled',
            audio_url: typeof event_data.url === 'string' ? event_data.url : '',
            status,
            duration: typeof event_data.duration === 'number' ? event_data.duration : undefined,
            progress: typeof event_data.progress === 'number' ? event_data.progress : undefined,
            prompt: typeof event_data.prompt === 'string' ? event_data.prompt : undefined,
            model: typeof event_data.model === 'string' ? event_data.model : undefined,
            bpm: typeof event_data.bpm === 'number' ? event_data.bpm : undefined,
            music_key: typeof event_data.key === 'string' ? event_data.key : undefined,
            timestamp: created_at,
          }
          set_tracks(prev => [...prev, track])
          set_active_track(track)
        }

        if (event_type === 'model_info') {
          const name = typeof event_data.model === 'string' ? event_data.model : (typeof event_data.name === 'string' ? event_data.name : '')
          set_model_name(name)
        }

        if (event_type === 'stems') {
          if (Array.isArray(event_data.stems)) {
            const stem_list: string[] = []
            for (const s of event_data.stems) {
              if (typeof s === 'string') {
                stem_list.push(s)
              }
            }
            set_stems(stem_list)
          }
        }

        if (event_type === 'track_info') {
          if (typeof event_data.bpm === 'number') {
            set_active_track(prev => {
              if (prev === null) return prev
              return { ...prev, bpm: event_data.bpm as number }
            })
          }
          if (typeof event_data.key === 'string') {
            set_active_track(prev => {
              if (prev === null) return prev
              return { ...prev, music_key: event_data.key as string }
            })
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  // Audio playback tracking
  useEffect(() => {
    const audio = audio_ref.current
    if (audio === null) return

    const update_progress = () => {
      if (audio.duration > 0) {
        set_playback_progress((audio.currentTime / audio.duration) * 100)
      }
    }

    const handle_ended = () => {
      set_is_playing(false)
    }

    audio.addEventListener('timeupdate', update_progress)
    audio.addEventListener('ended', handle_ended)

    return () => {
      audio.removeEventListener('timeupdate', update_progress)
      audio.removeEventListener('ended', handle_ended)
    }
  }, [active_track])

  const toggle_play = () => {
    const audio = audio_ref.current
    if (audio === null) return

    if (is_playing) {
      audio.pause()
    } else {
      audio.play()
    }
    set_is_playing(!is_playing)
  }

  // Auto-scroll thinking
  useEffect(() => {
    if (thinking_ref.current !== null) {
      thinking_ref.current.scrollTo({ top: thinking_ref.current.scrollHeight, behavior: 'smooth' })
    }
  }, [thinking])

  const format_duration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="h-full flex">
      {/* Left: Thinking */}
      <div className="w-80 min-w-80 border-r border-white/[0.04] flex flex-col">
        <div className="p-4 border-b border-white/[0.04] flex items-center gap-2">
          <span className="text-white/80 text-sm font-medium">Musical Mind</span>
          {model_name !== '' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
              {model_name}
            </span>
          )}
        </div>

        <div ref={thinking_ref} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {thinking.length === 0 ? (
            <div className="text-white/20 text-sm text-center py-8 italic">
              waiting for musical thoughts...
            </div>
          ) : (
            thinking.map((block, i) => {
              const is_latest = i === thinking.length - 1
              return (
                <div
                  key={block.id}
                  className={`p-3 rounded-xl ${
                    is_latest
                      ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20'
                      : 'bg-white/[0.02] border border-white/[0.04]'
                  } ${is_latest ? 'opacity-100' : 'opacity-50'}`}
                >
                  <p className="text-sm text-white/70 leading-relaxed">
                    {block.content}
                    {is_latest && <span className="inline-block w-1.5 h-4 bg-amber-400/70 ml-1 animate-pulse" />}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Player */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main player */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          {active_track !== null ? (
            <div className="w-full max-w-2xl">
              {/* Waveform visualizer */}
              <div className="h-48 mb-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex items-center justify-center overflow-hidden">
                {active_track.status === 'generating' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-1">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 bg-amber-500/50 rounded-full animate-waveform"
                          style={{
                            height: `${20 + ((i * 17 + 7) % 60)}px`,
                            animationDelay: `${i * 0.05}s`
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-white/50 text-sm">Generating...</span>
                    {active_track.progress !== undefined && active_track.progress > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all"
                            style={{ width: `${active_track.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/40 tabular-nums">{Math.round(active_track.progress)}%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-1 w-full h-full items-end p-4">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t ${
                          is_playing ? 'bg-amber-500 animate-waveform' : 'bg-amber-500/30'
                        }`}
                        style={{
                          height: is_playing
                            ? undefined
                            : `${20 + Math.sin(i / 2) * 20}%`,
                          animationDelay: is_playing ? `${i * 0.02}s` : undefined,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium text-white/90">{active_track.title}</h3>
                {active_track.prompt !== undefined && (
                  <p className="text-white/40 text-sm mt-2">&ldquo;{active_track.prompt}&rdquo;</p>
                )}

                {/* Track info pills */}
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  {active_track.bpm !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] tabular-nums">
                      {active_track.bpm} BPM
                    </span>
                  )}
                  {active_track.music_key !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
                      {active_track.music_key}
                    </span>
                  )}
                  {active_track.duration !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 text-[10px] tabular-nums">
                      {format_duration(active_track.duration)}
                    </span>
                  )}
                  {active_track.model !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                      {active_track.model}
                    </span>
                  )}
                </div>

                {/* Stem indicators */}
                {stems.length > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {stems.map((s, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded-full text-[10px] ${stem_color(s)}`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${playback_progress}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white/80 transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                <button
                  onClick={toggle_play}
                  disabled={active_track.status === 'generating'}
                  className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center transition"
                >
                  {is_playing ? (
                    <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white/80 transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>

              {/* Hidden audio element */}
              {active_track.audio_url !== '' && (
                <audio ref={audio_ref} src={active_track.audio_url} />
              )}
            </div>
          ) : (
            <div className="text-white/20 text-sm italic">
              waiting for music...
            </div>
          )}
        </div>

        {/* Track list */}
        {tracks.length > 1 && (
          <div className="border-t border-white/[0.04] p-4 max-h-48 overflow-y-auto scrollbar-hide">
            <div className="space-y-2">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => set_active_track(track)}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition ${
                    active_track !== null && active_track.id === track.id
                      ? 'bg-amber-500/20'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    track.status === 'generating'
                      ? 'bg-amber-500/20'
                      : 'bg-white/10'
                  }`}>
                    {track.status === 'generating' ? (
                      <div className="w-4 h-4 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-white/80">{track.title}</div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      {track.status === 'generating' ? (
                        <span>Generating...</span>
                      ) : (
                        <>
                          {track.model !== undefined && <span>{track.model}</span>}
                          {track.duration !== undefined && <span>{format_duration(track.duration)}</span>}
                          {track.bpm !== undefined && <span className="tabular-nums">{track.bpm} BPM</span>}
                        </>
                      )}
                    </div>
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
