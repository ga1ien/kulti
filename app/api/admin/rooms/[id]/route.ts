import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/permissions-server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createRouteHandlerClient({ cookies })
  const { id } = await params

  try {
    const body = await request.json()
    const { name, description, category, icon_emoji, tags, archived } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category) updateData.category = category
    if (icon_emoji) updateData.icon_emoji = icon_emoji
    if (tags) updateData.tags = tags
    if (typeof archived === 'boolean') {
      updateData.archived_at = archived ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from('community_rooms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update room:', error)
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createRouteHandlerClient({ cookies })
  const { id } = await params

  try {
    const { error } = await supabase
      .from('community_rooms')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    )
  }
}
