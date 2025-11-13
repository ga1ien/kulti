/**
 * Credits Service
 *
 * Core service for managing credits in the Kulti platform.
 * Handles adding, deducting, and querying credit balances.
 */

import { createClient } from '@/lib/supabase/server'
import type { TransactionType } from './config'

export interface CreditBalance {
  credits_balance: number
  total_credits_earned: number
  total_credits_spent: number
  credits_updated_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  balance_after: number
  type: TransactionType
  source_session_id: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface AddCreditsParams {
  userId: string
  amount: number
  type: TransactionType
  sourceSessionId?: string
  metadata?: Record<string, any>
}

export interface AddCreditsResult {
  success: boolean
  transaction_id: string
  new_balance: number
  amount: number
}

/**
 * Add credits to a user's account
 * Uses the Postgres function for transaction safety
 */
export async function addCredits(params: AddCreditsParams): Promise<AddCreditsResult> {
  const supabase = await createClient()
  const { userId, amount, type, sourceSessionId = null, metadata = {} } = params

  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_source_session_id: sourceSessionId,
    p_metadata: metadata,
  })

  if (error) {
    console.error('Failed to add credits:', error)
    throw new Error(`Failed to add credits: ${error.message}`)
  }

  return data as AddCreditsResult
}

/**
 * Deduct credits from a user's account
 * Just a wrapper around addCredits with negative amount
 */
export async function deductCredits(params: AddCreditsParams): Promise<AddCreditsResult> {
  return addCredits({
    ...params,
    amount: -Math.abs(params.amount), // Ensure negative
  })
}

/**
 * Get a user's current credit balance
 */
export async function getBalance(userId: string): Promise<CreditBalance | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance, total_credits_earned, total_credits_spent, credits_updated_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Failed to get credit balance:', error)
    return null
  }

  return data
}

/**
 * Get a user's transaction history
 */
export async function getTransactions(
  userId: string,
  options: {
    limit?: number
    offset?: number
    type?: TransactionType
  } = {}
): Promise<CreditTransaction[]> {
  const { limit = 50, offset = 0, type } = options
  const supabase = await createClient()

  let query = supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to get transactions:', error)
    return []
  }

  return data || []
}

/**
 * Get recent transactions across all users (for leaderboard/activity feed)
 */
export async function getRecentTransactions(limit: number = 10): Promise<CreditTransaction[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get recent transactions:', error)
    return []
  }

  return data || []
}

/**
 * Check if user has sufficient balance for a purchase
 */
export async function hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
  const balance = await getBalance(userId)
  return balance ? balance.credits_balance >= amount : false
}

/**
 * Check and award milestones for a user
 * Returns list of newly awarded milestones
 */
export async function checkAndAwardMilestones(userId: string): Promise<{
  milestones_awarded: Array<{ milestone: string; credits: number }>
  count: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('check_and_award_milestones', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Failed to check milestones:', error)
    return { milestones_awarded: [], count: 0 }
  }

  return data
}

/**
 * Get top credit earners (leaderboard)
 */
export async function getTopEarners(limit: number = 10): Promise<
  Array<{
    user_id: string
    username: string
    display_name: string
    total_credits_earned: number
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, total_credits_earned')
    .order('total_credits_earned', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get top earners:', error)
    return []
  }

  return data?.map((profile) => ({
    user_id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    total_credits_earned: profile.total_credits_earned,
  })) || []
}

/**
 * Get user's credit stats from view
 */
export async function getUserStats(userId: string): Promise<{
  credits_balance: number
  total_credits_earned: number
  total_credits_spent: number
  sessions_attended: number
  sessions_hosted: number
  total_hours_watched: number
  total_hours_streamed: number
  milestones_achieved: number
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_credit_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Failed to get user stats:', error)
    return null
  }

  return data
}

/**
 * Award first session bonus (called when user attends their first session)
 */
export async function awardFirstSessionBonus(userId: string): Promise<void> {
  const supabase = await createClient()

  // Check if already awarded
  const { data: existing } = await supabase
    .from('credit_milestones')
    .select('id')
    .eq('user_id', userId)
    .eq('milestone_type', 'first_session')
    .single()

  if (existing) {
    return // Already awarded
  }

  // Award the bonus
  await addCredits({
    userId,
    amount: 100,
    type: 'bonus_first_session',
    metadata: { milestone: 'first_session' },
  })

  // Record the milestone
  await supabase.from('credit_milestones').insert({
    user_id: userId,
    milestone_type: 'first_session',
    credits_awarded: 100,
  })
}

/**
 * Award first stream bonus (called when user hosts their first session)
 */
export async function awardFirstStreamBonus(userId: string): Promise<void> {
  const supabase = await createClient()

  // Check if already awarded
  const { data: existing } = await supabase
    .from('credit_milestones')
    .select('id')
    .eq('user_id', userId)
    .eq('milestone_type', 'first_stream')
    .single()

  if (existing) {
    return // Already awarded
  }

  // Award the bonus
  await addCredits({
    userId,
    amount: 200,
    type: 'bonus_first_session',
    metadata: { milestone: 'first_stream' },
  })

  // Record the milestone
  await supabase.from('credit_milestones').insert({
    user_id: userId,
    milestone_type: 'first_stream',
    credits_awarded: 200,
  })
}

/**
 * Get user's milestone achievements
 */
export async function getUserMilestones(userId: string): Promise<
  Array<{
    milestone_type: string
    credits_awarded: number
    achieved_at: string
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('credit_milestones')
    .select('milestone_type, credits_awarded, achieved_at')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })

  if (error) {
    console.error('Failed to get user milestones:', error)
    return []
  }

  return data || []
}

/**
 * Tip another user (send credits as a gift)
 */
export async function tipUser(params: {
  fromUserId: string
  toUserId: string
  amount: number
  sessionId?: string
  message?: string
}): Promise<{ success: boolean; error?: string }> {
  const { fromUserId, toUserId, amount, sessionId, message } = params
  const supabase = await createClient()

  // Check sender has sufficient balance
  const hasBalance = await hasSufficientBalance(fromUserId, amount)
  if (!hasBalance) {
    return { success: false, error: 'Insufficient balance' }
  }

  try {
    // Fetch usernames for both users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', [fromUserId, toUserId])

    const fromUser = users?.find(u => u.id === fromUserId)
    const toUser = users?.find(u => u.id === toUserId)

    // Deduct from sender
    await deductCredits({
      userId: fromUserId,
      amount,
      type: 'spent_tipping',
      sourceSessionId: sessionId,
      metadata: {
        recipientId: toUserId,
        recipientUsername: toUser?.username,
        message
      },
    })

    // Add to recipient
    await addCredits({
      userId: toUserId,
      amount,
      type: 'received_tip',
      sourceSessionId: sessionId,
      metadata: {
        fromUserId,
        fromUsername: fromUser?.username,
        message
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to tip user:', error)
    return { success: false, error: 'Failed to process tip' }
  }
}
