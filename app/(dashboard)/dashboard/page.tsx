"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { SessionCard } from "@/components/dashboard/session-card"
import { SessionCardSkeleton, LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { usePresence } from "@/hooks/use-presence"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Sparkles, Users } from "lucide-react"
import { toast } from "react-hot-toast"
import { SessionWithDetails } from "@/types/database"
import { logger } from '@/lib/logger'

// Code split heavy modals - only load when needed
const CreateSessionModal = dynamic(
  () => import("@/components/dashboard/create-session-modal").then(mod => ({ default: mod.CreateSessionModal })),
  { ssr: false }
)

const FindSessionModal = dynamic(
  () => import("@/components/matchmaking/find-session-modal").then(mod => ({ default: mod.FindSessionModal })),
  { ssr: false }
)

const ProfileSetupModal = dynamic(
  () => import("@/components/profile/profile-setup-modal").then(mod => ({ default: mod.ProfileSetupModal })),
  { ssr: false }
)

const WelcomeTour = dynamic(
  () => import("@/components/onboarding/welcome-tour").then(mod => ({ default: mod.WelcomeTour })),
  { ssr: false }
)

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { markStepComplete } = useOnboarding()
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profileCompleted, setProfileCompleted] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [showFindSession, setShowFindSession] = useState(false)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const showCreate = searchParams.get("create") === "true"

  // Enable presence tracking
  usePresence({ enabled: true })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)

        // Check if profile is completed
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed")
          .eq("id", user.id)
          .single()

        if (profile && !profile.profile_completed) {
          setProfileCompleted(false)
          setShowProfileSetup(true)
        }
      }

      // Get live sessions
      const { data } = await supabase
        .from("sessions")
        .select(`
          *,
          host:profiles!host_id(*),
          participants:session_participants(count)
        `)
        .eq("status", "live")
        .eq("is_public", true)
        .order("started_at", { ascending: false })

      if (data) {
        setSessions(data)
      }

      // Get online users count
      const { count } = await supabase
        .from("user_presence")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true)
        .eq("available_for_matching", true)

      if (count !== null) {
        setOnlineUsers(count)
      }

      setLoading(false)
    }

    fetchData()

    // Refresh online users count every 30 seconds
    const interval = setInterval(async () => {
      const supabase = createClient()
      const { count } = await supabase
        .from("user_presence")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true)
        .eq("available_for_matching", true)

      if (count !== null) {
        setOnlineUsers(count)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleCloseModal = () => {
    router.push("/dashboard")
  }

  const handleProfileComplete = async (data: { skills: string[]; interests: string[]; experienceLevel: string }) => {
    try {
      const response = await fetch('/api/profile/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        // Mark profile setup as complete in onboarding context
        // This will trigger the welcome tour (Joyride) to show
        logger.info('[Dashboard] Marking profile setup as complete')
        markStepComplete('profileSetupCompleted')

        // Update local state
        setProfileCompleted(true)

        // Small delay to ensure onboarding context state propagates before closing modal
        setTimeout(() => {
          setShowProfileSetup(false)
        }, 100)
      } else {
        toast.error("Failed to update profile. Please try again.")
      }
    } catch (error) {
      logger.error('Profile update error:', error)
      toast.error("Failed to update profile. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-lime-400"></div>
      </div>
    )
  }

  return (
    <>
      <WelcomeTour />
      {showCreate && <CreateSessionModal onClose={handleCloseModal} />}
      {showFindSession && (
        <FindSessionModal
          isOpen={showFindSession}
          onClose={() => setShowFindSession(false)}
        />
      )}
      {showProfileSetup && (
        <ProfileSetupModal
          isOpen={showProfileSetup}
          onClose={() => setShowProfileSetup(false)}
          onComplete={handleProfileComplete}
        />
      )}
    <div className="space-y-8 sm:space-y-12 animate-fade-in px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-mono">Dashboard</h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#a1a1aa] mt-2 sm:mt-4">
            Join a live session or create your own
          </p>
          {onlineUsers > 0 && (
            <div className="flex items-center gap-2 mt-2 sm:mt-3 text-lime-400">
              <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                {onlineUsers} {onlineUsers === 1 ? 'developer' : 'developers'} online
              </span>
            </div>
          )}
        </div>
        {/* Mobile-optimized button group */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => setShowFindSession(true)}
            disabled={!profileCompleted}
            data-tour="find-match"
            className="min-h-[56px] bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-500 hover:to-green-600 text-black font-bold text-base sm:text-lg lg:text-xl px-8 sm:px-10 py-4 sm:py-5 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!profileCompleted ? 'Complete your profile first' : ''}
            aria-label="Find a session to join"
            aria-disabled={!profileCompleted}
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            <span>Find Session</span>
          </button>
          <button
            onClick={() => router.push("/dashboard?create=true")}
            data-tour="create-session"
            className="min-h-[56px] bg-lime-400 hover:bg-lime-500 text-black font-bold text-base sm:text-lg lg:text-xl px-8 sm:px-10 py-4 sm:py-5 rounded-xl transition-colors duration-300"
            aria-label="Create a new session"
          >
            Create Session
          </button>
        </div>
      </div>

      {/* Matchmaking Widget (if users online) */}
      {onlineUsers > 2 && profileCompleted && (
        <div className="p-4 sm:p-6 bg-gradient-to-br from-lime-400/10 to-green-500/10 border-2 border-lime-400/20 rounded-xl sm:rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1">
              <div className="p-2 sm:p-3 bg-lime-400 rounded-lg sm:rounded-xl flex-shrink-0">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">Compatible Developers Online</h3>
                <p className="text-sm sm:text-base text-[#a1a1aa]">
                  {onlineUsers} developers who match your skills are available right now
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFindSession(true)}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              Find Match
            </button>
          </div>
        </div>
      )}

      {/* Live Sessions */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-mono mb-6 sm:mb-8">Live Now</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[...Array(3)].map((_, i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} currentUserId={userId} />
            ))}
          </div>
        ) : (
          <div
            className="text-center py-12 sm:py-20 border border-[#27272a] border-dashed rounded-xl sm:rounded-2xl bg-[#1a1a1a]/30 backdrop-blur-sm px-4"
            role="status"
            aria-label="No live sessions"
          >
            <p className="text-lg sm:text-xl lg:text-2xl text-[#a1a1aa] mb-6 sm:mb-8">
              No live sessions right now. Be the first to start one!
            </p>
            <button
              onClick={() => router.push("/dashboard?create=true")}
              className="min-h-[56px] bg-lime-400 hover:bg-lime-500 text-black font-bold text-base sm:text-lg lg:text-xl px-8 sm:px-12 py-4 sm:py-5 rounded-xl transition-colors duration-300"
              aria-label="Create a new session"
            >
              Create Session
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-lime-400"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
