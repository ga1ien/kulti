/**
 * Message Pin API
 *
 * Pin/unpin messages (host only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = await context.params
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    // Toggle pin using database function (verifies host)
    const { data, error } = await supabase.rpc('toggle_message_pin', {
      p_message_id: messageId,
      p_session_id: sessionId,
      p_user_id: user.id,
    })

    if (error) {
      console.error('Toggle pin error:', error)
      if (error.message.includes('Only host')) {
        return NextResponse.json(
          { error: 'Only host can pin messages' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to toggle pin' },
        { status: 500 }
      )
    }

    // data is an array with one row
    const result = data[0]

    return NextResponse.json({
      success: true,
      pinned: result.pinned,
      pinnedAt: result.pinned_at,
    })
  } catch (error) {
    console.error('Pin API error:', error)
    return NextResponse.json(
      { error: 'Failed to process pin' },
      { status: 500 }
    )
  }
}
