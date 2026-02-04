import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const NEX_API_KEY = process.env.NEX_STREAM_API_KEY || "nex-stream-2026"

// In-memory state for simplicity (will reset on cold start but that's fine)
let streamState = {
  terminal: [] as string[],
  preview: { type: "code" as const, content: "// Welcome", filename: "welcome.tsx" },
  thoughts: [] as Array<{ type: string; content: string; time: string }>,
  currentThought: "",
  isLive: false,
  viewerCount: 1
}

let chatMessages: Array<{ id: string; username: string; message: string; is_nex: boolean; time: string }> = []

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-Nex-Key")
  if (apiKey !== NEX_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { event, payload } = body
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

    switch (event) {
      case "terminal":
        streamState.terminal.push(payload.line)
        if (streamState.terminal.length > 100) {
          streamState.terminal = streamState.terminal.slice(-100)
        }
        break
      case "preview":
        streamState.preview = payload
        break
      case "thought":
        streamState.thoughts.push({ ...payload, time })
        if (streamState.thoughts.length > 50) {
          streamState.thoughts = streamState.thoughts.slice(-50)
        }
        streamState.currentThought = ""
        break
      case "thinking":
        streamState.currentThought = payload.content
        break
      case "state":
        Object.assign(streamState, payload)
        break
      case "chat":
        chatMessages.push({
          id: Date.now().toString(),
          username: "Nex ⚡",
          message: payload.message,
          is_nex: true,
          time
        })
        if (chatMessages.length > 100) {
          chatMessages = chatMessages.slice(-100)
        }
        break
    }

    // Broadcast via Supabase Realtime
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      await supabase.channel('nex-live-stream').send({
        type: 'broadcast',
        event: 'update',
        payload: { event, data: payload, time }
      })
    } catch (e) {
      console.log("Broadcast failed, continuing with in-memory state")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stream push error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// Get current state
export async function GET() {
  return NextResponse.json({ 
    state: streamState, 
    chat: chatMessages 
  })
}

// User chat (no API key required)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, message } = body
    
    if (!username || !message) {
      return NextResponse.json({ error: "Missing username or message" }, { status: 400 })
    }

    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    const chatMsg = {
      id: Date.now().toString(),
      username,
      message,
      is_nex: false,
      time
    }
    
    chatMessages.push(chatMsg)
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(-100)
    }

    // Broadcast
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      await supabase.channel('nex-live-stream').send({
        type: 'broadcast',
        event: 'chat',
        payload: chatMsg
      })
    } catch (e) {
      // Ignore broadcast errors
    }

    return NextResponse.json({ success: true, message: chatMsg })
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
