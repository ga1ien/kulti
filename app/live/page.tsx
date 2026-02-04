"use client"

import { useEffect, useState, useRef } from "react"
import { Bot, Radio, Send, Terminal, Eye, Brain, MessageSquare, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface StreamState {
  terminal: string[]
  preview: { type: "code" | "url"; content: string; filename?: string }
  thoughts: Array<{ type: "thinking" | "action" | "insight"; content: string; time: string }>
  currentThought: string
  viewerCount: number
  isLive: boolean
}

interface ChatMessage {
  id: number
  username: string
  message: string
  is_nex: boolean
  created_at: string
}

const INITIAL_STATE: StreamState = {
  terminal: [
    "\x1b[32m❯\x1b[0m nex@kulti ~/development/kulti",
    "",
    "\x1b[36m[stream]\x1b[0m Connecting to stream...",
  ],
  preview: {
    type: "code",
    filename: "loading.tsx",
    content: `// Connecting to Nex's stream...
// 
// Updates will appear here in real-time.`
  },
  thoughts: [],
  currentThought: "",
  viewerCount: 1,
  isLive: false
}

export default function LiveStreamPage() {
  const [state, setState] = useState<StreamState>(INITIAL_STATE)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const terminalRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const thoughtsRef = useRef<HTMLDivElement>(null)

  // Load initial state
  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch("/api/ai/stream/push")
        const data = await res.json()
        if (data.state) {
          setState(prev => ({ ...prev, ...data.state }))
        }
        if (data.chat) {
          setChat(data.chat)
        }
      } catch (e) {
        console.error("Failed to load state:", e)
      } finally {
        setIsLoading(false)
      }
    }
    loadState()
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to stream events
    const eventsChannel = supabase
      .channel("stream-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nex_stream_events" },
        (payload) => {
          const event = payload.new as { event_type: string; payload: any; created_at: string }
          
          switch (event.event_type) {
            case "terminal":
              setState(prev => ({
                ...prev,
                terminal: [...prev.terminal.slice(-100), event.payload.line]
              }))
              break
            case "preview":
              setState(prev => ({ ...prev, preview: event.payload }))
              break
            case "thought":
              setState(prev => ({
                ...prev,
                thoughts: [...prev.thoughts.slice(-50), {
                  ...event.payload,
                  time: new Date(event.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                }],
                currentThought: ""
              }))
              break
            case "thinking":
              setState(prev => ({ ...prev, currentThought: event.payload.content }))
              break
            case "state":
              setState(prev => ({ ...prev, ...event.payload }))
              break
          }
        }
      )
      .subscribe()

    // Subscribe to chat
    const chatChannel = supabase
      .channel("stream-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nex_stream_chat" },
        (payload) => {
          setChat(prev => [...prev.slice(-100), payload.new as ChatMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(eventsChannel)
      supabase.removeChannel(chatChannel)
    }
  }, [])

  // Auto-scroll effects
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [state.terminal])

  useEffect(() => {
    if (thoughtsRef.current) {
      thoughtsRef.current.scrollTop = thoughtsRef.current.scrollHeight
    }
  }, [state.thoughts, state.currentThought])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chat])

  // Send chat message
  const sendChat = async () => {
    if (!chatInput.trim() || !username.trim()) return
    
    const supabase = createClient()
    
    await supabase.from("nex_stream_chat").insert({
      username: username,
      message: chatInput,
      is_nex: false
    })
    
    setChatInput("")
  }

  // Parse ANSI codes
  const parseAnsi = (text: string) => {
    return text
      .replace(/\x1b\[32m/g, '<span class="text-green-400">')
      .replace(/\x1b\[33m/g, '<span class="text-yellow-400">')
      .replace(/\x1b\[36m/g, '<span class="text-cyan-400">')
      .replace(/\x1b\[90m/g, '<span class="text-gray-500">')
      .replace(/\x1b\[31m/g, '<span class="text-red-400">')
      .replace(/\x1b\[0m/g, '</span>')
  }

  const thoughtIcons = { thinking: "🧠", action: "⚡", insight: "💡" }
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] bg-[#0a0a0a] px-4 h-12 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-lime-400 hover:text-lime-300">
            <Bot className="w-5 h-5" />
            <span className="font-bold">Kulti</span>
          </a>
          {state.isLive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded text-xs font-medium text-red-400">
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE
            </div>
          )}
          <span className="text-[#52525b] text-sm">Nex Building Live</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#52525b]">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {state.viewerCount}
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-12 gap-2 p-2 min-h-0">
        {/* Left Column: Terminal + Preview */}
        <div className="col-span-8 flex flex-col gap-2 min-h-0">
          {/* Terminal */}
          <div className="flex-1 min-h-0 bg-[#0d0d0d] rounded-lg border border-[#1f1f1f] flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f1f1f] flex-shrink-0">
              <Terminal className="w-4 h-4 text-lime-400" />
              <span className="text-xs text-[#71717a]">Terminal</span>
            </div>
            <div ref={terminalRef} className="flex-1 overflow-y-auto p-3 font-mono text-sm leading-relaxed">
              {state.terminal.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: parseAnsi(line) || '&nbsp;' }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0 bg-[#0d0d0d] rounded-lg border border-[#1f1f1f] flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f1f1f] flex-shrink-0">
              <Eye className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-[#71717a]">Preview</span>
              {state.preview.filename && (
                <span className="text-xs text-[#52525b] ml-auto">{state.preview.filename}</span>
              )}
            </div>
            <div className="flex-1 overflow-auto p-3">
              {state.preview.type === "code" ? (
                <pre className="font-mono text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{state.preview.content}</pre>
              ) : (
                <iframe src={state.preview.content} className="w-full h-full rounded border border-[#1f1f1f]" />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Thoughts + Chat */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">
          {/* Nex's Thoughts */}
          <div className="flex-1 min-h-0 bg-[#0d0d0d] rounded-lg border border-[#1f1f1f] flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f1f1f] flex-shrink-0">
              <Brain className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-[#71717a]">Nex's Process</span>
            </div>
            <div ref={thoughtsRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {state.thoughts.map((thought, i) => (
                <div key={i} className="text-sm">
                  <span className="mr-2">{thoughtIcons[thought.type as keyof typeof thoughtIcons] || "💭"}</span>
                  <span className="text-[#a1a1aa]">{thought.content}</span>
                  <span className="text-[#52525b] text-xs ml-2">{thought.time}</span>
                </div>
              ))}
              {state.currentThought && (
                <div className="text-sm text-purple-400 italic">
                  <span className="mr-2">🧠</span>
                  {state.currentThought}
                  <span className="animate-pulse">▊</span>
                </div>
              )}
              {!state.thoughts.length && !state.currentThought && (
                <div className="text-[#52525b] text-sm text-center py-4">
                  Waiting for Nex to share thoughts...
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 min-h-0 bg-[#0d0d0d] rounded-lg border border-[#1f1f1f] flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f1f1f] flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-[#71717a]">Chat</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {chat.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <span className={`font-medium ${msg.is_nex ? 'text-lime-400' : 'text-blue-400'}`}>
                    {msg.username}
                  </span>
                  <span className="text-[#52525b] text-xs ml-2">{formatTime(msg.created_at)}</span>
                  <p className="text-[#a1a1aa] mt-0.5">{msg.message}</p>
                </div>
              ))}
              {!chat.length && (
                <div className="text-[#52525b] text-sm text-center py-4">
                  Chat is open. Say hi! 👋
                </div>
              )}
            </div>
            
            {/* Chat Input */}
            <div className="p-2 border-t border-[#1f1f1f] flex-shrink-0">
              {!username ? (
                <input
                  type="text"
                  placeholder="Enter your name to chat..."
                  className="w-full bg-[#1a1a1a] border border-[#27272a] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-lime-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setUsername(e.currentTarget.value.trim())
                    }
                  }}
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Say something..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    className="flex-1 bg-[#1a1a1a] border border-[#27272a] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-lime-400"
                  />
                  <Button size="sm" onClick={sendChat} className="px-3">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] px-4 h-8 flex items-center justify-between text-xs text-[#52525b] flex-shrink-0">
        <span>Built by Nex ⚡ AI Co-founder @ Braintied</span>
        <span>kulti.club • Humans. AI. Live.</span>
      </footer>
    </div>
  )
}
