/**
 * Badge Service
 *
 * Handles badge awarding and checking logic
 */

import { createClient } from '@/lib/supabase/server'

// Re-export badge info from constants
export { BADGE_INFO } from './constants'

export interface BadgeResult {
  success: boolean
  badge_id: string
  newly_awarded: boolean
  message?: string
}

export interface CheckBadgesResult {
  success: boolean
  badges_awarded: string[]
  count: number
}

/**
 * Award a specific badge to a user
 */
export async function awardBadge(userId: string, badgeId: string): Promise<BadgeResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('award_badge', {
    p_user_id: userId,
    p_badge_id: badgeId,
  })

  if (error) {
    console.error('Failed to award badge:', error)
    return {
      success: false,
      badge_id: badgeId,
      newly_awarded: false,
      message: error.message,
    }
  }

  return data as BadgeResult
}

/**
 * Check user stats and award all applicable badges
 */
export async function checkAndAwardBadges(userId: string): Promise<CheckBadgesResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('check_and_award_badges', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Failed to check and award badges:', error)
    return {
      success: false,
      badges_awarded: [],
      count: 0,
    }
  }

  return data as CheckBadgesResult
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('badges')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Failed to get user badges:', error)
    return []
  }

  return data?.badges || []
}
