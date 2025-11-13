import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withRateLimit, RateLimiters } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimiters.authAttempts(), async () => {
    try {
      const body = await request.json()
      const { userId, email, password, username, displayName, inviteCode, phone } = body

      if (!userId || !email || !password || !username || !displayName || !inviteCode) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        )
      }

      // Verify the requesting user matches the userId
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.id !== userId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }

      // Step 1: Update email first
      const { error: emailError } = await supabase.auth.updateUser({
        email,
      })

      if (emailError) {
        console.error('Update email error:', emailError)
        return NextResponse.json(
          { error: emailError.message || 'Failed to add email to account' },
          { status: 500 }
        )
      }

      // Step 2: Update password separately (required after email is set)
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      })

      if (passwordError) {
        console.error('Update password error:', passwordError)
        return NextResponse.json(
          { error: passwordError.message || 'Failed to set password' },
          { status: 500 }
        )
      }

      // Step 3: Refresh the session to ensure cookies are updated
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.error('Refresh session error:', refreshError)
        return NextResponse.json(
          { error: refreshError.message || 'Failed to refresh session' },
          { status: 500 }
        )
      }

      if (!refreshedSession) {
        console.error('No session after refresh')
        return NextResponse.json(
          { error: 'Session lost after credential update' },
          { status: 500 }
        )
      }

      // Check if username is taken by someone else
      const { data: existingUsername } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", username)
        .maybeSingle()

      if (existingUsername && existingUsername.id !== userId) {
        return NextResponse.json(
          { error: `Username "${username}" is already taken` },
          { status: 400 }
        )
      }

      // Upsert profile (creates if doesn't exist, updates if it does)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username,
            display_name: displayName,
            is_approved: true,
          },
          { onConflict: "id" }
        )

      if (profileError) {
        console.error("Profile upsert error:", profileError)
        return NextResponse.json(
          { error: `Failed to save profile: ${profileError.message}` },
          { status: 500 }
        )
      }

      // Record invite code usage and award credits
      const { data: inviteResult, error: inviteError } = await supabase.rpc("use_invite_code", {
        p_code: inviteCode,
        p_user_id: userId,
        p_metadata: {
          signup_method: "phone",
          signup_timestamp: new Date().toISOString(),
          phone,
        },
      })

      if (inviteError) {
        console.error("Use invite code error:", inviteError)

        // Handle race conditions gracefully
        if (inviteError.message?.includes('lock_not_available')) {
          return NextResponse.json(
            { error: 'Invite code is being processed. Please try again.' },
            { status: 409 }
          )
        }

        if (inviteError.message?.includes('unique_violation') || inviteError.message?.includes('already used')) {
          // User already used this code - this is actually okay for retry scenarios
        } else {
          // Other invite errors should not block signup completion
          console.error('Non-critical invite code error, continuing signup:', inviteError)
        }
      } else if (inviteResult && !inviteResult.success) {
        console.error("Invite code validation failed:", inviteResult.error)

        // If they already used the code, that's fine (idempotency)
        if (!inviteResult.error?.includes('already used')) {
          return NextResponse.json(
            { error: inviteResult.error || 'Invalid invite code' },
            { status: 400 }
          )
        }
      }

      // Note: User's 5 invite codes are auto-generated by database trigger
      // (trigger_auto_generate_invite_codes on profiles table)

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Complete phone signup error:", error)
      return NextResponse.json(
        { error: "Failed to complete signup" },
        { status: 500 }
      )
    }
  })
}
