import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateHMSToken, getRoomDetails, getHLSStreamStatus, startHLSStream } from "@/lib/hms/server"
import { logger } from "@/lib/logger"

/**
 * HLS Threshold Configuration
 * When a session has more than this many participants, new viewers will use HLS instead of WebRTC
 * This allows sessions to scale to 1000+ viewers while maintaining performance
 *
 * Default: 100 participants
 * Can be overridden via HLS_THRESHOLD environment variable
 */
const HLS_THRESHOLD = parseInt(process.env.HLS_THRESHOLD || "100", 10)

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
    if (role === "viewer") {
      try {
        // Get room details to check participant count
        const roomDetails = await getRoomDetails(roomId)

        logger.info("Checking HLS eligibility", {
          roomId,
          peerCount: roomDetails.peer_count,
          threshold: HLS_THRESHOLD,
          role
        })

        // If room has more than HLS_THRESHOLD participants, use HLS for viewers
        if (roomDetails.peer_count && roomDetails.peer_count >= HLS_THRESHOLD) {
          // Check if HLS stream is running
          let hlsStatus = await getHLSStreamStatus(roomId)

          // If HLS not started yet, start it
          if (!hlsStatus || hlsStatus.status === "stopped") {
            try {
              logger.info("Starting HLS stream for high participant count", {
                roomId,
                peerCount: roomDetails.peer_count,
                threshold: HLS_THRESHOLD
              })

              const hlsStream = await startHLSStream(roomId)
              hlsStreamUrl = hlsStream.stream_url || hlsStream.playback_url || null

              // Wait for stream to become available (poll status)
              if (!hlsStreamUrl) {
                // Give it a moment to start
                await new Promise(resolve => setTimeout(resolve, 2000))
                hlsStatus = await getHLSStreamStatus(roomId)
                hlsStreamUrl = hlsStatus?.stream_url || hlsStatus?.playback_url || null
              }

              useHLS = true
              logger.info("HLS stream started successfully", {
                roomId,
                streamId: hlsStream.id,
                hasUrl: !!hlsStreamUrl
              })
            } catch (error) {
              logger.error("Failed to start HLS stream", { error, roomId })
              // Fall back to WebRTC if HLS fails
              useHLS = false
            }
          } else {
            // HLS stream already running, use it
            hlsStreamUrl = hlsStatus.stream_url || hlsStatus.playback_url || null
            useHLS = true
            logger.info("Using existing HLS stream", {
              roomId,
              streamId: hlsStatus.id,
              status: hlsStatus.status,
              hasUrl: !!hlsStreamUrl
            })
          }
        } else {
          logger.info("Participant count below HLS threshold, using WebRTC", {
            roomId,
            peerCount: roomDetails.peer_count,
            threshold: HLS_THRESHOLD
          })
        }
      } catch (error) {
        logger.error("Error checking HLS eligibility", { error, roomId, role })
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
    logger.error("Token generation error", { error, body: request.body })
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
