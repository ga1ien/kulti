/**
 * Sentry Error Tracking and Performance Monitoring
 *
 * This module initializes and configures Sentry for production error tracking,
 * performance monitoring, and user context tracking.
 */

import * as Sentry from "@sentry/nextjs"

interface SentryUser {
  id: string
  email?: string
  username?: string
}

/**
 * Initialize Sentry with production-ready configuration
 */
export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Filter sensitive data before sending
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers.authorization
          delete event.request.headers.cookie
        }

        // Remove sensitive query params
        if (event.request?.query_string) {
          const params = new URLSearchParams(event.request.query_string)
          params.delete("token")
          params.delete("api_key")
          event.request.query_string = params.toString()
        }

        // Filter out known non-critical errors
        const error = hint.originalException
        if (error instanceof Error) {
          // Ignore network errors that are expected
          if (error.message.includes("NetworkError") ||
              error.message.includes("Failed to fetch")) {
            return null
          }
        }

        return event
      },

      // Add additional context
      integrations: typeof window !== 'undefined' ? [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ] : [],

      // Configure tracing
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/kulti\.app/,
        /^https:\/\/.*\.vercel\.app/,
      ],

      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        "top.GLOBALS",
        "Can't find variable: gtag",
        // Random plugins/extensions
        "fb_xd_fragment",
        "bmi_SafeAddOnload",
        "Non-Error promise rejection captured",
      ],
    })
  }
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: SentryUser | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level)
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({
    name,
    op,
  }, (span) => span)
}

/**
 * Track HMS-specific events
 */
export function trackHMSEvent(event: string, data?: Record<string, any>) {
  addBreadcrumb(`HMS: ${event}`, data)

  // Track critical HMS failures
  if (event.includes("failed") || event.includes("error")) {
    captureMessage(`HMS Event: ${event}`, "warning")
  }
}

/**
 * Track Supabase-specific events
 */
export function trackSupabaseEvent(event: string, data?: Record<string, any>) {
  addBreadcrumb(`Supabase: ${event}`, data)

  // Track critical Supabase failures
  if (event.includes("failed") || event.includes("error")) {
    captureMessage(`Supabase Event: ${event}`, "warning")
  }
}

/**
 * Track credit transaction events
 */
export function trackCreditEvent(event: string, userId: string, amount: number, reason: string) {
  addBreadcrumb(`Credits: ${event}`, {
    userId,
    amount,
    reason,
  })
}

/**
 * Track session events
 */
export function trackSessionEvent(event: string, sessionId: string, data?: Record<string, any>) {
  addBreadcrumb(`Session: ${event}`, {
    sessionId,
    ...data,
  })

  // Track session failures
  if (event.includes("failed") || event.includes("error")) {
    captureMessage(`Session Event: ${event}`, "error")
  }
}
