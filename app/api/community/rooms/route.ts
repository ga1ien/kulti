import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/community/rooms
 * Get all public community rooms with membership status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use the database function to get rooms with membership info
    const { data: rooms, error } = await supabase.rpc("get_user_rooms", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("Error fetching rooms:", error)
      return NextResponse.json(
        { error: "Failed to fetch rooms" },
        { status: 500 }
      )
    }

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error("Error in GET /api/community/rooms:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
