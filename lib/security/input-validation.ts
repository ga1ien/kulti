/**
 * Input Validation and Sanitization
 *
 * Provides utilities for validating and sanitizing user inputs to prevent
 * XSS, SQL injection, and other security vulnerabilities.
 */

import { z } from "zod"

/**
 * Sanitize HTML to prevent XSS attacks
 * Strips all HTML tags and returns plain text
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/**
 * Sanitize user input for display
 * Escapes HTML special characters
 */
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char])
}

/**
 * Validate and sanitize session title
 */
export const sessionTitleSchema = z
  .string()
  .min(1, "Title is required")
  .max(100, "Title must be 100 characters or less")
  .transform(sanitizeHtml)

/**
 * Validate and sanitize username
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be 30 characters or less")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
  .transform(sanitizeHtml)

/**
 * Validate and sanitize display name
 */
export const displayNameSchema = z
  .string()
  .min(1, "Display name is required")
  .max(50, "Display name must be 50 characters or less")
  .transform(sanitizeHtml)

/**
 * Validate phone number (US format)
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^\+1[0-9]{10}$/, "Invalid US phone number format. Expected: +1XXXXXXXXXX")

/**
 * Validate email address
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email must be 255 characters or less")
  .toLowerCase()

/**
 * Validate UUID
 */
export const uuidSchema = z
  .string()
  .uuid("Invalid UUID format")

/**
 * Validate chat message
 */
export const chatMessageSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(2000, "Message must be 2000 characters or less")
  .transform(sanitizeHtml)

/**
 * Validate bio/description
 */
export const bioSchema = z
  .string()
  .max(500, "Bio must be 500 characters or less")
  .transform(sanitizeHtml)

/**
 * Validate positive integer
 */
export const positiveIntSchema = z
  .number()
  .int("Must be an integer")
  .positive("Must be positive")

/**
 * Validate credit amount
 */
export const creditAmountSchema = z
  .number()
  .int("Credit amount must be a whole number")
  .min(1, "Credit amount must be at least 1")
  .max(10000, "Credit amount cannot exceed 10,000")

/**
 * Validate pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

/**
 * Validate date range
 */
export const dateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
}).refine(
  (data) => new Date(data.from) < new Date(data.to),
  "Start date must be before end date"
)

/**
 * Validate URL
 */
export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .refine(
    (url) => url.startsWith('https://') || url.startsWith('http://localhost'),
    "URL must use HTTPS (or http://localhost for development)"
  )

/**
 * Validate HMS room ID
 */
export const hmsRoomIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/, "Invalid HMS room ID format")

/**
 * Validate session creation input
 */
export const createSessionSchema = z.object({
  title: sessionTitleSchema,
  description: bioSchema.optional(),
  maxParticipants: z.number().int().min(2).max(50).default(10),
  isPrivate: z.boolean().default(false),
  recordingEnabled: z.boolean().default(false),
})

/**
 * Validate user profile update
 */
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: displayNameSchema.optional(),
  bio: bioSchema.optional(),
  avatarUrl: urlSchema.optional(),
})

/**
 * Validate credit tip
 */
export const creditTipSchema = z.object({
  recipientId: uuidSchema,
  amount: creditAmountSchema,
  message: chatMessageSchema.optional(),
})

/**
 * Validate webhook payload
 */
export const webhookPayloadSchema = z.object({
  type: z.string(),
  data: z.record(z.string(), z.any()),
  timestamp: z.string().optional(),
})

/**
 * Sanitize object keys (prevent prototype pollution)
 */
export function sanitizeObjectKeys<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {}

  for (const key in obj) {
    // Skip dangerous keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue
    }

    sanitized[key] = obj[key]
  }

  return sanitized
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJson(input: string): any {
  try {
    const parsed = JSON.parse(input)
    return sanitizeObjectKeys(parsed)
  } catch (error) {
    throw new Error('Invalid JSON input')
  }
}

/**
 * Rate limit key generation
 * Creates safe keys for rate limiting
 */
export function createRateLimitKey(prefix: string, identifier: string): string {
  // Sanitize identifier to prevent key injection
  const sanitizedId = identifier.replace(/[^a-zA-Z0-9-_]/g, '')
  return `${prefix}:${sanitizedId}`
}

/**
 * Validate file upload
 */
export const fileUploadSchema = z.object({
  name: z.string().max(255),
  size: z.number().max(10 * 1024 * 1024, "File size must be less than 10MB"),
  type: z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
  ]),
})

/**
 * SQL injection prevention
 * Use this with raw SQL queries (though prefer Supabase query builder)
 */
export function escapeSql(input: string): string {
  return input.replace(/['";\\]/g, '\\$&')
}

/**
 * Validate invite code format
 */
export const inviteCodeSchema = z
  .string()
  .length(8, "Invite code must be 8 characters")
  .regex(/^[A-Z0-9]{8}$/, "Invalid invite code format")
