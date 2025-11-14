import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

/**
 * Result returned from phone authentication operations
 */
export interface PhoneAuthResult {
  success: boolean
  error?: string
  data?: {
    user?: User | null
    session?: Session | null
  }
}

/**
 * Format phone number to E.164 format (e.g., +12345678900)
 * Already formatted by PhoneInput component, but this validates it
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except the leading +
  const cleaned = phone.replace(/[^\d+]/g, '')

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    throw new Error('Phone number must start with country code (e.g., +1)')
  }

  return cleaned
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  try {
    const formatted = formatPhoneNumber(phone)

    // Basic validation: should be + followed by 7-15 digits
    const phoneRegex = /^\+\d{7,15}$/
    if (!phoneRegex.test(formatted)) {
      return {
        valid: false,
        error: 'Please enter a valid phone number with country code',
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid phone number',
    }
  }
}

/**
 * Send OTP to phone number
 */
export async function sendPhoneOTP(phone: string): Promise<PhoneAuthResult> {
  try {
    const validation = validatePhoneNumber(phone)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const formatted = formatPhoneNumber(phone)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formatted,
      options: {
        channel: 'sms',
      },
    })

    if (error) {
      logger.error('Send OTP error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send verification code',
      }
    }

    return { success: true, data }
  } catch (error) {
    logger.error('Send OTP error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send verification code',
    }
  }
}

/**
 * Verify OTP code
 */
export async function verifyPhoneOTP(
  phone: string,
  token: string
): Promise<PhoneAuthResult> {
  try {
    const formatted = formatPhoneNumber(phone)
    const supabase = createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token,
      type: 'sms',
    })

    if (error) {
      logger.error('Verify OTP error:', error)
      return {
        success: false,
        error: error.message || 'Invalid or expired verification code',
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Verification failed. Please try again.',
      }
    }

    return { success: true, data }
  } catch (error) {
    logger.error('Verify OTP error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify code',
    }
  }
}

/**
 * Complete phone signup by creating profile
 * This is called after OTP verification
 */
export async function completePhoneSignup(params: {
  userId: string
  phone: string
  inviteCode: string
  username: string
  displayName: string
  email: string
  password: string
}): Promise<PhoneAuthResult> {
  try {
    // Call server-side API to handle everything
    const response = await fetch('/api/auth/complete-phone-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: params.userId,
        email: params.email,
        password: params.password,
        username: params.username,
        displayName: params.displayName,
        inviteCode: params.inviteCode,
        phone: params.phone,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to complete signup',
      }
    }

    // Refresh session on client to sync with server-side updates
    const supabase = createClient()
    const { error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError) {
      logger.error('Client session refresh error:', refreshError)
      return {
        success: false,
        error: 'Account created but session refresh failed. Please try logging in.',
      }
    }

    return { success: true }
  } catch (error) {
    logger.error('Complete signup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete signup',
    }
  }
}

/**
 * Check if phone number is already registered
 */
export async function checkPhoneExists(phone: string): Promise<boolean> {
  try {
    const formatted = formatPhoneNumber(phone)
    const supabase = createClient()

    // Try to sign in - if account exists, it will send OTP
    // If account doesn't exist, Supabase will still return success
    // (it creates a new user on OTP verification)
    // So we can't actually check this directly with phone auth

    // Instead, we'll let the flow handle it naturally:
    // - If phone exists, verifying OTP logs them in
    // - If phone doesn't exist, verifying OTP creates new user

    return false // For now, assume we always allow the flow
  } catch (error) {
    return false
  }
}
