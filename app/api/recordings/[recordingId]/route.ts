import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recordingId } = await params

    // Get recording and verify user is the session host
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select(
        `
        id,
        session_id,
        sessions!inner (
          host_id
        )
      `
      )
      .eq("id", recordingId)
      .single()

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      )
    }

    // TypeScript type assertion for the joined data
    const sessions = recording.sessions as unknown as { host_id: string }
    const sessionHost = sessions.host_id

    if (sessionHost !== user.id) {
      return NextResponse.json(
        { error: "Only the session host can delete recordings" },
        { status: 403 }
      )
    }

    // Delete recording (RLS will also check this)
    const { error: deleteError } = await supabase
      .from("recordings")
      .delete()
      .eq("id", recordingId)

    if (deleteError) {
      logger.error("Error deleting recording", { error: deleteError, recordingId })
      return NextResponse.json(
        { error: "Failed to delete recording" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Delete recording error", { error })
    return NextResponse.json(
      { error: "Failed to delete recording" },
      { status: 500 }
    )
  }
}
