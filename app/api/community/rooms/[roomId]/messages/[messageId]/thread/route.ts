import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/community/rooms/[roomId]/messages/[messageId]/thread
 * Get a message thread (parent + replies)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId, messageId } = await params

    // Verify user is a member of the room
    const { data: membership } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member to view messages" },
        { status: 403 }
      )
    }

    // Get thread using database function
    const { data: thread, error } = await supabase.rpc("get_message_thread", {
      p_parent_message_id: messageId,
    })

    if (error) {
      console.error("Error fetching thread:", error)
      return NextResponse.json(
        { error: "Failed to fetch thread" },
        { status: 500 }
      )
    }

    return NextResponse.json({ thread })
  } catch (error) {
    console.error(
      "Error in GET /api/community/rooms/[roomId]/messages/[messageId]/thread:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
