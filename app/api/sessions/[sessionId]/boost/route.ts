/**
 * Boost Session API
 *
 * Allows session hosts to boost/feature their session for improved visibility
 * Cost: 500 credits for 24 hours of featured placement
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deductCredits, hasSufficientBalance } from '@/lib/credits/service'
import { FEATURE_COSTS } from '@/lib/credits/config'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await context.params

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('host_id, status, boosted_until')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is the host
    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can boost their session' },
        { status: 403 }
      )
    }

    // Check if already boosted
    if (session.boosted_until && new Date(session.boosted_until) > new Date()) {
      return NextResponse.json(
        {
          error: 'Session is already boosted',
          boosted_until: session.boosted_until,
        },
        { status: 400 }
      )
    }

    // Check balance
    const boostCost = FEATURE_COSTS.FEATURED_SESSION
    const hasBalance = await hasSufficientBalance(user.id, boostCost)

    if (!hasBalance) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: boostCost,
        },
        { status: 402 }
      )
    }

    // Deduct credits
    const deductResult = await deductCredits({
      userId: user.id,
      amount: boostCost,
      type: 'spent_feature',
      sourceSessionId: sessionId,
      metadata: {
        feature: 'session_boost',
        duration_hours: 24,
      },
    })

    if (!deductResult.success) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      )
    }

    // Calculate boost expiration (24 hours from now)
    const boostedUntil = new Date()
    boostedUntil.setHours(boostedUntil.getHours() + 24)

    // Update session with boost
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        boosted_until: boostedUntil.toISOString(),
        featured_rank: 100, // Default featured rank
      })
      .eq('id', sessionId)

    if (updateError) {
      logger.error('Failed to update session boost', { error: updateError, sessionId })
      return NextResponse.json(
        { error: 'Failed to boost session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      boosted_until: boostedUntil.toISOString(),
      credits_spent: boostCost,
      new_balance: deductResult.new_balance,
    })
  } catch (error) {
    logger.error('Boost session error', { error })
    return NextResponse.json(
      {
        error: 'Failed to boost session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
