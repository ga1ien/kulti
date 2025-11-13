import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/community/rooms/[roomId]/messages
 * Get messages for a room with pagination
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const beforeTime = searchParams.get("before")

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

    // Get messages using database function
    const { data: messages, error } = await supabase.rpc("get_room_messages", {
      p_room_id: roomId,
      p_limit: limit,
      p_before_time: beforeTime || null,
    })

    if (error) {
      console.error("Error fetching messages:", error)
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error(
      "Error in GET /api/community/rooms/[roomId]/messages:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/rooms/[roomId]/messages
 * Send a message to a room
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
    const body = await request.json()
    const { content, parentMessageId } = body

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Message too long (max 5000 characters)" },
        { status: 400 }
      )
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
        { error: "You must be a member to send messages" },
        { status: 403 }
      )
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from("room_messages")
      .insert({
        room_id: roomId,
        user_id: user.id,
        content: content.trim(),
        parent_message_id: parentMessageId || null,
      })
      .select(
        `
        *,
        profile:profiles(username, display_name, avatar_url)
      `
      )
      .single()

    if (messageError) {
      console.error("Error creating message:", messageError)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error(
      "Error in POST /api/community/rooms/[roomId]/messages:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
