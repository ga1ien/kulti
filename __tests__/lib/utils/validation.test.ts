/**
 * Tests for validation utilities
 */

import {
  isValidEmail,
  isValidUsername,
  isValidDisplayName,
  isValidPhone,
  isValidInviteCode,
  isValidCreditAmount,
  isValidUrl,
  isValidSessionTitle,
  isNotEmpty,
  hasMinLength,
  hasMaxLength,
  getUsernameError,
  getEmailError,
  getDisplayNameError,
} from '@/lib/utils/validation'

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@@example.com')).toBe(false)
    })
  })

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(isValidUsername('user123')).toBe(true)
      expect(isValidUsername('test_user')).toBe(true)
      expect(isValidUsername('user-name')).toBe(true)
    })

    it('should reject invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false) // Too short
      expect(isValidUsername('a'.repeat(21))).toBe(false) // Too long
      expect(isValidUsername('_user')).toBe(false) // Starts with underscore
      expect(isValidUsername('user name')).toBe(false) // Contains space
      expect(isValidUsername('user@name')).toBe(false) // Invalid character
    })
  })

  describe('isValidDisplayName', () => {
    it('should validate correct display names', () => {
      expect(isValidDisplayName('John Doe')).toBe(true)
      expect(isValidDisplayName('Test User 123')).toBe(true)
    })

    it('should reject invalid display names', () => {
      expect(isValidDisplayName('J')).toBe(false) // Too short
      expect(isValidDisplayName('a'.repeat(51))).toBe(false) // Too long
    })
  })

  describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
      expect(isValidPhone('1234567890')).toBe(true)
      expect(isValidPhone('+1 (555) 123-4567')).toBe(true)
      expect(isValidPhone('555-123-4567')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false) // Too short
      expect(isValidPhone('abc')).toBe(false) // No digits
    })
  })

  describe('isValidInviteCode', () => {
    it('should validate correct invite codes', () => {
      expect(isValidInviteCode('VIBE-A1B2')).toBe(true)
      expect(isValidInviteCode('CODE-1234')).toBe(true)
    })

    it('should reject invalid invite codes', () => {
      expect(isValidInviteCode('INVALID')).toBe(false)
      expect(isValidInviteCode('vibe-a1b2')).toBe(false) // Lowercase
      expect(isValidInviteCode('VIBE-ABCD')).toBe(true) // This is actually valid
    })
  })

  describe('isValidCreditAmount', () => {
    it('should validate correct credit amounts', () => {
      expect(isValidCreditAmount(100)).toBe(true)
      expect(isValidCreditAmount(1)).toBe(true)
    })

    it('should reject invalid credit amounts', () => {
      expect(isValidCreditAmount(0)).toBe(false) // Not positive
      expect(isValidCreditAmount(-10)).toBe(false) // Negative
      expect(isValidCreditAmount(10.5)).toBe(false) // Not integer
      expect(isValidCreditAmount(2000000)).toBe(false) // Exceeds default max
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false) // Missing protocol
    })
  })

  describe('isValidSessionTitle', () => {
    it('should validate correct session titles', () => {
      expect(isValidSessionTitle('Great Session')).toBe(true)
      expect(isValidSessionTitle('A'.repeat(50))).toBe(true)
    })

    it('should reject invalid session titles', () => {
      expect(isValidSessionTitle('AB')).toBe(false) // Too short
      expect(isValidSessionTitle('A'.repeat(101))).toBe(false) // Too long
      expect(isValidSessionTitle('   ')).toBe(false) // Just whitespace
    })
  })

  describe('isNotEmpty', () => {
    it('should validate non-empty strings', () => {
      expect(isNotEmpty('test')).toBe(true)
      expect(isNotEmpty(' test ')).toBe(true)
    })

    it('should reject empty strings', () => {
      expect(isNotEmpty('')).toBe(false)
      expect(isNotEmpty('   ')).toBe(false)
    })
  })

  describe('hasMinLength', () => {
    it('should validate minimum length', () => {
      expect(hasMinLength('test', 3)).toBe(true)
      expect(hasMinLength('test', 4)).toBe(true)
    })

    it('should reject strings below minimum', () => {
      expect(hasMinLength('ab', 3)).toBe(false)
    })
  })

  describe('hasMaxLength', () => {
    it('should validate maximum length', () => {
      expect(hasMaxLength('test', 5)).toBe(true)
      expect(hasMaxLength('test', 4)).toBe(true)
    })

    it('should reject strings above maximum', () => {
      expect(hasMaxLength('toolong', 5)).toBe(false)
    })
  })

  describe('getUsernameError', () => {
    it('should return null for valid usernames', () => {
      expect(getUsernameError('validuser')).toBeNull()
    })

    it('should return error for empty username', () => {
      expect(getUsernameError('')).toBe('Username is required')
    })

    it('should return error for short username', () => {
      expect(getUsernameError('ab')).toBe('Username must be at least 3 characters')
    })

    it('should return error for long username', () => {
      expect(getUsernameError('a'.repeat(21))).toBe('Username must be less than 20 characters')
    })

    it('should return error for invalid characters', () => {
      expect(getUsernameError('user name')).toBe('Username can only contain letters, numbers, underscores, and hyphens')
    })
  })

  describe('getEmailError', () => {
    it('should return null for valid emails', () => {
      expect(getEmailError('test@example.com')).toBeNull()
    })

    it('should return error for empty email', () => {
      expect(getEmailError('')).toBe('Email is required')
    })

    it('should return error for invalid email', () => {
      expect(getEmailError('invalid')).toBe('Please enter a valid email address')
    })
  })

  describe('getDisplayNameError', () => {
    it('should return null for valid display names', () => {
      expect(getDisplayNameError('John Doe')).toBeNull()
    })

    it('should return error for empty name', () => {
      expect(getDisplayNameError('')).toBe('Display name is required')
    })

    it('should return error for short name', () => {
      expect(getDisplayNameError('J')).toBe('Display name must be at least 2 characters')
    })

    it('should return error for long name', () => {
      expect(getDisplayNameError('a'.repeat(51))).toBe('Display name must be less than 50 characters')
    })
  })
})
