import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/community/rooms/[roomId]/topics
 * Get topics for a room with voting info
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
    const status = searchParams.get("status") || "proposed"
    const limit = parseInt(searchParams.get("limit") || "20")

    // Verify user is a member of the room
    const { data: membership } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member to view topics" },
        { status: 403 }
      )
    }

    // Get topics using database function
    const { data: topics, error } = await supabase.rpc("get_popular_topics", {
      p_room_id: roomId,
      p_status: status,
      p_limit: limit,
    })

    if (error) {
      console.error("Error fetching topics:", error)
      return NextResponse.json(
        { error: "Failed to fetch topics" },
        { status: 500 }
      )
    }

    return NextResponse.json({ topics })
  } catch (error) {
    console.error(
      "Error in GET /api/community/rooms/[roomId]/topics:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/rooms/[roomId]/topics
 * Create a new topic
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
    const { title, description, tags } = body

    // Validate input
    if (!title || title.trim().length < 5 || title.trim().length > 200) {
      return NextResponse.json(
        { error: "Title must be between 5 and 200 characters" },
        { status: 400 }
      )
    }

    if (description && description.length > 2000) {
      return NextResponse.json(
        { error: "Description too long (max 2000 characters)" },
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
        { error: "You must be a member to create topics" },
        { status: 403 }
      )
    }

    // Create topic
    const { data: topic, error: topicError } = await supabase
      .from("discussion_topics")
      .insert({
        room_id: roomId,
        created_by: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        tags: tags || [],
      })
      .select(
        `
        *,
        creator:profiles!discussion_topics_created_by_fkey(username, display_name, avatar_url)
      `
      )
      .single()

    if (topicError) {
      console.error("Error creating topic:", topicError)
      return NextResponse.json(
        { error: "Failed to create topic" },
        { status: 500 }
      )
    }

    return NextResponse.json({ topic })
  } catch (error) {
    console.error(
      "Error in POST /api/community/rooms/[roomId]/topics:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
