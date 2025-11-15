/**
 * Presence Update API
 *
 * Update user's online status and current session
 * Called via heartbeat (every 30 seconds) and on page load/unload
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isOnline, sessionId = null } = body

    // Update presence using database function
    const { error } = await supabase.rpc('update_user_presence', {
      p_user_id: user.id,
      p_is_online: isOnline,
      p_session_id: sessionId,
    })

    if (error) {
      logger.error('Update presence error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to update presence' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      isOnline,
      sessionId,
    })
  } catch (error) {
    logger.error('Update presence error:', { error: error })
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current presence
    const { data: presence, error } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no presence record exists, create one
      if (error.code === 'PGRST116') {
        await supabase.rpc('update_user_presence', {
          p_user_id: user.id,
          p_is_online: true,
          p_session_id: null,
        })

        return NextResponse.json({
          isOnline: true,
          availableForMatching: true,
          currentSessionId: null,
        })
      }

      logger.error('Get presence error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to get presence' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      isOnline: presence.is_online,
      availableForMatching: presence.available_for_matching,
      currentSessionId: presence.current_session_id,
      lastSeen: presence.last_seen,
    })
  } catch (error) {
    logger.error('Get presence error:', { error: error })
    return NextResponse.json(
      { error: 'Failed to get presence' },
      { status: 500 }
    )
  }
}
