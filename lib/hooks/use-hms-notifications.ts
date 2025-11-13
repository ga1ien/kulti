/**
 * HMS Notifications Hook
 *
 * Shared hook for handling HMS notification events.
 * Provides consistent notification handling across session components.
 */

import { useEffect } from 'react'
import { useHMSNotifications, HMSNotificationTypes } from '@100mslive/react-sdk'
import { toast } from 'react-hot-toast'

export function useHMSNotificationHandler() {
  const notification = useHMSNotifications()

  useEffect(() => {
    if (!notification) return

    switch (notification.type) {
      case HMSNotificationTypes.PEER_JOINED:
        toast.success(`${notification.data?.name || 'Someone'} joined the session`, {
          duration: 2000,
          icon: '👋',
        })
        break

      case HMSNotificationTypes.PEER_LEFT:
        toast(`${notification.data?.name || 'Someone'} left the session`, {
          duration: 2000,
          icon: '👋',
        })
        break

      case HMSNotificationTypes.ERROR:
        const error = notification.data
        console.error('HMS Error:', error)

        // Provide user-friendly error messages
        if (error.code === 3001) {
          toast.error('Failed to join: Invalid room code')
        } else if (error.code === 3003) {
          toast.error('Network connection failed')
        } else if (error.code === 3008) {
          toast.error('Camera/microphone access denied')
        } else if (error.code === 1003) {
          toast.error('Session has ended')
        } else {
          toast.error(error.message || 'An error occurred')
        }
        break

      case HMSNotificationTypes.RECONNECTING:
        toast('Reconnecting...', {
          duration: Infinity,
          id: 'reconnecting',
          icon: '🔄',
        })
        break

      case HMSNotificationTypes.RECONNECTED:
        toast.dismiss('reconnecting')
        toast.success('Reconnected successfully!', {
          duration: 3000,
          icon: '✅',
        })
        break

      case HMSNotificationTypes.TRACK_MUTED:
        const mutedPeer = (notification.data as any)?.peer
        if (!mutedPeer?.isLocal) {
          toast(`${mutedPeer?.name}'s ${(notification.data as any)?.track?.type} was muted`, {
            duration: 2000,
          })
        }
        break

      case HMSNotificationTypes.TRACK_UNMUTED:
        const unmutedPeer = (notification.data as any)?.peer
        if (!unmutedPeer?.isLocal) {
          toast(`${unmutedPeer?.name}'s ${(notification.data as any)?.track?.type} was unmuted`, {
            duration: 2000,
          })
        }
        break

      case HMSNotificationTypes.DEVICE_CHANGE_UPDATE:
        toast('Camera or microphone changed', {
          duration: 2000,
          icon: '🎥',
        })
        break

      default:
        // Ignore other notifications
        break
    }
  }, [notification])
}
