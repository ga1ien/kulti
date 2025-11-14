/**
 * Presenter Invite API
 *
 * Manage presenter invite links for a session (host only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyPresenterInvited } from '@/lib/notifications/service'
import { logger } from '@/lib/logger'

/**
 * GET - Get current presenter invite status
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await context.params

    // Get session and verify user is host
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('host_id, presenter_invite_token, presenter_invite_revoked')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only host can view invite status' },
        { status: 403 }
      )
    }

    // Get base URL for building invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      hasToken: !!session.presenter_invite_token,
      isRevoked: session.presenter_invite_revoked || false,
      inviteUrl: session.presenter_invite_token
        ? `${baseUrl}/presenter-join/${session.presenter_invite_token}`
        : null,
    })
  } catch (error) {
    logger.error('Get presenter invite error', { error })
    return NextResponse.json(
      { error: 'Failed to get presenter invite' },
      { status: 500 }
    )
  }
}

/**
 * POST - Generate or regenerate presenter invite token
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await context.params
    const body = await request.json()
    const { inviteEmail } = body

    // Call database function to generate token (verifies host)
    const { data: token, error } = await supabase.rpc(
      'generate_presenter_invite_token',
      {
        p_session_id: sessionId,
      }
    )

    if (error) {
      logger.error('Generate token error', { error, sessionId })
      if (error.message.includes('Only host')) {
        return NextResponse.json(
          { error: 'Only host can generate invite' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to generate invite token' },
        { status: 500 }
      )
    }

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/presenter-join/${token}`

    // Try to notify user if email is provided and user exists in database
    if (inviteEmail) {
      try {
        const { data: invitedUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', inviteEmail)
          .single()

        if (invitedUser) {
          // Get session and host info
          const { data: session } = await supabase
            .from('sessions')
            .select('title, host_id')
            .eq('id', sessionId)
            .single()

          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', session?.host_id)
            .single()

          await notifyPresenterInvited(
            invitedUser.id,
            sessionId,
            hostProfile?.display_name || hostProfile?.username || 'Someone'
          )
        }
      } catch (notifError) {
        logger.error('Failed to send presenter invite notification', { error: notifError, sessionId, inviteEmail })
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      token,
      inviteUrl,
      success: true,
    })
  } catch (error) {
    logger.error('Generate presenter invite error', { error })
    return NextResponse.json(
      { error: 'Failed to generate presenter invite' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Revoke presenter invite token
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await context.params

    // Call database function to revoke token (verifies host)
    const { data: success, error } = await supabase.rpc(
      'revoke_presenter_invite_token',
      {
        p_session_id: sessionId,
      }
    )

    if (error) {
      logger.error('Revoke token error', { error, sessionId })
      if (error.message.includes('Only host')) {
        return NextResponse.json(
          { error: 'Only host can revoke invite' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to revoke invite token' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      revoked: success,
    })
  } catch (error) {
    logger.error('Revoke presenter invite error', { error })
    return NextResponse.json(
      { error: 'Failed to revoke presenter invite' },
      { status: 500 }
    )
  }
}
