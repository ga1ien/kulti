/**
 * Environment Variable Validation
 *
 * Validates that all required environment variables are set before the app starts.
 * This prevents runtime errors due to missing configuration.
 */

import { logger } from "../logger"

interface EnvConfig {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string

  // 100ms HMS
  NEXT_PUBLIC_HMS_APP_ID: string
  HMS_APP_ACCESS_KEY: string
  HMS_APP_SECRET: string
  HMS_TEMPLATE_ID: string

  // Anthropic AI
  ANTHROPIC_API_KEY: string

  // App
  NEXT_PUBLIC_APP_URL: string
  NODE_ENV: string

  // Optional: Upstash Redis (rate limiting)
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string

  // Optional: Sentry (error tracking)
  NEXT_PUBLIC_SENTRY_DSN?: string

  // Optional: Supabase Access Token (for admin operations)
  SUPABASE_ACCESS_TOKEN?: string
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_HMS_APP_ID',
  'HMS_APP_ACCESS_KEY',
  'HMS_APP_SECRET',
  'HMS_TEMPLATE_ID',
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
]

const optionalEnvVars: (keyof EnvConfig)[] = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SUPABASE_ACCESS_TOKEN',
]

/**
 * Validate that all required environment variables are set
 * @throws Error if any required variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Check optional variables and warn
  for (const key of optionalEnvVars) {
    if (!process.env[key]) {
      warnings.push(key)
    }
  }

  // Log warnings for optional variables
  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    logger.warn('Optional environment variables not set', {
      variables: warnings,
      impact: 'Some features may be disabled',
    })
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`
    logger.error('Environment validation failed', { missing })
    throw new Error(errorMessage)
  }

  // Validate URL formats
  validateUrlFormats()

  // Validate production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    validateProductionRequirements()
  }

  logger.info('Environment validation passed', {
    required: requiredEnvVars.length,
    optional: optionalEnvVars.length - warnings.length,
    missing_optional: warnings.length,
  })
}

/**
 * Validate URL format for environment variables
 */
function validateUrlFormats(): void {
  const urlVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'UPSTASH_REDIS_REST_URL',
  ]

  for (const key of urlVars) {
    const value = process.env[key]
    if (value) {
      try {
        new URL(value)
      } catch (error) {
        throw new Error(`Invalid URL format for ${key}: ${value}`)
      }
    }
  }
}

/**
 * Validate production-specific requirements
 */
function validateProductionRequirements(): void {
  // Ensure HTTPS in production
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl && !appUrl.startsWith('https://')) {
    logger.warn('App URL should use HTTPS in production', { appUrl })
  }

  // Warn if Sentry is not configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    logger.warn('Sentry DSN not configured - error tracking disabled')
  }

  // Warn if Redis is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    logger.warn('Upstash Redis not configured - using in-memory rate limiting')
  }
}

/**
 * Get typed environment config
 * Use this instead of process.env for type safety
 */
export function getEnvConfig(): EnvConfig {
  validateEnv()

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_HMS_APP_ID: process.env.NEXT_PUBLIC_HMS_APP_ID!,
    HMS_APP_ACCESS_KEY: process.env.HMS_APP_ACCESS_KEY!,
    HMS_APP_SECRET: process.env.HMS_APP_SECRET!,
    HMS_TEMPLATE_ID: process.env.HMS_TEMPLATE_ID!,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    NODE_ENV: process.env.NODE_ENV!,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
  }
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: 'sentry' | 'redis' | 'ai'): boolean {
  switch (feature) {
    case 'sentry':
      return !!process.env.NEXT_PUBLIC_SENTRY_DSN
    case 'redis':
      return !!process.env.UPSTASH_REDIS_REST_URL
    case 'ai':
      return !!process.env.ANTHROPIC_API_KEY
    default:
      return false
  }
}
