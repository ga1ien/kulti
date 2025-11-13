/**
 * Matchmaking Suggestion Actions API
 *
 * PUT - Update suggestion status (accept/decline/dismiss)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { status, createSession } = body

    // Validate status
    if (!['viewed', 'accepted', 'declined', 'expired'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from('matchmaking_suggestions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this suggestion
      .single()

    if (suggestionError || !suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    // Check if already processed
    if (['accepted', 'declined', 'expired'].includes(suggestion.status)) {
      return NextResponse.json(
        { error: 'Suggestion already processed' },
        { status: 400 }
      )
    }

    // If accepting and should create session
    if (status === 'accepted' && createSession) {
      // Get user profile for session creation
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, skills')
        .eq('id', user.id)
        .single()

      if (!profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }

      // Get suggested users' details
      const { data: suggestedUsers } = await supabase
        .from('profiles')
        .select('username, display_name')
        .in('id', suggestion.suggested_users)

      // Generate room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      // Create session title
      const userNames = suggestedUsers?.slice(0, 2).map(u => u.display_name || u.username) || []
      const sessionTitle = `Matched Session: ${userNames.join(', ')}`
      const sessionTags = profile.skills.slice(0, 3)

      // Create the session
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          room_code: roomCode,
          title: sessionTitle,
          description: `Matchmaking session with compatible developers`,
          host_id: user.id,
          max_participants: Math.min(suggestion.suggested_users.length + 1, 4),
          min_participants: 2,
          tags: sessionTags,
          session_intent: 'open',
          is_matchmaking_session: true,
          is_public: true,
          status: 'live',
        })
        .select()
        .single()

      if (createError || !newSession) {
        console.error('Create session error:', createError)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }

      // Add host as participant
      await supabase
        .from('session_participants')
        .insert({
          session_id: newSession.id,
          user_id: user.id,
          role: 'host',
        })

      // Update suggestion with session_id
      const { error: updateError } = await supabase
        .from('matchmaking_suggestions')
        .update({
          status: 'accepted',
          session_id: newSession.id,
        })
        .eq('id', id)

      if (updateError) {
        console.error('Update suggestion error:', updateError)
        // Don't fail, session is created
      }

      // Update user presence
      await supabase.rpc('update_user_presence', {
        p_user_id: user.id,
        p_is_online: true,
        p_session_id: newSession.id,
      })

      return NextResponse.json({
        success: true,
        status: 'accepted',
        session: {
          id: newSession.id,
          roomCode: newSession.room_code,
          title: newSession.title,
        },
      })
    }

    // Just update the status without creating a session
    const { error: updateError } = await supabase
      .from('matchmaking_suggestions')
      .update({ status })
      .eq('id', id)

    if (updateError) {
      console.error('Update suggestion error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update suggestion' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error) {
    console.error('Update suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to update suggestion' },
      { status: 500 }
    )
  }
}
