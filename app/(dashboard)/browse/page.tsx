import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BrowseContent } from "@/components/browse/browse-content"

export default async function BrowsePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  // Fetch all sessions with host info
  // Ordered by: boosted first, then live status, then created date
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(`
      *,
      host:profiles!sessions_host_id_fkey(*)
    `)
    .eq("is_public", true)
    .order("boosted_until", { ascending: false, nullsFirst: false })
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })

  // Handle errors gracefully
  if (error) {
    console.error("Failed to fetch sessions:", error)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-mono text-5xl md:text-6xl font-bold mb-4">
            <span className="text-lime-400 mr-4">&gt;</span>Browse Sessions
          </h1>
          <p className="text-2xl text-[#a1a1aa]">
            Discover live coding sessions and join the community
          </p>
        </div>

        {/* Browse Content with Filters */}
        <BrowseContent sessions={sessions || []} currentUserId={user.id} />
      </div>
    </div>
  )
}
