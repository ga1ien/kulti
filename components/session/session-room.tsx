"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  useHMSNotifications,
  HMSNotificationTypes,
  useAutoplayError,
  selectRoomState,
  HMSRoomState,
  selectPeerCount,
  selectPeers,
} from "@100mslive/react-sdk"
import { Session, Profile } from "@/types/database"
import { VideoGrid } from "./video-grid"
import { Controls } from "./controls"
import { ChatSidebar as ChatSidebarEnhanced } from "./chat-sidebar-enhanced"
import { OBSPanel } from "./obs-panel"
import { SessionEndModal } from "./session-end-modal"
import { TipModal } from "./tip-modal"
import { AIChatSidebar } from "./ai-chat-sidebar"
import { AIModuleControl } from "./ai-module-control"
import { AISettingsModal } from "./ai-settings-modal"
import { PresenterInviteModal } from "./presenter-invite-modal"
import { StatsPanel } from "./stats-panel"
import { HLSViewer } from "./hls-viewer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, Heart, MessageSquare, Bot, UserPlus } from "lucide-react"
import { getAIPermissions, updateAIModule, type AIPermissions } from "@/lib/session"
import { createClient } from "@/lib/supabase/client"
import { useTokenRefresh } from "@/hooks/use-token-refresh"
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

  // HMS Session Store - Real-time ephemeral state (no database polling!)
  const watchDurationData = useHMSStore(selectWatchDuration(userId))
  const viewerCountData = useHMSStore(selectViewerCount)
  const watchDuration = watchDurationData?.durationSeconds || 0

  // Calculate estimated credits locally (same formula as server)
  const isHost = session.host_id === userId
  const estimatedCredits = isHost
    ? Math.floor((watchDuration / 60) * 5) // Host: ~5 credits/min
    : Math.floor((watchDuration / 60) * 1) // Viewer: ~1 credit/min

  const [previousCredits, setPreviousCredits] = useState(0)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showCreditsAnimation, setShowCreditsAnimation] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [activeTab, setActiveTab] = useState<"chat" | "ai">("chat")
  const [aiPermissions, setAIPermissions] = useState<AIPermissions | null>(null)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showPresenterInvite, setShowPresenterInvite] = useState(false)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [useHLS, setUseHLS] = useState(false)

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
  const [hlsStreamUrl, setHLSStreamUrl] = useState<string | null>(null)
  const supabase = createClient()

  // Track local watch duration (client-side timer)
  const watchStartTimeRef = useRef<number>(Date.now())
  const localWatchDuration = useRef<number>(0)
  const isActiveRef = useRef<boolean>(true)

  // Comprehensive notification handler for HMS events
  const notification = useHMSNotifications()
  const autoplayError = useAutoplayError()

  // Handle all HMS notifications
  useEffect(() => {
    if (!notification) return

    switch (notification.type) {
      case HMSNotificationTypes.PEER_JOINED:
        toast.success(`${notification.data?.name || 'Someone'} joined the session`, {
          duration: 2000,
          icon: '👋',
        })
        break

      case HMSNotificationTypes.PEER_LEFT:
        toast(`${notification.data?.name || 'Someone'} left the session`, {
          duration: 2000,
          icon: '👋',
        })
        break

      case HMSNotificationTypes.ERROR:
        const error = notification.data
        console.error('HMS Error:', error)

        // Provide user-friendly error messages
        if (error.code === 3001) {
          toast.error('Failed to join: Invalid room code')
        } else if (error.code === 3003) {
          toast.error('Network connection failed')
        } else if (error.code === 3008) {
          toast.error('Camera/microphone access denied')
        } else if (error.code === 1003) {
          toast.error('Session has ended')
        } else {
          toast.error(error.message || 'An error occurred')
        }
        break

      case HMSNotificationTypes.RECONNECTING:
        toast('Reconnecting...', {
          duration: Infinity,
          id: 'reconnecting',
          icon: '🔄',
        })
        break

      case HMSNotificationTypes.RECONNECTED:
        toast.dismiss('reconnecting')
        toast.success('Reconnected successfully!', {
          duration: 3000,
          icon: '✅',
        })
        break

      case HMSNotificationTypes.TRACK_ADDED:
        console.log('Track added:', notification.data)
        break

      case HMSNotificationTypes.TRACK_REMOVED:
        console.log('Track removed:', notification.data)
        break

      case HMSNotificationTypes.TRACK_MUTED:
        const mutedPeer = notification.data?.peer
        if (!mutedPeer?.isLocal) {
          toast(`${mutedPeer?.name}'s ${notification.data?.track?.type} was muted`, {
            duration: 2000,
          })
        }
        break

      case HMSNotificationTypes.TRACK_UNMUTED:
        const unmutedPeer = notification.data?.peer
        if (!unmutedPeer?.isLocal) {
          toast(`${unmutedPeer?.name}'s ${notification.data?.track?.type} was unmuted`, {
            duration: 2000,
          })
        }
        break

      case HMSNotificationTypes.ROLE_CHANGE_REQUESTED:
        const roleRequest = notification.data
        toast(`Role change requested: ${roleRequest?.role?.name}`, {
          duration: 5000,
        })
        break

      case HMSNotificationTypes.DEVICE_CHANGE_UPDATE:
        toast('Camera or microphone changed', {
          duration: 2000,
          icon: '🎥',
        })
        break

      default:
        // Log other notifications for debugging
        if (notification.type !== HMSNotificationTypes.NEW_MESSAGE) {
          console.log('HMS Notification:', notification.type, notification.data)
        }
    }
  }, [notification])

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

        // Check if user should use HLS
        if (data.useHLS && data.hlsStreamUrl) {
          setUseHLS(true)
          setHLSStreamUrl(data.hlsStreamUrl)
          // Don't join WebRTC for HLS viewers
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
          // Don't block session join if streak update fails
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
      // Mark as inactive and leave
      if (isConnected) {
        markUserInactive(hmsActions, userId, localWatchDuration.current)
      }
      hmsActions.leave()
    }
  }, [hmsActions, session.hms_room_id, session.id, userId])

  // Update viewer count when peers change
  useEffect(() => {
    if (!isConnected) return

    // Calculate active viewers (exclude host if needed)
    const allWatchData = getAllWatchDurations(useHMSStore as any)
    const activeCount = countActiveViewers(allWatchData)

    // Update viewer count in session store
    updateViewerCount(hmsActions, peerCount, activeCount)
  }, [isConnected, peerCount, peers, hmsActions])

  // HMS Session Store Heartbeat - Updates every 30 seconds
  useEffect(() => {
    if (!isConnected) return

    let heartbeatInterval: NodeJS.Timeout | null = null

    // Update watch duration in HMS Session Store
    const sendHeartbeat = () => {
      // Calculate duration since last update
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - watchStartTimeRef.current) / 1000)

      // Only count time when tab is active
      if (isActiveRef.current) {
        localWatchDuration.current += elapsedSeconds
      }

      watchStartTimeRef.current = now

      // Update HMS Session Store (synced to all peers in <100ms!)
      updateWatchDuration(
        hmsActions,
        userId,
        localWatchDuration.current,
        isActiveRef.current
      )

      // Also update database for persistence (still needed for credit calculation)
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          isActive: isActiveRef.current,
        }),
      }).catch(console.error)
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval - every 30 seconds
    heartbeatInterval = setInterval(sendHeartbeat, 30000)

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      const wasActive = isActiveRef.current
      isActiveRef.current = !document.hidden

      // If transitioning from active to inactive, update immediately
      if (wasActive && !isActiveRef.current) {
        sendHeartbeat()
      } else if (!wasActive && isActiveRef.current) {
        // If transitioning from inactive to active, reset timer
        watchStartTimeRef.current = Date.now()
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

      // Final heartbeat on unmount
      sendHeartbeat()
    }
  }, [isConnected, session.id, userId, hmsActions])

  // Animate credit increase
  useEffect(() => {
    if (estimatedCredits > previousCredits && previousCredits > 0) {
      setShowCreditsAnimation(true)
      setTimeout(() => setShowCreditsAnimation(false), 1000)
    }
    setPreviousCredits(estimatedCredits)
  }, [estimatedCredits])

  // Fetch current balance for tipping
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/credits/balance')
        if (response.ok) {
          const data = await response.json()
          setCurrentBalance(data.credits_balance || 0)
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error)
      }
    }
    fetchBalance()
  }, [])

  // Fetch AI permissions and subscribe to updates
  useEffect(() => {
    const fetchPermissions = async () => {
      const permissions = await getAIPermissions(session.id)
      if (permissions) {
        setAIPermissions(permissions)
      }
    }

    fetchPermissions()

    // Subscribe to session changes (AI module updates)
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

  const handleTipSuccess = async () => {
    // Refresh balance after successful tip
    try {
      const response = await fetch('/api/credits/balance')
      if (response.ok) {
        const data = await response.json()
        setCurrentBalance(data.credits_balance || 0)
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error)
    }
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
          {/* Mobile: Stacked layout */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Top row: Leave button and title */}
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

            {/* Bottom row: Actions and info */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Tip Host Button - Only show if not the host */}
                {session.host_id !== userId && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 min-h-[44px] bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-lg transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-sm sm:text-base">Tip</span>
                  </button>
                )}
                {/* Presenter Invite Button - Only show if host */}
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

              {/* Info badges */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Credits Earned with Animation */}
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
                {/* AI Module Control */}
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
        {/* Video Area */}
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
          {/* Controls - Fixed at bottom on mobile */}
          <div className="border-t border-[#27272a] bg-[#1a1a1a]/50 sticky bottom-0">
            <Controls sessionId={session.id} isHost={session.host_id === userId} />
          </div>
        </div>

        {/* Stats Panel - Bottom right corner */}
        <StatsPanel />

        {/* Right Sidebar - Chat/AI + OBS (Overlay on mobile, sidebar on desktop) */}
        <div className="hidden lg:flex lg:w-96 border-l border-[#27272a] flex-col bg-[#1a1a1a]/30">
          {/* Tab Switcher */}
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
            {/* Only show AI tab when module is enabled */}
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

          {/* Chat Content */}
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
                onBalanceUpdate={async () => {
                  try {
                    const response = await fetch('/api/credits/balance')
                    if (response.ok) {
                      const data = await response.json()
                      setCurrentBalance(data.credits_balance || 0)
                    }
                  } catch (error) {
                    console.error('Failed to refresh balance:', error)
                  }
                }}
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

      {/* Session End Modal */}
      <SessionEndModal
        isOpen={showEndModal}
        onClose={handleCloseEndModal}
        sessionId={session.id}
      />

      {/* Tip Modal */}
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

      {/* AI Settings Modal */}
      {aiPermissions && (
        <AISettingsModal
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          permissions={aiPermissions}
          sessionId={session.id}
          onUpdate={handleAISettingsUpdate}
        />
      )}

      {/* Presenter Invite Modal */}
      <PresenterInviteModal
        isOpen={showPresenterInvite}
        onClose={() => setShowPresenterInvite(false)}
        sessionId={session.id}
      />
    </div>
  )
}
