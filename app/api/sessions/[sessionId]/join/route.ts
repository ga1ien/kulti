/**
 * Session Join API
 *
 * Called when a user joins a session to update streak and badges
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { onSessionJoin } from '@/lib/streaks'

export async function POST(
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

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update streak and award badges
    const result = await onSessionJoin(user.id, sessionId)

    return NextResponse.json({
      success: true,
      streak: result.streak,
      badges: result.badges,
    })
  } catch (error) {
    console.error('Session join error:', error)
    return NextResponse.json(
      { error: 'Failed to process session join' },
      { status: 500 }
    )
  }
}
