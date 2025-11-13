/**
 * Matchmaking Suggestions API
 *
 * GET - Retrieve user's pending suggestions
 * POST - Generate new suggestion for user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's pending suggestions
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('matchmaking_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'viewed'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (suggestionsError) {
      console.error('Get suggestions error:', suggestionsError)
      return NextResponse.json(
        { error: 'Failed to get suggestions' },
        { status: 500 }
      )
    }

    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        count: 0,
      })
    }

    // Get user details for suggested users
    const allUserIds = suggestions.flatMap(s => s.suggested_users)
    const uniqueUserIds = [...new Set(allUserIds)]

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, skills, interests, experience_level')
      .in('id', uniqueUserIds)

    if (usersError) {
      console.error('Get users error:', usersError)
      return NextResponse.json(
        { error: 'Failed to get user details' },
        { status: 500 }
      )
    }

    // Create user map
    const userMap = new Map(users?.map(u => [u.id, u]) || [])

    // Enrich suggestions with user details
    const enrichedSuggestions = suggestions.map(suggestion => ({
      id: suggestion.id,
      matchScore: suggestion.match_score,
      matchReasons: suggestion.match_reasons,
      status: suggestion.status,
      expiresAt: suggestion.expires_at,
      createdAt: suggestion.created_at,
      sessionId: suggestion.session_id,
      suggestedUsers: suggestion.suggested_users
        .map((userId: string) => {
          const user = userMap.get(userId)
          if (!user) return null

          return {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            skills: user.skills,
            interests: user.interests,
            experienceLevel: user.experience_level,
          }
        })
        .filter(Boolean),
    }))

    return NextResponse.json({
      suggestions: enrichedSuggestions,
      count: enrichedSuggestions.length,
    })
  } catch (error) {
    console.error('Get suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
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

    // Get request body
    const body = await request.json()
    const { minMatches = 1 } = body

    // Check if user's matchmaking is enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('matchmaking_enabled, profile_completed')
      .eq('id', user.id)
      .single()

    if (profileError) {
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

    if (!profile.profile_completed) {
      return NextResponse.json(
        {
          error: 'Please complete your profile to use matchmaking',
          profileCompleted: false,
        },
        { status: 400 }
      )
    }

    // Generate suggestion using database function
    const { data: suggestionId, error: generateError } = await supabase.rpc(
      'create_matchmaking_suggestion',
      {
        p_user_id: user.id,
        p_min_matches: minMatches,
      }
    )

    if (generateError) {
      console.error('Generate suggestion error:', generateError)
      return NextResponse.json(
        { error: 'Failed to generate suggestion' },
        { status: 500 }
      )
    }

    // If no suggestion was created (not enough matches or recent suggestion exists)
    if (!suggestionId) {
      return NextResponse.json({
        created: false,
        reason: 'No compatible users found or recent suggestion already exists',
      })
    }

    // Fetch the created suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('matchmaking_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single()

    if (fetchError || !suggestion) {
      console.error('Fetch suggestion error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch created suggestion' },
        { status: 500 }
      )
    }

    // Get user details for suggested users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, skills, interests, experience_level')
      .in('id', suggestion.suggested_users)

    if (usersError) {
      console.error('Get users error:', usersError)
      return NextResponse.json(
        { error: 'Failed to get user details' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      created: true,
      suggestion: {
        id: suggestion.id,
        matchScore: suggestion.match_score,
        matchReasons: suggestion.match_reasons,
        status: suggestion.status,
        expiresAt: suggestion.expires_at,
        suggestedUsers: users?.map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
          skills: u.skills,
          interests: u.interests,
          experienceLevel: u.experience_level,
        })) || [],
      },
    })
  } catch (error) {
    console.error('Generate suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 }
    )
  }
}
