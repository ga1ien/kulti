import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateHMSToken, verifyHMSToken } from "@/lib/hms/server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { roomId, sessionId, oldToken, userId, isGuest } = body

    if (!roomId || !sessionId || !oldToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify the old token to ensure it's valid (even if expired)
    const verification = verifyHMSToken(oldToken)
    if (!verification.valid && !verification.payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      )
    }

    // Handle guest presenters (no authentication required)
    if (isGuest && userId) {
      // For guests, verify the userId matches the token
      if (verification.payload?.user_id !== userId) {
        return NextResponse.json(
          { error: "User ID mismatch" },
          { status: 401 }
        )
      }

      // Generate new HMS token for guest
      const tokenData = generateHMSToken(roomId, userId, 'presenter')

      return NextResponse.json({
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
        userName: 'Guest Presenter',
        role: 'presenter',
      })
    }

    // Regular authenticated users
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the user_id from the token matches the authenticated user
    if (verification.payload?.user_id !== user.id) {
      return NextResponse.json(
        { error: "User ID mismatch" },
        { status: 401 }
      )
    }

    // Get session and participant info
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if session is still active
    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: 410 }
      )
    }

    // Get participant to ensure they're still part of the session
    const { data: participant } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .single()

    if (!participant) {
      return NextResponse.json(
        { error: "User is not a participant in this session" },
        { status: 403 }
      )
    }

    // Determine role (same logic as get-token)
    let role: "host" | "presenter" | "viewer" = "viewer"

    if (session.host_id === user.id) {
      role = "host"
    } else if (participant.role === "presenter") {
      role = "presenter"
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single()

    // Generate new HMS token with same role
    const tokenData = generateHMSToken(roomId, user.id, role)

    return NextResponse.json({
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      userName: profile?.display_name || "User",
      role,
    })
  } catch (error) {
    logger.error("Token refresh error", { error })
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    )
  }
}
