/**
 * Session Summary API
 *
 * Get credits breakdown for a completed session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateViewerCredits,
  calculateHostCredits,
} from '@/lib/analytics/session-tracking'
import { MILESTONES } from '@/lib/credits/config'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await context.params

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get participant record
    const { data: participant } = await supabase
      .from('session_participants')
      .select('role, watch_duration_seconds, credits_earned')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Calculate credits breakdown
    let baseCredits = 0
    const bonuses: Record<string, number> = {}

    if (participant.role === 'host') {
      baseCredits = await calculateHostCredits(sessionId)
    } else {
      // Get detailed viewer stats for bonus calculation
      const { data: stats } = await supabase
        .from('session_participants')
        .select('chat_messages_count, helped_others_count')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()

      baseCredits = Math.floor(participant.watch_duration_seconds / 60) // 1 credit per minute

      // Calculate bonuses (simplified - you can expand this logic)
      if (stats?.chat_messages_count && stats.chat_messages_count > 5) {
        bonuses.active_chat = Math.floor(baseCredits * 0.5)
      }
      if (stats?.helped_others_count && stats.helped_others_count > 0) {
        bonuses.helped_others = stats.helped_others_count * 50
      }
      if (participant.watch_duration_seconds > 1800) {
        // 30+ minutes
        bonuses.completion = Math.floor(baseCredits * 1.0)
      }
    }

    // Check for milestones achieved in this session
    const { data: milestones } = await supabase
      .from('credit_milestones')
      .select('milestone_type, credits_awarded, achieved_at')
      .eq('user_id', user.id)
      .gte(
        'achieved_at',
        new Date(Date.now() - 5 * 60 * 1000).toISOString()
      ) // Last 5 minutes

    const milestonesFormatted = milestones?.map((m) => ({
      label:
        Object.values(MILESTONES).find((def) => def.type === m.milestone_type)
          ?.type || m.milestone_type,
      reward: m.credits_awarded,
    }))

    return NextResponse.json({
      total_credits_earned: participant.credits_earned,
      base_credits: baseCredits,
      bonuses,
      milestones: milestonesFormatted,
      watch_duration_seconds: participant.watch_duration_seconds,
      role: participant.role,
    })
  } catch (error) {
    console.error('Get session summary error:', error)
    return NextResponse.json(
      { error: 'Failed to get session summary' },
      { status: 500 }
    )
  }
}
