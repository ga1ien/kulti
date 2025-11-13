"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Loader2, Radio, Users, WifiOff } from "lucide-react"
import { toast } from "react-hot-toast"

interface HLSViewerProps {
  streamUrl: string
  sessionId: string
  onError?: () => void
}

export function HLSViewer({ streamUrl, sessionId, onError }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState<number>(0)
  const [streamQuality, setStreamQuality] = useState<string>("auto")
  const [isLive, setIsLive] = useState(false)

  // Fetch viewer count periodically
  useEffect(() => {
    const fetchViewerCount = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/viewer-count`)
        if (response.ok) {
          const data = await response.json()
          setViewerCount(data.count || 0)
        }
      } catch (error) {
        console.error("Failed to fetch viewer count:", error)
      }
    }

    // Initial fetch
    fetchViewerCount()

    // Update every 10 seconds
    const interval = setInterval(fetchViewerCount, 10000)

    return () => clearInterval(interval)
  }, [sessionId])

  useEffect(() => {
    if (!videoRef.current || !streamUrl) return

    const video = videoRef.current

    // Check if HLS is supported natively (Safari)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false)
        setIsLive(true)
      })
      video.addEventListener("error", () => {
        setError("Failed to load stream")
        setIsLoading(false)
        onError?.()
      })
    } else if (Hls.isSupported()) {
      // Use HLS.js for other browsers
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDuration: 2,
        liveMaxLatencyDuration: 5,
        liveDurationInfinity: true,
        highBufferWatchdogPeriod: 2,
      })

      hlsRef.current = hls

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        setIsLive(true)
        // Auto-play when stream is ready
        video.play().catch((err) => {
          console.error("Autoplay failed:", err)
          toast.error("Click the video to start playback", { duration: 3000 })
        })
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data)

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              setError("Stream playback failed")
              setIsLoading(false)
              setIsLive(false)
              onError?.()
              break
          }
        }
      })

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        // Update quality indicator
        if (hls.currentLevel === -1) {
          setStreamQuality("auto")
        } else {
          const level = hls.levels[hls.currentLevel]
          if (level) {
            setStreamQuality(`${level.height}p`)
          }
        }
      })

      // Clean up
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else {
      setError("HLS playback is not supported in this browser")
      setIsLoading(false)
      onError?.()
    }
  }, [streamUrl, onError])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] rounded-lg">
        <div className="text-center space-y-4 p-8">
          <WifiOff className="w-16 h-16 mx-auto text-red-500" />
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
            <p className="text-[#a1a1aa]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] z-10">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-lime-400" />
            <p className="text-lg text-[#a1a1aa]">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        autoPlay
        muted={false}
      />

      {/* Stream Info Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Live Indicator */}
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500 rounded-lg font-bold">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>LIVE</span>
          </div>
        )}

        {/* Viewer Count */}
        <div className="flex items-center gap-4">
          {viewerCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur rounded-lg">
              <Users className="w-4 h-4" />
              <span className="font-mono font-bold">{viewerCount.toLocaleString()}</span>
            </div>
          )}

          {/* Quality Indicator */}
          <div className="px-3 py-2 bg-black/80 backdrop-blur rounded-lg font-mono text-sm">
            {streamQuality}
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-20 left-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/80 backdrop-blur rounded-lg px-4 py-2 text-sm text-[#a1a1aa]">
          Viewing via HLS (Scalable Streaming) - Low latency mode enabled
        </div>
      </div>
    </div>
  )
}
