import { NextRequest, NextResponse } from 'next/server'
import { requireModerator } from '@/lib/admin/permissions-server'
import { createInviteCode, getAllInvites } from '@/lib/invites/service'

export async function GET(request: NextRequest) {
  const authError = await requireModerator(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const invites = await getAllInvites({ page, limit, includeInactive })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json(
      { error: 'Failed to get invites' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireModerator(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { maxUses, expiresAt, metadata } = body

    const result = await createInviteCode({
      maxUses,
      expiresAt,
      metadata,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json(
      { error: 'Failed to create invite code' },
      { status: 500 }
    )
  }
}
