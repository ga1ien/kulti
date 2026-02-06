import { createClient } from "@/lib/supabase/server"
import { NavBar } from "@/components/dashboard/nav-bar"
import { redirect } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen bg-black">
        <div className="relative z-10">
          <NavBar profile={profile} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
