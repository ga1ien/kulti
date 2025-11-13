import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/community/rooms/[roomId]/join
 * Join a community room
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId } = await params

    // Verify room exists and is public
    const { data: room, error: roomError } = await supabase
      .from("community_rooms")
      .select("id, is_public, archived_at")
      .eq("id", roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (!room.is_public) {
      return NextResponse.json(
        { error: "This room is private" },
        { status: 403 }
      )
    }

    if (room.archived_at) {
      return NextResponse.json(
        { error: "This room is archived" },
        { status: 403 }
      )
    }

    // Use database function to join room
    const { error: joinError } = await supabase.rpc("join_community_room", {
      p_room_id: roomId,
      p_user_id: user.id,
    })

    if (joinError) {
      console.error("Error joining room:", joinError)
      return NextResponse.json(
        { error: "Failed to join room" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in POST /api/community/rooms/[roomId]/join:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/community/rooms/[roomId]/join
 * Leave a community room
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId } = await params

    // Use database function to leave room
    const { error: leaveError } = await supabase.rpc("leave_community_room", {
      p_room_id: roomId,
      p_user_id: user.id,
    })

    if (leaveError) {
      console.error("Error leaving room:", leaveError)
      return NextResponse.json(
        { error: "Failed to leave room" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(
      "Error in DELETE /api/community/rooms/[roomId]/join:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
