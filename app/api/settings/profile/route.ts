import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { display_name, bio, avatar_url } = body

    const updateData: any = {}

    if (display_name !== undefined) {
      if (!display_name.trim()) {
        return NextResponse.json(
          { error: "Display name cannot be empty" },
          { status: 400 }
        )
      }
      updateData.display_name = display_name.trim()
    }

    if (bio !== undefined) {
      updateData.bio = bio ? bio.trim() : null
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)

    if (error) {
      console.error("Profile update error:", error)
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
