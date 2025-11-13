/**
 * Credits System Configuration
 *
 * This file contains all the constants and rates for the Kulti credits economy.
 * Adjust these values to fine-tune the earning rates and costs.
 */

// ============================================================================
// BASE EARNING RATES
// ============================================================================

/**
 * Credits earned per minute of watching a session
 * Base rate without any multipliers
 */
export const CREDITS_PER_MINUTE_WATCHING = 1

/**
 * Credits earned per minute of hosting/streaming a session
 * Base rate without any multipliers
 */
export const CREDITS_PER_MINUTE_HOSTING = 5

// ============================================================================
// MULTIPLIERS
// ============================================================================

/**
 * Multiplier applied when user is actively chatting
 */
export const ACTIVE_CHAT_MULTIPLIER = 1.5

/**
 * Multiplier applied when user helps someone (tagged in chat or marked as helper)
 */
export const HELPER_MULTIPLIER = 2.0

/**
 * Multiplier applied for repeat viewers (attended 3+ sessions from same creator)
 */
export const REPEAT_VIEWER_MULTIPLIER = 1.2

/**
 * Multiplier applied when discovering/watching a new session
 */
export const NEW_SESSION_DISCOVERY_MULTIPLIER = 1.5

/**
 * Multiplier applied to host per concurrent viewer
 * Added to base hosting rate
 */
export const CREDITS_PER_VIEWER_PER_MINUTE = 2

/**
 * Multiplier for high engagement sessions (chat activity rate)
 * Applied to hosting credits
 */
export const HIGH_ENGAGEMENT_MULTIPLIER = 2.0

/**
 * Threshold for "high engagement" (messages per minute)
 */
export const HIGH_ENGAGEMENT_THRESHOLD = 2

// ============================================================================
// COMPLETION BONUSES
// ============================================================================

/**
 * Bonus multiplier for completing full session (>30 minutes)
 */
export const FULL_SESSION_COMPLETION_MULTIPLIER = 2.0

/**
 * Minimum session duration (seconds) to qualify for completion bonus
 */
export const MIN_SESSION_DURATION_FOR_BONUS = 30 * 60 // 30 minutes

/**
 * Credits awarded to host per person helped during session
 */
export const CREDITS_PER_PERSON_HELPED = 50

// ============================================================================
// MILESTONE BONUSES
// ============================================================================

export const MILESTONES = {
  // Viewer milestones
  FIRST_SESSION: { credits: 100, type: 'first_session' as const },
  SESSIONS_ATTENDED_10: { credits: 500, type: 'sessions_attended_10' as const },
  SESSIONS_ATTENDED_50: { credits: 2500, type: 'sessions_attended_50' as const },
  SESSIONS_ATTENDED_100: { credits: 10000, type: 'sessions_attended_100' as const },
  HOURS_WATCHED_10: { credits: 1000, type: 'hours_watched_10' as const },
  HOURS_WATCHED_50: { credits: 5000, type: 'hours_watched_50' as const },
  HOURS_WATCHED_100: { credits: 15000, type: 'hours_watched_100' as const },

  // Creator milestones
  FIRST_STREAM: { credits: 200, type: 'first_stream' as const },
  SESSIONS_HOSTED_10: { credits: 1000, type: 'sessions_hosted_10' as const },
  SESSIONS_HOSTED_50: { credits: 5000, type: 'sessions_hosted_50' as const },
  HOURS_STREAMED_10: { credits: 2000, type: 'hours_streamed_10' as const },
  HOURS_STREAMED_50: { credits: 10000, type: 'hours_streamed_50' as const },

  // Community milestones
  FIRST_REGULAR_VIEWER: { credits: 500, type: 'first_regular_viewer' as const },
  REGULAR_VIEWERS_10: { credits: 5000, type: 'regular_viewers_10' as const },
} as const

// ============================================================================
// FEATURE COSTS (What users can spend credits on)
// ============================================================================

export const FEATURE_COSTS = {
  // Session features
  PRIORITY_JOIN: 100, // Skip queue when session is full
  FEATURED_SESSION: 500, // Homepage placement for 24 hours
  SESSION_RECORDING: 1000, // Save and download session recording

  // Customization
  CUSTOM_THEME_BASIC: 200, // Basic color theme
  CUSTOM_THEME_PREMIUM: 500, // Advanced theme with animations
  CUSTOM_THEME_ELITE: 1000, // Full custom styling
  PROFILE_BADGE: 300, // Custom profile badge

  // Utility
  INVITE_CODE: 50, // Generate sharable invite code
  AI_ASSISTANT_BOOST: 200, // Extra AI queries per session
  ANALYTICS_UNLOCK: 500, // Detailed session analytics
} as const

