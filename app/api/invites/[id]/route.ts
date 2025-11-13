import { NextRequest, NextResponse } from 'next/server'
import { requireModerator } from '@/lib/admin/permissions-server'
import {
  getInviteAnalytics,
  deactivateInvite,
  reactivateInvite,
} from '@/lib/invites/service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireModerator(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const analytics = await getInviteAnalytics(id)

    if (!analytics) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Get invite analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to get invite analytics' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireModerator(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = await request.json()
    const { action } = body

    let success = false

    if (action === 'deactivate') {
      success = await deactivateInvite(id)
    } else if (action === 'reactivate') {
      success = await reactivateInvite(id)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update invite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update invite error:', error)
    return NextResponse.json(
      { error: 'Failed to update invite' },
      { status: 500 }
    )
  }
}
