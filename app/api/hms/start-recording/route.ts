import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { startRecording } from "@/lib/hms/server"

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
      .select("id, hms_room_id, host_id, title")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the host can start recording" },
        { status: 403 }
      )
    }

    if (!session.hms_room_id) {
      return NextResponse.json(
        { error: "Session has no HMS room" },
        { status: 400 }
      )
    }

    // Start recording via HMS API
    const recordingData = await startRecording(session.hms_room_id)

    // Create recording record in database
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .insert({
        session_id: sessionId,
        hms_recording_id: recordingData.id,
        status: "recording",
      })
      .select()
      .single()

    if (recordingError) {
      console.error("Error creating recording record:", recordingError)
      return NextResponse.json(
        { error: "Failed to create recording record" },
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
    console.error("Start recording error:", error)
    return NextResponse.json(
      { error: "Failed to start recording" },
      { status: 500 }
    )
  }
}
