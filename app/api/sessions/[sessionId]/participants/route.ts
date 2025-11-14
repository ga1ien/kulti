/**
 * Session Participants API
 *
 * Get list of participants for user selection in AI module
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await context.params

    // Verify session exists and user has access
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, host_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get all participants with their profile info
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select(`
        user_id,
        role,
        joined_at,
        profiles!user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true })

    if (participantsError) {
      logger.error('Failed to fetch participants', { error: participantsError, sessionId })
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedParticipants = participants.map((p) => {
      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
      return {
        userId: p.user_id,
        role: p.role,
        username: profile?.username || 'Unknown',
        displayName: profile?.display_name || profile?.username || 'Unknown User',
        avatarUrl: profile?.avatar_url || null,
        joinedAt: p.joined_at,
      }
    })

    return NextResponse.json({
      participants: formattedParticipants,
    })
  } catch (error) {
    logger.error('Session participants API error', { error })
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}
