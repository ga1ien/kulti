import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createStreamKey } from "@/lib/hms/server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      )
    }

    // Get session and verify user is host
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the host can create stream keys" },
        { status: 403 }
      )
    }

    // Create stream key via 100ms
    const streamKeyData = await createStreamKey(session.hms_room_id)

    // Update session with stream key info
    await supabase
      .from("sessions")
      .update({
        rtmp_stream_key_id: streamKeyData.id,
        rtmp_enabled: true,
      })
      .eq("id", sessionId)

    return NextResponse.json({
      streamKeyId: streamKeyData.id,
      streamKey: streamKeyData.streamKey,
      rtmpUrl: streamKeyData.rtmpUrl,
    })
  } catch (error) {
    logger.error("Stream key creation error", { error })
    return NextResponse.json(
      { error: "Failed to create stream key" },
      { status: 500 }
    )
  }
}
