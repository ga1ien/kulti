"use client"

import { useEffect, useRef, useState } from "react"
import { X, Download, Maximize2, Minimize2, Volume2, VolumeX, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Recording, RecordingMetadata } from "@/types/database"
import Hls from "hls.js"
import { formatDistanceToNow } from "date-fns"
import { logger } from "@/lib/logger"

interface RecordingPlayerModalProps {
  recording: Recording & {
    sessions: {
      id: string
      title: string
      description: string | null
      host_id: string
      started_at: string | null
      ended_at: string | null
    }
  }
  isOpen: boolean
  onClose: () => void
}

export function RecordingPlayerModal({
  recording,
  isOpen,
  onClose,
}: RecordingPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  useEffect(() => {
    if (!isOpen) return

    const video = videoRef.current
    if (!video || !recording.recording_url) return

    const isHLS = recording.recording_url.includes(".m3u8")

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      })

      hls.loadSource(recording.recording_url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        logger.debug("HLS manifest loaded")
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        logger.error("HLS playback error", { event, data })
      })

      hlsRef.current = hls

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (isHLS && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = recording.recording_url
    } else {
      // MP4 or other formats
      video.src = recording.recording_url
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [isOpen, recording.recording_url])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener("timeupdate", updateTime)
    video.addEventListener("loadedmetadata", updateDuration)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("timeupdate", updateTime)
      video.removeEventListener("loadedmetadata", updateDuration)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [isOpen])

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = parseFloat(e.target.value)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    const newVolume = parseFloat(e.target.value)
    if (!video) return
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (!document.fullscreenElement) {
      video.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "00:00"
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatFileSize = (metadata: RecordingMetadata) => {
    if (!metadata?.size) return null
    const bytes = metadata.size
    const mb = (bytes / (1024 * 1024)).toFixed(2)
    return `${mb} MB`
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-title"
    >
      <div
        className="w-full max-w-6xl bg-[#0a0a0a] border border-[#27272a] rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#27272a]">
          <div className="flex-1 min-w-0">
            <h2 id="player-title" className="text-2xl font-bold mb-2 truncate">
              {recording.sessions.title}
            </h2>
            {recording.sessions.description && (
              <p className="text-[#a1a1aa] text-sm mb-2 line-clamp-2">
                {recording.sessions.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-[#a1a1aa]">
              <span>
                Recorded{" "}
                {formatDistanceToNow(new Date(recording.created_at), {
                  addSuffix: true,
                })}
              </span>
              {recording.duration && (
                <span>Duration: {formatTime(recording.duration)}</span>
              )}
              {formatFileSize(recording.metadata) && (
                <span>Size: {formatFileSize(recording.metadata)}</span>
              )}
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="ml-4 flex-shrink-0"
            aria-label="Close player"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full"
            onClick={handlePlayPause}
            aria-label="Recording video player"
          >
            Your browser does not support the video tag.
          </video>

          {/* Custom Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 space-y-2">
            {/* Progress Bar */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-[#27272a] rounded-full appearance-none cursor-pointer accent-lime-400"
              aria-label="Seek video"
            />

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-[#27272a] rounded-full appearance-none cursor-pointer accent-lime-400"
                  aria-label="Volume"
                />

                <span className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-white" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-[#27272a]">
          <div className="text-sm text-[#a1a1aa]">
            Press <kbd className="px-2 py-1 bg-[#27272a] rounded">ESC</kbd> to close
          </div>
          {recording.recording_url && (
            <Button
              variant="primary"
              size="sm"
              asChild
              aria-label="Download recording"
            >
              <a
                href={recording.recording_url}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
