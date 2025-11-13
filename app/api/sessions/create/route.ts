import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHMSRoom, createStreamKey } from "@/lib/hms/server"
import { generateRoomCode } from "@/lib/utils"
import { withRateLimit, RateLimiters } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting
    return withRateLimit(request, RateLimiters.sessionCreation(user.id), async () => {
      try {

    const body = await request.json()
    const { title, description, isPublic, maxPresenters, enableOBS } = body

    // Validate input
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Generate unique room code
    let roomCode = generateRoomCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("room_code", roomCode)
        .single()

      if (!existing) break
      roomCode = generateRoomCode()
      attempts++
    }

    // Create HMS room
    const hmsRoomId = await createHMSRoom(title, description)

    // Create RTMP stream key if OBS is enabled
    let streamKeyId = null
    if (enableOBS) {
      try {
        const streamKeyData = await createStreamKey(hmsRoomId)
        streamKeyId = streamKeyData.id
      } catch (error) {
        console.error("Failed to create stream key:", error)
        // Continue with session creation even if stream key fails
      }
    }

    // Create session in database
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        room_code: roomCode,
        title: title.trim(),
        description: description?.trim() || null,
        host_id: user.id,
        hms_room_id: hmsRoomId,
        status: "live",
        is_public: isPublic !== false,
        max_presenters: maxPresenters || 4,
        started_at: new Date().toISOString(),
        rtmp_enabled: enableOBS || false,
        rtmp_stream_key_id: streamKeyId,
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Session creation error:", sessionError)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    // Add host as participant
    await supabase.from("session_participants").insert({
      session_id: session.id,
      user_id: user.id,
      role: "host",
    })

        return NextResponse.json({
          success: true,
          session,
          roomCode,
        })
      } catch (innerError) {
        console.error("Session creation error:", innerError)
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error("Session authentication error:", error)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    )
  }
}
