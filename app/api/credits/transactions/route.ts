/**
 * Credits Transactions API
 *
 * Get user's transaction history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTransactions } from '@/lib/credits'
import { TransactionType } from '@/lib/credits/config'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') || undefined

    // Get transactions
    const transactions = await getTransactions(user.id, {
      limit,
      offset,
      type: type as TransactionType | undefined,
    })

    return NextResponse.json({
      transactions,
      count: transactions.length,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('Get transactions error', { error })
    return NextResponse.json(
      { error: 'Failed to get transactions' },
      { status: 500 }
    )
  }
}
