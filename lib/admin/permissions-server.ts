import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from './permissions'

/**
 * Check if a user has admin role
 */
export async function checkIsAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'admin'
}

/**
 * Check if a user has moderator or admin role
 */
export async function checkIsModerator(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'moderator' || profile?.role === 'admin'
}

/**
 * Get user's role
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return (profile?.role as UserRole) || 'user'
}

/**
 * Middleware helper to require admin access for API routes
 * Returns an error response if not authorized, null if authorized
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = await checkIsAdmin(supabase, user.id)
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    )
  }

  return null // No error, proceed
}

/**
 * Middleware helper to require moderator or admin access for API routes
 * Returns an error response if not authorized, null if authorized
 */
export async function requireModerator(
  request: NextRequest
): Promise<NextResponse | null> {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isModerator = await checkIsModerator(supabase, user.id)
  if (!isModerator) {
    return NextResponse.json(
      { error: 'Forbidden - Moderator access required' },
      { status: 403 }
    )
  }

  return null // No error, proceed
}
