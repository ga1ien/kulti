/**
 * AI Module Control API
 *
 * Manage AI module settings for a session (host only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await context.params
    const {
      enabled,
      accessMode,
      allowedUsers,
    } = await request.json()

    // Validate inputs
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    if (accessMode && !['host_only', 'presenters', 'manual'].includes(accessMode)) {
      return NextResponse.json(
        { error: 'Invalid access mode' },
        { status: 400 }
      )
    }

    if (accessMode === 'manual' && !Array.isArray(allowedUsers)) {
      return NextResponse.json(
        { error: 'allowedUsers must be an array when accessMode is manual' },
        { status: 400 }
      )
    }

    // Update settings using database function
    const { data, error } = await supabase.rpc('update_ai_module_settings', {
      p_session_id: sessionId,
      p_user_id: user.id,
      p_enabled: enabled,
      p_access_mode: accessMode || null,
      p_allowed_users: allowedUsers || null,
    })

    if (error) {
      console.error('Update AI module error:', error)
      return NextResponse.json(
        { error: 'Failed to update AI module settings' },
        { status: 500 }
      )
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      ...data,
    })
  } catch (error) {
    console.error('AI module API error:', error)
    return NextResponse.json(
      { error: 'Failed to update AI module' },
      { status: 500 }
    )
  }
}
