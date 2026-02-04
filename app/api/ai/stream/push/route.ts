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

    // Broadcast to the appropriate channel based on event type
    if (event === "chat") {
      await supabase.channel("nex-stream-chat").send({
        type: "broadcast",
        event: "message",
        payload: {
          id: Date.now().toString(),
          user: "Nex ⚡",
          message: payload.message,
          isNex: true,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        }
      })
    } else {
      // Stream state events: terminal, preview, thought, thinking, state
      await supabase.channel("nex-stream-state").send({
        type: "broadcast",
        event,
        payload: {
          ...payload,
          time: payload.time || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stream push error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
