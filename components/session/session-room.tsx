"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
} from "@100mslive/react-sdk"
import { Session, Profile } from "@/types/database"
import { VideoGrid } from "./video-grid"
import { Controls } from "./controls"
import { ChatSidebar } from "./chat-sidebar"
import { OBSPanel } from "./obs-panel"
import { SessionEndModal } from "./session-end-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp } from "lucide-react"

interface SessionRoomProps {
  session: Session & { host: Profile }
  userId: string
}

export function SessionRoom({ session, userId }: SessionRoomProps) {
  return (
    <HMSRoomProvider>
      <SessionRoomContent session={session} userId={userId} />
    </HMSRoomProvider>
  )
}

function SessionRoomContent({
  session,
  userId,
}: SessionRoomProps) {
  const router = useRouter()
  const hmsActions = useHMSActions()
  const isConnected = useHMSStore(selectIsConnectedToRoom)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [watchDuration, setWatchDuration] = useState(0)
  const [estimatedCredits, setEstimatedCredits] = useState(0)
  const [previousCredits, setPreviousCredits] = useState(0)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showCreditsAnimation, setShowCreditsAnimation] = useState(false)

  useEffect(() => {
    const joinRoom = async () => {
      try {
        setIsJoining(true)
        setError(null)

        // Get HMS auth token
        const response = await fetch("/api/hms/get-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: session.hms_room_id,
            sessionId: session.id,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to join session")
        }

        // Join HMS room
        await hmsActions.join({
          userName: data.userName,
          authToken: data.token,
        })
      } catch (err) {
        console.error("Join room error:", err)
        setError(err instanceof Error ? err.message : "Failed to join session")
      } finally {
        setIsJoining(false)
      }
    }

    joinRoom()

    return () => {
      hmsActions.leave()
    }
  }, [hmsActions, session.hms_room_id, session.id])

  // Heartbeat tracking for credits
  useEffect(() => {
    if (!isConnected) return

    let heartbeatInterval: NodeJS.Timeout | null = null
    let isActive = true

    // Send heartbeat every 30 seconds
    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/analytics/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.id,
            isActive: true,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setWatchDuration(data.watch_duration_seconds)

          // Animate credit increase
          if (data.estimated_credits > previousCredits && previousCredits > 0) {
            setShowCreditsAnimation(true)
            setTimeout(() => setShowCreditsAnimation(false), 1000)
          }

          setPreviousCredits(estimatedCredits)
          setEstimatedCredits(data.estimated_credits)
        }
      } catch (error) {
        console.error('Heartbeat error:', error)
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval
    heartbeatInterval = setInterval(sendHeartbeat, 30000) // 30 seconds

    // Handle visibility change (tab switching)
    const handleVisibilityChange = async () => {
      isActive = !document.hidden
      if (!isActive) {
        // Mark as inactive when tab is hidden
        try {
          await fetch('/api/analytics/heartbeat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: session.id,
              isActive: false,
            }),
          })
        } catch (error) {
          console.error('Failed to mark inactive:', error)
        }
      } else {
        // Resume heartbeat when tab is visible again
        sendHeartbeat()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // Mark as inactive on unmount
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          isActive: false,
        }),
      }).catch(console.error)
    }
  }, [isConnected, session.id])

  const handleLeave = () => {
    hmsActions.leave()
    // Show session end modal if user earned credits
    if (estimatedCredits > 0) {
      setShowEndModal(true)
    } else {
      router.push("/dashboard")
    }
  }

  const handleCloseEndModal = () => {
    setShowEndModal(false)
    router.push("/dashboard")
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-8 p-12 bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#27272a] rounded-2xl max-w-md animate-fade-in">
          <p className="text-red-500 text-2xl font-bold">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-lime-400 hover:bg-lime-500 text-black font-bold text-lg px-12 py-4 rounded-xl transition-colors duration-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (isJoining || !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-lime-400 mx-auto mb-6"></div>
          <p className="text-2xl text-[#a1a1aa]">Joining session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#1a1a1a]/95 backdrop-blur">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={handleLeave}
              className="flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-[#2a2a2a] transition-colors text-lg font-medium"
            >
              <ArrowLeft size={20} />
              Leave
            </button>
            <div>
              <h1 className="font-bold font-mono text-2xl">{session.title}</h1>
              <p className="text-base text-[#a1a1aa] mt-1">
                Hosted by {session.host.display_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits Earned with Animation */}
            {watchDuration > 0 && (
              <div className={`px-4 py-2 bg-[#1a1a1a] border rounded-lg transition-all duration-300 ${
                showCreditsAnimation
                  ? "border-lime-400 scale-105 shadow-lg shadow-lime-400/20"
                  : "border-[#27272a]"
              }`}>
                <div className="flex items-center gap-2 text-xs text-[#a1a1aa] mb-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Earning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-lg font-bold transition-all duration-300 ${
                    showCreditsAnimation ? "scale-110" : ""
                  } text-lime-400`}>
                    +{estimatedCredits}
                  </span>
                  <span className="text-xs text-[#71717a]">credits</span>
                </div>
              </div>
            )}
            <div className="px-5 py-2 bg-lime-400/10 text-lime-400 text-lg rounded-lg font-mono font-bold">
              {session.room_code}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <VideoGrid />
          </div>
          <div className="border-t border-[#27272a] bg-[#1a1a1a]/50">
            <Controls sessionId={session.id} isHost={session.host_id === userId} />
          </div>
        </div>

        {/* Right Sidebar - Chat + OBS */}
        <div className="w-96 border-l border-[#27272a] flex flex-col bg-[#1a1a1a]/30">
          <div className="flex-1 overflow-y-auto">
            <ChatSidebar sessionId={session.id} userId={userId} />
          </div>
          <div className="border-t border-[#27272a] p-6">
            <OBSPanel sessionId={session.id} isHost={session.host_id === userId} />
          </div>
        </div>
      </div>

      {/* Session End Modal */}
      <SessionEndModal
        isOpen={showEndModal}
        onClose={handleCloseEndModal}
        sessionId={session.id}
      />
    </div>
  )
}
