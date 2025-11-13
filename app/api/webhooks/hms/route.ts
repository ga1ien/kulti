import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHmac } from "crypto"
import { logger } from "@/lib/logger"

/**
 * Verify 100ms webhook signature
 * Uses HMAC SHA-256 to verify webhook authenticity
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp) {
    return false
  }

  const secret = process.env.HMS_APP_SECRET
  if (!secret) {
    logger.error("HMS_APP_SECRET not configured for webhook verification")
    return false
  }

  try {
    // 100ms webhook signature format: HMAC-SHA256(timestamp.body, secret)
    const expectedSignature = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex")

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    logger.error("Webhook signature verification failed", { error })
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature before processing
    const signature = request.headers.get("x-hms-signature")
    const timestamp = request.headers.get("x-hms-timestamp")

    // Get raw body for signature verification
    const rawBody = await request.text()

    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      logger.warn("Invalid webhook signature", {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
      })
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      )
    }

    const body = JSON.parse(rawBody)

    // 100ms webhook events for RTMP ingestion, recordings, and HLS streaming
    // Event types: rtmp.*, recording.*, beam.*, live-stream.*
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }

    const supabase = await createClient()

    // Handle RTMP events
    if (type.startsWith("rtmp.")) {
      const roomId = data.room_id

      // Find session by HMS room ID
      const { data: session } = await supabase
        .from("sessions")
        .select("id, title")
        .eq("hms_room_id", roomId)
        .single()

      if (!session) {
        return NextResponse.json({ received: true })
      }

      switch (type) {
        case "rtmp.started":
          break

        case "rtmp.stopped":
          break

        case "rtmp.failed":
          logger.error("OBS stream failed for session", {
            sessionId: session.id,
            error: data.error,
          })
          break
      }
    }

    // Handle Recording events
    if (type.startsWith("recording.")) {
      const roomId = data.room_id
      const recordingId = data.id

      // Find session by HMS room ID
      const { data: session } = await supabase
        .from("sessions")
        .select("id, title")
        .eq("hms_room_id", roomId)
        .single()

      if (!session) {
        return NextResponse.json({ received: true })
      }

      switch (type) {
        case "recording.started":
          await supabase
            .from("recordings")
            .update({
              status: "recording",
            })
            .eq("hms_recording_id", recordingId)
          break

        case "recording.stopped":
          await supabase
            .from("recordings")
            .update({
              status: "processing",
            })
            .eq("hms_recording_id", recordingId)
          break

        case "recording.success":
          // Update recording with final URL and duration
          await supabase
            .from("recordings")
            .update({
              status: "completed",
              recording_url: data.recording_url || data.location,
              duration: data.duration || 0,
              metadata: {
                size: data.size,
                resolution: data.resolution,
                format: data.format,
              },
            })
            .eq("hms_recording_id", recordingId)
          break

        case "recording.failed":
          await supabase
            .from("recordings")
            .update({
              status: "failed",
              metadata: {
                error: data.error || "Unknown error",
              },
            })
            .eq("hms_recording_id", recordingId)

          logger.error("Recording failed for session", {
            sessionId: session.id,
            recordingId,
            error: data.error,
          })
          break
      }
    }

    // Handle HLS/Live-Stream events
    if (type.startsWith("live-stream.") || type.startsWith("beam.")) {
      const roomId = data.room_id
      const streamId = data.id

      // Find session by HMS room ID
      const { data: session } = await supabase
        .from("sessions")
        .select("id, title")
        .eq("hms_room_id", roomId)
        .single()

      if (!session) {
        return NextResponse.json({ received: true })
      }

      switch (type) {
        case "live-stream.started":
        case "beam.started":
          // Update session metadata
          await supabase
            .from("sessions")
            .update({
              metadata: {
                hls_stream_id: streamId,
                hls_stream_url: data.url || data.playback_url,
                hls_started_at: new Date().toISOString(),
              },
            })
            .eq("id", session.id)
          break

        case "live-stream.stopped":
        case "beam.stopped":
          break

        case "live-stream.recording.success":
        case "beam.recording.success":
          // HLS VOD recording is ready
          // Store HLS recording separately or link to main recording
          await supabase
            .from("recordings")
            .insert({
              session_id: session.id,
              hms_recording_id: streamId,
              recording_url: data.recording_url || data.location,
              duration: data.duration || 0,
              status: "completed",
              recording_type: "hls",
              metadata: {
                size: data.size,
                format: "hls",
              },
            })
          break

        case "live-stream.failed":
        case "beam.failed":
          logger.error("HLS stream failed for session", {
            sessionId: session.id,
            streamId,
            error: data.error,
          })
          break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error("Webhook processing error", { error })
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}
