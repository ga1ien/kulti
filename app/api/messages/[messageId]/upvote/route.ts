/**
 * Message Upvote API
 *
 * Toggle upvote on a message (authenticated users only)
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

    // Toggle upvote using database function
    const { data, error } = await supabase.rpc('toggle_message_upvote', {
      p_message_id: messageId,
      p_user_id: user.id,
    })

    if (error) {
      console.error('Toggle upvote error:', error)
      return NextResponse.json(
        { error: 'Failed to toggle upvote' },
        { status: 500 }
      )
    }

    // data is an array with one row
    const result = data[0]

    return NextResponse.json({
      success: true,
      upvoted: result.upvoted,
      newCount: result.new_count,
    })
  } catch (error) {
    console.error('Upvote API error:', error)
    return NextResponse.json(
      { error: 'Failed to process upvote' },
      { status: 500 }
    )
  }
}
