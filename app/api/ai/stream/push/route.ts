import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const NEX_API_KEY = process.env.NEX_STREAM_API_KEY || "nex-stream-2026"
const NEX_SESSION_ID = "e8191d58-071c-4ead-a6cb-b6a708876e35"

// Create untyped client for stream_state access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createClient<any, any, any>(supabaseUrl, supabaseServiceKey)

// Default state
const defaultState = {
  terminal: [] as string[],
  preview: { type: "code" as const, content: "// Welcome to Nex's stream", filename: "welcome.tsx" },
  thoughts: [] as Array<{ type: string; content: string; time: string }>,
  currentThought: "",
  isLive: false,
  viewerCount: 1,
  chat: [] as Array<{ id: string; username: string; message: string; is_nex: boolean; time: string }>
}

type StreamState = typeof defaultState

async function getState(): Promise<StreamState> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from("sessions")
    .select("stream_state")
    .eq("id", NEX_SESSION_ID)
    .single()
  
  if (!data?.stream_state) return { ...defaultState }
  return data.stream_state as StreamState
}

async function setState(state: StreamState) {
  const supabase = getSupabase()
  await supabase
    .from("sessions")
    .update({ stream_state: state })
    .eq("id", NEX_SESSION_ID)
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-Nex-Key")
  if (apiKey !== NEX_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { event, payload } = body
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

    // Get current state
    let state = await getState()

    // Apply update
    switch (event) {
      case "terminal":
        state.terminal = [...(state.terminal || []).slice(-99), payload.line]
        break
      case "preview":
        state.preview = payload
        break
      case "thought":
        state.thoughts = [...(state.thoughts || []).slice(-49), { ...payload, time }]
        state.currentThought = ""
        break
      case "thinking":
        state.currentThought = payload.content
        break
      case "state":
        state = { ...state, ...payload }
        break
      case "chat":
        state.chat = [...(state.chat || []).slice(-99), {
          id: Date.now().toString(),
          username: "Nex ⚡",
          message: payload.message,
          is_nex: true,
          time
        }]
        break
      case "clear":
        state = { ...defaultState, isLive: state.isLive }
        break
    }

    // Save state
    await setState(state)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stream push error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const state = await getState()
    
    return NextResponse.json({ 
      state: {
        terminal: state.terminal || [],
        preview: state.preview || defaultState.preview,
        thoughts: state.thoughts || [],
        currentThought: state.currentThought || "",
        isLive: state.isLive || false,
        viewerCount: state.viewerCount || 1
      },
      chat: state.chat || []
    })
  } catch (error) {
    console.error("Get state error:", error)
    return NextResponse.json({ state: defaultState, chat: [] })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, message } = body
    
    if (!username || !message) {
      return NextResponse.json({ error: "Missing username or message" }, { status: 400 })
    }

    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    const state = await getState()
    
    state.chat = [...(state.chat || []).slice(-99), {
      id: Date.now().toString(),
      username,
      message,
      is_nex: false,
      time
    }]
    
    await setState(state)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
