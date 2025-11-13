/**
 * AI Conversation API
 *
 * Get conversation history for a session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Verify user is in the session
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

    // Get conversation
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!conversation) {
      return NextResponse.json({
        conversation: null,
        messages: [],
        total_messages: 0,
      })
    }

    // Get messages
    const { data: messages } = await supabase.rpc(
      'get_ai_conversation_history',
      {
        p_conversation_id: conversation.id,
        p_limit: 100,
      }
    )

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        total_messages: conversation.total_messages,
        total_tokens_used: conversation.total_tokens_used,
        total_cost_credits: conversation.total_cost_credits,
        last_message_at: conversation.last_message_at,
      },
      messages: messages || [],
      total_messages: messages?.length || 0,
    })
  } catch (error) {
    console.error('Get AI conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI conversation' },
      { status: 500 }
    )
  }
}
