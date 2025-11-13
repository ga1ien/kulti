/**
 * Message Replies API
 *
 * Get and create replies to messages (threading)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyMessageReply } from '@/lib/notifications/service'

/**
 * GET - Get thread for a message (parent + replies)
 */
export async function GET(
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

    // Get message thread using database function
    const { data: messages, error } = await supabase.rpc('get_message_thread', {
      p_message_id: messageId,
      p_user_id: user.id,
    })

    if (error) {
      console.error('Get thread error:', error)
      return NextResponse.json(
        { error: 'Failed to get message thread' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      messages: messages || [],
      total: messages?.length || 0,
    })
  } catch (error) {
    console.error('Get replies API error:', error)
    return NextResponse.json(
      { error: 'Failed to get replies' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create reply to a message
 */
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
    const { sessionId, content } = await request.json()

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: 'Session ID and content required' },
        { status: 400 }
      )
    }

    // Validate user is in session
    const { data: participant } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant in this session' },
        { status: 403 }
      )
    }

    // Create reply using database function
    const { data: replyId, error } = await supabase.rpc('create_message_reply', {
      p_parent_message_id: messageId,
      p_session_id: sessionId,
      p_user_id: user.id,
      p_content: content.trim(),
    })

    if (error) {
      console.error('Create reply error:', error)
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      )
    }

    // Get the full reply with user info
    const { data: reply } = await supabase
      .from('messages')
      .select(`
        *,
        profile:profiles!messages_user_id_fkey(username, display_name)
      `)
      .eq('id', replyId)
      .single()

    // Get parent message to notify the author
    const { data: parentMessage } = await supabase
      .from('messages')
      .select('user_id')
      .eq('id', messageId)
      .single()

    // Send notification to parent message author (but not if replying to self)
    if (parentMessage && parentMessage.user_id !== user.id) {
      try {
        // Get session room code for link
        const { data: session } = await supabase
          .from('sessions')
          .select('room_code')
          .eq('id', sessionId)
          .single()

        const messagePreview = content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '')

        await notifyMessageReply(
          parentMessage.user_id,
          session?.room_code || sessionId,
          reply?.profile?.display_name || reply?.profile?.username || 'Someone',
          messagePreview
        )
      } catch (notifError) {
        console.error('Failed to send message reply notification:', notifError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      reply: {
        id: reply?.id,
        content: reply?.content,
        created_at: reply?.created_at,
        user_id: reply?.user_id,
        username: reply?.profile?.username,
        display_name: reply?.profile?.display_name,
        parent_message_id: reply?.parent_message_id,
      },
    })
  } catch (error) {
    console.error('Create reply API error:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}
