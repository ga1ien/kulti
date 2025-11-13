"use client"

import { useState } from "react"
import {
  useHMSStore,
  useHMSStatsStore,
  selectLocalPeer,
} from "@100mslive/react-sdk"
import { Button } from "@/components/ui/button"
import { Activity, ChevronDown, ChevronUp } from "lucide-react"

export function StatsPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const localPeer = useHMSStore(selectLocalPeer)
  // Get all stats using a generic selector
  const stats = useHMSStatsStore((state: any) => state)

  // Get local peer stats - HMS stats structure has changed
  const localPeerStats = localPeer?.id && stats ? (stats as any).peer?.[localPeer.id] : null
  const localVideoTrack = localPeer?.videoTrack
  const localAudioTrack = localPeer?.audioTrack

  // Video track stats - access track ID properly
  const videoTrackId = typeof localVideoTrack === 'string' ? localVideoTrack : (localVideoTrack as any)?.id
  const videoStats = videoTrackId && stats ? (stats as any).track?.[videoTrackId] : null

  // Audio track stats - access track ID properly
  const audioTrackId = typeof localAudioTrack === 'string' ? localAudioTrack : (localAudioTrack as any)?.id
  const audioStats = audioTrackId && stats ? (stats as any).track?.[audioTrackId] : null

  // Format numbers for display
  const formatBitrate = (bps: number | undefined) => {
    if (!bps) return "0 kbps"
    const kbps = bps / 1000
    if (kbps < 1000) return `${kbps.toFixed(0)} kbps`
    return `${(kbps / 1000).toFixed(1)} Mbps`
  }

  const formatPercent = (value: number | undefined) => {
    if (!value) return "0%"
    return `${value.toFixed(1)}%`
  }

  const formatLatency = (ms: number | undefined) => {
    if (!ms) return "0 ms"
    return `${ms.toFixed(0)} ms`
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80">
      {/* Toggle Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-[#1a1a1a]/95 backdrop-blur border border-[#27272a] hover:border-lime-400/50 transition-all"
      >
        <Activity className="w-4 h-4 mr-2" />
        <span className="flex-1 text-left font-mono text-sm">Stats for Nerds</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </Button>

      {/* Stats Panel */}
      {isExpanded && (
        <div className="mt-2 bg-[#1a1a1a]/95 backdrop-blur border border-[#27272a] rounded-lg p-4 space-y-4 text-xs font-mono animate-fade-in">
          {/* Video Stats */}
          {videoStats && (
            <div className="space-y-2">
              <div className="text-lime-400 font-bold uppercase tracking-wider mb-2">
                Video
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[#71717a]">Bitrate</div>
                  <div className="text-white font-semibold">
                    {formatBitrate(videoStats.bitrate)}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">Frame Rate</div>
                  <div className="text-white font-semibold">
                    {videoStats.framesPerSecond?.toFixed(0) || 0} fps
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">Resolution</div>
                  <div className="text-white font-semibold">
                    {videoStats.resolution?.width || 0}x
                    {videoStats.resolution?.height || 0}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">Packet Loss</div>
                  <div
                    className={`font-semibold ${
                      (videoStats.packetsLost || 0) > 5
                        ? "text-red-500"
                        : "text-white"
                    }`}
                  >
                    {formatPercent(videoStats.packetsLost)}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">Jitter</div>
                  <div
                    className={`font-semibold ${
                      (videoStats.jitter || 0) > 50
                        ? "text-yellow-500"
                        : "text-white"
                    }`}
                  >
                    {formatLatency(videoStats.jitter)}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">RTT</div>
                  <div
                    className={`font-semibold ${
                      (videoStats.roundTripTime || 0) > 200
                        ? "text-red-500"
                        : (videoStats.roundTripTime || 0) > 100
                        ? "text-yellow-500"
                        : "text-white"
                    }`}
                  >
                    {formatLatency(videoStats.roundTripTime)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Stats */}
          {audioStats && (
            <div className="space-y-2 pt-4 border-t border-[#27272a]">
              <div className="text-purple-400 font-bold uppercase tracking-wider mb-2">
                Audio
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[#71717a]">Bitrate</div>
                  <div className="text-white font-semibold">
                    {formatBitrate(audioStats.bitrate)}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">Packet Loss</div>
                  <div
                    className={`font-semibold ${
                      (audioStats.packetsLost || 0) > 5
                        ? "text-red-500"
                        : "text-white"
                    }`}
                  >
                    {formatPercent(audioStats.packetsLost)}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">Jitter</div>
                  <div
                    className={`font-semibold ${
                      (audioStats.jitter || 0) > 50
                        ? "text-yellow-500"
                        : "text-white"
                    }`}
                  >
                    {formatLatency(audioStats.jitter)}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">RTT</div>
                  <div
                    className={`font-semibold ${
                      (audioStats.roundTripTime || 0) > 200
                        ? "text-red-500"
                        : (audioStats.roundTripTime || 0) > 100
                        ? "text-yellow-500"
                        : "text-white"
                    }`}
                  >
                    {formatLatency(audioStats.roundTripTime)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Stats */}
          {localPeerStats && (
            <div className="space-y-2 pt-4 border-t border-[#27272a]">
              <div className="text-blue-400 font-bold uppercase tracking-wider mb-2">
                Connection
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[#71717a]">Total Bitrate</div>
                  <div className="text-white font-semibold">
                    {formatBitrate(
                      (videoStats?.bitrate || 0) + (audioStats?.bitrate || 0)
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a]">Available Bandwidth</div>
                  <div className="text-white font-semibold">
                    {formatBitrate(localPeerStats.availableBandwidth)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Stats Message */}
          {!videoStats && !audioStats && (
            <div className="text-center text-[#71717a] py-4">
              No active tracks to display stats
            </div>
          )}
        </div>
      )}
    </div>
  )
}
