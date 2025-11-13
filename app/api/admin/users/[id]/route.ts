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
    const { role, is_approved } = body

    const updateData: any = {}
    if (role) updateData.role = role
    if (typeof is_approved === 'boolean') updateData.is_approved = is_approved

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
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
    // Delete user's profile (cascading deletes should handle related records)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
