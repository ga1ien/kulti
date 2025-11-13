/**
 * Find Session API
 *
 * Find or create a matched session based on user preferences
 * Handles both joining existing sessions and creating new ones
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/service'
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

interface FindSessionRequest {
  category?: string
  tags?: string[]
  sessionIntent?: 'learn' | 'teach' | 'collaborate' | 'open'
  minParticipants?: number
  maxPresenters?: number
  createIfNoMatch?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    return withRateLimit(request, RateLimiters.matchmaking(user.id), async () => {
      try {

    // Get request parameters
    const body: FindSessionRequest = await request.json()
    const {
      category,
      tags,
      sessionIntent = 'open',
      minParticipants = 2,
      maxPresenters = 4,
      createIfNoMatch = true,
    } = body

    // Get user's profile for matching
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, display_name, skills, interests, experience_level, matchmaking_enabled')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (!profile.matchmaking_enabled) {
      return NextResponse.json(
        { error: 'Matchmaking is disabled for your account' },
        { status: 403 }
      )
    }

    // Step 1: Try to find existing joinable sessions
    const { data: existingSessions, error: sessionsError } = await supabase.rpc(
      'find_joinable_matchmaking_sessions',
      {
        p_user_id: user.id,
        p_limit: 5,
      }
    )

    if (sessionsError) {
      console.error('Find sessions error:', sessionsError)
      // Continue to create new session if this fails
    }

    // If we found good matches, return the best one
    if (existingSessions && existingSessions.length > 0) {
      const bestMatch = existingSessions[0]

      return NextResponse.json({
        type: 'existing_session',
        session: {
          id: bestMatch.session_id,
          roomCode: bestMatch.room_code,
          title: bestMatch.title,
          description: bestMatch.description,
          hostId: bestMatch.host_id,
          hostName: bestMatch.host_name,
          participantCount: bestMatch.participant_count,
          maxPresenters: bestMatch.max_presenters,
          tags: bestMatch.tags,
          matchScore: bestMatch.match_score,
        },
        alternativeSessions: existingSessions.slice(1).map((s: any) => ({
          id: s.session_id,
          roomCode: s.room_code,
          title: s.title,
          hostName: s.host_name,
          participantCount: s.participant_count,
          maxPresenters: s.max_presenters,
          matchScore: s.match_score,
        })),
      })
    }

    // Step 2: If no existing sessions and createIfNoMatch is false, return compatible users
    if (!createIfNoMatch) {
      const { data: compatibleUsers, error: usersError } = await supabase.rpc(
        'get_compatible_users',
        {
          p_user_id: user.id,
          p_limit: 10,
        }
      )

      if (usersError) {
        console.error('Get compatible users error:', usersError)
        return NextResponse.json(
          { error: 'Failed to find compatible users' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        type: 'compatible_users',
        users: compatibleUsers || [],
      })
    }

    // Step 3: Create new matched session
    const { data: compatibleUsers, error: usersError } = await supabase.rpc(
      'get_compatible_users',
      {
        p_user_id: user.id,
        p_limit: Math.min(maxPresenters - 1, 5),
      }
    )

    if (usersError) {
      console.error('Get compatible users error:', usersError)
      return NextResponse.json(
        { error: 'Failed to find compatible users' },
        { status: 500 }
      )
    }

    // Generate session details
    const sessionTags = tags || profile.skills.slice(0, 3)
    const sessionCategory = category || 'General Programming'

    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Create session title based on intent
    const intentLabels = {
      learn: 'Learning Session',
      teach: 'Teaching Session',
      collaborate: 'Collaboration',
      open: 'Open Jam',
    }
    const sessionTitle = `${intentLabels[sessionIntent]}: ${sessionTags.slice(0, 2).join(' & ')}`

    // Build description
    const matchedUserNames = compatibleUsers?.slice(0, 2).map((u: any) => u.display_name || u.username) || []
    const sessionDescription = matchedUserNames.length > 0
      ? `Matched session with ${matchedUserNames.join(', ')} and others interested in ${sessionTags.slice(0, 2).join(', ')}`
      : `Session for ${sessionTags.slice(0, 2).join(', ')}`

    // Create the session
    const { data: newSession, error: createError } = await supabase
      .from('sessions')
      .insert({
        room_code: roomCode,
        title: sessionTitle,
        description: sessionDescription,
        host_id: user.id,
        max_presenters: maxPresenters,
        min_participants: minParticipants,
        category: sessionCategory,
        tags: sessionTags,
        session_intent: sessionIntent,
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
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: newSession.id,
        user_id: user.id,
        role: 'host',
      })

    if (participantError) {
      console.error('Add participant error:', participantError)
      // Don't fail the request, session is still created
    }

    // Update user presence
    await supabase.rpc('update_user_presence', {
      p_user_id: user.id,
      p_is_online: true,
      p_session_id: newSession.id,
    })

    // Send notifications to matched users
    if (compatibleUsers && compatibleUsers.length > 0) {
      const topicName = sessionTags.slice(0, 2).join(' & ')

      for (const compatibleUser of compatibleUsers.slice(0, 5)) {
        try {
          await createNotification({
            userId: compatibleUser.user_id,
            type: 'match_found',
            title: 'Match found!',
            message: `A session for "${topicName}" is ready`,
            link: `/s/${roomCode}`,
            metadata: {
              sessionId: newSession.id,
              roomCode: newSession.room_code,
              hostId: user.id,
              topicName,
            }
          })
        } catch (notifError) {
          console.error('Failed to send match notification:', notifError)
          // Continue with other notifications
        }
      }
    }

        return NextResponse.json({
          type: 'new_session',
          session: {
            id: newSession.id,
            roomCode: newSession.room_code,
            title: newSession.title,
            description: newSession.description,
            category: newSession.category,
            tags: newSession.tags,
            sessionIntent: newSession.session_intent,
            hostId: newSession.host_id,
            maxPresenters: newSession.max_presenters,
            minParticipants: newSession.min_participants,
          },
          matchedUsers: compatibleUsers?.slice(0, 5).map((u: any) => ({
            id: u.user_id,
            username: u.username,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            matchScore: u.match_score,
            sharedSkills: u.shared_skills,
            sharedInterests: u.shared_interests,
          })) || [],
        })
      } catch (innerError) {
        console.error('Find session error:', innerError)
        return NextResponse.json(
          { error: 'Failed to find or create session' },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error('Find session authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
