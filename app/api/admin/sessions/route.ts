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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const featured = searchParams.get('featured')

    let query = supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        room_code,
        status,
        started_at,
        ended_at,
        created_at,
        featured_rank,
        total_credits_distributed,
        avg_concurrent_viewers,
        total_chat_messages,
        category,
        host:profiles!sessions_host_id_fkey(username, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) {
      query = query.eq('status', status)
    }

    if (featured === 'true') {
      query = query.gt('featured_rank', 0)
    }

    const { data: sessions, error } = await query

    if (error) throw error

    return NextResponse.json(sessions || [])
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
