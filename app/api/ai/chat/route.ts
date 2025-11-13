/**
 * AI Chat API
 *
 * Send messages to shared Claude conversation in a session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendToClaude,
  calculateTokenCost,
  buildSessionSystemPrompt,
  formatUserMessage,
  stripClaudeMention,
  type ClaudeMessage,
} from '@/lib/ai'
import { deductCredits } from '@/lib/credits'
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

const AI_MESSAGE_COST = 5 // Base cost in credits

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

    // Apply rate limiting
    return withRateLimit(request, RateLimiters.aiChat(user.id), async () => {
      try {

    const { sessionId, message } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check if AI module is enabled and user has permission to chat
    const { data: canChat } = await supabase.rpc('can_user_chat_with_ai', {
      p_session_id: sessionId,
      p_user_id: user.id,
    })

    if (!canChat) {
      return NextResponse.json(
        { error: 'AI module is disabled or you do not have permission to chat' },
        { status: 403 }
      )
    }

    // Get or create AI conversation
    const { data: conversationId, error: convError } = await supabase.rpc(
      'get_or_create_ai_conversation',
      { p_session_id: sessionId }
    )

    if (convError || !conversationId) {
      console.error('Failed to get conversation:', convError)
      return NextResponse.json(
        { error: 'Failed to get AI conversation' },
        { status: 500 }
      )
    }

    // Get session context
    const { data: session } = await supabase
      .from('sessions')
      .select('title, host:profiles!sessions_host_id_fkey(username, display_name)')
      .eq('id', sessionId)
      .single()

    const { count: participantCount } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    // Get conversation history
    const { data: history } = await supabase.rpc(
      'get_ai_conversation_history',
      { p_conversation_id: conversationId, p_limit: 20 }
    )

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, credits_balance')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user has enough credits
    if (profile.credits_balance < AI_MESSAGE_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: AI_MESSAGE_COST },
        { status: 402 }
      )
    }

    // Build message history for Claude
    const messages: ClaudeMessage[] = []

    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === 'user' && msg.username) {
          messages.push({
            role: 'user',
            content: formatUserMessage(msg.username, msg.content),
          })
        } else if (msg.role === 'assistant') {
          messages.push({
            role: 'assistant',
            content: msg.content,
          })
        }
      }
    }

    // Add new user message
    const cleanedMessage = stripClaudeMention(message)
    messages.push({
      role: 'user',
      content: formatUserMessage(profile.username, cleanedMessage),
    })

    // Build system prompt
    const host = Array.isArray(session?.host) ? session.host[0] : session?.host
    const systemPrompt = buildSessionSystemPrompt({
      title: session?.title || 'Untitled Session',
      hostName: host?.display_name || 'Unknown',
      participantCount: participantCount || 1,
    })

    // Send to Claude
    const claudeResponse = await sendToClaude(messages, systemPrompt)

    // Calculate actual cost based on tokens
    const tokenCost = calculateTokenCost(claudeResponse.tokens.total)
    const actualCost = Math.max(AI_MESSAGE_COST, tokenCost) // At least base cost

    // Deduct credits from user
    const deductResult = await deductCredits({
      userId: user.id,
      amount: actualCost,
      type: 'spent_feature',
      sourceSessionId: sessionId,
      metadata: {
        feature: 'ai_chat',
        tokens: claudeResponse.tokens.total,
        conversation_id: conversationId,
      },
    })

    if (!deductResult.success) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      )
    }

    // Save user message
    await supabase.rpc('add_ai_message', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
      p_role: 'user',
      p_content: cleanedMessage,
      p_tokens_used: claudeResponse.tokens.input,
      p_cost_credits: actualCost,
      p_metadata: {},
    })

    // Save Claude's response
    await supabase.rpc('add_ai_message', {
      p_conversation_id: conversationId,
      p_user_id: null,
      p_role: 'assistant',
      p_content: claudeResponse.content,
      p_tokens_used: claudeResponse.tokens.output,
      p_cost_credits: 0,
      p_metadata: {
        stop_reason: claudeResponse.stopReason,
      },
    })

        return NextResponse.json({
          success: true,
          response: claudeResponse.content,
          tokens: claudeResponse.tokens,
          cost: actualCost,
          new_balance: deductResult.new_balance,
        })
      } catch (innerError) {
        console.error('AI chat error:', innerError)
        return NextResponse.json(
          { error: 'Failed to process AI chat' },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error('AI chat authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
