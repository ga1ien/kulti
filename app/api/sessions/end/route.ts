/**
 * End Session API
 *
 * Ends a session and distributes credits to all participants
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { endSessionAndDistributeCredits } from '@/lib/credits/session-end'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Verify user is the host of this session
    const { data: session } = await supabase
      .from('sessions')
      .select('host_id, status, credits_calculated')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can end the session' },
        { status: 403 }
      )
    }

    if (session.status === 'ended' && session.credits_calculated) {
      return NextResponse.json(
        { error: 'Session already ended and credits calculated' },
        { status: 400 }
      )
    }

    // End session and distribute credits
    const result = await endSessionAndDistributeCredits(sessionId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('End session error', { error })
    return NextResponse.json(
      {
        error: 'Failed to end session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