// ============================================================================
// SYSTEM LIMITS
// ============================================================================

/**
 * Maximum credits that can be earned per session (anti-abuse)
 */
export const MAX_CREDITS_PER_SESSION = 10000

/**
 * Maximum watch duration that counts toward credits (4 hours)
 * Prevents people from leaving sessions open indefinitely
 */
export const MAX_WATCH_DURATION_SECONDS = 4 * 60 * 60

/**
 * Heartbeat interval in milliseconds (how often to update watch time)
 */
export const HEARTBEAT_INTERVAL_MS = 30 * 1000 // 30 seconds

/**
 * How long before considering a user inactive (no heartbeat)
 */
export const INACTIVITY_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

// ============================================================================
// CONVERSION RATES (for future token implementation)
// ============================================================================

/**
 * Credits to token conversion rate
 * 1000 credits = 1 token
 */
export const CREDITS_PER_TOKEN = 1000

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export const TRANSACTION_TYPES = {
  // Earning types
  EARNED_WATCHING: 'earned_watching',
  EARNED_HOSTING: 'earned_hosting',
  EARNED_CHATTING: 'earned_chatting',
  EARNED_HELPING: 'earned_helping',
  RECEIVED_TIP: 'received_tip',
  BONUS_MILESTONE: 'bonus_milestone',
  BONUS_COMPLETION: 'bonus_completion',
  BONUS_FIRST_SESSION: 'bonus_first_session',
  REFERRAL_BONUS: 'referral_bonus',

  // Spending types
  SPENT_FEATURE: 'spent_feature',
  SPENT_TIPPING: 'spent_tipping',
  SPENT_PRIORITY_JOIN: 'spent_priority_join',
  SPENT_RECORDING: 'spent_recording',

  // Admin
  ADMIN_ADJUSTMENT: 'admin_adjustment',
} as const

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate credits earned from watching based on duration and multipliers
 */
export function calculateWatchingCredits(params: {
  durationSeconds: number
  wasActivelyChatting: boolean
  helpedOthers: boolean
  isRepeatViewer: boolean
  isNewDiscovery: boolean
}): number {
  const { durationSeconds, wasActivelyChatting, helpedOthers, isRepeatViewer, isNewDiscovery } = params

  // Base credits (1 per minute)
  const durationMinutes = Math.min(durationSeconds, MAX_WATCH_DURATION_SECONDS) / 60
  let credits = durationMinutes * CREDITS_PER_MINUTE_WATCHING

  // Apply multipliers
  if (wasActivelyChatting) credits *= ACTIVE_CHAT_MULTIPLIER
  if (helpedOthers) credits *= HELPER_MULTIPLIER
  if (isRepeatViewer) credits *= REPEAT_VIEWER_MULTIPLIER
  if (isNewDiscovery) credits *= NEW_SESSION_DISCOVERY_MULTIPLIER

  return Math.floor(credits)
}

/**
 * Calculate credits earned from hosting based on session stats
 */
export function calculateHostingCredits(params: {
  durationSeconds: number
  avgConcurrentViewers: number
  totalChatMessages: number
  peopleHelped: number
  completedFullSession: boolean
}): number {
  const { durationSeconds, avgConcurrentViewers, totalChatMessages, peopleHelped, completedFullSession } = params

  // Base credits (5 per minute)
  const durationMinutes = durationSeconds / 60
  let credits = durationMinutes * CREDITS_PER_MINUTE_HOSTING

  // Add credits for viewers
  credits += avgConcurrentViewers * durationMinutes * CREDITS_PER_VIEWER_PER_MINUTE

  // Apply engagement multiplier if high chat activity
  const messagesPerMinute = totalChatMessages / durationMinutes
  if (messagesPerMinute >= HIGH_ENGAGEMENT_THRESHOLD) {
    credits *= HIGH_ENGAGEMENT_MULTIPLIER
  }

  // Apply completion bonus
  if (completedFullSession && durationSeconds >= MIN_SESSION_DURATION_FOR_BONUS) {
    credits *= FULL_SESSION_COMPLETION_MULTIPLIER
  }

  // Add helper bonus
  credits += peopleHelped * CREDITS_PER_PERSON_HELPED

  // Cap at maximum
  return Math.floor(Math.min(credits, MAX_CREDITS_PER_SESSION))
}

/**
 * Format credits with commas for display
 */
export function formatCredits(credits: number): string {
  return credits.toLocaleString()
}

/**
 * Convert credits to estimated tokens (for future use)
 */
export function creditsToTokens(credits: number): number {
  return credits / CREDITS_PER_TOKEN
}
