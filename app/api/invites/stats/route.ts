import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/permissions-server'
import { getPlatformInviteStats } from '@/lib/invites/service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const stats = await getPlatformInviteStats()
    return NextResponse.json(stats)
  } catch (error) {
    logger.error('Get invite stats error', { error })
    return NextResponse.json(
      { error: 'Failed to get invite stats' },
      { status: 500 }
    )
  }
}
