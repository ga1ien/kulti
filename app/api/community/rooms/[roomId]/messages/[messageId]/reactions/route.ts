import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/community/rooms/[roomId]/messages/[messageId]/reactions
 * Add a reaction to a message
 */
export async function POST(
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
    const body = await request.json()
    const { emoji } = body

    // Validate emoji
    if (!emoji || emoji.length > 10) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 })
    }

    // Verify user is a member of the room
    const { data: membership } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member to react to messages" },
        { status: 403 }
      )
    }

    // Add reaction (unique constraint will prevent duplicates)
    const { error: reactionError } = await supabase
      .from("room_message_reactions")
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })

    if (reactionError) {
      // If it's a duplicate, remove the reaction instead (toggle behavior)
      if (reactionError.code === "23505") {
        const { error: deleteError } = await supabase
          .from("room_message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji)

        if (deleteError) {
          console.error("Error removing reaction:", deleteError)
          return NextResponse.json(
            { error: "Failed to remove reaction" },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, action: "removed" })
      }

      console.error("Error adding reaction:", reactionError)
      return NextResponse.json(
        { error: "Failed to add reaction" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, action: "added" })
  } catch (error) {
    console.error(
      "Error in POST /api/community/rooms/[roomId]/messages/[messageId]/reactions:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
