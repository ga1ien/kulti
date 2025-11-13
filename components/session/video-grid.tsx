"use client"

import { useMemo } from "react"
import {
  useHMSStore,
  selectPeers,
  selectLocalPeer,
  selectPeerScreenSharing,
  selectDominantSpeaker,
} from "@100mslive/react-sdk"
import { VideoTile } from "./video-tile"

export function VideoGrid() {
  const peers = useHMSStore(selectPeers)
  const localPeer = useHMSStore(selectLocalPeer)
  const peerScreenSharing = useHMSStore(selectPeerScreenSharing)
  const dominantSpeaker = useHMSStore(selectDominantSpeaker)

  // Memoize grid column calculation to prevent recalculation on every render
  const gridCols = useMemo(() => {
    const count = peers.length
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-2"
    if (count <= 4) return "grid-cols-2"
    return "grid-cols-3"
  }, [peers.length])

  // Sort peers to prioritize dominant speaker
  const sortedPeers = useMemo(() => {
    if (!dominantSpeaker) return peers

    const sorted = [...peers]
    const speakerIndex = sorted.findIndex(p => p.id === dominantSpeaker.id)

    if (speakerIndex > 0) {
      const [speaker] = sorted.splice(speakerIndex, 1)
      sorted.unshift(speaker)
    }

    return sorted
  }, [peers, dominantSpeaker])

  // Memoize peer tiles to prevent unnecessary re-renders
  const peerTiles = useMemo(() => {
    return sortedPeers.map((peer) => (
      <div key={peer.id} className="aspect-video">
        <VideoTile
          peer={peer}
          isLocal={peer.id === localPeer?.id}
          isDominantSpeaker={peer.id === dominantSpeaker?.id}
        />
      </div>
    ))
  }, [sortedPeers, localPeer?.id, dominantSpeaker?.id])

  if (peerScreenSharing) {
    // Screen share layout
    return (
      <div className="h-full flex gap-4">
        {/* Main screen share */}
        <div className="flex-1 bg-surfaceElevated rounded-lg overflow-hidden">
          <VideoTile peer={peerScreenSharing} isScreenShare />
        </div>

        {/* Participant strip */}
        <div className="w-64 space-y-3 overflow-y-auto">
          {peerTiles}
        </div>
      </div>
    )
  }

  // Regular grid layout
  return (
    <div className={`h-full grid ${gridCols} gap-4 content-center`}>
      {peerTiles}
    </div>
  )
}
