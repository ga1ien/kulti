import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams {
  params: Promise<{
    sessionId: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Get session details
    const { data: session } = await supabase
      .from("sessions")
      .select("hms_room_id")
      .eq("id", sessionId)
      .single()

    if (!session || !session.hms_room_id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    // Get viewer count from HMS
    let totalCount = 0

    try {
      // Check WebRTC peers
      const roomDetails = await getRoomDetails(session.hms_room_id)
      if (roomDetails) {
        totalCount += roomDetails.peer_count
      }

      // Check HLS viewers
      const hlsStatus = await getHLSStreamStatus(session.hms_room_id)
      if (hlsStatus && hlsStatus.viewer_count) {
        totalCount += hlsStatus.viewer_count
      }
    } catch (error) {
      console.error("Error fetching viewer count:", error)
    }

    return NextResponse.json({
      count: totalCount,
    })
  } catch (error) {
    console.error("Viewer count error:", error)
    return NextResponse.json(
      { error: "Failed to get viewer count" },
      { status: 500 }
    )
  }
}
