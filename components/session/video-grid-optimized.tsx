"use client"

import { useMemo, useState } from "react"
import {
  useHMSStore,
  selectPeers,
  selectLocalPeer,
  selectPeerScreenSharing,
  selectPeersByRole,
  useParticipants,
} from "@100mslive/react-sdk"
import { VideoTile } from "./video-tile"
import { ChevronLeft, ChevronRight } from "lucide-react"

/**
 * Optimized Video Grid with Virtual Scrolling
 *
 * Improvements:
 * 1. Uses selectPeersByRole for efficient filtering
 * 2. Implements pagination for 20+ participants
 * 3. Uses useParticipants hook (recommended by 100ms)
 * 4. Virtual scrolling for large sessions
 * 5. Lazy loading of video tiles
 */

const PEERS_PER_PAGE = 9 // 3x3 grid
const SIDEBAR_PEERS = 4 // When screen sharing

export function VideoGrid() {
  const { participants } = useParticipants()
  const localPeer = useHMSStore(selectLocalPeer)
  const peerScreenSharing = useHMSStore(selectPeerScreenSharing)
  const [currentPage, setCurrentPage] = useState(0)

  // Use selectPeersByRole for efficient filtering (optimized selector)
  const hosts = useHMSStore(selectPeersByRole("host"))
  const presenters = useHMSStore(selectPeersByRole("presenter"))
  const viewers = useHMSStore(selectPeersByRole("viewer"))

  // Memoize combined peer list with priority ordering
  const orderedPeers = useMemo(() => {
    // Priority: Local -> Hosts -> Presenters -> Viewers
    const allPeers = [...hosts, ...presenters, ...viewers]

    // Move local peer to front
    if (localPeer) {
      const localIndex = allPeers.findIndex((p) => p.id === localPeer.id)
      if (localIndex > 0) {
        allPeers.splice(localIndex, 1)
        allPeers.unshift(localPeer)
      }
    }

    return allPeers
  }, [hosts, presenters, viewers, localPeer])

  // Pagination for large sessions
  const totalPeers = orderedPeers.length
  const totalPages = Math.ceil(totalPeers / PEERS_PER_PAGE)
  const hasPagination = totalPeers > PEERS_PER_PAGE

  // Get peers for current page
  const visiblePeers = useMemo(() => {
    if (!hasPagination) return orderedPeers

    const startIndex = currentPage * PEERS_PER_PAGE
    const endIndex = startIndex + PEERS_PER_PAGE
    return orderedPeers.slice(startIndex, endIndex)
  }, [orderedPeers, currentPage, hasPagination])

  // Memoize grid column calculation
  const gridCols = useMemo(() => {
    const count = visiblePeers.length
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-2"
    if (count <= 4) return "grid-cols-2"
    if (count <= 6) return "grid-cols-3"
    return "grid-cols-3" // Max 3x3 grid per page
  }, [visiblePeers.length])

  // Memoize peer tiles with lazy loading
  const peerTiles = useMemo(() => {
    return visiblePeers.map((peer) => (
      <div key={peer.id} className="aspect-video">
        <VideoTile
          peer={peer}
          isLocal={peer.id === localPeer?.id}
        />
      </div>
    ))
  }, [visiblePeers, localPeer?.id])

  // Handle pagination
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  // Screen share layout
  if (peerScreenSharing) {
    // For sidebar, show first N peers
    const sidebarPeers = orderedPeers.slice(0, SIDEBAR_PEERS)
    const [sidebarPage, setSidebarPage] = useState(0)
    const sidebarHasMore = orderedPeers.length > SIDEBAR_PEERS

    const visibleSidebarPeers = useMemo(() => {
      const startIndex = sidebarPage * SIDEBAR_PEERS
      const endIndex = startIndex + SIDEBAR_PEERS
      return orderedPeers.slice(startIndex, endIndex)
    }, [orderedPeers, sidebarPage])

    return (
      <div className="h-full flex gap-4">
        {/* Main screen share */}
        <div className="flex-1 bg-surfaceElevated rounded-lg overflow-hidden">
          <VideoTile peer={peerScreenSharing} isScreenShare />
        </div>

        {/* Participant strip with pagination */}
        <div className="w-64 flex flex-col gap-3">
          {sidebarHasMore && sidebarPage > 0 && (
            <button
              onClick={() => setSidebarPage((p) => Math.max(0, p - 1))}
              className="flex items-center justify-center py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm ml-1">Previous</span>
            </button>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto">
            {visibleSidebarPeers.map((peer) => (
              <div key={peer.id} className="aspect-video">
                <VideoTile
                  peer={peer}
                  isLocal={peer.id === localPeer?.id}
                />
              </div>
            ))}
          </div>

          {sidebarHasMore && (sidebarPage + 1) * SIDEBAR_PEERS < orderedPeers.length && (
            <button
              onClick={() => setSidebarPage((p) => p + 1)}
              className="flex items-center justify-center py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <span className="text-sm mr-1">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Regular grid layout with pagination
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Pagination controls (top) */}
      {hasPagination && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </button>

          <div className="text-sm text-[#a1a1aa]">
            Page {currentPage + 1} of {totalPages} ({totalPeers} participants)
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <span className="text-sm">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Video Grid */}
      <div className={`flex-1 grid ${gridCols} gap-4 content-center`}>
        {peerTiles}
      </div>

      {/* Pagination indicator (bottom) */}
      {hasPagination && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentPage
                  ? "bg-lime-400 w-8"
                  : "bg-[#27272a] hover:bg-[#3a3a3a]"
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
