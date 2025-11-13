import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SessionRoom } from "@/components/session/session-room"
import { ErrorBoundary } from "@/components/error-boundary"

interface SessionPageProps {
  params: Promise<{
    roomCode: string
  }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { roomCode } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=/s/${roomCode}`)
  }

  const { data: session } = await supabase
    .from("sessions")
    .select(`
      *,
      host:profiles!host_id(*)
    `)
    .eq("room_code", roomCode)
    .single()

  if (!session) {
    redirect("/dashboard")
  }

  return (
    <ErrorBoundary>
      <SessionRoom
        session={session}
        userId={user.id}
      />
    </ErrorBoundary>
  )
}
