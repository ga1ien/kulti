"use client"

import { useVideo } from "@100mslive/react-sdk"
import type { HMSPeer } from "@100mslive/react-sdk"
import { Mic, MicOff, User } from "lucide-react"

interface VideoTileProps {
  peer: HMSPeer
  isLocal?: boolean
  isScreenShare?: boolean
}

export function VideoTile({ peer, isLocal, isScreenShare }: VideoTileProps) {
  const { videoRef } = useVideo({
    trackId: isScreenShare ? (peer.auxiliaryTracks[0] as any)?.id : peer.videoTrack as string | undefined,
  })

  const isAudioEnabled = peer.audioTrack !== undefined
  const isVideoEnabled = isScreenShare
    ? true
    : peer.videoTrack !== undefined

  return (
    <div className="relative w-full h-full bg-surfaceElevated rounded-lg overflow-hidden">
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

      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {peer.name}
              {isLocal && " (You)"}
            </span>
            {peer.roleName === "host" && (
              <span className="px-2 py-0.5 bg-primary text-black text-xs rounded font-bold">
                HOST
              </span>
            )}
          </div>
          <div>
            {isAudioEnabled ? (
              <Mic size={16} className="text-white" />
            ) : (
              <MicOff size={16} className="text-red-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
