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
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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

  const handleLeave = () => {
    hmsActions.leave()
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
    </div>
  )
}
