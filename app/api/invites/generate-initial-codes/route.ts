import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Generate initial 5 invite codes for current user
 * This is a one-time operation for users who signed up before auto-generation was implemented
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the database function to generate initial codes
    const { data, error } = await supabase.rpc('create_initial_user_invite_codes', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Generate initial codes error:', error)

      // If function doesn't exist, return helpful error
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'The database migration needs to be applied. Please run: npx supabase db push' },
          { status: 500 }
        )
      }

      // If user already has codes
      if (error.message?.includes('already has invite codes')) {
        return NextResponse.json(
          { error: 'You already have invite codes' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: error.message || 'Failed to generate codes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      codes: data,
      message: `Successfully generated ${data?.length || 0} invite codes`,
    })
  } catch (error) {
    console.error('Generate initial codes error:', error)
    return NextResponse.json(
      { error: 'Failed to generate codes' },
      { status: 500 }
    )
  }
}
