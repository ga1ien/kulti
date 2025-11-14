/**
 * Streak Service
 *
 * Handles daily streak tracking and rewards
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface StreakResult {
  success: boolean
  current_streak: number
  longest_streak: number
  streak_broken: boolean
  streak_continued: boolean
  milestone_awarded: boolean
  message?: string
}

export interface SessionJoinResult {
  success: boolean
  streak: StreakResult
  badges: {
    success: boolean
    badges_awarded: string[]
    count: number
  }
}

/**
 * Update user's daily streak
 * Should be called when user joins a session
 */
export async function updateStreak(userId: string): Promise<StreakResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('update_streak', {
    p_user_id: userId,
  })

  if (error) {
    logger.error('Failed to update streak:', error)
    return {
      success: false,
      current_streak: 0,
      longest_streak: 0,
      streak_broken: false,
      streak_continued: false,
      milestone_awarded: false,
      message: error.message,
    }
  }

  return data as StreakResult
}

/**
 * Called when user joins a session
 * Updates streak and awards badges in one transaction
 */
export async function onSessionJoin(userId: string, sessionId: string): Promise<SessionJoinResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('on_session_join', {
    p_user_id: userId,
    p_session_id: sessionId,
  })

  if (error) {
    logger.error('Failed to process session join:', error)
    return {
      success: false,
      streak: {
        success: false,
        current_streak: 0,
        longest_streak: 0,
        streak_broken: false,
        streak_continued: false,
        milestone_awarded: false,
      },
      badges: {
        success: false,
        badges_awarded: [],
        count: 0,
      },
    }
  }

  return data as SessionJoinResult
}

/**
 * Get user's current streak info
 */
export async function getUserStreak(userId: string): Promise<{
  current_streak: number
  longest_streak: number
  last_active_date: string | null
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date')
    .eq('id', userId)
    .single()

  if (error) {
    logger.error('Failed to get user streak:', error)
    return null
  }

  return {
    current_streak: data.current_streak || 0,
    longest_streak: data.longest_streak || 0,
    last_active_date: data.last_active_date,
  }
}

/**
 * Streak milestone rewards
 */
export const STREAK_MILESTONES = {
  7: { credits: 100, name: '7 Day Streak' },
  30: { credits: 500, name: '30 Day Streak' },
  100: { credits: 2000, name: '100 Day Streak' },
} as const
