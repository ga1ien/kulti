"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  useAutoplayError,
  selectRoomState,
  HMSRoomState,
  selectPeerCount,
  selectPeers,
} from "@100mslive/react-sdk"
import { HMSVirtualBackgroundPlugin } from "@100mslive/hms-virtual-background"
import { Session, Profile } from "@/types/database"
import dynamic from "next/dynamic"
import { LoadingSkeleton, VideoGridSkeleton, ChatSkeleton } from "@/components/ui/loading-skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, Heart, MessageSquare, Bot, UserPlus } from "lucide-react"
import { getAIPermissions, updateAIModule, type AIPermissions } from "@/lib/session"
import { createClient } from "@/lib/supabase/client"
import { useTokenRefresh } from "@/hooks/use-token-refresh"
import { useCreditBalance } from "@/lib/hooks/use-credit-balance"
import { useHMSNotificationHandler } from "@/lib/hooks/use-hms-notifications"
import { getHMSToken, sendHeartbeat } from "@/lib/utils/api"
import {
  initializeSessionStore,
  updateWatchDuration,
  selectWatchDuration,
  updateViewerCount,
  selectViewerCount,
  markUserInactive,
  countActiveViewers,
  getAllWatchDurations,
} from "@/lib/hms/session-store"

// Code split video components
const VideoGrid = dynamic(() => import("./video-grid").then(mod => ({ default: mod.VideoGrid })), {
  loading: () => <VideoGridSkeleton />,
  ssr: false
})

const Controls = dynamic(() => import("./controls").then(mod => ({ default: mod.Controls })), {
  loading: () => (
    <div className="flex items-center justify-center gap-4 p-4">
      <LoadingSkeleton className="w-12 h-12 rounded-full" />
      <LoadingSkeleton className="w-12 h-12 rounded-full" />
      <LoadingSkeleton className="w-12 h-12 rounded-full" />
      <LoadingSkeleton className="w-12 h-12 rounded-full" />
    </div>
  ),
  ssr: false
})

// Code split chat/AI sidebars
const ChatSidebarEnhanced = dynamic(() => import("./chat-sidebar-enhanced").then(mod => ({ default: mod.ChatSidebar })), {
  loading: () => <ChatSkeleton />,
  ssr: false
})

const AIChatSidebar = dynamic(() => import("./ai-chat-sidebar").then(mod => ({ default: mod.AIChatSidebar })), {
  loading: () => <ChatSkeleton />,
  ssr: false
})

const AIModuleControl = dynamic(() => import("./ai-module-control").then(mod => ({ default: mod.AIModuleControl })), {
  ssr: false
})

const StatsPanel = dynamic(() => import("./stats-panel").then(mod => ({ default: mod.StatsPanel })), {
  ssr: false
})

const OBSPanel = dynamic(() => import("./obs-panel").then(mod => ({ default: mod.OBSPanel })), {
  loading: () => <LoadingSkeleton className="w-full h-24" />,
  ssr: false
})

// Code split modals - only load when needed
const SessionEndModal = dynamic(() => import("./session-end-modal").then(mod => ({ default: mod.SessionEndModal })), {
  ssr: false
})

const TipModal = dynamic(() => import("./tip-modal").then(mod => ({ default: mod.TipModal })), {
  ssr: false
})

const AISettingsModal = dynamic(() => import("./ai-settings-modal").then(mod => ({ default: mod.AISettingsModal })), {
  ssr: false
})

const PresenterInviteModal = dynamic(() => import("./presenter-invite-modal").then(mod => ({ default: mod.PresenterInviteModal })), {
  ssr: false
})

