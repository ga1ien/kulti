import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateHMSToken } from "@/lib/hms/server"

const HLS_THRESHOLD = 100 // Switch to HLS when more than 100 viewers

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { roomId, sessionId, role: requestedRole, userId, isGuest } = body

    if (!roomId || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Handle guest presenters (no authentication required)
    if (isGuest && userId && requestedRole === 'presenter') {
      // Check presenter limit for guest presenters too
      const { data: session } = await supabase
        .from("sessions")
        .select("max_presenters")
        .eq("id", sessionId)
        .single()

      if (session) {
        const { count: presenterCount } = await supabase
          .from("session_participants")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId)
          .in("role", ["host", "presenter"])

        if (presenterCount !== null && presenterCount >= session.max_presenters) {
          return NextResponse.json(
            { error: `Session has reached maximum presenters limit (${session.max_presenters})` },
            { status: 403 }
          )
        }
      }

      // Generate HMS token for guest
      const tokenData = generateHMSToken(roomId, userId, 'presenter')

      return NextResponse.json({
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
        userName: 'Guest Presenter',
        role: 'presenter',
        useHLS: false, // Presenters always use WebRTC
      })
    }

    // Regular authenticated users
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Get or create participant
    const { data: participant } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .single()

    let role: "host" | "presenter" | "viewer" = "viewer"

    if (session.host_id === user.id) {
      role = "host"
    } else if (participant?.role === "presenter") {
      role = "presenter"
    } else if (requestedRole === "presenter") {
      // Check if there's room for another presenter
      const { count: presenterCount } = await supabase
        .from("session_participants")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .in("role", ["host", "presenter"])

      if (presenterCount !== null && presenterCount >= session.max_presenters) {
        return NextResponse.json(
          { error: `Session has reached maximum presenters limit (${session.max_presenters})` },
          { status: 403 }
        )
      }

      role = "presenter"
    }

    // If not already a participant, add them
    if (!participant) {
      await supabase.from("session_participants").insert({
        session_id: sessionId,
        user_id: user.id,
        role: role,
      })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single()

    // Determine if user should use HLS
    let useHLS = false
    let hlsStreamUrl: string | null = null

    // Only viewers can use HLS (hosts and presenters need WebRTC for interaction)
    // TODO: Implement HLS switching for high participant counts
    if (role === "viewer" && false) { // Disabled until HLS functions are implemented
      try {
        // Get room details to check participant count
        // const roomDetails = await getRoomDetails(roomId)

        // If room has more than HLS_THRESHOLD participants, use HLS for viewers
        if (false) { // Disabled
          // Check if HLS stream is running
          // let hlsStatus = await getHLSStreamStatus(roomId)

          // If HLS not started yet, start it
          if (false) { // Disabled
            try {
              // const hlsStream = await startHLSStream(roomId)
              // hlsStreamUrl = hlsStream.stream_url
              useHLS = true
            } catch (error) {
              console.error("Failed to start HLS stream:", error)
              // Fall back to WebRTC if HLS fails
              useHLS = false
            }
          } else {
            // hlsStreamUrl = hlsStatus.stream_url
            useHLS = true
          }
        }
      } catch (error) {
        console.error("Error checking HLS eligibility:", error)
        // Fall back to WebRTC if there's an error
        useHLS = false
      }
    }

    // Generate HMS token (still needed for chat participation even with HLS)
    const tokenData = generateHMSToken(roomId, user.id, role)

    return NextResponse.json({
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      userName: profile?.display_name || "User",
      role,
      useHLS,
      hlsStreamUrl: useHLS ? hlsStreamUrl : null,
    })
  } catch (error) {
    console.error("Token generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
