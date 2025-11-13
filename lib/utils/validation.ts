/**
 * Validation Utilities
 *
 * Shared validation helpers for forms and user input.
 */

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate username format
 * - 3-20 characters
 * - Alphanumeric, underscores, and hyphens only
 * - Must start with letter or number
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$/
  return usernameRegex.test(username)
}

/**
 * Validate display name
 * - 2-50 characters
 * - Can contain letters, numbers, spaces, and basic punctuation
 */
export function isValidDisplayName(name: string): boolean {
  return name.length >= 2 && name.length <= 50
}

/**
 * Validate phone number (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  // Should have 10-15 digits (covers most international formats)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15
}

/**
 * Validate invite code format
 * - Format: WORD-XXXX (e.g., VIBE-A1B2)
 */
export function isValidInviteCode(code: string): boolean {
  const codeRegex = /^[A-Z]{4}-[A-Z0-9]{4}$/
  return codeRegex.test(code.toUpperCase())
}

/**
 * Validate room code format
 * - Same as invite code format
 */
export function isValidRoomCode(code: string): boolean {
  return isValidInviteCode(code)
}

/**
 * Validate credit amount
 * - Must be positive integer
 * - Within reasonable bounds
 */
export function isValidCreditAmount(amount: number, max: number = 1000000): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= max
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate session title
 * - 3-100 characters
 * - Not empty or just whitespace
 */
export function isValidSessionTitle(title: string): boolean {
  const trimmed = title.trim()
  return trimmed.length >= 3 && trimmed.length <= 100
}

/**
 * Validate session description
 * - 0-500 characters
 */
export function isValidSessionDescription(description: string): boolean {
  return description.length <= 500
}

/**
 * Sanitize user input (remove dangerous characters)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate that a string is not empty or just whitespace
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0
}

/**
 * Validate minimum length
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength
}

/**
 * Validate maximum length
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength
}

/**
 * Get validation error message for username
 */
export function getUsernameError(username: string): string | null {
  if (!username) return 'Username is required'
  if (username.length < 3) return 'Username must be at least 3 characters'
  if (username.length > 20) return 'Username must be less than 20 characters'
  if (!isValidUsername(username)) return 'Username can only contain letters, numbers, underscores, and hyphens'
  return null
}

/**
 * Get validation error message for email
 */
export function getEmailError(email: string): string | null {
  if (!email) return 'Email is required'
  if (!isValidEmail(email)) return 'Please enter a valid email address'
  return null
}

/**
 * Get validation error message for display name
 */
export function getDisplayNameError(name: string): string | null {
  if (!name) return 'Display name is required'
  if (name.length < 2) return 'Display name must be at least 2 characters'
  if (name.length > 50) return 'Display name must be less than 50 characters'
  return null
}