const HLSViewer = dynamic(() => import("./hls-viewer").then(mod => ({ default: mod.HLSViewer })), {
  ssr: false
})

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
  const roomState = useHMSStore(selectRoomState)
  const peerCount = useHMSStore(selectPeerCount)
  const peers = useHMSStore(selectPeers)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // HMS Session Store - Real-time ephemeral state
  const watchDurationData = useHMSStore(selectWatchDuration(userId))
  const watchDuration = watchDurationData?.durationSeconds || 0

  // Calculate estimated credits locally
  const isHost = session.host_id === userId
  const estimatedCredits = isHost
    ? Math.floor((watchDuration / 60) * 5)
    : Math.floor((watchDuration / 60) * 1)

  const [previousCredits, setPreviousCredits] = useState(0)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showCreditsAnimation, setShowCreditsAnimation] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "ai">("chat")
  const [aiPermissions, setAIPermissions] = useState<AIPermissions | null>(null)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showPresenterInvite, setShowPresenterInvite] = useState(false)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [useHLS, setUseHLS] = useState(false)
  const [hlsStreamUrl, setHLSStreamUrl] = useState<string | null>(null)
  const [virtualBgPlugin, setVirtualBgPlugin] = useState<HMSVirtualBackgroundPlugin | null>(null)
  const [noiseCancellationActive, setNoiseCancellationActive] = useState(false)

  // Use shared hooks
  const { balance: currentBalance, refreshBalance } = useCreditBalance()
  useHMSNotificationHandler()
  const autoplayError = useAutoplayError()

  // Token refresh hook
  const { showExpiryWarning } = useTokenRefresh({
    isConnected,
    tokenExpiresAt,
    authToken,
    roomId: session.hms_room_id,
    sessionId: session.id,
    onTokenUpdate: (token, expiresAt) => {
      setAuthToken(token)
      setTokenExpiresAt(expiresAt)
    },
  })

  const supabase = createClient()

  // Track local watch duration
  const watchStartTimeRef = useRef<number>(Date.now())
  const localWatchDuration = useRef<number>(0)
  const isActiveRef = useRef<boolean>(true)

  // Handle browser autoplay errors
  useEffect(() => {
    if (autoplayError) {
      toast.error(
        'Browser blocked autoplay. Please click anywhere to enable audio/video.',
        {
          duration: 5000,
          icon: '🔇',
        }
      )
    }
  }, [autoplayError])

  // Join room and initialize session store
  useEffect(() => {
    const joinRoom = async () => {
      try {
        setIsJoining(true)
        setError(null)

        // Get HMS auth token using shared utility
        if (!session.hms_room_id) {
          throw new Error("Session room ID is missing")
        }
        const response = await getHMSToken(session.hms_room_id, session.id)

        if (!response.ok) {
          throw new Error(response.error || "Failed to join session")
        }

        const data = response.data!

        // Check if user should use HLS
        if (data.useHLS && data.hlsStreamUrl) {
          setUseHLS(true)
          setHLSStreamUrl(data.hlsStreamUrl)
          setIsJoining(false)
          return
        }

        // Store token and expiry time for refresh
        setAuthToken(data.token)
        setTokenExpiresAt(data.expiresAt)

        // Join HMS room (WebRTC)
        await hmsActions.join({
          userName: data.userName,
          authToken: data.token,
        })

        // Initialize HMS Session Store observers
        initializeSessionStore(hmsActions, userId)

        // Update streak and check badges
        try {
          const streakResponse = await fetch(`/api/sessions/${session.id}/join`, {
            method: "POST",
          })

          if (streakResponse.ok) {
            const streakData = await streakResponse.json()

            // Show streak notifications
            const { notifyStreakContinued, notifyStreakMilestone, notifyStreakBroken, notifyBadgeEarned } = await import('@/lib/badges/notifications')

            if (streakData.streak?.streak_continued && streakData.streak.current_streak > 1) {
              notifyStreakContinued(streakData.streak.current_streak)
            }

            if (streakData.streak?.milestone_awarded) {
              const milestone = streakData.streak.current_streak
              const milestoneRewards: Record<number, number> = { 7: 100, 30: 500, 100: 2000 }
              const credits = milestoneRewards[milestone]
              if (credits) {
                notifyStreakMilestone(milestone, credits)
              }
            }

            if (streakData.streak?.streak_broken) {
              notifyStreakBroken(1)
            }

            // Show badge notifications
            if (streakData.badges?.badges_awarded && streakData.badges.badges_awarded.length > 0) {
              for (const badgeId of streakData.badges.badges_awarded) {
                notifyBadgeEarned(badgeId)
              }
            }
          }
        } catch (streakError) {
          console.error("Failed to update streak:", streakError)
        }

        // Start watch time tracking
        watchStartTimeRef.current = Date.now()
      } catch (err) {
        console.error("Join room error:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to join session"
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsJoining(false)
      }
    }

    joinRoom()

    return () => {
      if (isConnected) {
        markUserInactive(hmsActions, userId, localWatchDuration.current)
      }
      hmsActions.leave()
    }
  }, [hmsActions, session.hms_room_id, session.id, userId, isConnected])

  // Update viewer count when peers change
  useEffect(() => {
    if (!isConnected) return

    const allWatchData = getAllWatchDurations(useHMSStore)
    const activeCount = countActiveViewers(allWatchData)

    updateViewerCount(hmsActions, peerCount, activeCount)
  }, [isConnected, peerCount, peers, hmsActions])

  // HMS Session Store Heartbeat - Updates every 30 seconds
  useEffect(() => {
    if (!isConnected) return

    let heartbeatInterval: NodeJS.Timeout | null = null

    const sendSessionHeartbeat = () => {
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - watchStartTimeRef.current) / 1000)

      if (isActiveRef.current) {
        localWatchDuration.current += elapsedSeconds
      }

      watchStartTimeRef.current = now

      updateWatchDuration(
        hmsActions,
        userId,
        localWatchDuration.current,
        isActiveRef.current
      )

      // Use shared utility for heartbeat
      sendHeartbeat(session.id, isActiveRef.current)
    }

    sendSessionHeartbeat()
    heartbeatInterval = setInterval(sendSessionHeartbeat, 30000)

    const handleVisibilityChange = () => {
      const wasActive = isActiveRef.current
      isActiveRef.current = !document.hidden

      if (wasActive && !isActiveRef.current) {
        sendSessionHeartbeat()
      } else if (!wasActive && isActiveRef.current) {
        watchStartTimeRef.current = Date.now()
        sendSessionHeartbeat()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sendSessionHeartbeat()
    }
  }, [isConnected, session.id, userId, hmsActions])

  // Animate credit increase
  useEffect(() => {
    if (estimatedCredits > previousCredits && previousCredits > 0) {
      setShowCreditsAnimation(true)
      setTimeout(() => setShowCreditsAnimation(false), 1000)
    }
    setPreviousCredits(estimatedCredits)
  }, [estimatedCredits, previousCredits])

  // Fetch AI permissions and subscribe to updates
  useEffect(() => {
    const fetchPermissions = async () => {
      const permissions = await getAIPermissions(session.id)
      if (permissions) {
        setAIPermissions(permissions)
      }
    }

    fetchPermissions()

    const channel = supabase
      .channel(`session:${session.id}:ai`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        () => {
          fetchPermissions()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [session.id, supabase])

  const handleLeave = () => {
    hmsActions.leave()
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

  const handleTipSuccess = async () => {
    await refreshBalance()
  }

  const handleAIToggle = async (enabled: boolean) => {
    const result = await updateAIModule(session.id, { enabled })
    if (!result.success) {
      console.error('Failed to toggle AI module:', result.error)
    }
  }

  const handleAISettingsUpdate = async () => {
    const permissions = await getAIPermissions(session.id)
    if (permissions) {
      setAIPermissions(permissions)
    }
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

  if (isJoining || (!isConnected && !useHLS)) {
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
    <div className="h-screen flex flex-col bg-[#0a0a0a] relative">
      {/* Reconnection Overlay */}
      {roomState === HMSRoomState.Reconnecting && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-6 p-12 bg-[#1a1a1a]/90 border border-[#27272a] rounded-2xl max-w-md">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-lime-400 mx-auto"></div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Reconnecting...</h2>
              <p className="text-[#a1a1aa]">
                Lost connection. Attempting to rejoin the session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#1a1a1a]/95 backdrop-blur">
        <div className="px-3 sm:px-6 py-3 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 lg:gap-6">
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-3 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-[#2a2a2a] transition-colors text-base sm:text-lg font-medium flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold font-mono text-base sm:text-xl lg:text-2xl truncate">{session.title}</h1>
                <p className="text-xs sm:text-sm lg:text-base text-[#a1a1aa] truncate">
                  Hosted by {session.host.display_name}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                {session.host_id !== userId && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 min-h-[44px] bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-lg transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-sm sm:text-base">Tip</span>
                  </button>
                )}
                {session.host_id === userId && (
                  <button
                    onClick={() => setShowPresenterInvite(true)}
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">Invite</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {watchDuration > 0 && (
                  <div className={`px-2 sm:px-4 py-1.5 sm:py-2 bg-[#1a1a1a] border rounded-lg transition-all duration-300 ${
                    showCreditsAnimation
                      ? "border-lime-400 scale-105 shadow-lg shadow-lime-400/20"
                      : "border-[#27272a]"
                  }`}>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs text-[#a1a1aa]">
                      <TrendingUp className="w-3 h-3" />
                      <span className="hidden sm:inline">Earning</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className={`font-mono text-sm sm:text-lg font-bold transition-all duration-300 ${
                        showCreditsAnimation ? "scale-110" : ""
                      } text-lime-400`}>
                        +{estimatedCredits}
                      </span>
                    </div>
                  </div>
                )}
                <div className="px-3 sm:px-5 py-1.5 sm:py-2 bg-lime-400/10 text-lime-400 text-sm sm:text-lg rounded-lg font-mono font-bold">
                  {session.room_code}
                </div>
                {aiPermissions && (
                  <div className="hidden sm:block">
                    <AIModuleControl
                      permissions={aiPermissions}
                      onOpenSettings={() => setShowAISettings(true)}
                      onToggle={handleAIToggle}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-2 sm:p-4 lg:p-6">
            {useHLS && hlsStreamUrl ? (
              <HLSViewer
                streamUrl={hlsStreamUrl}
                sessionId={session.id}
                onError={() => {
                  setError("Failed to load HLS stream")
                  setUseHLS(false)
                }}
              />
            ) : (
              <VideoGrid />
            )}
          </div>
          <div className="border-t border-[#27272a] bg-[#1a1a1a]/50 sticky bottom-0">
            <Controls
              sessionId={session.id}
              isHost={session.host_id === userId}
              virtualBgPlugin={virtualBgPlugin}
              noiseCancellationActive={noiseCancellationActive}
              onToggleNoiseCancellation={() => setNoiseCancellationActive(!noiseCancellationActive)}
            />
          </div>
        </div>

        <StatsPanel />

        <div className="hidden lg:flex lg:w-96 border-l border-[#27272a] flex-col bg-[#1a1a1a]/30">
          <div className="flex border-b border-[#27272a]">
            <button
              onClick={() => setActiveTab("chat")}
              className={`${
                aiPermissions?.moduleEnabled ? "flex-1" : "w-full"
              } flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-[#1a1a1a] text-white border-b-2 border-lime-400"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Team Chat</span>
            </button>
            {aiPermissions?.moduleEnabled && (
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === "ai"
                    ? "bg-[#1a1a1a] text-white border-b-2 border-purple-500"
                    : "text-[#71717a] hover:text-white"
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>AI Chat</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <ChatSidebarEnhanced
                sessionId={session.id}
                userId={userId}
                isHost={session.host_id === userId}
              />
            ) : aiPermissions?.moduleEnabled ? (
              <AIChatSidebar
                sessionId={session.id}
                userId={userId}
                currentBalance={currentBalance}
                canChat={aiPermissions?.canChat || false}
                permissions={aiPermissions}
                onBalanceUpdate={refreshBalance}
              />
            ) : (
              <ChatSidebarEnhanced
                sessionId={session.id}
                userId={userId}
                isHost={session.host_id === userId}
              />
            )}
          </div>
          <div className="border-t border-[#27272a] p-6">
            <OBSPanel sessionId={session.id} isHost={session.host_id === userId} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <SessionEndModal
        isOpen={showEndModal}
        onClose={handleCloseEndModal}
        sessionId={session.id}
      />

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        recipientId={session.host_id}
        recipientName={session.host.display_name}
        recipientUsername={session.host.username}
        currentBalance={currentBalance}
        sessionId={session.id}
        onSuccess={handleTipSuccess}
      />

      {aiPermissions && (
        <AISettingsModal
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          permissions={aiPermissions}
          sessionId={session.id}
          hostId={session.host_id}
          onUpdate={handleAISettingsUpdate}
        />
      )}

      <PresenterInviteModal
        isOpen={showPresenterInvite}
        onClose={() => setShowPresenterInvite(false)}
        sessionId={session.id}
      />
    </div>
  )
}
