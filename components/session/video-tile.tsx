"use client"

import { memo, useMemo, useEffect, useState } from "react"
import { useVideo, useHMSStore, selectPeerAudioByID, selectIsPeerAudioEnabled } from "@100mslive/react-sdk"
import type { HMSPeer } from "@100mslive/react-sdk"
import { Mic, MicOff, User, Wifi, WifiOff } from "lucide-react"

interface VideoTileProps {
  peer: HMSPeer
  isLocal?: boolean
  isScreenShare?: boolean
  isDominantSpeaker?: boolean
}

export const VideoTile = memo(function VideoTile({ peer, isLocal, isScreenShare, isDominantSpeaker }: VideoTileProps) {
  // Memoize track ID calculation
  const trackId = useMemo(() => {
    return isScreenShare
      ? (peer.auxiliaryTracks[0] as any)?.id
      : peer.videoTrack as string | undefined
  }, [isScreenShare, peer.auxiliaryTracks, peer.videoTrack])

  const { videoRef } = useVideo({ trackId })

  // Get network quality for this peer (-1 = unknown, 0 = bad, 5 = excellent)
  // Note: selectPeerNetworkQuality not available in current HMS SDK version
  const networkQuality = -1 // Unknown

  // Get audio data for this peer
  const peerAudio = useHMSStore(selectPeerAudioByID(peer.id))
  const isAudioEnabled = useHMSStore(selectIsPeerAudioEnabled(peer.id))

  // Audio level state for visualization
  const [audioLevel, setAudioLevel] = useState(0)

  // Update audio level from peer audio
  useEffect(() => {
    if (!peerAudio || !isAudioEnabled) {
      setAudioLevel(0)
      return
    }

    const interval = setInterval(() => {
      // HMS audio level is accessed via the audioLevel property, not volume
      const level = (peerAudio as any)?.audioLevel || 0
      // Normalize to 0-100 range and smooth it
      setAudioLevel(Math.min(100, level * 100))
    }, 100)

    return () => clearInterval(interval)
  }, [peerAudio, isAudioEnabled])

  // Memoize audio/video enabled checks
  const isVideoEnabled = useMemo(() => {
    return isScreenShare ? true : peer.videoTrack !== undefined
  }, [isScreenShare, peer.videoTrack])

  // Memoize display name
  const displayName = useMemo(() => {
    return `${peer.name}${isLocal ? " (You)" : ""}`
  }, [peer.name, isLocal])

  // Memoize network quality indicator
  const networkQualityIndicator = useMemo(() => {
    if (networkQuality === undefined || networkQuality === -1) return null

    if (networkQuality <= 1) {
      return { icon: WifiOff, color: "text-red-500", label: "Poor" }
    } else if (networkQuality <= 2) {
      return { icon: Wifi, color: "text-orange-500", label: "Fair" }
    } else if (networkQuality <= 3) {
      return { icon: Wifi, color: "text-yellow-500", label: "Good" }
    } else {
      return { icon: Wifi, color: "text-green-500", label: "Excellent" }
    }
  }, [networkQuality])

  // Generate audio bars based on audio level
  const audioBars = useMemo(() => {
    if (!isAudioEnabled || audioLevel === 0) return null

    const numBars = 4
    const bars = []

    for (let i = 0; i < numBars; i++) {
      const threshold = (i + 1) * (100 / numBars)
      const isActive = audioLevel >= threshold
      const height = isActive ? `${20 + (i * 8)}px` : "4px"

      bars.push(
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            isActive ? "bg-lime-400" : "bg-white/30"
          }`}
          style={{ height }}
        />
      )
    }

    return bars
  }, [isAudioEnabled, audioLevel])

  // Determine border style for dominant speaker
  const borderStyle = useMemo(() => {
    if (isDominantSpeaker && !isScreenShare) {
      return "border-4 border-lime-400 shadow-lg shadow-lime-400/50"
    }
    return ""
  }, [isDominantSpeaker, isScreenShare])

  return (
    <div className={`relative w-full h-full bg-surfaceElevated rounded-lg overflow-hidden ${borderStyle}`}>
      {isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal && !isScreenShare}
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <User size={32} className="text-black" />
          </div>
        </div>
      )}

      {/* Network quality indicator (top-right) */}
      {networkQualityIndicator && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-lg backdrop-blur-sm">
          <networkQualityIndicator.icon
            size={14}
            className={networkQualityIndicator.color}
          />
          <span className={`text-xs font-medium ${networkQualityIndicator.color}`}>
            {networkQualityIndicator.label}
          </span>
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {displayName}
            </span>
            {peer.roleName === "host" && (
              <span className="px-2 py-0.5 bg-primary text-black text-xs rounded font-bold">
                HOST
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAudioEnabled ? (
              <>
                <Mic size={16} className="text-white" />
                {audioBars && (
                  <div className="flex items-end gap-0.5 h-5">
                    {audioBars}
                  </div>
                )}
              </>
            ) : (
              <MicOff size={16} className="text-red-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
