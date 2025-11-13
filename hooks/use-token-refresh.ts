import { useEffect, useState } from "react"
import { useHMSActions, useHMSNotifications, HMSNotificationTypes } from "@100mslive/react-sdk"
import { toast } from "react-hot-toast"

interface UseTokenRefreshOptions {
  isConnected?: boolean
  tokenExpiresAt: number | null
  authToken: string | null
  roomId: string | null
  sessionId: string
  onTokenUpdate: (token: string, expiresAt: number) => void
}

export function useTokenRefresh({
  isConnected,
  tokenExpiresAt,
  authToken,
  roomId,
  sessionId,
  onTokenUpdate,
}: UseTokenRefreshOptions) {
  const hmsActions = useHMSActions()
  const notification = useHMSNotifications()
  const [showExpiryWarning, setShowExpiryWarning] = useState(false)

  // Auto-refresh token 5 minutes before expiry
  useEffect(() => {
    if (!isConnected || !tokenExpiresAt || !authToken || !roomId) return

    let refreshTimer: NodeJS.Timeout | null = null
    let warningTimer: NodeJS.Timeout | null = null

    const refreshToken = async () => {
      try {
        const response = await fetch('/api/hms/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            sessionId,
            oldToken: authToken,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to refresh token')
        }

        const data = await response.json()

        // Update token in parent component
        onTokenUpdate(data.token, data.expiresAt)

        // HMS SDK doesn't support seamless token refresh in current version
        // Token will be used on next reconnection if needed

        toast.success('Session token refreshed', {
          duration: 2000,
          icon: '🔄',
        })
      } catch (error) {
        console.error('Token refresh failed:', error)
        toast.error('Failed to refresh session. Please rejoin if connection is lost.', {
          duration: 5000,
        })
      }
    }

    // Calculate time until we should refresh (5 minutes before expiry)
    const now = Date.now()
    const timeUntilExpiry = tokenExpiresAt - now
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000) // 5 minutes before expiry
    const warningTime = timeUntilExpiry - (10 * 60 * 1000) // 10 minutes before expiry

    // Show warning 10 minutes before expiry
    if (warningTime > 0) {
      warningTimer = setTimeout(() => {
        setShowExpiryWarning(true)
        toast('Your session will refresh automatically in 5 minutes', {
          duration: 4000,
          icon: '⏰',
        })
      }, warningTime)
    }

    // Auto-refresh 5 minutes before expiry
    if (refreshTime > 0) {
      refreshTimer = setTimeout(() => {
        refreshToken()
        setShowExpiryWarning(false)
      }, refreshTime)
    } else {
      // Token is close to expiry or already expired, refresh immediately
      refreshToken()
    }

    // Cleanup timers on unmount or when token changes
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      if (warningTimer) clearTimeout(warningTimer)
    }
  }, [isConnected, tokenExpiresAt, authToken, hmsActions, roomId, sessionId, onTokenUpdate])

  // Manual token refresh on connection errors
  useEffect(() => {
    if (!notification || !authToken || !roomId) return

    // If we get a reconnection error or token error, try to refresh
    if (notification.type === HMSNotificationTypes.ERROR) {
      const error = notification.data
      // Error codes that might indicate token issues
      if (error.code === 3001 || error.code === 401 || error.code === 403) {
        const attemptRefresh = async () => {
          try {
            const response = await fetch('/api/hms/refresh-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                roomId,
                sessionId,
                oldToken: authToken,
              }),
            })

            if (response.ok) {
              const data = await response.json()
              onTokenUpdate(data.token, data.expiresAt)
              // Store token for potential reconnection
              toast.success('Reconnected successfully', { icon: '✅' })
            }
          } catch (refreshError) {
            console.error('Manual refresh failed:', refreshError)
          }
        }

        attemptRefresh()
      }
    }
  }, [notification, authToken, hmsActions, roomId, sessionId, onTokenUpdate])

  return { showExpiryWarning }
}
