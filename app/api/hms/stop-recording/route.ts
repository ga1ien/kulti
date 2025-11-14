import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stopRecording } from "@/lib/hms/server"
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

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }

    // Get session and verify user is the host
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, hms_room_id, host_id")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the host can stop recording" },
        { status: 403 }
      )
    }

    if (!session.hms_room_id) {
      return NextResponse.json(
        { error: "Session has no HMS room" },
        { status: 400 }
      )
    }

    // Stop recording via HMS API
    const recordingData = await stopRecording(session.hms_room_id)

    // Update recording record in database
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .update({
        status: "processing",
      })
      .eq("session_id", sessionId)
      .eq("status", "recording")
      .select()
      .single()

    if (recordingError) {
      logger.error("Error updating recording record", { error: recordingError, sessionId })
      return NextResponse.json(
        { error: "Failed to update recording record" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recording: {
        id: recording.id,
        status: recording.status,
      },
    })
  } catch (error) {
    logger.error("Stop recording error", { error })
    return NextResponse.json(
      { error: "Failed to stop recording" },
      { status: 500 }
    )
  }
}
