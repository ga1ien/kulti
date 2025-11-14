import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { new_email, password } = body

    if (!new_email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Verify current password by attempting to sign in
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

    // Update email - this will send a verification email to the new address
    const { error: updateError } = await supabase.auth.updateUser({
      email: new_email,
    })

    if (updateError) {
      logger.error('Email update error:', { error: updateError })
      return NextResponse.json(
        { error: updateError.message || "Failed to update email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent to new address",
    })
  } catch (error) {
    logger.error('Email update error:', { error: error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
