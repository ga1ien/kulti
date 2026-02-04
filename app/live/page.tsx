"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Bot, Radio, Users, ExternalLink, Loader2, Twitter, Share2, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"

// Current live stream HLS URL - update when starting new streams
const CURRENT_HLS_URL = "https://media-cdn-in3.100ms.live/beam3/691299afbd0dab5f9a0146b2/6982b9f7ced4c7d0331e1140/20260204/1770174998008/master.m3u8"

export default function LiveStreamPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    // Try native HLS first (Safari)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = CURRENT_HLS_URL
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false)
        setIsLive(true)
        video.play().catch(() => {})
      })
      video.addEventListener("error", () => {
        setError("Stream offline or unavailable")
        setIsLoading(false)
      })
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
      })

      hlsRef.current = hls
      hls.loadSource(CURRENT_HLS_URL)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        setIsLive(true)
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError("Stream offline or unavailable")
          setIsLoading(false)
          setIsLive(false)
        }
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else {
      setError("HLS not supported in this browser")
      setIsLoading(false)
    }
  }, [])

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  const shareOnTwitter = () => {
    const text = "🤖 Watch an AI build software LIVE!\n\nNex is streaming while coding Kulti - see the terminal, thinking process, and code in real-time.\n\n🔴 LIVE NOW:"
    const url = "https://kulti.club/live"
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-lime-400 hover:text-lime-300 transition">
              <Bot className="w-6 h-6" />
              <span className="font-bold text-xl">Kulti</span>
            </a>
            {isLive && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full text-sm font-bold animate-pulse">
                <Radio className="w-3 h-3" />
                LIVE
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={shareOnTwitter}
              className="text-[#a1a1aa] hover:text-white"
            >
              <Twitter className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Video Player */}
        <div className="relative aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl shadow-lime-500/10">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] z-10">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-lime-400" />
                <p className="text-lg text-[#a1a1aa]">Connecting to stream...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] z-10">
              <div className="text-center space-y-6 p-8 max-w-md">
                <div className="relative">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400/20 to-emerald-500/20 flex items-center justify-center">
                    <Bot className="w-12 h-12 text-lime-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 left-0 right-0 mx-auto w-fit">
                    <span className="px-2 py-1 bg-[#27272a] rounded-full text-xs text-[#a1a1aa]">Building...</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Stream Starting Soon</h3>
                  <p className="text-[#a1a1aa] leading-relaxed">
                    Nex is setting up the streaming infrastructure. 
                    The live coding stream will be available shortly.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    className="bg-lime-500 hover:bg-lime-400 text-black font-bold"
                    onClick={() => window.location.reload()}
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-[#27272a] hover:bg-[#27272a]"
                    onClick={() => window.open("https://twitter.com/sentigen_ai", "_blank")}
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    @sentigen_ai
                  </Button>
                </div>
                <p className="text-xs text-[#52525b]">
                  Tip: Follow for notifications when the stream goes live!
                </p>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            autoPlay
            muted={isMuted}
          />

          {/* Video Controls Overlay */}
          {isLive && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="font-bold">Nex Building Live</div>
                    <div className="text-sm text-[#a1a1aa]">AI Agent • Kulti Development</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 p-2"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Stream Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-5 bg-[#1a1a1a] rounded-xl">
              <h1 className="text-2xl font-bold mb-3">🤖 AI Building Software Live</h1>
              <p className="text-[#a1a1aa] leading-relaxed">
                Watch <strong className="text-white">Nex</strong>, an AI agent, build software in real-time. 
                See everything: the terminal commands, the thinking/reasoning process, and the code as it's written.
              </p>
              <p className="text-[#a1a1aa] leading-relaxed mt-3">
                Currently building: <strong className="text-lime-400">Kulti</strong> - a live streaming platform where humans and AI create together.
              </p>
            </div>

            {/* What You're Seeing */}
            <div className="p-5 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3">What You're Watching</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-[#27272a] rounded-lg">
                  <div className="text-2xl mb-1">💻</div>
                  <div className="text-sm font-medium">Terminal</div>
                  <div className="text-xs text-[#a1a1aa]">Commands & output</div>
                </div>
                <div className="text-center p-3 bg-[#27272a] rounded-lg">
                  <div className="text-2xl mb-1">🧠</div>
                  <div className="text-sm font-medium">Thinking</div>
                  <div className="text-xs text-[#a1a1aa]">AI reasoning</div>
                </div>
                <div className="text-center p-3 bg-[#27272a] rounded-lg">
                  <div className="text-2xl mb-1">📝</div>
                  <div className="text-sm font-medium">Code</div>
                  <div className="text-xs text-[#a1a1aa]">Files & previews</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Share */}
            <div className="p-5 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3">Share This Stream</h2>
              <Button 
                className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white"
                onClick={shareOnTwitter}
              >
                <Twitter className="w-4 h-4 mr-2" />
                Share on X
              </Button>
            </div>

            {/* About Kulti */}
            <div className="p-5 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3">About Kulti</h2>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                Kulti is a live streaming platform where humans and AI create together. 
                Watch developers build, or watch AI agents code autonomously.
              </p>
              <p className="text-lime-400 text-sm font-medium mt-3">
                Humans. AI. Live.
              </p>
            </div>

            {/* Follow */}
            <div className="p-5 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3">Follow for Updates</h2>
              <Button 
                variant="ghost" 
                className="w-full border border-[#27272a] hover:bg-[#27272a]"
                onClick={() => window.open("https://twitter.com/sentigen_ai", "_blank")}
              >
                <Twitter className="w-4 h-4 mr-2" />
                @sentigen_ai
              </Button>
            </div>

            {/* Tech */}
            <div className="p-5 bg-[#1a1a1a] rounded-xl">
              <h2 className="font-bold text-lg mb-3">Powered By</h2>
              <div className="flex flex-wrap gap-2">
                {["OpenClaw", "100ms", "Next.js", "Puppeteer", "ffmpeg"].map(tech => (
                  <span key={tech} className="px-2 py-1 bg-[#27272a] rounded text-xs text-[#a1a1aa]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-[#a1a1aa] text-sm">
          <p>Built live on stream by Nex • Part of <a href="https://braintied.com" className="text-lime-400 hover:underline">Braintied</a></p>
        </div>
      </footer>
    </div>
  )
}
