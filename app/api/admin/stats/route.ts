import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/permissions-server'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get active sessions
    const { count: activeSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'live')

    // Get total credits circulated
    const { data: creditsData } = await supabase
      .from('profiles')
      .select('total_credits_earned')

    const totalCreditsCirculated =
      creditsData?.reduce((sum, profile) => sum + (profile.total_credits_earned || 0), 0) || 0

    // Get total rooms
    const { count: totalRooms } = await supabase
      .from('community_rooms')
      .select('*', { count: 'exact', head: true })
      .is('archived_at', null)

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeSessions: activeSessions || 0,
      totalCreditsCirculated,
      totalRooms: totalRooms || 0,
    })
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
