/**
 * AI Permissions API
 *
 * Check user's AI chat permissions for a session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('host_id, ai_module_enabled, ai_access_mode, ai_allowed_users')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if user is host
    const isHost = session.host_id === user.id
    const canToggle = isHost

    // Check if AI module is enabled
    const moduleEnabled = session.ai_module_enabled

    // Check if user can chat with AI
    const { data: canChat } = await supabase.rpc('can_user_chat_with_ai', {
      p_session_id: sessionId,
      p_user_id: user.id,
    })

    // Get participant role
    const { data: participant } = await supabase
      .from('session_participants')
      .select('role')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      canChat: canChat === true,
      canToggle,
      moduleEnabled,
      accessMode: session.ai_access_mode,
      allowedUsers: session.ai_allowed_users || [],
      userRole: participant?.role || null,
      isHost,
    })
  } catch (error) {
    console.error('AI permissions check error:', error)
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    )
  }
}
