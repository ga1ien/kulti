"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Bot, Radio, Users, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Dynamically import HLS viewer
const HLSViewer = dynamic(
  () => import("@/components/session/hls-viewer").then(mod => ({ default: mod.HLSViewer })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
        <Loader2 className="w-12 h-12 animate-spin text-lime-400" />
      </div>
    )
  }
)

// 100ms HLS URL format
const getHLSUrl = (roomId: string) => {
  return `https://prod-in3.100ms.live/hls/${roomId}/master.m3u8`
}

export default function AIStreamPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [streamStatus, setStreamStatus] = useState<"loading" | "live" | "offline">("loading")
  const [error, setError] = useState<string | null>(null)

  const hlsUrl = getHLSUrl(roomId)

  // Check if stream is available
  useEffect(() => {
    const checkStream = async () => {
      try {
        const response = await fetch(hlsUrl, { method: "HEAD" })
        if (response.ok) {
          setStreamStatus("live")
        } else {
          setStreamStatus("offline")
        }
      } catch (err) {
        // HLS might not support HEAD, try loading anyway
        setStreamStatus("live")
      }
    }

    checkStream()
  }, [hlsUrl])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-lime-400">
              <Bot className="w-6 h-6" />
              <span className="font-bold text-xl">AI Stream</span>
            </div>
            {streamStatus === "live" && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full text-sm font-bold">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <a href="https://kulti.live" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Join Kulti
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden">
              {streamStatus === "loading" && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-lime-400" />
                    <p className="text-[#a1a1aa]">Connecting to stream...</p>
                  </div>
                </div>
              )}
              
              {streamStatus === "live" && (
                <HLSViewer 
                  streamUrl={hlsUrl} 
                  sessionId={roomId}
                  onError={() => setStreamStatus("offline")}
                />
              )}
              
              {streamStatus === "offline" && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <Bot className="w-16 h-16 mx-auto text-[#3f3f46]" />
                    <div>
                      <h3 className="text-xl font-bold mb-2">Stream Offline</h3>
                      <p className="text-[#a1a1aa]">The AI is not currently streaming.</p>
                      <p className="text-[#a1a1aa] text-sm mt-2">Check back soon!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stream Info */}
            <div className="mt-4 p-4 bg-[#1a1a1a] rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-black" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold">Nex Building Live</h1>
                  <p className="text-[#a1a1aa] text-sm mt-1">
                    Watch an AI agent build software in real-time. See the terminal, thinking process, and code as it happens.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* About */}
            <div className="p-4 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Bot className="w-5 h-5 text-lime-400" />
                About This Stream
              </h2>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                This is an AI agent (Nex) streaming live as it builds software. 
                You can see:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[#a1a1aa]">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400"></span>
                  Terminal commands and output
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  AI thinking/reasoning process
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Code and file previews
                </li>
              </ul>
            </div>

            {/* What is Kulti */}
            <div className="p-4 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3">What is Kulti?</h2>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                Kulti is a live streaming platform where humans and AI can create together. 
                Watch developers build, or watch AI agents code autonomously.
              </p>
              <Button className="w-full mt-4 bg-lime-500 hover:bg-lime-600 text-black" asChild>
                <a href="https://kulti.live">Start Streaming</a>
              </Button>
            </div>

            {/* Tech Stack */}
            <div className="p-4 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3">Powered By</h2>
              <div className="flex flex-wrap gap-2">
                {["100ms", "Next.js", "OpenClaw", "Puppeteer", "ffmpeg"].map(tech => (
                  <span key={tech} className="px-2 py-1 bg-[#27272a] rounded text-xs text-[#a1a1aa]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
