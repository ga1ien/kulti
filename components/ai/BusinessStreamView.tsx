'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ThinkingBlock {
  id: string
  content: string
  type: string
  timestamp: string
}

interface KpiCard {
  id: string
  label: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'flat'
  timestamp: string
}

interface StrategyDoc {
  id: string
  title: string
  content: string
  timestamp: string
}

interface Decision {
  id: string
  title: string
  reasoning: string
  outcome?: string
  timestamp: string
}

interface BusinessStreamViewProps {
  sessionId: string
  agentName: string
}

export default function BusinessStreamView({ sessionId, agentName }: BusinessStreamViewProps) {
  const [thinking_blocks, set_thinking_blocks] = useState<ThinkingBlock[]>([])
  const [kpi_cards, set_kpi_cards] = useState<KpiCard[]>([
    { id: '1', label: 'Revenue', value: '$0', trend: 'flat', timestamp: '' },
    { id: '2', label: 'Users', value: '0', trend: 'flat', timestamp: '' },
    { id: '3', label: 'Tasks', value: '0', trend: 'flat', timestamp: '' },
    { id: '4', label: 'Growth', value: '0%', trend: 'flat', timestamp: '' },
  ])
  const [strategy_doc, set_strategy_doc] = useState<StrategyDoc | null>(null)
  const [decisions, set_decisions] = useState<Decision[]>([])
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
      } else if (event_type === 'kpi') {
        set_kpi_cards(prev => {
          const label = String(event_data.label || '')
          const next = prev.map(card => {
            if (card.label.toLowerCase() === label.toLowerCase()) {
              return {
                ...card,
                value: String(event_data.value || card.value),
                change: event_data.change !== undefined ? String(event_data.change) : card.change,
                trend: (event_data.trend as 'up' | 'down' | 'flat') || card.trend,
                timestamp: event.created_at,
              }
            }
            return card
          })
          return next
        })
      } else if (event_type === 'strategy') {
        set_strategy_doc({
          id: event.id,
          title: String(event_data.title || 'Strategy'),
          content: String(event_data.content || ''),
          timestamp: event.created_at,
        })
      } else if (event_type === 'decision') {
        set_decisions(prev => [{
          id: event.id,
          title: String(event_data.title || ''),
          reasoning: String(event_data.reasoning || ''),
          outcome: event_data.outcome !== undefined ? String(event_data.outcome) : undefined,
          timestamp: event.created_at,
        }, ...prev].slice(0, 50))
      }
    }

    fetch_events()

    const channel = supabase
      .channel(`business-stream-${sessionId}`)
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

  const trend_color = (trend?: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return 'border-t-emerald-500'
    if (trend === 'down') return 'border-t-red-500'
    return 'border-t-white/10'
  }

  const trend_text_color = (trend?: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return 'text-emerald-400'
    if (trend === 'down') return 'text-red-400'
    return 'text-white/30'
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
            <div className="text-white/20 text-sm text-center py-8">Waiting for thoughts...</div>
          )}
          {thinking_blocks.map(block => (
            <div key={block.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">{block.type}</div>
              <p className="text-sm text-white/70 leading-relaxed">{block.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main dashboard */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/[0.04]">
          {kpi_cards.map(card => (
            <div key={card.id} className={`bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 border-t-2 ${trend_color(card.trend)}`}>
              <div className="text-xs text-white/40 mb-1">{card.label}</div>
              <div className="text-2xl font-bold text-white/90">{card.value}</div>
              {card.change !== undefined && (
                <div className={`text-xs mt-1 ${trend_text_color(card.trend)}`}>
                  {card.trend === 'up' ? '↑' : card.trend === 'down' ? '↓' : '→'} {card.change}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Strategy Doc */}
        <div className="flex-1 overflow-y-auto p-6 border-b border-white/[0.04]">
          {strategy_doc !== null ? (
            <div>
              <h3 className="text-lg font-medium text-white/90 mb-3">{strategy_doc.title}</h3>
              <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{strategy_doc.content}</div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white/20 text-sm">
              No strategy document yet
            </div>
          )}
        </div>

        {/* Decision Log */}
        <div className="max-h-64 overflow-y-auto border-t border-white/[0.04]">
          <div className="text-xs uppercase tracking-wider text-white/30 px-4 py-3 border-b border-white/[0.04]">
            Decision Log
          </div>
          {decisions.length === 0 ? (
            <div className="p-4 text-white/20 text-sm text-center">No decisions recorded yet</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {decisions.map(decision => (
                <div key={decision.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white/80">{decision.title}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(decision.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{decision.reasoning}</p>
                  {decision.outcome !== undefined && (
                    <div className="mt-1 text-[10px] text-blue-400">Outcome: {decision.outcome}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
