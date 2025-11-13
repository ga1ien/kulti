import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/community/topics/[topicId]/vote
 * Toggle vote on a topic (add or remove)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { topicId } = await params

    // Verify topic exists and user is a member of the room
    const { data: topic } = await supabase
      .from("discussion_topics")
      .select("room_id")
      .eq("id", topicId)
      .single()

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", topic.room_id)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member to vote" },
        { status: 403 }
      )
    }

    // Toggle vote using database function
    const { data, error } = await supabase.rpc("toggle_topic_vote", {
      p_topic_id: topicId,
      p_user_id: user.id,
    })

    if (error) {
      console.error("Error toggling vote:", error)
      return NextResponse.json(
        { error: "Failed to toggle vote" },
        { status: 500 }
      )
    }

    const result = data?.[0]

    return NextResponse.json({
      success: true,
      upvoted: result?.upvoted,
      newCount: result?.new_count,
    })
  } catch (error) {
    console.error("Error in POST /api/community/topics/[topicId]/vote:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
