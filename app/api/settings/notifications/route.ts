import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", user.id)
      .single()

    if (error) {
      logger.error('Notification preferences fetch error:', { error: error })
      return NextResponse.json(
        { error: "Failed to fetch notification preferences" },
        { status: 500 }
      )
    }

    return NextResponse.json(data.notification_preferences || {})
  } catch (error) {
    logger.error('Notification preferences fetch error:', { error: error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preferences = await request.json()

    // Validate that all values are booleans
    const validKeys = [
      "tips_received",
      "badges_earned",
      "match_found",
      "topic_streamed",
      "session_invites",
      "message_replies",
      "system_announcements",
    ]

    for (const key of Object.keys(preferences)) {
      if (!validKeys.includes(key)) {
        return NextResponse.json(
          { error: `Invalid preference key: ${key}` },
          { status: 400 }
        )
      }
      if (typeof preferences[key] !== "boolean") {
        return NextResponse.json(
          { error: `Preference ${key} must be a boolean` },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: preferences })
      .eq("id", user.id)

    if (error) {
      logger.error('Notification preferences update error:', { error: error })
      return NextResponse.json(
        { error: "Failed to update notification preferences" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Notification preferences update error:', { error: error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
