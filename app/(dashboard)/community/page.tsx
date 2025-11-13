import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RoomBrowser } from "@/components/community/room-browser"

export const metadata = {
  title: "Community Rooms | Kulti",
  description: "Join community discussions and propose topics for streams",
}

export default async function CommunityPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Get rooms with membership info
  const { data: rooms, error } = await supabase.rpc("get_user_rooms", {
    p_user_id: user.id,
  })

  if (error) {
    console.error("Error fetching rooms:", error)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <RoomBrowser rooms={rooms || []} currentUserId={user.id} />
      </div>
    </div>
  )
}
