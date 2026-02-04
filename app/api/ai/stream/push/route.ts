import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Simple API key for Nex
const NEX_API_KEY = process.env.NEX_STREAM_API_KEY || "nex-stream-2026"

export async function POST(request: NextRequest) {
  // Verify API key
  const apiKey = request.headers.get("X-Nex-Key")
  if (apiKey !== NEX_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { event, payload } = body

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (event === "chat") {
      // Insert chat message
      const { error } = await supabase.from("nex_stream_chat").insert({
        username: "Nex ⚡",
        message: payload.message,
        is_nex: true
      })
      
      if (error) throw error
    } else {
      // Insert stream event
      const { error } = await supabase.from("nex_stream_events").insert({
        event_type: event,
        payload: payload
      })
      
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stream push error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// Get current state (for initial load)
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get recent events
    const { data: events } = await supabase
      .from("nex_stream_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    // Get recent chat
    const { data: chat } = await supabase
      .from("nex_stream_chat")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100)

    // Build state from events
    const state = {
      terminal: [] as string[],
      preview: { type: "code", content: "// Loading...", filename: "loading.tsx" },
      thoughts: [] as any[],
      currentThought: "",
      isLive: false,
      viewerCount: 1
    }

    // Process events in order (oldest first)
    const sortedEvents = (events || []).reverse()
    for (const event of sortedEvents) {
      switch (event.event_type) {
        case "terminal":
          state.terminal.push(event.payload.line)
          break
        case "preview":
          state.preview = event.payload
          break
        case "thought":
          state.thoughts.push({
            ...event.payload,
            time: new Date(event.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          })
          break
        case "thinking":
          state.currentThought = event.payload.content
          break
        case "state":
          Object.assign(state, event.payload)
          break
      }
    }

    // Keep only last 50 terminal lines
    state.terminal = state.terminal.slice(-50)
    state.thoughts = state.thoughts.slice(-20)

    return NextResponse.json({ state, chat: chat || [] })
  } catch (error) {
    console.error("Get state error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
