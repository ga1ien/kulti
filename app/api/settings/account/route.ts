import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { password, confirmation } = body

    if (!password || !confirmation) {
      return NextResponse.json(
        { error: "Password and confirmation are required" },
        { status: 400 }
      )
    }

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'You must type "DELETE" to confirm' },
        { status: 400 }
      )
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      )
    }

    // Delete user profile (cascading deletes will handle related data)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id)

    if (profileError) {
      console.error("Profile deletion error:", profileError)
      return NextResponse.json(
        { error: "Failed to delete profile" },
        { status: 500 }
      )
    }

    // Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    )

    if (deleteError) {
      console.error("User deletion error:", deleteError)
      // Profile is already deleted, but user account remains
      // This is an acceptable failure state
      return NextResponse.json(
        { error: "Account partially deleted. Please contact support." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    })
  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
