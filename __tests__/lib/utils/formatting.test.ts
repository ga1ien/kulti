/**
 * Tests for formatting utilities
 */

import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  formatNumber,
  formatCredits,
  formatPercentage,
  truncate,
  formatFileSize,
} from '@/lib/utils/formatting'

describe('Formatting Utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate('2024-01-15T10:30:00')
      expect(result).toBe('Jan 15, 2024')
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-12-25T00:00:00')
      const result = formatDate(date)
      expect(result).toBe('Dec 25, 2024')
    })
  })

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const result = formatTime('2024-01-15T14:30:00')
      expect(result).toMatch(/2:30 PM/)
    })
  })

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('45s')
    })

    it('should format minutes and seconds', () => {
      expect(formatDuration(125)).toBe('2m 5s')
    })

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3665)).toBe('1h 1m 5s')
    })
  })

  describe('formatNumber', () => {
    it('should format large numbers with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('should handle small numbers', () => {
      expect(formatNumber(42)).toBe('42')
    })
  })

  describe('formatCredits', () => {
    it('should format singular credit', () => {
      expect(formatCredits(1)).toBe('1 credit')
    })

    it('should format plural credits', () => {
      expect(formatCredits(100)).toBe('100 credits')
    })

    it('should format large credit amounts', () => {
      expect(formatCredits(1234)).toBe('1,234 credits')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(0.8567)).toBe('85.7%')
    })

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(0.8567, 2)).toBe('85.67%')
    })

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%')
    })

    it('should handle one', () => {
      expect(formatPercentage(1)).toBe('100.0%')
    })
  })

  describe('truncate', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that should be truncated'
      expect(truncate(text, 20)).toBe('This is a very lo...')
    })

    it('should not truncate short text', () => {
      const text = 'Short text'
      expect(truncate(text, 20)).toBe('Short text')
    })

    it('should handle exact length', () => {
      const text = 'Exact'
      expect(truncate(text, 5)).toBe('Exact')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500.0 B')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1572864)).toBe('1.5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1610612736)).toBe('1.5 GB')
    })
  })
})
