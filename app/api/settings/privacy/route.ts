import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "profile_visibility, show_online_status, session_visibility, show_credit_balance"
      )
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Privacy settings fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch privacy settings" },
        { status: 500 }
      )
    }

    // Also get matchmaking availability from user_presence
    const { data: presenceData } = await supabase
      .from("user_presence")
      .select("available_for_matching")
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      ...data,
      matchmaking_available: presenceData?.available_for_matching ?? true,
    })
  } catch (error) {
    console.error("Privacy settings fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      profile_visibility,
      show_online_status,
      matchmaking_available,
      session_visibility,
      show_credit_balance,
    } = body

    const updateData: any = {}

    if (profile_visibility !== undefined) {
      if (!["public", "friends", "private"].includes(profile_visibility)) {
        return NextResponse.json(
          { error: "Invalid profile visibility value" },
          { status: 400 }
        )
      }
      updateData.profile_visibility = profile_visibility
    }

    if (show_online_status !== undefined) {
      updateData.show_online_status = show_online_status
    }

    if (session_visibility !== undefined) {
      if (!["public", "invite", "private"].includes(session_visibility)) {
        return NextResponse.json(
          { error: "Invalid session visibility value" },
          { status: 400 }
        )
      }
      updateData.session_visibility = session_visibility
    }

    if (show_credit_balance !== undefined) {
      updateData.show_credit_balance = show_credit_balance
    }

    // Update profile settings
    const { error: profileError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)

    if (profileError) {
      console.error("Privacy settings update error:", profileError)
      return NextResponse.json(
        { error: "Failed to update privacy settings" },
        { status: 500 }
      )
    }

    // Update matchmaking availability in user_presence if provided
    if (matchmaking_available !== undefined) {
      const { error: presenceError } = await supabase
        .from("user_presence")
        .upsert(
          {
            user_id: user.id,
            available_for_matching: matchmaking_available,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (presenceError) {
        console.error("Presence update error:", presenceError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Privacy settings update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
