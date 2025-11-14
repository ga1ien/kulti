import * as jwt from "jsonwebtoken"
import { logger } from "@/lib/logger"

const HMS_APP_ACCESS_KEY = process.env.HMS_APP_ACCESS_KEY!
const HMS_APP_SECRET = process.env.HMS_APP_SECRET!

export async function createHMSRoom(name: string, description?: string) {
  try {
    const response = await fetch("https://api.100ms.live/v2/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
      },
      body: JSON.stringify({
        name,
        description: description || "",
        settings: {
          region: "us",
          recording_info: {
            enabled: true,
          },
          simulcast: {
            video: {
              enabled: true,
              layers: [
                {
                  rid: "f",
                  max_bitrate: 700000,
                  scale_resolution_down_by: 1
                },
                {
                  rid: "h",
                  max_bitrate: 350000,
                  scale_resolution_down_by: 2
                },
                {
                  rid: "q",
                  max_bitrate: 100000,
                  scale_resolution_down_by: 4
                },
              ],
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error("HMS create room error", { error, name })
      throw new Error("Failed to create HMS room")
    }

    const data = await response.json()
    return data.id
  } catch (error) {
    logger.error("Error creating HMS room", { error, name })
    throw error
  }
}

export function generateHMSToken(
  roomId: string,
  userId: string,
  role: "host" | "presenter" | "viewer" = "viewer"
) {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 2 * 60 * 60

  const payload = {
    access_key: HMS_APP_ACCESS_KEY,
    room_id: roomId,
    user_id: userId,
    role: role,
    type: "app",
    version: 2,
    iat: now,
    nbf: now,
    exp: now + expiresIn,
    jti: `${userId}-${Date.now()}`,
  }

  const token = jwt.sign(payload, HMS_APP_SECRET, {
    algorithm: "HS256",
    expiresIn: "2h",
    jwtid: `${userId}-${Date.now()}`,
  })

  return {
    token,
    expiresAt: (now + expiresIn) * 1000,
  }
}

/**
 * HMS JWT token payload structure
 */
export interface HMSTokenPayload {
  access_key: string
  room_id: string
  user_id: string
  role: string
  type: string
  version: number
  iat: number
  nbf: number
  exp: number
  jti: string
}

/**
 * Verify HMS token and return decoded payload
 */
export function verifyHMSToken(token: string): { valid: boolean; payload?: HMSTokenPayload } {
  try {
    const payload = jwt.verify(token, HMS_APP_SECRET, {
      algorithms: ["HS256"],
    }) as HMSTokenPayload
    return { valid: true, payload }
  } catch (error) {
    return { valid: false }
  }
}

export async function endHMSRoom(roomId: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/rooms/${roomId}/end`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
        body: JSON.stringify({
          lock: true,
          reason: "Session ended by host",
        }),
      }
    )

    if (!response.ok) {
      throw new Error("Failed to end HMS room")
    }

    return true
  } catch (error) {
    logger.error("Error ending HMS room", { error, roomId })
    throw error
  }
}

export async function createStreamKey(roomId: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/stream-key/room/${roomId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error("HMS create stream key error", { error, roomId })
      throw new Error("Failed to create stream key")
    }

    const data = await response.json()
    return {
      id: data.id,
      streamKey: data.key,
      rtmpUrl: data.rtmp_ingest_url || "rtmp://ingest.100ms.live/live",
    }
  } catch (error) {
    logger.error("Error creating stream key", { error, roomId })
    throw error
  }
}

export async function getStreamKey(roomId: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/stream-key/room/${roomId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const error = await response.text()
      logger.error("HMS get stream key error", { error, roomId })
      throw new Error("Failed to get stream key")
    }

    const data = await response.json()
    return {
      id: data.id,
      streamKey: data.key,
      rtmpUrl: data.rtmp_ingest_url || "rtmp://ingest.100ms.live/live",
      active: data.enabled,
    }
  } catch (error) {
    logger.error("Error getting stream key", { error, roomId })
    throw error
  }
}

export async function disableStreamKey(streamKeyId: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/stream-key/${streamKeyId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error("Failed to disable stream key")
    }

    return true
  } catch (error) {
    logger.error("Error disabling stream key", { error, streamKeyId })
    throw error
  }
}

export async function startRecording(roomId: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/recordings/room/${roomId}/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
        body: JSON.stringify({
          recording_type: "composite",
          resolution: {
            width: 1920,
            height: 1080,
          },
          meeting_url: `https://app.kulti.com/session/${roomId}`,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error("HMS start recording error", { error, roomId })
      throw new Error("Failed to start recording")
    }

    const data = await response.json()
    return {
      id: data.id,
      status: data.status,
    }
  } catch (error) {
    logger.error("Error starting recording", { error, roomId })
    throw error
  }
}

export async function stopRecording(roomId: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/recordings/room/${roomId}/stop`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error("HMS stop recording error", { error, roomId })
      throw new Error("Failed to stop recording")
    }

    const data = await response.json()
    return {
      id: data.id,
      status: data.status,
    }
  } catch (error) {
    logger.error("Error stopping recording", { error, roomId })
    throw error
  }
}

export async function getRecordingStatus(roomId: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/recordings/room/${roomId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const error = await response.text()
      logger.error("HMS get recording status error", { error, roomId })
      throw new Error("Failed to get recording status")
    }

    const data = await response.json()
    return {
      id: data.id,
      status: data.status,
      recording_url: data.recording_url,
      duration: data.duration,
    }
  } catch (error) {
    logger.error("Error getting recording status", { error, roomId })
    throw error
  }
}

/**
 * HLS Room Details Interface
 */
export interface HMSRoomDetails {
  id: string
  name: string
  enabled: boolean
  description?: string
  customer_id: string
  recording_info?: {
    enabled: boolean
  }
  max_duration?: number
  created_at: string
  template_id?: string
  template?: string
  region?: string
  peers?: Array<{
    id: string
    name: string
    role: string
    user_id: string
  }>
  peer_count?: number
}

/**
 * HLS Stream Status Interface
 */
export interface HLSStreamStatus {
  id?: string
  room_id: string
  session_id?: string
  status: "starting" | "running" | "stopping" | "stopped" | "post_processing"
  stream_url?: string
  playback_url?: string
  started_at?: string
  stopped_at?: string
  recording?: {
    hls_vod?: boolean
    single_file_per_layer?: boolean
  }
}

/**
 * HLS Stream Start Response Interface
 */
export interface HLSStreamStartResponse {
  id: string
  room_id: string
  session_id: string
  status: string
  meeting_url?: string
  destination?: string
  recording?: {
    hls_vod: boolean
  }
}

/**
 * Get detailed information about an HMS room including active peer count
 *
 * @param roomId - The HMS room ID
 * @returns Room details including peer_count for HLS threshold decisions
 */
export async function getRoomDetails(roomId: string): Promise<HMSRoomDetails> {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/rooms/${roomId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error("HMS get room details error", { error, roomId, status: response.status })
      throw new Error(`Failed to get room details: ${response.status}`)
    }

    const data = await response.json()

    // Calculate peer count from peers array if available
    const peerCount = data.peers ? data.peers.length : 0

    return {
      id: data.id,
      name: data.name,
      enabled: data.enabled,
      description: data.description,
      customer_id: data.customer_id,
      recording_info: data.recording_info,
      max_duration: data.max_duration,
      created_at: data.created_at,
      template_id: data.template_id,
      template: data.template,
      region: data.region,
      peers: data.peers,
      peer_count: peerCount,
    }
  } catch (error) {
    logger.error("Error getting room details", { error, roomId })
    throw error
  }
}

/**
 * Check if HLS stream is currently running for a room
 *
 * @param roomId - The HMS room ID
 * @returns Stream status object or null if no stream exists
 */
export async function getHLSStreamStatus(roomId: string): Promise<HLSStreamStatus | null> {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/live-streams/room/${roomId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        // No active stream found
        return null
      }
      const error = await response.text()
      logger.error("HMS get HLS stream status error", { error, roomId, status: response.status })
      throw new Error(`Failed to get HLS stream status: ${response.status}`)
    }

    const data = await response.json()

    // HMS returns an array of streams, get the first active one
    const streams = Array.isArray(data) ? data : [data]
    const activeStream = streams.find(
      (stream: HLSStreamStatus) => stream.status === "running" || stream.status === "starting"
    )

    if (!activeStream) {
      return null
    }

    return {
      id: activeStream.id,
      room_id: activeStream.room_id,
      session_id: activeStream.session_id,
      status: activeStream.status,
      stream_url: activeStream.playback_url || activeStream.stream_url,
      playback_url: activeStream.playback_url,
      started_at: activeStream.started_at,
      stopped_at: activeStream.stopped_at,
      recording: activeStream.recording,
    }
  } catch (error) {
    logger.error("Error getting HLS stream status", { error, roomId })
    throw error
  }
}

/**
 * Start HLS streaming for a room
 * Automatically enables HLS recording for VOD playback
 *
 * @param roomId - The HMS room ID
 * @param meetingUrl - Optional meeting URL for composite recording
 * @returns Stream details including playback URL
 */
export async function startHLSStream(
  roomId: string,
  meetingUrl?: string
): Promise<HLSStreamStatus> {
  try {
    // Check if HLS is already running
    const existingStream = await getHLSStreamStatus(roomId)
    if (existingStream && (existingStream.status === "running" || existingStream.status === "starting")) {
      logger.info("HLS stream already running", { roomId, streamId: existingStream.id })
      return existingStream
    }

    const response = await fetch(
      `https://api.100ms.live/v2/live-streams/room/${roomId}/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
        body: JSON.stringify({
          meeting_url: meetingUrl || `${process.env.NEXT_PUBLIC_APP_URL}/session/${roomId}`,
          recording: {
            hls_vod: true, // Enable HLS VOD recording
            single_file_per_layer: false, // Single master playlist
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error("HMS start HLS stream error", {
        error,
        roomId,
        status: response.status,
        meetingUrl
      })
      throw new Error(`Failed to start HLS stream: ${response.status}`)
    }

    const data: HLSStreamStartResponse = await response.json()

    logger.info("HLS stream started successfully", {
      roomId,
      streamId: data.id,
      sessionId: data.session_id
    })

    return {
      id: data.id,
      room_id: data.room_id,
      session_id: data.session_id,
      status: data.status as HLSStreamStatus["status"],
      recording: data.recording,
    }
  } catch (error) {
    logger.error("Error starting HLS stream", { error, roomId, meetingUrl })
    throw error
  }
}

/**
 * Stop HLS streaming for a room
 *
 * @param roomId - The HMS room ID
 * @returns Stream stop confirmation
 */
export async function stopHLSStream(roomId: string): Promise<{ id: string; status: string }> {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/live-streams/room/${roomId}/stop`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HMS_APP_ACCESS_KEY}:${HMS_APP_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error("HMS stop HLS stream error", { error, roomId, status: response.status })
      throw new Error(`Failed to stop HLS stream: ${response.status}`)
    }

    const data = await response.json()

    logger.info("HLS stream stopped successfully", { roomId, streamId: data.id })

    return {
      id: data.id,
      status: data.status,
    }
  } catch (error) {
    logger.error("Error stopping HLS stream", { error, roomId })
    throw error
  }
}
