'use client'

/**
 * Badge Notifications
 *
 * Toast notifications for badge and streak events
 */

import toast from 'react-hot-toast'
import { BADGE_INFO } from './constants'

/**
 * Show notification when a badge is earned
 */
export function notifyBadgeEarned(badgeId: string) {
  const badge = BADGE_INFO[badgeId]

  if (!badge) {
    console.warn(`Unknown badge: ${badgeId}`)
    return
  }

  toast.success(
    (t) => (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
          <span className="text-2xl">🏆</span>
        </div>
        <div>
          <p className="font-bold text-sm">Badge Earned!</p>
          <p className="text-xs text-gray-600">{badge.name}</p>
        </div>
      </div>
    ),
    {
      duration: 4000,
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid #27272a',
      },
    }
  )
}

/**
 * Show notification for streak continuation
 */
export function notifyStreakContinued(streakDays: number) {
  const emoji = streakDays >= 100 ? '🔥🔥🔥' : streakDays >= 30 ? '🔥🔥' : '🔥'

  toast.success(
    (t) => (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <span className="text-3xl">{emoji}</span>
        </div>
        <div>
          <p className="font-bold text-sm">{streakDays} Day Streak!</p>
          <p className="text-xs text-gray-600">Keep it up!</p>
        </div>
      </div>
    ),
    {
      duration: 3000,
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid #f97316',
      },
    }
  )
}

/**
 * Show notification when streak milestone is hit
 */
export function notifyStreakMilestone(streakDays: number, creditsEarned: number) {
  toast.success(
    (t) => (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
          <span className="text-2xl">🔥</span>
        </div>
        <div>
          <p className="font-bold text-sm">{streakDays} Day Streak Milestone!</p>
          <p className="text-xs text-lime-400 font-mono">+{creditsEarned} credits</p>
        </div>
      </div>
    ),
    {
      duration: 5000,
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid #f97316',
      },
    }
  )
}

/**
 * Show notification when streak is broken
 */
export function notifyStreakBroken(previousStreak: number) {
  if (previousStreak > 1) {
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <span className="text-2xl">💔</span>
          </div>
          <div>
            <p className="font-bold text-sm">Streak Reset</p>
            <p className="text-xs text-gray-600">
              Your {previousStreak} day streak ended. Start a new one today!
            </p>
          </div>
        </div>
      ),
      {
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #71717a',
        },
      }
    )
  }
}
