'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ThinkingBlock {
  id: string
  content: string
  type: string
  timestamp: string
}

interface NotebookCell {
  id: string
  cell_type: 'code' | 'output' | 'table' | 'chart'
  content: string
  execution_number?: number
  table_data?: { headers: string[]; rows: string[][] }
  timestamp: string
}

interface PipelineStep {
  name: string
  status: 'complete' | 'running' | 'pending' | 'failed'
}

interface DataStreamViewProps {
  sessionId: string
  agentName: string
}

export default function DataStreamView({ sessionId, agentName }: DataStreamViewProps) {
  const [thinking_blocks, set_thinking_blocks] = useState<ThinkingBlock[]>([])
  const [cells, set_cells] = useState<NotebookCell[]>([])
  const [pipeline_steps, set_pipeline_steps] = useState<PipelineStep[]>([])
  const [dataset_name, set_dataset_name] = useState<string>('Untitled Dataset')
  const [row_count, set_row_count] = useState<number>(0)
  const [is_running, set_is_running] = useState(false)
  const [execution_counter, set_execution_counter] = useState(0)
  const thinking_ref = useRef<HTMLDivElement>(null)
  const notebook_ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetch_events = async () => {
      const { data } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (data !== null) {
        for (const event of data) {
          handle_event(event)
        }
      }
    }

    const handle_event = (event: { id: string; event_type: string; data: Record<string, unknown>; created_at: string }) => {
      const event_type = event.event_type
      const event_data = event.data

      if (event_type === 'thinking' || event_type === 'thought') {
        set_thinking_blocks(prev => [...prev.slice(-50), {
          id: event.id,
          content: String(event_data.content || event_data.text || ''),
          type: event_type,
          timestamp: event.created_at,
        }])
      } else if (event_type === 'code_cell') {
        set_execution_counter(prev => prev + 1)
        set_is_running(true)
        set_cells(prev => [...prev, {
          id: event.id,
          cell_type: 'code',
          content: String(event_data.content || event_data.code || ''),
          execution_number: execution_counter + 1,
          timestamp: event.created_at,
        }])
      } else if (event_type === 'output_cell') {
        set_is_running(false)
        set_cells(prev => [...prev, {
          id: event.id,
          cell_type: 'output',
          content: String(event_data.content || event_data.output || ''),
          timestamp: event.created_at,
        }])
      } else if (event_type === 'table_data') {
        set_is_running(false)
        const headers = Array.isArray(event_data.headers)
          ? (event_data.headers as string[])
          : []
        const rows = Array.isArray(event_data.rows)
          ? (event_data.rows as string[][])
          : []
        set_cells(prev => [...prev, {
          id: event.id,
          cell_type: 'table',
          content: '',
          table_data: { headers, rows },
          timestamp: event.created_at,
        }])
        if (typeof event_data.dataset_name === 'string') {
          set_dataset_name(event_data.dataset_name)
        }
        if (typeof event_data.row_count === 'number') {
          set_row_count(event_data.row_count)
        }
      } else if (event_type === 'pipeline_status') {
        if (Array.isArray(event_data.steps)) {
          set_pipeline_steps(event_data.steps as PipelineStep[])
        }
      }
    }

    fetch_events()

    const channel = supabase
      .channel(`data-stream-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        handle_event(payload.new as { id: string; event_type: string; data: Record<string, unknown>; created_at: string })
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

  useEffect(() => {
    if (notebook_ref.current !== null) {
      notebook_ref.current.scrollTop = notebook_ref.current.scrollHeight
    }
  }, [cells])

  const pipeline_dot_color = (status: string) => {
    if (status === 'complete') return 'bg-emerald-500'
    if (status === 'running') return 'bg-yellow-500 animate-pulse'
    if (status === 'failed') return 'bg-red-500'
    return 'bg-white/20'
  }

  return (
    <div className="h-full flex">
      {/* Thinking sidebar */}
      <div className="w-96 min-w-96 border-r border-white/[0.04] flex flex-col bg-black/30">
        <div className="text-xs uppercase tracking-wider text-white/30 px-4 py-3 border-b border-white/[0.04]">
          Thinking
        </div>
        <div ref={thinking_ref} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {thinking_blocks.length === 0 && (
            <div className="text-white/20 text-sm text-center py-8">Waiting for analysis...</div>
          )}
          {thinking_blocks.map(block => (
            <div key={block.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wider text-teal-400 mb-1">{block.type}</div>
              <p className="text-sm text-white/70 leading-relaxed">{block.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main notebook area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="h-10 flex items-center gap-3 px-4 border-b border-white/[0.04] bg-black/20">
          <span className="text-sm text-white/60">{dataset_name}</span>
          {row_count > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[10px]">
              {row_count.toLocaleString()} rows
            </span>
          )}
          {is_running && (
            <span className="flex items-center gap-1.5 text-[10px] text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Running
            </span>
          )}
        </div>

        {/* Notebook cells */}
        <div ref={notebook_ref} className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {cells.length === 0 && (
            <div className="flex items-center justify-center h-full text-white/20 text-sm">
              Notebook is empty
            </div>
          )}
          {cells.map(cell => (
            <div key={cell.id}>
              {cell.cell_type === 'code' && (
                <div className="bg-black/40 rounded-xl p-3 border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-teal-400 font-mono">
                      [In {cell.execution_number || '?'}]
                    </span>
                  </div>
                  <pre className="font-mono text-sm text-white/70 whitespace-pre-wrap overflow-x-auto">{cell.content}</pre>
                </div>
              )}
              {cell.cell_type === 'output' && (
                <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04] ml-4">
                  <pre className="font-mono text-sm text-white/60 whitespace-pre-wrap">{cell.content}</pre>
                </div>
              )}
              {cell.cell_type === 'table' && cell.table_data !== undefined && (
                <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] ml-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {cell.table_data.headers.map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-white/40 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {cell.table_data.rows.slice(0, 20).map((row, row_idx) => (
                        <tr key={row_idx}>
                          {row.map((val, col_idx) => (
                            <td key={col_idx} className="px-3 py-1.5 text-white/60 font-mono text-xs">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {cell.cell_type === 'chart' && (
                <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] ml-4 p-8 flex items-center justify-center text-white/20 text-sm">
                  Chart visualization
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pipeline status */}
        {pipeline_steps.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.04] bg-black/20">
            <span className="text-[10px] uppercase tracking-wider text-white/30">Pipeline</span>
            <div className="flex items-center gap-2">
              {pipeline_steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${pipeline_dot_color(step.status)}`} />
                  <span className="text-[10px] text-white/40">{step.name}</span>
                  {i < pipeline_steps.length - 1 && (
                    <span className="text-white/10 text-[10px]">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
