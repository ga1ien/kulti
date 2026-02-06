'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CodeFile {
  filename: string
  language: string
  content: string
  displayed_content: string
  is_typing: boolean
  action: 'write' | 'edit' | 'delete'
  timestamp: string
}

interface ThinkingBlock {
  id: string
  content: string
  type: string
  timestamp: string
}

interface CodeStreamViewProps {
  sessionId: string
  agentName: string
}

const language_color = (lang: string): string => {
  if (lang === 'typescript') return 'bg-blue-400'
  if (lang === 'javascript') return 'bg-yellow-400'
  if (lang === 'python') return 'bg-emerald-400'
  if (lang === 'css') return 'bg-pink-400'
  if (lang === 'html') return 'bg-orange-400'
  if (lang === 'json') return 'bg-amber-400'
  if (lang === 'sql') return 'bg-cyan-400'
  if (lang === 'markdown') return 'bg-white/60'
  return 'bg-white/40'
}

function get_language_from_filename(filename: string): string {
  const parts = filename.split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', sql: 'sql', css: 'css', html: 'html', json: 'json',
    md: 'markdown', yml: 'yaml', yaml: 'yaml', sh: 'bash',
  }
  const result = map[ext]
  return result !== undefined ? result : 'text'
}

export default function CodeStreamView({ sessionId, agentName }: CodeStreamViewProps) {
  const [code_files, set_code_files] = useState<Map<string, CodeFile>>(new Map())
  const [active_file, set_active_file] = useState<string | null>(null)
  const [thinking, set_thinking] = useState<ThinkingBlock[]>([])
  const [terminal, set_terminal] = useState<Array<{ type: string; content: string; timestamp: string }>>([])
  const [git_branch, set_git_branch] = useState('')
  const [lines_changed, set_lines_changed] = useState(0)
  const code_ref = useRef<HTMLDivElement>(null)
  const terminal_ref = useRef<HTMLDivElement>(null)

  // Auto-scroll code
  useEffect(() => {
    if (code_ref.current !== null) {
      code_ref.current.scrollTop = code_ref.current.scrollHeight
    }
  }, [code_files, active_file])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminal_ref.current !== null) {
      terminal_ref.current.scrollTop = terminal_ref.current.scrollHeight
    }
  }, [terminal])

  // Load initial data + subscribe
  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: events } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (events !== null) {
        const files_map = new Map<string, CodeFile>()
        const thinking_blocks: ThinkingBlock[] = []
        const terminal_entries: Array<{ type: string; content: string; timestamp: string }> = []

        for (const e of events.reverse()) {
          const event_type = typeof e.type === 'string' ? e.type : (typeof e.event_type === 'string' ? e.event_type : '')
          const event_data: Record<string, unknown> = typeof e.data === 'object' && e.data !== null ? e.data : {}

          if (event_type === 'code') {
            const filename = typeof event_data.filename === 'string' ? event_data.filename : 'untitled'
            const content = typeof event_data.content === 'string' ? event_data.content : ''
            const language = typeof event_data.language === 'string' ? event_data.language : get_language_from_filename(filename)
            const action_raw = typeof event_data.action === 'string' ? event_data.action : 'write'
            const action: 'write' | 'edit' | 'delete' = action_raw === 'edit' ? 'edit' : (action_raw === 'delete' ? 'delete' : 'write')

            files_map.set(filename, {
              filename,
              language,
              content,
              displayed_content: content,
              is_typing: false,
              action,
              timestamp: e.created_at,
            })
            set_lines_changed(prev => prev + content.split('\n').length)
          } else if (event_type === 'thinking' || event_type === 'thought') {
            thinking_blocks.push({
              id: e.id,
              content: typeof event_data.content === 'string' ? event_data.content : '',
              type: typeof event_data.thoughtType === 'string' ? event_data.thoughtType : 'general',
              timestamp: e.created_at,
            })
          } else if (event_type === 'terminal') {
            terminal_entries.push({
              type: typeof event_data.type === 'string' ? event_data.type : 'info',
              content: typeof event_data.content === 'string' ? event_data.content : '',
              timestamp: e.created_at,
            })
          } else if (event_type === 'git_status') {
            const branch = typeof event_data.branch === 'string' ? event_data.branch : ''
            set_git_branch(branch)
          }
        }

        set_code_files(files_map)
        set_thinking(thinking_blocks.slice(-20))
        set_terminal(terminal_entries.slice(-50))

        if (files_map.size > 0) {
          const keys = Array.from(files_map.keys())
          const last_key = keys[keys.length - 1]
          if (last_key !== undefined) {
            set_active_file(last_key)
          }
        }
      }
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel(`code-${sessionId}`)
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

        if (event_type === 'code') {
          const filename = typeof event_data.filename === 'string' ? event_data.filename : 'untitled'
          const content = typeof event_data.content === 'string' ? event_data.content : ''
          const language = typeof event_data.language === 'string' ? event_data.language : get_language_from_filename(filename)
          const action_raw = typeof event_data.action === 'string' ? event_data.action : 'write'
          const action: 'write' | 'edit' | 'delete' = action_raw === 'edit' ? 'edit' : (action_raw === 'delete' ? 'delete' : 'write')

          set_lines_changed(prev => prev + content.split('\n').length)

          // Add with typing animation
          set_code_files(prev => {
            const next = new Map(prev)
            next.set(filename, {
              filename,
              language,
              content,
              displayed_content: '',
              is_typing: true,
              action,
              timestamp: created_at,
            })
            return next
          })
          set_active_file(filename)

          // Typing animation
          let i = 0
          const interval = setInterval(() => {
            i += 50
            if (i >= content.length) {
              clearInterval(interval)
              set_code_files(prev => {
                const next = new Map(prev)
                const file = next.get(filename)
                if (file !== undefined) {
                  next.set(filename, { ...file, displayed_content: content, is_typing: false })
                }
                return next
              })
            } else {
              set_code_files(prev => {
                const next = new Map(prev)
                const file = next.get(filename)
                if (file !== undefined) {
                  next.set(filename, { ...file, displayed_content: content.slice(0, i) })
                }
                return next
              })
            }
          }, 10)
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

        if (event_type === 'terminal') {
          set_terminal(prev => [...prev.slice(-49), {
            type: typeof event_data.type === 'string' ? event_data.type : 'info',
            content: typeof event_data.content === 'string' ? event_data.content : '',
            timestamp: created_at,
          }])
        }

        if (event_type === 'git_status') {
          const branch = typeof event_data.branch === 'string' ? event_data.branch : ''
          set_git_branch(branch)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  const file_list = Array.from(code_files.values())
  const current_file = active_file !== null ? code_files.get(active_file) : undefined
  const resolved_file = current_file !== undefined ? current_file : null

  return (
    <div className="h-full flex">
      {/* Left: Terminal + Thinking */}
      <div className="w-96 border-r border-white/[0.04] flex flex-col">
        {/* Terminal */}
        <div className="h-1/2 border-b border-white/[0.04] flex flex-col">
          <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <span className="text-xs text-white/30 font-mono">terminal</span>
            {git_branch !== '' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                {git_branch}
              </span>
            )}
          </div>
          <div ref={terminal_ref} className="flex-1 overflow-y-auto p-3 font-mono text-xs scrollbar-hide bg-black/50">
            {terminal.map((entry, i) => (
              <div key={i} className={`mb-1 ${
                entry.type === 'error' ? 'text-red-400' :
                entry.type === 'success' ? 'text-emerald-400' :
                'text-white/50'
              }`}>
                {entry.content}
              </div>
            ))}
          </div>
        </div>

        {/* Thinking */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-white/[0.04]">
            <span className="text-xs uppercase tracking-wider text-white/30">thinking</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {thinking.map((block, i) => (
              <div
                key={block.id}
                className={`p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-opacity ${
                  i === thinking.length - 1 ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <p className="text-sm text-white/60 leading-relaxed">{block.content}</p>
                <p className="text-[10px] text-white/20 mt-2">
                  {new Date(block.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Code */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* File tabs */}
        <div className="h-10 border-b border-white/[0.04] flex items-center px-4 gap-1 overflow-x-auto scrollbar-hide">
          {file_list.map((file) => (
            <button
              key={file.filename}
              onClick={() => set_active_file(file.filename)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-2 ${
                active_file === file.filename
                  ? 'bg-white/10 text-white'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${language_color(file.language)}`} />
              {file.filename}
              {file.is_typing && (
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Code content */}
        <div ref={code_ref} className="flex-1 overflow-auto p-6 scrollbar-hide">
          {resolved_file === null ? (
            <div className="h-full flex items-center justify-center text-white/20">
              waiting for code...
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden ring-1 ring-cyan-500/20">
              <div className="px-4 py-2 bg-white/[0.04] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${language_color(resolved_file.language)}`} />
                  <span className="text-white/50 font-mono">{resolved_file.filename}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                    resolved_file.action === 'write' ? 'bg-emerald-500/20 text-emerald-400' :
                    resolved_file.action === 'edit' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {resolved_file.action}
                  </span>
                  <span className="text-[10px] text-white/30">{lines_changed} lines</span>
                </div>
                <span className="text-white/20">
                  {new Date(resolved_file.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="p-4 bg-black/50">
                <pre className="font-mono text-sm leading-relaxed text-white/70 whitespace-pre overflow-x-auto">
                  {resolved_file.displayed_content}
                  {resolved_file.is_typing && (
                    <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
