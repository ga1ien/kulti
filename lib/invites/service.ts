/**
 * Invite Service
 *
 * Service layer for managing invite codes, usage tracking, and analytics
 */

import { createClient } from '@/lib/supabase/server'
import type { Invite, InviteUse, InviteStats } from '@/types/database'

/**
 * Metadata that can be attached to invites
 * Flexible structure for tracking invite sources, campaigns, etc.
 */
export type InviteMetadata = Record<string, string | number | boolean | null>

export interface CreateInviteParams {
  maxUses?: number
  expiresAt?: string | null
  metadata?: InviteMetadata
}

export interface CreateInviteResult {
  success: boolean
  invite_id: string
  code: string
}

export interface ValidateInviteResult {
  isValid: boolean
  error?: string
  invite?: Invite
}

/**
 * Create a new invite code
 * Only callable by admins and moderators
 */
export async function createInviteCode(
  params: CreateInviteParams = {}
): Promise<CreateInviteResult> {
  const supabase = await createClient()
  const { maxUses = 1, expiresAt = null, metadata = {} } = params

  const { data, error } = await supabase.rpc('create_invite_code', {
    p_max_uses: maxUses,
    p_expires_at: expiresAt,
    p_metadata: metadata,
  })

  if (error) {
    console.error('Failed to create invite code:', error)
    throw new Error(`Failed to create invite code: ${error.message}`)
  }

  return data as CreateInviteResult
}

/**
 * Validate an invite code
 * Checks if code is valid, not expired, and has remaining uses
 */
export async function validateInviteCode(
  code: string
): Promise<ValidateInviteResult> {
  const supabase = await createClient()

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[validateInviteCode] Database error:', error)
    return { isValid: false, error: 'Invalid invite code' }
  }

  if (!invite) {
    return { isValid: false, error: 'Invalid invite code' }
  }

  if (invite.current_uses >= invite.max_uses) {
    return { isValid: false, error: 'Invite code has been fully used' }
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { isValid: false, error: 'Invite code has expired' }
  }

  return { isValid: true, invite }
}

/**
 * Use an invite code (called during signup)
 * Records the usage and awards referral credits
 * Now includes race condition protection via database constraints
 */
export async function useInviteCode(
  code: string,
  userId: string,
  metadata: InviteMetadata = {}
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('use_invite_code', {
    p_code: code,
    p_user_id: userId,
    p_metadata: metadata,
  })

  if (error) {
    console.error('Failed to use invite code:', error)

    // Handle specific race condition errors
    if (error.message?.includes('lock_not_available')) {
      return {
        success: false,
        error: 'This invite code is currently being processed. Please try again in a moment.'
      }
    }

    if (error.message?.includes('unique_violation') || error.message?.includes('already used')) {
      return {
        success: false,
        error: 'You have already used this invite code'
      }
    }

    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  return { success: true }
}

/**
 * Get all invite codes (admin/moderator view)
 */
export async function getAllInvites(options: {
  page?: number
  limit?: number
  includeInactive?: boolean
} = {}): Promise<Invite[]> {
  const { page = 1, limit = 50, includeInactive = false } = options
  const supabase = await createClient()
  const offset = (page - 1) * limit

  let query = supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to get invites:', error)
    return []
  }

  return data || []
}

/**
 * Get invite codes created by a specific user
 */
export async function getUserInvites(userId: string): Promise<Invite[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get user invites:', error)
    return []
  }

  return data || []
}

/**
 * Get invite analytics/statistics
 */
export async function getInviteAnalytics(
  inviteId: string
): Promise<InviteStats | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_invite_analytics', {
    p_invite_id: inviteId,
  })

  if (error) {
    console.error('Failed to get invite analytics:', error)
    return null
  }

  return data
}

/**
 * Get platform-wide invite statistics
 */
export async function getPlatformInviteStats(): Promise<{
  total_codes: number
  total_uses: number
  active_codes: number
  top_codes: InviteStats[]
}> {
  const supabase = await createClient()

  // Get overall stats
  const { data: invites } = await supabase
    .from('invites')
    .select('id, is_active, current_uses')

  const totalCodes = invites?.length || 0
  const activeCodes = invites?.filter((i) => i.is_active).length || 0
  const totalUses = invites?.reduce((sum, i) => sum + i.current_uses, 0) || 0

  // Get top performing codes
  const { data: topCodes } = await supabase
    .from('invite_stats')
    .select('*')
    .order('total_uses', { ascending: false })
    .limit(10)

  return {
    total_codes: totalCodes,
    total_uses: totalUses,
    active_codes: activeCodes,
    top_codes: (topCodes as InviteStats[]) || [],
  }
}

/**
 * Deactivate an invite code
 */
export async function deactivateInvite(inviteId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invites')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', inviteId)

  if (error) {
    console.error('Failed to deactivate invite:', error)
    return false
  }

  return true
}

/**
 * Reactivate an invite code
 */
export async function reactivateInvite(inviteId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invites')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', inviteId)

  if (error) {
    console.error('Failed to reactivate invite:', error)
    return false
  }

  return true
}

/**
 * Profile data structure returned from database join
 */
interface InviteUseWithProfile {
  used_at: string
  used_by: string
  profiles: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
}

/**
 * Get users who signed up with a specific invite code
 */
export async function getInviteUsers(inviteId: string): Promise<
  Array<{
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    used_at: string
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invite_uses')
    .select(
      `
      used_at,
      used_by,
      profiles:used_by (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('invite_id', inviteId)
    .order('used_at', { ascending: false })

  if (error) {
    console.error('Failed to get invite users:', error)
    return []
  }

  return (
    (data as unknown as InviteUseWithProfile[])?.map((row) => ({
      id: row.profiles.id,
      username: row.profiles.username,
      display_name: row.profiles.display_name,
      avatar_url: row.profiles.avatar_url,
      used_at: row.used_at,
    })) || []
  )
}
