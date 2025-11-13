/**
 * Tip Credits API
 *
 * Allows users to tip credits to other users (hosts or helpful participants)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tipUser } from '@/lib/credits/service'
import { notifyTipReceived } from '@/lib/notifications/service'
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

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
    return withRateLimit(request, RateLimiters.creditsTipping(user.id), async () => {
      try {

    // Parse request body
    const body = await request.json()
    const { recipientId, amount, message, sessionId } = body

    // Validation
    if (!recipientId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (amount <= 0 || amount > 10000) {
      return NextResponse.json(
        { error: 'Amount must be between 1 and 10,000 credits' },
        { status: 400 }
      )
    }

    // Cannot tip yourself
    if (recipientId === user.id) {
      return NextResponse.json(
        { error: 'Cannot tip yourself' },
        { status: 400 }
      )
    }

    // Verify recipient exists
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', recipientId)
      .single()

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Execute tip using service function
    const result = await tipUser({
      fromUserId: user.id,
      toUserId: recipientId,
      amount,
      message,
      sessionId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send tip' },
        { status: result.error === 'Insufficient balance' ? 402 : 500 }
      )
    }

    // Get sender profile for notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, username, credits_balance')
      .eq('id', user.id)
      .single()

    // Get updated recipient balance
    const { data: updatedRecipient } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', recipientId)
      .single()

    // Send notification to recipient
    try {
      await notifyTipReceived(
        recipientId,
        amount,
        senderProfile?.display_name || senderProfile?.username || 'Someone',
        user.id
      )
    } catch (notifError) {
      console.error('Failed to send tip notification:', notifError)
      // Don't fail the request if notification fails
    }

        return NextResponse.json({
          success: true,
          sender_new_balance: senderProfile?.credits_balance || 0,
          recipient_new_balance: updatedRecipient?.credits_balance || 0,
          recipient_username: recipient.username,
          recipient_display_name: recipient.display_name,
        })
      } catch (innerError) {
        console.error('Tip error:', innerError)
        return NextResponse.json(
          {
            error: 'Failed to send tip',
            details: innerError instanceof Error ? innerError.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error('Tip authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
