"use client"

import { useEffect, useRef, useCallback } from 'react'

interface UsePresenceOptions {
  enabled?: boolean
  sessionId?: string | null
  heartbeatInterval?: number // milliseconds
}

/**
 * Hook to maintain user presence and send heartbeat updates
 *
 * Usage:
 * usePresence({ enabled: true, sessionId: currentSessionId })
 */
export function usePresence({
  enabled = true,
  sessionId = null,
  heartbeatInterval = 30000, // 30 seconds
}: UsePresenceOptions = {}) {
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSessionIdRef = useRef<string | null>(null)

  const updatePresence = useCallback(async (isOnline: boolean, currentSessionId: string | null = null) => {
    try {
      await fetch('/api/presence/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOnline,
          sessionId: currentSessionId,
        }),
      })
    } catch (error) {
      console.error('Failed to update presence:', error)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Set online on mount
    updatePresence(true, sessionId)

    // Setup heartbeat
    const startHeartbeat = () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }

      heartbeatTimerRef.current = setInterval(() => {
        updatePresence(true, sessionId)
      }, heartbeatInterval)
    }

    startHeartbeat()

    // Update presence when session changes
    if (sessionId !== lastSessionIdRef.current) {
      updatePresence(true, sessionId)
      lastSessionIdRef.current = sessionId
    }

    // Set offline on unmount or page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability on page unload
      const data = JSON.stringify({
        isOnline: false,
        sessionId: null,
      })

      navigator.sendBeacon('/api/presence/update', data)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // Set offline when component unmounts
      updatePresence(false, null)
    }
  }, [enabled, sessionId, heartbeatInterval, updatePresence])

  return {
    updatePresence,
  }
}
