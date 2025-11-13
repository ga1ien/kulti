/**
 * Tests for credit service
 */

import { addCredits, deductCredits, hasSufficientBalance } from '@/lib/credits/service'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}))

describe('Credit Service', () => {
  describe('addCredits', () => {
    it('should add credits successfully', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          success: true,
          transaction_id: 'test-id',
          new_balance: 150,
          amount: 50,
        },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await addCredits({
        userId: 'user-1',
        amount: 50,
        type: 'earned_hosting',
      })

      expect(result.success).toBe(true)
      expect(result.new_balance).toBe(150)
      expect(mockRpc).toHaveBeenCalledWith('add_credits', expect.objectContaining({
        p_user_id: 'user-1',
        p_amount: 50,
        p_type: 'earned_hosting',
      }))
    })

    it('should throw error on failure', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      await expect(addCredits({
        userId: 'user-1',
        amount: 50,
        type: 'earned_hosting',
      })).rejects.toThrow('Failed to add credits')
    })
  })

  describe('deductCredits', () => {
    it('should deduct credits by making amount negative', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          success: true,
          transaction_id: 'test-id',
          new_balance: 50,
          amount: -50,
        },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await deductCredits({
        userId: 'user-1',
        amount: 50,
        type: 'spent_tipping',
      })

      expect(result.success).toBe(true)
      expect(result.new_balance).toBe(50)
      expect(mockRpc).toHaveBeenCalledWith('add_credits', expect.objectContaining({
        p_amount: -50, // Should be negative
      }))
    })
  })

  describe('hasSufficientBalance', () => {
    it('should return true when balance is sufficient', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: { credits_balance: 100 },
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        })),
      })

      const result = await hasSufficientBalance('user-1', 50)
      expect(result).toBe(true)
    })

    it('should return false when balance is insufficient', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: { credits_balance: 25 },
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        })),
      })

      const result = await hasSufficientBalance('user-1', 50)
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        })),
      })

      const result = await hasSufficientBalance('user-1', 50)
      expect(result).toBe(false)
    })
  })
})
