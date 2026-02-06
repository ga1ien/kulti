'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ThinkingBlock {
  id: string
  content: string
  type: string
  timestamp: string
}

interface StartupMetric {
  id: string
  label: string
  value: string
  timestamp: string
}

interface KanbanTask {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  timestamp: string
}

interface Milestone {
  id: string
  title: string
  completed: boolean
  timestamp: string
}

interface StartupStreamViewProps {
  sessionId: string
  agentName: string
}

export default function StartupStreamView({ sessionId, agentName }: StartupStreamViewProps) {
  const [thinking_blocks, set_thinking_blocks] = useState<ThinkingBlock[]>([])
  const [metrics, set_metrics] = useState<StartupMetric[]>([
    { id: '1', label: 'Users', value: '0', timestamp: '' },
    { id: '2', label: 'Revenue', value: '$0', timestamp: '' },
    { id: '3', label: 'MRR', value: '$0', timestamp: '' },
    { id: '4', label: 'Runway', value: '—', timestamp: '' },
  ])
  const [tasks, set_tasks] = useState<KanbanTask[]>([])
  const [milestones, set_milestones] = useState<Milestone[]>([])
  const thinking_ref = useRef<HTMLDivElement>(null)

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
      } else if (event_type === 'metric') {
        set_metrics(prev => {
          const label = String(event_data.label || '')
          return prev.map(m => {
            if (m.label.toLowerCase() === label.toLowerCase()) {
              return { ...m, value: String(event_data.value || m.value), timestamp: event.created_at }
            }
            return m
          })
        })
      } else if (event_type === 'task') {
        const task_id = String(event_data.id || event.id)
        set_tasks(prev => {
          const existing_index = prev.findIndex(t => t.id === task_id)
          const new_task: KanbanTask = {
            id: task_id,
            title: String(event_data.title || ''),
            description: event_data.description !== undefined ? String(event_data.description) : undefined,
            status: (event_data.status as 'todo' | 'in_progress' | 'done') || 'todo',
            priority: (event_data.priority as 'low' | 'medium' | 'high') || 'medium',
            timestamp: event.created_at,
          }
          if (existing_index >= 0) {
            const next = [...prev]
            next[existing_index] = new_task
            return next
          }
          return [...prev, new_task]
        })
      } else if (event_type === 'milestone') {
        const milestone_id = String(event_data.id || event.id)
        set_milestones(prev => {
          const existing_index = prev.findIndex(m => m.id === milestone_id)
          const new_milestone: Milestone = {
            id: milestone_id,
            title: String(event_data.title || ''),
            completed: Boolean(event_data.completed),
            timestamp: event.created_at,
          }
          if (existing_index >= 0) {
            const next = [...prev]
            next[existing_index] = new_milestone
            return next
          }
          return [...prev, new_milestone]
        })
      }
    }

    fetch_events()

    const channel = supabase
      .channel(`startup-stream-${sessionId}`)
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

  const todo_tasks = tasks.filter(t => t.status === 'todo')
  const in_progress_tasks = tasks.filter(t => t.status === 'in_progress')
  const done_tasks = tasks.filter(t => t.status === 'done')

  const completed_milestones = milestones.filter(m => m.completed).length
  const total_milestones = milestones.length
  const milestone_progress = total_milestones > 0 ? (completed_milestones / total_milestones) * 100 : 0

  const priority_border = (priority: string) => {
    if (priority === 'high') return 'border-l-red-500'
    if (priority === 'medium') return 'border-l-yellow-500'
    return 'border-l-emerald-500'
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
            <div className="text-white/20 text-sm text-center py-8">Waiting for ideas...</div>
          )}
          {thinking_blocks.map(block => (
            <div key={block.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">{block.type}</div>
              <p className="text-sm text-white/70 leading-relaxed">{block.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Metrics bar */}
        <div className="flex items-center gap-3 p-3 border-b border-white/[0.04]">
          {metrics.map(metric => (
            <div key={metric.id} className="flex-1 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">{metric.label}</div>
              <div className="text-lg font-bold text-white/90">{metric.value}</div>
            </div>
          ))}
        </div>

        {/* Kanban board */}
        <div className="flex-1 flex gap-3 p-4 overflow-hidden">
          {/* Todo column */}
          <div className="flex-1 bg-white/[0.01] rounded-xl p-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-white/50">Todo</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/40">
                {todo_tasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {todo_tasks.map(task => (
                <div key={task.id} className={`bg-white/[0.03] p-3 rounded-lg border-l-2 ${priority_border(task.priority)}`}>
                  <div className="text-sm text-white/80">{task.title}</div>
                  {task.description !== undefined && (
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* In Progress column */}
          <div className="flex-1 bg-white/[0.01] rounded-xl p-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-white/50">In Progress</span>
              <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-[10px] text-yellow-400">
                {in_progress_tasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {in_progress_tasks.map(task => (
                <div key={task.id} className={`bg-white/[0.03] p-3 rounded-lg border-l-2 ${priority_border(task.priority)}`}>
                  <div className="text-sm text-white/80">{task.title}</div>
                  {task.description !== undefined && (
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Done column */}
          <div className="flex-1 bg-white/[0.01] rounded-xl p-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-white/50">Done</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-400">
                {done_tasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {done_tasks.map(task => (
                <div key={task.id} className={`bg-white/[0.03] p-3 rounded-lg border-l-2 border-l-emerald-500 opacity-60`}>
                  <div className="text-sm text-white/80 line-through">{task.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MVP Progress */}
        <div className="p-4 border-t border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">MVP Progress</span>
            <span className="text-[10px] text-white/30">
              {completed_milestones}/{total_milestones} milestones
            </span>
          </div>
          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${milestone_progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
