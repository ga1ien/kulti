import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/community/topics/[topicId]/comments
 * Get comments for a topic
 */
export async function GET(
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

    // Verify user is a member of the room
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
        { error: "You must be a member to view comments" },
        { status: 403 }
      )
    }

    // Get comments
    const { data: comments, error } = await supabase
      .from("topic_comments")
      .select(
        `
        *,
        commenter:profiles!topic_comments_user_id_fkey(username, display_name, avatar_url)
      `
      )
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      )
    }

    return NextResponse.json({ comments })
  } catch (error) {
    console.error(
      "Error in GET /api/community/topics/[topicId]/comments:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/topics/[topicId]/comments
 * Add a comment to a topic
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
    const body = await request.json()
    const { content, parentCommentId } = body

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Comment too long (max 2000 characters)" },
        { status: 400 }
      )
    }

    // Verify user is a member of the room
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
        { error: "You must be a member to comment" },
        { status: 403 }
      )
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from("topic_comments")
      .insert({
        topic_id: topicId,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select(
        `
        *,
        commenter:profiles!topic_comments_user_id_fkey(username, display_name, avatar_url)
      `
      )
      .single()

    if (commentError) {
      console.error("Error creating comment:", commentError)
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      )
    }

    return NextResponse.json({ comment })
  } catch (error) {
    console.error(
      "Error in POST /api/community/topics/[topicId]/comments:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
