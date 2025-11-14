/**
 * Guest Presenter Join API
 *
 * Allows users to join a session as a guest presenter using an invite token.
 * No authentication required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { token, displayName } = await request.json()

    if (!token || !displayName) {
      return NextResponse.json(
        { error: 'Token and display name are required' },
        { status: 400 }
      )
    }

    // Validate display name
    const trimmedName = displayName.trim()
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Display name must be between 2 and 50 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Validate token and get session info (no auth required)
    const { data: sessionData, error: sessionError } = await supabase.rpc(
      'get_session_by_presenter_token',
      { p_token: token }
    )

    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 404 }
      )
    }

    const session = sessionData[0]

    // Add guest presenter to database
    const { data: guestId, error: guestError } = await supabase.rpc(
      'add_guest_presenter',
      {
        p_session_id: session.session_id,
        p_display_name: trimmedName,
        p_hms_peer_id: null, // Will be set when they join HMS
      }
    )

    if (guestError) {
      logger.error('Add guest presenter error', { error: guestError, token })
      if (guestError.message.includes('already in use')) {
        return NextResponse.json(
          { error: 'This display name is already in use. Please choose another.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to join as guest presenter' },
        { status: 500 }
      )
    }

    // Generate HMS token for guest presenter
    const hmsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hms/get-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.session_id,
          role: 'presenter',
          userId: `guest_${guestId}`, // Guest identifier
          isGuest: true,
        }),
      }
    )

    if (!hmsResponse.ok) {
      logger.error('HMS token generation failed for guest', { guestId, sessionId: session.session_id })
      return NextResponse.json(
        { error: 'Failed to generate video token' },
        { status: 500 }
      )
    }

    const { token: hmsToken } = await hmsResponse.json()

    return NextResponse.json({
      success: true,
      guestId,
      sessionId: session.session_id,
      roomCode: session.room_code,
      sessionTitle: session.title,
      hmsToken,
      displayName: trimmedName,
    })
  } catch (error) {
    logger.error('Join as presenter error', { error })
    return NextResponse.json(
      { error: 'Failed to join as presenter' },
      { status: 500 }
    )
  }
}

/**
 * GET - Validate token and get session info (for preview before joining)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Validate token and get session info
    const { data: sessionData, error } = await supabase.rpc(
      'get_session_by_presenter_token',
      { p_token: token }
    )

    if (error || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 404 }
      )
    }

    const session = sessionData[0]

    return NextResponse.json({
      valid: true,
      session: {
        id: session.session_id,
        roomCode: session.room_code,
        title: session.title,
      },
    })
  } catch (error) {
    logger.error('Validate presenter token error', { error })
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}
