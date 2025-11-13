/**
 * HMS Session Store Helper
 *
 * Wrapper utilities for managing ephemeral session state using HMS Session Store.
 * This replaces custom database polling for real-time data that doesn't need persistence.
 *
 * Benefits:
 * - Lower latency (<100ms vs database polling)
 * - Reduced Supabase load and costs
 * - Built-in conflict resolution
 * - Auto-cleanup on session end
 * - Real-time synchronization across all peers
 *
 * Limitations:
 * - Max 100 keys, 64KB total (including key names)
 * - Max 1KB per value
 * - No permission controls (everyone can read/write)
 * - Cleared when last peer leaves
 */

import type { HMSActions, HMSStore } from "@100mslive/react-sdk"
import { selectSessionStore } from "@100mslive/react-sdk"

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Watch duration tracking for individual users
 * Synced every 30 seconds while user is active
 */
export interface WatchDurationData {
  userId: string
  durationSeconds: number
  lastUpdate: number // timestamp
  isActive: boolean
}

/**
 * Session-wide viewer count
 * Updated when peers join/leave
 */
export interface ViewerCountData {
  total: number
  active: number // Currently watching (tab visible)
  timestamp: number
}

/**
 * Live poll state
 * Used for real-time polls during sessions
 */
export interface LivePollData {
  pollId: string
  question: string
  options: Array<{
    id: string
    text: string
    votes: number
  }>
  totalVotes: number
  isActive: boolean
  createdAt: number
}

/**
 * Ephemeral UI state
 * Pinned messages, spotlighted user, etc.
 */
export interface EphemeralUIState {
  pinnedMessageId?: string | null
  spotlightPeerId?: string | null
  announcementText?: string | null
  timestamp: number
}

/**
 * Complete session store schema
 * Note: TypeScript doesn't support computed property names in interfaces,
 * so we use an index signature instead
 */
export interface SessionStoreSchema {
  // Watch duration by user ID (accessed via watch:userId)
  [key: string]: WatchDurationData | ViewerCountData | LivePollData | EphemeralUIState | undefined

  // Viewer counts
  viewers: ViewerCountData

  // Active poll
  activePoll?: LivePollData | undefined

  // UI state
  uiState: EphemeralUIState
}

// ============================================================================
// Session Store Keys
// ============================================================================

export const SESSION_STORE_KEYS = {
  watchDuration: (userId: string) => `watch:${userId}`,
  viewers: "viewers",
  activePoll: "activePoll",
  uiState: "uiState",
} as const

// ============================================================================
// Watch Duration Management
// ============================================================================

/**
 * Update watch duration for current user
 * Called every 30 seconds by heartbeat
 */
export function updateWatchDuration(
  hmsActions: HMSActions,
  userId: string,
  durationSeconds: number,
  isActive: boolean
): void {
  const key = SESSION_STORE_KEYS.watchDuration(userId)
  const data: WatchDurationData = {
    userId,
    durationSeconds,
    lastUpdate: Date.now(),
    isActive,
  }

  hmsActions.sessionStore.set(key, data)
}

/**
 * Get watch duration for a specific user
 */
export function selectWatchDuration(userId: string) {
  return (store: any) => {
    const key = SESSION_STORE_KEYS.watchDuration(userId)
    return selectSessionStore(key)(store) as WatchDurationData | undefined
  }
}

/**
 * Get all watch durations (for host to see aggregate stats)
 */
export function getAllWatchDurations(hmsStore: any): WatchDurationData[] {
  // Access session store directly from the store state
  const storeState = hmsStore((state: any) => state.sessionStore) as Record<string, any>
  if (!storeState) return []

  return Object.entries(storeState)
    .filter(([key]) => key.startsWith("watch:"))
    .map(([_, value]) => value as WatchDurationData)
    .filter(Boolean)
}

// ============================================================================
// Viewer Count Management
// ============================================================================

/**
 * Update viewer count
 * Called when peers join/leave
 */
export function updateViewerCount(
  hmsActions: HMSActions,
  total: number,
  active: number
): void {
  const data: ViewerCountData = {
    total,
    active,
    timestamp: Date.now(),
  }

  hmsActions.sessionStore.set(SESSION_STORE_KEYS.viewers, data)
}

/**
 * Selector for viewer count
 */
export function selectViewerCount(store: any): ViewerCountData | undefined {
  return selectSessionStore(SESSION_STORE_KEYS.viewers)(store) as ViewerCountData | undefined
}

// ============================================================================
// Live Poll Management
// ============================================================================

