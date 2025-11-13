/**
 * Profile Matchmaking API
 *
 * Update user profile with matchmaking preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's matchmaking profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('skills, interests, experience_level, timezone, matchmaking_enabled, profile_completed')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Get matchmaking profile error:', error)
      return NextResponse.json(
        { error: 'Failed to get profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      skills: profile.skills || [],
      interests: profile.interests || [],
      experienceLevel: profile.experience_level || 'intermediate',
      timezone: profile.timezone,
      matchmakingEnabled: profile.matchmaking_enabled ?? true,
      profileCompleted: profile.profile_completed ?? false,
    })
  } catch (error) {
    console.error('Get matchmaking profile error:', error)
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    return withRateLimit(request, RateLimiters.profileUpdate(user.id), async () => {
      try {

    const body = await request.json()
    const { skills, interests, experienceLevel, timezone, matchmakingEnabled } = body

    // Validate required fields
    if (!skills || !Array.isArray(skills) || skills.length < 1) {
      return NextResponse.json(
        { error: 'At least 1 skill is required' },
        { status: 400 }
      )
    }

    if (!interests || !Array.isArray(interests) || interests.length < 1) {
      return NextResponse.json(
        { error: 'At least 1 interest is required' },
        { status: 400 }
      )
    }

    if (!experienceLevel || !['beginner', 'intermediate', 'advanced'].includes(experienceLevel)) {
      return NextResponse.json(
        { error: 'Valid experience level is required' },
        { status: 400 }
      )
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        skills,
        interests,
        experience_level: experienceLevel,
        timezone: timezone || null,
        matchmaking_enabled: matchmakingEnabled ?? true,
        profile_completed: true,
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update matchmaking profile error:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

        return NextResponse.json({
          success: true,
          profile: {
            skills: data.skills,
            interests: data.interests,
            experienceLevel: data.experience_level,
            timezone: data.timezone,
            matchmakingEnabled: data.matchmaking_enabled,
            profileCompleted: data.profile_completed,
          },
        })
      } catch (innerError) {
        console.error('Update matchmaking profile error:', innerError)
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error('Update matchmaking profile authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
