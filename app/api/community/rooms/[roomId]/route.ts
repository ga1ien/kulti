import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/community/rooms/[roomId]
 * Get room details
 */
export async function GET(
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

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from("community_rooms")
      .select("*")
      .eq("id", roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Check if user is a member
    const { data: membership } = await supabase
      .from("room_members")
      .select("role, last_read_at, is_muted")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      room: {
        ...room,
        is_member: !!membership,
        membership: membership || null,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/community/rooms/[roomId]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
