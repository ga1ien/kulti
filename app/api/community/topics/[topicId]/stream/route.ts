import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHMSRoom } from "@/lib/hms/server"
import { generateRoomCode } from "@/lib/utils"
import { notifyTopicStreamStarted } from "@/lib/notifications/service"

/**
 * POST /api/community/topics/[topicId]/stream
 * "Stream This Topic" - Create a session from a topic
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

    // Get topic details
    const { data: topic, error: topicError } = await supabase
      .from("discussion_topics")
      .select("*, room:community_rooms(name)")
      .eq("id", topicId)
      .single()

    if (topicError || !topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    }

    // Verify topic is not already covered
    if (topic.status === "completed" || topic.covered_in_session_id) {
      return NextResponse.json(
        { error: "This topic has already been covered" },
        { status: 400 }
      )
    }

    // Generate unique room code
    let roomCode = generateRoomCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("room_code", roomCode)
        .single()

      if (!existing) break
      roomCode = generateRoomCode()
      attempts++
    }

    // Create HMS room
    const hmsRoomId = await createHMSRoom(
      topic.title,
      `Community topic stream: ${topic.description || topic.title}`
    )

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        room_code: roomCode,
        title: topic.title,
        description: topic.description,
        host_id: user.id,
        hms_room_id: hmsRoomId,
        status: "live",
        is_public: true,
        max_participants: 4,
        started_at: new Date().toISOString(),
        session_type: "community_topic",
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Session creation error:", sessionError)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    // Add host as participant
    await supabase.from("session_participants").insert({
      session_id: session.id,
      user_id: user.id,
      role: "host",
    })

    // Mark topic as in-progress and link to session
    await supabase
      .from("discussion_topics")
      .update({
        status: "in-progress",
        covered_in_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", topicId)

    // Get host profile for notification
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()

    // Get engaged users for notifications
    const { data: engagedUsers } = await supabase.rpc(
      "get_topic_engaged_users",
      {
        p_topic_id: topicId,
      }
    )

    // Send notifications to engaged users
    // This runs in the background and won't block the response
    if (engagedUsers && engagedUsers.length > 0) {
      notifyTopicStreamStarted(
        session.id,
        topic.title,
        topic.room?.name || "community",
        hostProfile?.display_name || "Someone",
        user.id,
        engagedUsers
      )
        .then(() => {
          // Notifications sent successfully
        })
        .catch((error) => {
          console.error("Error sending topic stream notifications:", error)
          // Don't fail the stream creation if notifications fail
        })
    }

    return NextResponse.json({
      success: true,
      session,
      roomCode,
      engagedUsers: engagedUsers || [],
    })
  } catch (error) {
    console.error(
      "Error in POST /api/community/topics/[topicId]/stream:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
