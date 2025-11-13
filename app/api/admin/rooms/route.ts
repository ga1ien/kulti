import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/permissions-server'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const { name, slug, category, description, icon_emoji, tags } = body

    // Validate required fields
    if (!name || !slug || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('community_rooms')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A room with this slug already exists' },
        { status: 400 }
      )
    }

    // Get current user as creator
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: room, error } = await supabase
      .from('community_rooms')
      .insert({
        name,
        slug,
        category,
        description: description || null,
        icon_emoji: icon_emoji || '💬',
        tags: tags || [],
        created_by: user?.id,
        is_public: true,
        member_count: 0,
        message_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(room)
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}
