import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RecordingsContent } from "@/components/recordings/recordings-content"

export const metadata = {
  title: "My Recordings | Kulti",
  description: "View and manage your session recordings",
}

export default async function RecordingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get all recordings for sessions the user hosted
  const { data: recordings, error } = await supabase
    .from("recordings")
    .select(
      `
      *,
      sessions!inner (
        id,
        title,
        description,
        host_id,
        started_at,
        ended_at
      )
    `
    )
    .eq("sessions.host_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching recordings:", error)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Recordings</h1>
        <p className="text-muted-foreground">
          View and manage recordings from your hosted sessions
        </p>
      </div>

      <RecordingsContent recordings={recordings || []} />
    </div>
  )
}
