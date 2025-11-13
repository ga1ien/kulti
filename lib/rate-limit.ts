/**
 * Rate Limiting Utility
 *
 * Provides configurable rate limiting for API endpoints using Upstash Redis.
 * Falls back to in-memory storage for development environments.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// In-memory store for development (when Redis is not configured)
class InMemoryStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map()

  async get(key: string): Promise<{ count: number; resetAt: number } | null> {
    const data = this.store.get(key)
    if (!data) return null
    if (Date.now() > data.resetAt) {
      this.store.delete(key)
      return null
    }
    return data
  }

  async set(key: string, count: number, windowMs: number): Promise<void> {
    this.store.set(key, { count, resetAt: Date.now() + windowMs })
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const data = await this.get(key)
    if (!data) {
      await this.set(key, 1, windowMs)
      return 1
    }
    const newCount = data.count + 1
    await this.set(key, newCount, windowMs)
    return newCount
  }

  // Cleanup old entries every 5 minutes
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, data] of this.store.entries()) {
        if (now > data.resetAt) {
          this.store.delete(key)
        }
      }
    }, 5 * 60 * 1000)
  }
}

// Initialize in-memory store for development
const inMemoryStore = new InMemoryStore()
if (process.env.NODE_ENV === 'development') {
  inMemoryStore.startCleanup()
}

// Initialize Redis client (only if credentials are provided)
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number

  /**
   * Time window in milliseconds
   */
  window: number

  /**
   * Custom identifier for the rate limit key (defaults to IP address)
   */
  identifier?: string

  /**
   * Prefix for the rate limit key
   */
  prefix: string
}

/**
 * Rate Limit Result
 */
interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Create a rate limiter with the specified configuration
 */
export function createRateLimiter(config: Omit<RateLimitConfig, 'identifier'>) {
  if (redis) {
    // Use Upstash rate limiter in production
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.window}ms`),
      analytics: true,
      prefix: config.prefix,
    })
  }

  // In-memory fallback for development
  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const key = `${config.prefix}:${identifier}`
      const count = await inMemoryStore.increment(key, config.window)
      const remaining = Math.max(0, config.limit - count)
      const resetAt = Date.now() + config.window

      return {
        success: count <= config.limit,
        limit: config.limit,
        remaining,
        reset: resetAt,
        retryAfter: count > config.limit ? Math.ceil(config.window / 1000) : undefined,
      }
    },
  }
}

/**
 * Get identifier from request (IP address or custom identifier)
 */
export function getIdentifier(request: NextRequest, customIdentifier?: string): string {
  if (customIdentifier) {
    return customIdentifier
  }

  // Try to get IP from various headers (Vercel, CloudFlare, etc.)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'

  return ip
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const identifier = getIdentifier(request, config.identifier)
    const limiter = createRateLimiter({
      limit: config.limit,
      window: config.window,
      prefix: config.prefix,
    })

    const result = await limiter.limit(identifier)

    // Add rate limit headers
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', result.limit.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString())

    if (!result.success) {
      const retryAfter = 'retryAfter' in result ? result.retryAfter : Math.ceil((result.reset - Date.now()) / 1000)
      headers.set('Retry-After', retryAfter?.toString() || '60')
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            limit: result.limit,
            retryAfter,
            resetAt: new Date(result.reset).toISOString(),
          },
          { status: 429, headers }
        ),
      }
    }

    return { allowed: true }
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    console.error('Rate limiting error:', error)
    return { allowed: true }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  /**
   * Phone OTP sending - 3 requests per 5 minutes per phone number
   */
  phoneOTP: (phoneNumber: string) => ({
    limit: 3,
    window: 5 * 60 * 1000, // 5 minutes
    identifier: phoneNumber,
    prefix: 'otp:phone',
  }),

  /**
   * Invite code validation - 10 requests per minute per IP
   */
  inviteValidation: () => ({
    limit: 10,
    window: 60 * 1000, // 1 minute
    prefix: 'invite:validate',
  }),

  /**
   * Session creation - 5 sessions per hour per user
   */
  sessionCreation: (userId: string) => ({
    limit: 5,
    window: 60 * 60 * 1000, // 1 hour
    identifier: userId,
    prefix: 'session:create',
  }),

  /**
   * Credits tipping - 10 tips per hour per user
   */
  creditsTipping: (userId: string) => ({
    limit: 10,
    window: 60 * 60 * 1000, // 1 hour
    identifier: userId,
    prefix: 'credits:tip',
  }),

  /**
   * Authentication attempts - 10 requests per 5 minutes per IP
   */
  authAttempts: () => ({
    limit: 10,
    window: 5 * 60 * 1000, // 5 minutes
    prefix: 'auth:attempt',
  }),

  /**
   * AI chat messages - 30 requests per minute per user
   */
  aiChat: (userId: string) => ({
    limit: 30,
    window: 60 * 1000, // 1 minute
    identifier: userId,
    prefix: 'ai:chat',
  }),

  /**
   * Matchmaking requests - 20 requests per hour per user
   */
  matchmaking: (userId: string) => ({
    limit: 20,
    window: 60 * 60 * 1000, // 1 hour
    identifier: userId,
    prefix: 'matchmaking:request',
  }),

  /**
   * Profile updates - 5 requests per 10 minutes per user
   */
  profileUpdate: (userId: string) => ({
    limit: 5,
    window: 10 * 60 * 1000, // 10 minutes
    identifier: userId,
    prefix: 'profile:update',
  }),
}

/**
 * Middleware helper for applying rate limits
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const { allowed, response } = await applyRateLimit(request, config)

  if (!allowed && response) {
    return response
  }

  return handler()
}
