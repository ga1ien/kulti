'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WritingBlock {
  id: string
  content: string
  displayed_content: string
  is_typing: boolean
  type: 'prose' | 'dialogue' | 'description' | 'thought' | 'chapter_title'
  timestamp: string
}

interface ThinkingBlock {
  id: string
  content: string
  type: string
  timestamp: string
}

interface WritingStreamViewProps {
  sessionId: string
  agentName: string
}

export default function WritingStreamView({ sessionId, agentName }: WritingStreamViewProps) {
  const [writing, set_writing] = useState<WritingBlock[]>([])
  const [thinking, set_thinking] = useState<ThinkingBlock[]>([])
  const [word_count, set_word_count] = useState(0)
  const [title, set_title] = useState<string | null>(null)
  const [draft_number, set_draft_number] = useState(0)
  const [scroll_progress, set_scroll_progress] = useState(0)
  const writing_ref = useRef<HTMLDivElement>(null)
  const thinking_ref = useRef<HTMLDivElement>(null)

  // Auto-scroll writing
  useEffect(() => {
    if (writing_ref.current !== null) {
      writing_ref.current.scrollTop = writing_ref.current.scrollHeight
    }
  }, [writing])

  // Auto-scroll thinking
  useEffect(() => {
    if (thinking_ref.current !== null) {
      thinking_ref.current.scrollTop = thinking_ref.current.scrollHeight
    }
  }, [thinking])

  // Calculate word count
  useEffect(() => {
    const words = writing
      .map(b => b.content)
      .join(' ')
      .split(/\s+/)
      .filter(w => w.length > 0).length
    set_word_count(words)
  }, [writing])

  // Scroll progress handler
  const handle_scroll = () => {
    const el = writing_ref.current
    if (el === null) return
    const max_scroll = el.scrollHeight - el.clientHeight
    if (max_scroll <= 0) {
      set_scroll_progress(100)
      return
    }
    set_scroll_progress(Math.round((el.scrollTop / max_scroll) * 100))
  }

  // Load initial + subscribe to realtime
  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: events } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (events !== null) {
        const writing_blocks: WritingBlock[] = []
        const thinking_blocks: ThinkingBlock[] = []

        for (const e of events) {
          const event_type = typeof e.type === 'string' ? e.type : (typeof e.event_type === 'string' ? e.event_type : '')
          const event_data: Record<string, unknown> = typeof e.data === 'object' && e.data !== null ? e.data : {}

          if (event_type === 'writing') {
            const content = typeof event_data.content === 'string' ? event_data.content : ''
            const block_type_raw = typeof event_data.blockType === 'string' ? event_data.blockType : 'prose'
            const block_type: WritingBlock['type'] =
              block_type_raw === 'dialogue' ? 'dialogue' :
              block_type_raw === 'chapter_title' ? 'chapter_title' :
              block_type_raw === 'description' ? 'description' :
              block_type_raw === 'thought' ? 'thought' :
              'prose'

            writing_blocks.push({
              id: e.id,
              content,
              displayed_content: content,
              is_typing: false,
              type: block_type,
              timestamp: e.created_at,
            })

            if (typeof event_data.title === 'string') {
              set_title(event_data.title)
            }
          } else if (event_type === 'thinking' || event_type === 'thought') {
            thinking_blocks.push({
              id: e.id,
              content: typeof event_data.content === 'string' ? event_data.content : '',
              type: typeof event_data.thoughtType === 'string' ? event_data.thoughtType : 'general',
              timestamp: e.created_at,
            })
          } else if (event_type === 'draft') {
            const num = typeof event_data.number === 'number' ? event_data.number : 0
            set_draft_number(num)
          }
        }

        set_writing(writing_blocks)
        set_thinking(thinking_blocks.slice(-20))
      }
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel(`writing-${sessionId}`)
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

        if (event_type === 'writing') {
          const content = typeof event_data.content === 'string' ? event_data.content : ''
          const block_type_raw = typeof event_data.blockType === 'string' ? event_data.blockType : 'prose'
          const block_type: WritingBlock['type'] =
            block_type_raw === 'dialogue' ? 'dialogue' :
            block_type_raw === 'chapter_title' ? 'chapter_title' :
            block_type_raw === 'description' ? 'description' :
            block_type_raw === 'thought' ? 'thought' :
            'prose'
          const event_id = typeof raw.id === 'string' ? raw.id : String(raw.id)

          const new_block: WritingBlock = {
            id: event_id,
            content,
            displayed_content: '',
            is_typing: true,
            type: block_type,
            timestamp: created_at,
          }
          set_writing(prev => [...prev, new_block])

          if (typeof event_data.title === 'string') {
            set_title(event_data.title)
          }

          // Typing animation
          let i = 0
          const interval = setInterval(() => {
            i += 3
            if (i >= content.length) {
              clearInterval(interval)
              set_writing(prev => prev.map(b =>
                b.id === event_id ? { ...b, displayed_content: content, is_typing: false } : b
              ))
            } else {
              set_writing(prev => prev.map(b =>
                b.id === event_id ? { ...b, displayed_content: content.slice(0, i) } : b
              ))
            }
          }, 20)
        }

        if (event_type === 'thinking' || event_type === 'thought') {
          const event_id = typeof raw.id === 'string' ? raw.id : String(raw.id)
          set_thinking(prev => [...prev.slice(-19), {
            id: event_id,
            content: typeof event_data.content === 'string' ? event_data.content : '',
            type: typeof event_data.thoughtType === 'string' ? event_data.thoughtType : 'general',
            timestamp: created_at,
          }])
        }

        if (event_type === 'draft') {
          const num = typeof event_data.number === 'number' ? event_data.number : 0
          set_draft_number(num)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  const get_block_style = (type: string): string => {
    if (type === 'dialogue') return 'pl-8 text-amber-200/80 italic'
    if (type === 'chapter_title') return 'text-2xl font-light text-white/90 mt-8 mb-4'
    if (type === 'description') return 'text-white/50'
    if (type === 'thought') return 'italic text-white/40'
    return 'text-white/70'
  }

  const reading_time = Math.ceil(word_count / 200)

  const thought_color = (type: string): string => {
    if (type === 'plot') return 'text-purple-400'
    if (type === 'character') return 'text-emerald-400'
    if (type === 'setting') return 'text-blue-400'
    if (type === 'dialogue') return 'text-amber-400'
    if (type === 'revision') return 'text-rose-400'
    return 'text-white/40'
  }

  return (
    <div className="h-full flex">
      {/* Writing Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div>
            {title !== null && <h1 className="text-xl font-light text-white/90">{title}</h1>}
            <p className="text-xs text-white/30 mt-1">by {agentName}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/30">
            {draft_number > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                Draft {draft_number}
              </span>
            )}
            <span className="tabular-nums">{word_count.toLocaleString()} words</span>
            <span>{reading_time} min read</span>
          </div>
        </div>

        {/* Reading progress bar */}
        <div className="h-0.5 bg-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-amber-500/60 to-orange-500/40 transition-all duration-300"
            style={{ width: `${scroll_progress}%` }}
          />
        </div>

        {/* Writing Content */}
        <div
          ref={writing_ref}
          onScroll={handle_scroll}
          className="flex-1 overflow-y-auto px-8 py-8 scrollbar-hide bg-[#0a0a0a]"
        >
          <div className="max-w-2xl mx-auto border-l-2 border-white/[0.03] pl-8">
            {writing.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-white/30 text-sm italic">waiting for words...</p>
              </div>
            ) : (
              <div className="space-y-4 leading-relaxed text-lg">
                {writing.map((block, index) => {
                  const prev_block = index > 0 ? writing[index - 1] : undefined
                  const show_divider = block.type === 'chapter_title' && prev_block !== undefined && prev_block.type !== 'chapter_title'

                  return (
                    <div key={block.id}>
                      {show_divider && (
                        <div className="flex items-center justify-center py-6 gap-3 text-white/10">
                          <span className="w-8 h-px bg-white/10" />
                          <span className="text-xs">&#9670;</span>
                          <span className="w-8 h-px bg-white/10" />
                        </div>
                      )}
                      <p className={`transition-opacity duration-500 ${get_block_style(block.type)}`}>
                        {block.displayed_content}
                        {block.is_typing && (
                          <span className="inline-block w-0.5 h-5 bg-amber-400 ml-0.5 animate-pulse" />
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thinking Sidebar */}
      <div className="w-80 min-w-80 border-l border-white/[0.04] flex flex-col bg-black/30">
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <span className="text-xs uppercase tracking-wider text-white/30">Author&apos;s Mind</span>
        </div>
        <div ref={thinking_ref} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {thinking.length === 0 && (
            <div className="text-white/20 text-sm text-center py-8 italic">
              waiting for creative thoughts...
            </div>
          )}
          {thinking.map((block, i) => {
            const is_latest = i === thinking.length - 1
            return (
              <div
                key={block.id}
                className={`p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-opacity ${
                  is_latest ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {block.type !== 'general' && (
                  <div className={`text-[10px] uppercase tracking-wider mb-1 ${thought_color(block.type)}`}>
                    {block.type}
                  </div>
                )}
                <p className="text-sm text-white/60 leading-relaxed">{block.content}</p>
                <p className="text-[10px] text-white/20 mt-2">
                  {new Date(block.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
