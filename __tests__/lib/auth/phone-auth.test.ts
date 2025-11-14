/**
 * Tests for phone authentication
 */

import {
  formatPhoneNumber,
  validatePhoneNumber,
  sendPhoneOTP,
  verifyPhoneOTP,
  completePhoneSignup,
  checkPhoneExists,
} from '@/lib/auth/phone-auth'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      refreshSession: jest.fn(),
    },
  })),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// Mock fetch for completePhoneSignup
global.fetch = jest.fn()

describe('Phone Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('formatPhoneNumber', () => {
    it('should format valid phone number', () => {
      expect(formatPhoneNumber('+12345678900')).toBe('+12345678900')
      expect(formatPhoneNumber('+1 (234) 567-8900')).toBe('+12345678900')
      expect(formatPhoneNumber('+44 20 1234 5678')).toBe('+442012345678')
    })

    it('should preserve leading plus sign', () => {
      const result = formatPhoneNumber('+12345678900')
      expect(result.startsWith('+')).toBe(true)
    })

    it('should remove non-digit characters except plus', () => {
      expect(formatPhoneNumber('+1 (234) 567-8900')).toBe('+12345678900')
      expect(formatPhoneNumber('+1-234-567-8900')).toBe('+12345678900')
      expect(formatPhoneNumber('+1.234.567.8900')).toBe('+12345678900')
    })

    it('should throw error if no country code', () => {
      expect(() => formatPhoneNumber('2345678900')).toThrow(
        'Phone number must start with country code'
      )
    })

    it('should throw error if missing plus sign', () => {
      expect(() => formatPhoneNumber('12345678900')).toThrow(
        'Phone number must start with country code'
      )
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('+12345678900').valid).toBe(true)
      expect(validatePhoneNumber('+442012345678').valid).toBe(true)
      expect(validatePhoneNumber('+861234567890').valid).toBe(true)
    })

    it('should reject phone numbers without country code', () => {
      const result = validatePhoneNumber('2345678900')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject phone numbers that are too short', () => {
      const result = validatePhoneNumber('+123456')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('valid phone number')
    })

    it('should reject phone numbers that are too long', () => {
      const result = validatePhoneNumber('+1234567890123456')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('valid phone number')
    })

    it('should remove letters from phone numbers during formatting', () => {
      // The formatPhoneNumber function removes non-digit characters (except +)
      // So letters are stripped out and validation passes if the result is valid
      const result = validatePhoneNumber('+12345678900ABC')
      // After removing ABC, we get +12345678900 which is valid
      expect(result.valid).toBe(true)
    })

    it('should handle formatting errors', () => {
      const result = validatePhoneNumber('invalid')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('sendPhoneOTP', () => {
    it('should send OTP successfully', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockSignInWithOtp = jest.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      })

      createClient.mockReturnValue({
        auth: {
          signInWithOtp: mockSignInWithOtp,
        },
      })

      const result = await sendPhoneOTP('+12345678900')

      expect(result.success).toBe(true)
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+12345678900',
        options: {
          channel: 'sms',
        },
      })
    })

    it('should validate phone number before sending', async () => {
      const result = await sendPhoneOTP('invalid')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle Supabase errors', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockSignInWithOtp = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      })

      createClient.mockReturnValue({
        auth: {
          signInWithOtp: mockSignInWithOtp,
        },
      })

      const result = await sendPhoneOTP('+12345678900')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
    })

    it('should handle network errors', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockSignInWithOtp = jest.fn().mockRejectedValue(new Error('Network error'))

      createClient.mockReturnValue({
        auth: {
          signInWithOtp: mockSignInWithOtp,
        },
      })

      const result = await sendPhoneOTP('+12345678900')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should format phone number before sending', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockSignInWithOtp = jest.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      })

      createClient.mockReturnValue({
        auth: {
          signInWithOtp: mockSignInWithOtp,
        },
      })

      await sendPhoneOTP('+1 (234) 567-8900')

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+12345678900',
        options: {
          channel: 'sms',
        },
      })
    })
  })

  describe('verifyPhoneOTP', () => {
    it('should verify OTP successfully', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockVerifyOtp = jest.fn().mockResolvedValue({
        data: {
          user: { id: 'user-123', phone: '+12345678900' },
          session: { access_token: 'token-123' },
        },
        error: null,
      })

      createClient.mockReturnValue({
        auth: {
          verifyOtp: mockVerifyOtp,
        },
      })

      const result = await verifyPhoneOTP('+12345678900', '123456')

      expect(result.success).toBe(true)
      expect(result.data?.user).toBeDefined()
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        phone: '+12345678900',
        token: '123456',
        type: 'sms',
      })
    })

    it('should handle invalid OTP', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockVerifyOtp = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid OTP' },
      })

      createClient.mockReturnValue({
        auth: {
          verifyOtp: mockVerifyOtp,
        },
      })

      const result = await verifyPhoneOTP('+12345678900', '000000')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid OTP')
    })

    it('should handle expired OTP', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockVerifyOtp = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Token expired' },
      })

      createClient.mockReturnValue({
        auth: {
          verifyOtp: mockVerifyOtp,
        },
      })

      const result = await verifyPhoneOTP('+12345678900', '123456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token expired')
    })

    it('should handle missing user in response', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockVerifyOtp = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      createClient.mockReturnValue({
        auth: {
          verifyOtp: mockVerifyOtp,
        },
      })

      const result = await verifyPhoneOTP('+12345678900', '123456')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Verification failed')
    })

    it('should format phone number before verifying', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockVerifyOtp = jest.fn().mockResolvedValue({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token-123' },
        },
        error: null,
      })

      createClient.mockReturnValue({
        auth: {
          verifyOtp: mockVerifyOtp,
        },
      })

      await verifyPhoneOTP('+1 (234) 567-8900', '123456')

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        phone: '+12345678900',
        token: '123456',
        type: 'sms',
      })
    })

    it('should handle network errors', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockVerifyOtp = jest.fn().mockRejectedValue(new Error('Network timeout'))

      createClient.mockReturnValue({
        auth: {
          verifyOtp: mockVerifyOtp,
        },
      })

      const result = await verifyPhoneOTP('+12345678900', '123456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })
  })

  describe('completePhoneSignup', () => {
    it('should complete signup successfully', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockRefreshSession = jest.fn().mockResolvedValue({
        error: null,
      })

      createClient.mockReturnValue({
        auth: {
          refreshSession: mockRefreshSession,
        },
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      const params = {
        userId: 'user-123',
        phone: '+12345678900',
        inviteCode: 'ABC123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
      }

      const result = await completePhoneSignup(params)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/complete-phone-signup',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
      expect(mockRefreshSession).toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Username already taken' }),
      })

      const params = {
        userId: 'user-123',
        phone: '+12345678900',
        inviteCode: 'ABC123',
        username: 'taken',
        displayName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
      }

      const result = await completePhoneSignup(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username already taken')
    })

    it('should handle session refresh errors', async () => {
      const { createClient } = require('@/lib/supabase/client')
      const mockRefreshSession = jest.fn().mockResolvedValue({
        error: { message: 'Session refresh failed' },
      })

      createClient.mockReturnValue({
        auth: {
          refreshSession: mockRefreshSession,
        },
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      const params = {
        userId: 'user-123',
        phone: '+12345678900',
        inviteCode: 'ABC123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
      }

      const result = await completePhoneSignup(params)

      expect(result.success).toBe(false)
      expect(result.error).toContain('session refresh failed')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const params = {
        userId: 'user-123',
        phone: '+12345678900',
        inviteCode: 'ABC123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
      }

      const result = await completePhoneSignup(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should send all required parameters to API', async () => {
      const { createClient } = require('@/lib/supabase/client')
      createClient.mockReturnValue({
        auth: {
          refreshSession: jest.fn().mockResolvedValue({ error: null }),
        },
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      const params = {
        userId: 'user-123',
        phone: '+12345678900',
        inviteCode: 'ABC123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
      }

      await completePhoneSignup(params)

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body).toMatchObject({
        userId: 'user-123',
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser',
        displayName: 'Test User',
        inviteCode: 'ABC123',
        phone: '+12345678900',
      })
    })
  })

  describe('checkPhoneExists', () => {
    it('should always return false', async () => {
      const result = await checkPhoneExists('+12345678900')
      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const result = await checkPhoneExists('invalid')
      expect(result).toBe(false)
    })
  })
})
