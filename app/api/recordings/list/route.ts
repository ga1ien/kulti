import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

/**
 * List recordings for the authenticated user
 * GET /api/recordings/list
 *
 * Query params:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - status: 'recording' | 'processing' | 'completed' | 'failed' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")

    // Build query
    let query = supabase
      .from("recordings")
      .select(`
        id,
        session_id,
        hms_recording_id,
        recording_url,
        duration,
        status,
        metadata,
        created_at,
        updated_at,
        sessions!inner (
          id,
          title,
          host_id
        )
      `)
      .or(`sessions.host_id.eq.${user.id},session_id.in.(SELECT session_id FROM session_participants WHERE user_id = '${user.id}')`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if provided
    if (status && ["recording", "processing", "completed", "failed"].includes(status)) {
      query = query.eq("status", status)
    }

    const { data: recordings, error, count } = await query

    if (error) {
      logger.error("Failed to fetch recordings", { userId: user.id, error })
      return NextResponse.json(
        { error: "Failed to fetch recordings" },
        { status: 500 }
      )
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from("recordings")
      .select("id", { count: "exact", head: true })
      .or(`sessions.host_id.eq.${user.id},session_id.in.(SELECT session_id FROM session_participants WHERE user_id = '${user.id}')`)

    return NextResponse.json({
      recordings: recordings || [],
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0),
      },
    })

  } catch (error) {
    logger.error("Error fetching recordings", { error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