/**
 * Create or update a live poll
 */
export function setActivePoll(
  hmsActions: HMSActions,
  pollData: LivePollData | null
): void {
  hmsActions.sessionStore.set(SESSION_STORE_KEYS.activePoll, pollData)
}

/**
 * Vote on active poll
 */
export function voteOnPoll(
  hmsActions: HMSActions,
  currentPoll: LivePollData,
  optionId: string
): void {
  const updatedPoll: LivePollData = {
    ...currentPoll,
    options: currentPoll.options.map((opt) =>
      opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    ),
    totalVotes: currentPoll.totalVotes + 1,
  }

  hmsActions.sessionStore.set(SESSION_STORE_KEYS.activePoll, updatedPoll)
}

/**
 * Close active poll
 */
export function closeActivePoll(hmsActions: HMSActions): void {
  hmsActions.sessionStore.set(SESSION_STORE_KEYS.activePoll, null)
}

/**
 * Selector for active poll
 */
export function selectActivePoll(store: any): LivePollData | null {
  return selectSessionStore(SESSION_STORE_KEYS.activePoll)(store) as LivePollData | null
}

// ============================================================================
// UI State Management
// ============================================================================

/**
 * Pin a message (visible to all participants)
 */
export function pinMessage(
  hmsActions: HMSActions,
  currentState: EphemeralUIState | undefined,
  messageId: string | null
): void {
  const newState: EphemeralUIState = {
    ...currentState,
    pinnedMessageId: messageId,
    timestamp: Date.now(),
  }

  hmsActions.sessionStore.set(SESSION_STORE_KEYS.uiState, newState)
}

/**
 * Spotlight a peer (brings them to center stage for everyone)
 */
export function spotlightPeer(
  hmsActions: HMSActions,
  currentState: EphemeralUIState | undefined,
  peerId: string | null
): void {
  const newState: EphemeralUIState = {
    ...currentState,
    spotlightPeerId: peerId,
    timestamp: Date.now(),
  }

  hmsActions.sessionStore.set(SESSION_STORE_KEYS.uiState, newState)
}

/**
 * Set announcement text (shown to all participants)
 */
export function setAnnouncement(
  hmsActions: HMSActions,
  currentState: EphemeralUIState | undefined,
  text: string | null
): void {
  const newState: EphemeralUIState = {
    ...currentState,
    announcementText: text,
    timestamp: Date.now(),
  }

  hmsActions.sessionStore.set(SESSION_STORE_KEYS.uiState, newState)
}

/**
 * Selector for UI state
 */
export function selectUIState(store: any): EphemeralUIState | undefined {
  return selectSessionStore(SESSION_STORE_KEYS.uiState)(store) as EphemeralUIState | undefined
}

// ============================================================================
// Initialization & Cleanup
// ============================================================================

/**
 * Initialize session store observers
 * Call this on room join to start receiving updates
 */
export function initializeSessionStore(hmsActions: HMSActions, userId: string): void {
  // Observe all keys we care about
  const keysToObserve = [
    SESSION_STORE_KEYS.watchDuration(userId),
    SESSION_STORE_KEYS.viewers,
    SESSION_STORE_KEYS.activePoll,
    SESSION_STORE_KEYS.uiState,
  ]

  hmsActions.sessionStore.observe(keysToObserve)
}

/**
 * Mark user as inactive
 * Updates their watch duration entry to show they're no longer active
 */
export function markUserInactive(
  hmsActions: HMSActions,
  userId: string,
  currentDuration: number
): void {
  const key = SESSION_STORE_KEYS.watchDuration(userId)
  const data: WatchDurationData = {
    userId,
    durationSeconds: currentDuration,
    lastUpdate: Date.now(),
    isActive: false,
  }

  hmsActions.sessionStore.set(key, data)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if watch duration data is stale (>2 minutes old)
 * Used to filter out inactive users
 */
export function isWatchDataStale(data: WatchDurationData): boolean {
  const twoMinutesAgo = Date.now() - 120_000
  return data.lastUpdate < twoMinutesAgo
}

/**
 * Calculate total active viewers from watch duration data
 */
export function countActiveViewers(watchData: WatchDurationData[]): number {
  return watchData.filter((data) => data.isActive && !isWatchDataStale(data)).length
}

/**
 * Calculate average watch time across all users
 */
export function calculateAverageWatchTime(watchData: WatchDurationData[]): number {
  if (watchData.length === 0) return 0

  const total = watchData.reduce((sum, data) => sum + data.durationSeconds, 0)
  return Math.floor(total / watchData.length)
}
