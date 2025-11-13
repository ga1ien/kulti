import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Suspense } from "react"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileStats } from "@/components/profile/profile-stats"
import { ProfileBadges } from "@/components/profile/profile-badges"
import { ProfileSessionHistory } from "@/components/profile/profile-session-history"
import { MyInviteCodes } from "@/components/profile/my-invite-codes"
import { ProfileScrollHandler } from "@/components/profile/profile-scroll-handler"

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get profile by username
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single()

  if (error || !profile) {
    notFound()
  }

  const isOwnProfile = user.id === profile.id

  // Get user stats
  const { data: stats } = await supabase.rpc("get_user_stats", {
    p_user_id: profile.id,
  })

  // Get recent sessions where user participated
  const { data: recentSessions } = await supabase
    .from("session_participants")
    .select(`
      session_id,
      role,
      joined_at,
      credits_earned,
      watch_duration_seconds,
      sessions (
        id,
        title,
        description,
        status,
        started_at,
        ended_at,
        host:profiles!host_id(username, display_name)
      )
    `)
    .eq("user_id", profile.id)
    .order("joined_at", { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Suspense>
        <ProfileScrollHandler />
      </Suspense>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

        {/* Stats Grid */}
        <div className="mt-12">
          <ProfileStats profile={profile} stats={stats} />
        </div>

        {/* Badges */}
        <div className="mt-12">
          <ProfileBadges badges={profile.badges || []} />
        </div>

        {/* Invite Codes (only for own profile) */}
        {isOwnProfile && (
          <div id="invite-codes-section" className="mt-12 rounded-xl transition-all duration-500">
            <h2 className="text-2xl font-bold mb-6">My Invite Codes</h2>
            <MyInviteCodes userId={profile.id} />
          </div>
        )}

        {/* Session History */}
        <div className="mt-12">
          <ProfileSessionHistory
            sessions={recentSessions || []}
            profileUsername={profile.username}
          />
        </div>
      </div>
    </div>
  )
}
