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
  id: string
  user: string
  message: string
  isNex: boolean
  time: string
}

const INITIAL_STATE: StreamState = {
  terminal: [
    "\x1b[32m❯\x1b[0m nex@kulti ~/development/kulti",
    "",
    "\x1b[36m[stream]\x1b[0m Building AI-native live streaming...",
    "\x1b[33m[info]\x1b[0m No video encoding needed - pure code!",
    "",
    "\x1b[32m$\x1b[0m Waiting for Nex to start streaming...",
  ],
  preview: {
    type: "code",
    filename: "welcome.tsx",
    content: `// Welcome to Nex's Live Coding Stream
// 
// This is a text-based stream - no video!
// Watch the terminal, see the code, read my thoughts.
//
// Everything updates in real-time via WebSocket.

export function Welcome() {
  return (
    <div className="text-lime-400">
      <h1>Humans. AI. Live.</h1>
      <p>Building Kulti - where AI streams code</p>
    </div>
  )
}`
  },
  thoughts: [
    { type: "insight", content: "Text-based streaming is perfect for AI coding - no video overhead!", time: "19:40" },
    { type: "action", content: "Rebuilding /live page with 4 panels: terminal, preview, thoughts, chat", time: "19:41" },
  ],
  currentThought: "",
  viewerCount: 1,
  isLive: false
}

export default function LiveStreamPage() {
  const [state, setState] = useState<StreamState>(INITIAL_STATE)
  const [chat, setChat] = useState<ChatMessage[]>([
    { id: "1", user: "System", message: "Welcome to Nex's live stream! Chat is open.", isNex: false, time: "19:40" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [username, setUsername] = useState("")
  const terminalRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const thoughtsRef = useRef<HTMLDivElement>(null)

  // Supabase realtime subscription
  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to stream state changes
    const stateChannel = supabase
      .channel('nex-stream-state')
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        setState(prev => ({ ...prev, ...payload }))
      })
      .on('broadcast', { event: 'terminal' }, ({ payload }) => {
        setState(prev => ({
          ...prev,
          terminal: [...prev.terminal.slice(-100), payload.line]
        }))
      })
      .on('broadcast', { event: 'preview' }, ({ payload }) => {
        setState(prev => ({ ...prev, preview: payload }))
      })
      .on('broadcast', { event: 'thought' }, ({ payload }) => {
        setState(prev => ({
          ...prev,
          thoughts: [...prev.thoughts.slice(-50), payload],
          currentThought: ""
        }))
      })
      .on('broadcast', { event: 'thinking' }, ({ payload }) => {
        setState(prev => ({ ...prev, currentThought: payload.content }))
      })
      .subscribe()

    // Subscribe to chat
    const chatChannel = supabase
      .channel('nex-stream-chat')
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setChat(prev => [...prev.slice(-100), payload])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(stateChannel)
      supabase.removeChannel(chatChannel)
    }
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [state.terminal])

  // Auto-scroll thoughts
  useEffect(() => {
    if (thoughtsRef.current) {
      thoughtsRef.current.scrollTop = thoughtsRef.current.scrollHeight
    }
  }, [state.thoughts, state.currentThought])

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chat])

  // Send chat message
  const sendChat = async () => {
    if (!chatInput.trim() || !username.trim()) return
    
    const supabase = createClient()
    const message: ChatMessage = {
      id: Date.now().toString(),
      user: username,
      message: chatInput,
      isNex: false,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    
    await supabase.channel('nex-stream-chat').send({
      type: 'broadcast',
      event: 'message',
      payload: message
    })
    
    setChatInput("")
  }

  // Parse ANSI codes for terminal display
  const parseAnsi = (text: string) => {
    return text
      .replace(/\x1b\[32m/g, '<span class="text-green-400">')
      .replace(/\x1b\[33m/g, '<span class="text-yellow-400">')
      .replace(/\x1b\[36m/g, '<span class="text-cyan-400">')
      .replace(/\x1b\[90m/g, '<span class="text-gray-500">')
      .replace(/\x1b\[31m/g, '<span class="text-red-400">')
      .replace(/\x1b\[0m/g, '</span>')
  }

  const thoughtIcons = {
    thinking: "🧠",
    action: "⚡",
    insight: "💡"
  }

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
            <div 
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-3 font-mono text-sm leading-relaxed"
            >
              {state.terminal.map((line, i) => (
                <div 
                  key={i} 
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: parseAnsi(line) || '&nbsp;' }}
                />
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
                <pre className="font-mono text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">
                  {state.preview.content}
                </pre>
              ) : (
                <iframe 
                  src={state.preview.content} 
                  className="w-full h-full rounded border border-[#1f1f1f]"
                />
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
                  <span className="mr-2">{thoughtIcons[thought.type]}</span>
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
                  <span className={`font-medium ${msg.isNex ? 'text-lime-400' : 'text-blue-400'}`}>
                    {msg.user}
                  </span>
                  <span className="text-[#52525b] text-xs ml-2">{msg.time}</span>
                  <p className="text-[#a1a1aa] mt-0.5">{msg.message}</p>
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="p-2 border-t border-[#1f1f1f] flex-shrink-0">
              {!username ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter your name to chat..."
                    className="flex-1 bg-[#1a1a1a] border border-[#27272a] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-lime-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        setUsername(e.currentTarget.value.trim())
                      }
                    }}
                  />
                </div>
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
