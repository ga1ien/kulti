/**
 * Available Users API
 *
 * Get compatible users who are currently online and available for matching
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const minMatchScore = parseFloat(searchParams.get('minMatchScore') || '0')

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

    // Get compatible users
    const { data: compatibleUsers, error: usersError } = await supabase.rpc(
      'get_compatible_users',
      {
        p_user_id: user.id,
        p_limit: Math.max(limit, 50), // Allow up to 50
      }
    )

    if (usersError) {
      console.error('Get compatible users error:', usersError)
      return NextResponse.json(
        { error: 'Failed to get compatible users' },
        { status: 500 }
      )
    }

    // Filter by minimum match score if specified
    const filteredUsers = (compatibleUsers || []).filter(
      (u: any) => u.match_score >= minMatchScore
    )

    // Get presence info for these users
    const userIds = filteredUsers.map((u: any) => u.user_id)
    const { data: presenceData } = await supabase
      .from('user_presence')
      .select('user_id, current_session_id, last_seen')
      .in('user_id', userIds)

    // Create presence map
    const presenceMap = new Map(
      presenceData?.map((p: any) => [p.user_id, p]) || []
    )

    // Combine user data with presence
    const usersWithPresence = filteredUsers.map((u: any) => ({
      id: u.user_id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      skills: u.skills,
      interests: u.interests,
      experienceLevel: u.experience_level,
      matchScore: u.match_score,
      sharedSkills: u.shared_skills,
      sharedInterests: u.shared_interests,
      presence: {
        inSession: !!presenceMap.get(u.user_id)?.current_session_id,
        lastSeen: presenceMap.get(u.user_id)?.last_seen,
      },
    }))

    return NextResponse.json({
      users: usersWithPresence,
      total: usersWithPresence.length,
    })
  } catch (error) {
    console.error('Available users error:', error)
    return NextResponse.json(
      { error: 'Failed to get available users' },
      { status: 500 }
    )
  }
}
