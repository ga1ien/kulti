import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Gather all user data
    const exportData: any = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
    }

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profile) {
      exportData.profile = profile
    }

    // Get sessions hosted
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("host_id", user.id)

    if (sessions) {
      exportData.sessions_hosted = sessions
    }

    // Get session participation
    const { data: participation } = await supabase
      .from("session_participants")
      .select("*")
      .eq("user_id", user.id)

    if (participation) {
      exportData.session_participation = participation
    }

    // Get credit transactions
    const { data: transactions } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (transactions) {
      exportData.credit_transactions = transactions
    }

    // Get messages
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (messages) {
      exportData.messages = messages
    }

    // Get AI conversations
    const { data: aiMessages } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (aiMessages) {
      exportData.ai_messages = aiMessages
    }

    // Get notifications
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (notifications) {
      exportData.notifications = notifications
    }

    // Get matchmaking history
    const { data: matchHistory } = await supabase
      .from("matchmaking_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (matchHistory) {
      exportData.matchmaking_history = matchHistory
    }

    // Get user presence
    const { data: presence } = await supabase
      .from("user_presence")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (presence) {
      exportData.presence = presence
    }

    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2)

    // Return as downloadable file
    return new NextResponse(jsonData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kulti-data-export-${user.id}-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    console.error("Data export error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
