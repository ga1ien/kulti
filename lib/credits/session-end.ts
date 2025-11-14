/**
 * Session End Credits Distribution
 *
 * Handles calculating and distributing credits to all participants
 * when a session ends.
 */

import { createClient } from '@/lib/supabase/server'
import {
  addCredits,
  checkAndAwardMilestones,
  awardFirstSessionBonus,
  awardFirstStreamBonus,
} from './service'
import {
  calculateViewerCredits,
  calculateHostCredits,
  getSessionStats,
} from '@/lib/analytics/session-tracking'
import { notifyBadgeEarned } from '@/lib/notifications/service'
import { BADGE_INFO } from '@/lib/badges/constants'
import { logger } from '@/lib/logger'

export interface SessionEndResult {
  sessionId: string
  totalCreditsDistributed: number
  participantCredits: Array<{
    userId: string
    credits: number
    role: string
  }>
  milestonesAwarded: Array<{
    userId: string
    milestones: Array<{ milestone: string; credits: number }>
  }>
}

/**
 * End a session and distribute credits to all participants
 * Should be called when a session status changes to 'ended'
 */
export async function endSessionAndDistributeCredits(
  sessionId: string
): Promise<SessionEndResult> {
  const supabase = await createClient()

  // Mark session as ended if not already
  await supabase
    .from('sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .is('ended_at', null)

  // Get all participants
  const { data: participants } = await supabase
    .from('session_participants')
    .select('user_id, role')
    .eq('session_id', sessionId)

  if (!participants || participants.length === 0) {
    return {
      sessionId,
      totalCreditsDistributed: 0,
      participantCredits: [],
      milestonesAwarded: [],
    }
  }

  const participantCredits: Array<{
    userId: string
    credits: number
    role: string
  }> = []
  const milestonesAwarded: Array<{
    userId: string
    milestones: Array<{ milestone: string; credits: number }>
  }> = []
  let totalCreditsDistributed = 0

  // Calculate and award credits for each participant
  for (const participant of participants) {
    try {
      let credits = 0

      // Calculate based on role
      if (participant.role === 'host') {
        credits = await calculateHostCredits(sessionId)

        // Check for first stream bonus
        const { data: previousStreams, count } = await supabase
          .from('session_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', participant.user_id)
          .eq('role', 'host')
          .neq('session_id', sessionId)

        if (count === 0) {
          await awardFirstStreamBonus(participant.user_id)
        }
      } else {
        // Viewer or presenter
        credits = await calculateViewerCredits(sessionId, participant.user_id)

        // Check for first session bonus
        const { data: previousSessions, count } = await supabase
          .from('session_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', participant.user_id)
          .neq('session_id', sessionId)

        if (count === 0) {
          await awardFirstSessionBonus(participant.user_id)
        }
      }

      // Award the credits
      if (credits > 0) {
        const transactionType =
          participant.role === 'host' ? 'earned_hosting' : 'earned_watching'

        await addCredits({
          userId: participant.user_id,
          amount: credits,
          type: transactionType,
          sourceSessionId: sessionId,
          metadata: {
            role: participant.role,
            session_end: true,
          },
        })

        // Update participant record
        await supabase
          .from('session_participants')
          .update({ credits_earned: credits })
          .eq('session_id', sessionId)
          .eq('user_id', participant.user_id)

        totalCreditsDistributed += credits
        participantCredits.push({
          userId: participant.user_id,
          credits,
          role: participant.role,
        })
      }

      // Check for milestone achievements
      const milestones = await checkAndAwardMilestones(participant.user_id)
      if (milestones.count > 0) {
        milestonesAwarded.push({
          userId: participant.user_id,
          milestones: milestones.milestones_awarded,
        })
      }

      // Check and award badges based on updated stats
      const { checkAndAwardBadges } = await import('@/lib/badges')
      const badgeResult = await checkAndAwardBadges(participant.user_id)

      // Send notifications for newly earned badges
      if (badgeResult.success && badgeResult.badges_awarded.length > 0) {
        for (const badgeId of badgeResult.badges_awarded) {
          try {
            const badgeInfo = BADGE_INFO[badgeId]
            if (badgeInfo) {
              await notifyBadgeEarned(
                participant.user_id,
                badgeId,
                badgeInfo.name
              )
            }
          } catch (notifError) {
            logger.error('Failed to send badge notification', { error: notifError, userId: participant.user_id })
            // Continue with other notifications
          }
        }
      }
    } catch (error) {
      logger.error('Failed to process credits for user', { error, userId: participant.user_id, sessionId })
      // Continue with other participants even if one fails
    }
  }

  // Update session with total credits distributed
  await supabase
    .from('sessions')
    .update({
      total_credits_distributed: totalCreditsDistributed,
      credits_calculated: true,
    })
    .eq('id', sessionId)

  // Get and update session stats
  const stats = await getSessionStats(sessionId)
  if (stats) {
    await supabase
      .from('sessions')
      .update({
        avg_concurrent_viewers: stats.avg_concurrent_viewers,
        engagement_score: stats.engagement_score,
      })
      .eq('id', sessionId)
  }

  return {
    sessionId,
    totalCreditsDistributed,
    participantCredits,
    milestonesAwarded,
  }
}

/**
 * Manually trigger session end (for API or admin use)
 */
export async function triggerSessionEnd(sessionId: string): Promise<SessionEndResult> {
  const supabase = await createClient()

  // Verify session exists and is not already ended
  const { data: session } = await supabase
    .from('sessions')
    .select('status, credits_calculated')
    .eq('id', sessionId)
    .single()

  if (!session) {
    throw new Error('Session not found')
  }

  if (session.credits_calculated) {
    throw new Error('Credits already calculated for this session')
  }

  return endSessionAndDistributeCredits(sessionId)
}
