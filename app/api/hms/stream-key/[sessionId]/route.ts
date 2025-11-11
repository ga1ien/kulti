import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStreamKey } from "@/lib/hms/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await params

    // Get session
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if user is participant
    const { data: participant } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .single()

    if (!participant && session.host_id !== user.id) {
      return NextResponse.json(
        { error: "Not a participant in this session" },
        { status: 403 }
      )
    }

    if (!session.rtmp_enabled) {
      return NextResponse.json({
        enabled: false,
        streamKey: null,
      })
    }

    // Get stream key from 100ms
    const streamKeyData = await getStreamKey(session.hms_room_id)

    if (!streamKeyData) {
      return NextResponse.json({
        enabled: false,
        streamKey: null,
      })
    }

    return NextResponse.json({
      enabled: true,
      streamKeyId: streamKeyData.id,
      streamKey: streamKeyData.streamKey,
      rtmpUrl: streamKeyData.rtmpUrl,
      active: streamKeyData.active,
    })
  } catch (error) {
    console.error("Get stream key error:", error)
    return NextResponse.json(
      { error: "Failed to get stream key" },
      { status: 500 }
    )
  }
}
