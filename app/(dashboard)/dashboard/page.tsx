"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SessionCard } from "@/components/dashboard/session-card"
import { CreateSessionModal } from "@/components/dashboard/create-session-modal"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const showCreate = searchParams.get("create") === "true"

  useEffect(() => {
    const fetchSessions = async () => {
      const supabase = createClient()
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
      setLoading(false)
    }

    fetchSessions()
  }, [])

  const handleCloseModal = () => {
    router.push("/dashboard")
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
      {showCreate && <CreateSessionModal onClose={handleCloseModal} />}
    <div className="space-y-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold font-mono">Dashboard</h1>
          <p className="text-2xl text-[#a1a1aa] mt-4">
            Join a live session or create your own
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard?create=true")}
          className="bg-lime-400 hover:bg-lime-500 text-black font-bold text-xl px-12 py-5 rounded-xl transition-colors duration-300 whitespace-nowrap"
        >
          Create Session
        </button>
      </div>

      {/* Live Sessions */}
      <div>
        <h2 className="text-3xl font-bold font-mono mb-8">Live Now</h2>

        {sessions && sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-[#27272a] border-dashed rounded-2xl bg-[#1a1a1a]/30 backdrop-blur-sm">
            <p className="text-2xl text-[#a1a1aa] mb-8">
              No live sessions right now. Be the first to start one!
            </p>
            <button
              onClick={() => router.push("/dashboard?create=true")}
              className="bg-lime-400 hover:bg-lime-500 text-black font-bold text-xl px-12 py-5 rounded-xl transition-colors duration-300"
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
