import * as jwt from "jsonwebtoken"

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
      console.error("HMS create room error:", error)
      throw new Error("Failed to create HMS room")
    }

    const data = await response.json()
    return data.id
  } catch (error) {
    console.error("Error creating HMS room:", error)
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
    console.error("Error ending HMS room:", error)
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
      console.error("HMS create stream key error:", error)
      throw new Error("Failed to create stream key")
    }

    const data = await response.json()
    return {
      id: data.id,
      streamKey: data.key,
      rtmpUrl: data.rtmp_ingest_url || "rtmp://ingest.100ms.live/live",
    }
  } catch (error) {
    console.error("Error creating stream key:", error)
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
      console.error("HMS get stream key error:", error)
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
    console.error("Error getting stream key:", error)
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
    console.error("Error disabling stream key:", error)
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
      console.error("HMS start recording error:", error)
      throw new Error("Failed to start recording")
    }

    const data = await response.json()
    return {
      id: data.id,
      status: data.status,
    }
  } catch (error) {
    console.error("Error starting recording:", error)
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
      console.error("HMS stop recording error:", error)
      throw new Error("Failed to stop recording")
    }

    const data = await response.json()
    return {
      id: data.id,
      status: data.status,
    }
  } catch (error) {
    console.error("Error stopping recording:", error)
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
      console.error("HMS get recording status error:", error)
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
    console.error("Error getting recording status:", error)
    throw error
  }
}
