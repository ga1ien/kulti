/**
 * Send Phone OTP API
 *
 * Send verification code via SMS
 * Rate limited to prevent SMS spam
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

/**
 * Format phone number to E.164 format (e.g., +12345678900)
 */
function formatPhoneNumber(phone: string): string {
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
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number
    const validation = validatePhoneNumber(phone)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const formatted = formatPhoneNumber(phone)

    // Apply rate limiting per phone number
    return withRateLimit(request, RateLimiters.phoneOTP(formatted), async () => {
      try {
        const supabase = await createClient()

        const { data, error } = await supabase.auth.signInWithOtp({
          phone: formatted,
          options: {
            channel: 'sms',
          },
        })

        if (error) {
          console.error('Send OTP error:', error)
          return NextResponse.json(
            { error: error.message || 'Failed to send verification code' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Verification code sent',
        })
      } catch (error) {
        console.error('Send OTP error:', error)
        return NextResponse.json(
          { error: 'Failed to send verification code' },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error('Send OTP request error:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
