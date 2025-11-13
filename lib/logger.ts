/**
 * Structured logging utility for Kulti with Sentry integration
 *
 * This logger provides consistent logging across the application:
 * - error: Always logs and sends to Sentry
 * - warn: Always logs and sends to Sentry
 * - info: Only logs in development
 * - debug: Only logs in development
 */

import { captureException, captureMessage, addBreadcrumb } from "./monitoring/sentry"

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogMeta {
  [key: string]: any
}

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Format log message with metadata
 */
function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString()
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
}

export const logger = {
  /**
   * Log error messages - always logged in production and development
   * Use for errors that should be tracked and monitored
   * Automatically sends to Sentry in production
   */
  error: (message: string, meta?: LogMeta) => {
    console.error(formatMessage('error', message, meta))

    // Send to Sentry if configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      if (meta?.error instanceof Error) {
        captureException(meta.error, { ...meta, message })
      } else {
        captureMessage(message, "error")
      }
    }
  },

  /**
   * Log warning messages - always logged in production and development
   * Use for potential issues that don't prevent functionality
   * Sends to Sentry as breadcrumb
   */
  warn: (message: string, meta?: LogMeta) => {
    console.warn(formatMessage('warn', message, meta))

    // Add breadcrumb to Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      addBreadcrumb(`WARNING: ${message}`, meta)
      captureMessage(message, "warning")
    }
  },

  /**
   * Log info messages - only in development
   * Use for important events that help track application flow
   * Adds breadcrumb to Sentry for context
   */
  info: (message: string, meta?: LogMeta) => {
    if (isDevelopment) {
      console.log(formatMessage('info', message, meta))
    }

    // Add breadcrumb to Sentry even in production for context
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      addBreadcrumb(`INFO: ${message}`, meta)
    }
  },

  /**
   * Log debug messages - only in development
   * Use for detailed debugging information during development
   */
  debug: (message: string, meta?: LogMeta) => {
    if (isDevelopment) {
      console.log(formatMessage('debug', message, meta))
    }
  },
}
