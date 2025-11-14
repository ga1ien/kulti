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

  describe('tipUser', () => {
    it('should transfer credits between users successfully', async () => {
      const { createClient } = require('@/lib/supabase/server')

      // Mock balance check
      const mockSingle = jest.fn().mockResolvedValue({
        data: { credits_balance: 100 },
        error: null,
      })

      // Mock user lookup
      const mockUsers = jest.fn().mockResolvedValue({
        data: [
          { id: 'user-1', username: 'alice' },
          { id: 'user-2', username: 'bob' },
        ],
        error: null,
      })

      // Mock RPC calls
      const mockRpc = jest.fn()
        .mockResolvedValueOnce({ // Deduct from sender
          data: {
            success: true,
            transaction_id: 'tx-1',
            new_balance: 50,
            amount: -50,
          },
          error: null,
        })
        .mockResolvedValueOnce({ // Add to recipient
          data: {
            success: true,
            transaction_id: 'tx-2',
            new_balance: 150,
            amount: 50,
          },
          error: null,
        })

      createClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnValue(mockUsers),
              single: mockSingle,
            }
          }
          return {}
        }),
        rpc: mockRpc,
      })

      const result = await (require('@/lib/credits/service').tipUser)({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        amount: 50,
        sessionId: 'session-123',
        message: 'Great session!',
      })

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledTimes(2)
    })

    it('should fail if sender has insufficient balance', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSingle = jest.fn().mockResolvedValue({
        data: { credits_balance: 25 },
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        })),
      })

      const result = await (require('@/lib/credits/service').tipUser)({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        amount: 50,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient balance')
    })

    it('should handle transaction errors', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSingle = jest.fn().mockResolvedValue({
        data: { credits_balance: 100 },
        error: null,
      })

      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Transaction failed' },
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              { id: 'user-1', username: 'alice' },
              { id: 'user-2', username: 'bob' },
            ],
            error: null,
          }),
          single: mockSingle,
        })),
        rpc: mockRpc,
      })

      const result = await (require('@/lib/credits/service').tipUser)({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        amount: 50,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to process tip')
    })
  })

  describe('getBalance', () => {
    it('should return user balance', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          credits_balance: 100,
          total_credits_earned: 500,
          total_credits_spent: 400,
          credits_updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        })),
      })

      const result = await (require('@/lib/credits/service').getBalance)('user-1')

      expect(result).toEqual({
        credits_balance: 100,
        total_credits_earned: 500,
        total_credits_spent: 400,
        credits_updated_at: '2024-01-01T00:00:00Z',
      })
    })

    it('should return null on error', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        })),
      })

      const result = await (require('@/lib/credits/service').getBalance)('user-1')

      expect(result).toBeNull()
    })
  })

  describe('getTransactions', () => {
    it('should return transaction history', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockTransactions = [
        { id: 'tx-1', amount: 50, type: 'earned_hosting' },
        { id: 'tx-2', amount: -25, type: 'spent_tipping' },
      ]

      const mockRange = jest.fn().mockResolvedValue({
        data: mockTransactions,
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: mockRange,
        })),
      })

      const result = await (require('@/lib/credits/service').getTransactions)('user-1')

      expect(result).toEqual(mockTransactions)
    })

    it('should support pagination', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: mockRange,
        })),
      })

      await (require('@/lib/credits/service').getTransactions)('user-1', {
        limit: 10,
        offset: 20,
      })

      expect(mockRange).toHaveBeenCalledWith(20, 29)
    })

    it('should filter by transaction type', async () => {
      const { createClient } = require('@/lib/supabase/server')

      const executeQuery = Promise.resolve({ data: [], error: null })

      const chainableMethods = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnValue({
          ...executeQuery,
          eq: jest.fn().mockReturnValue(executeQuery),
        }),
      }

      createClient.mockReturnValue({
        from: jest.fn(() => chainableMethods),
      })

      await (require('@/lib/credits/service').getTransactions)('user-1', {
        type: 'earned_hosting',
      })

      // Check that eq was called with the type filter
      expect(chainableMethods.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(chainableMethods.eq).toHaveBeenCalledWith('type', 'earned_hosting')
    })
  })

  describe('checkAndAwardMilestones', () => {
    it('should check and award milestones', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          milestones_awarded: [
            { milestone: 'first_session', credits: 100 },
            { milestone: '10_sessions', credits: 500 },
          ],
          count: 2,
        },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await (require('@/lib/credits/service').checkAndAwardMilestones)('user-1')

      expect(result.count).toBe(2)
      expect(result.milestones_awarded).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error' },
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await (require('@/lib/credits/service').checkAndAwardMilestones)('user-1')

      expect(result.milestones_awarded).toEqual([])
      expect(result.count).toBe(0)
    })
  })

  describe('awardFirstSessionBonus', () => {
    it('should award bonus for first session', async () => {
      const { createClient } = require('@/lib/supabase/server')

      // Mock check for existing milestone
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      // Mock adding credits
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          success: true,
          transaction_id: 'tx-1',
          new_balance: 100,
          amount: 100,
        },
        error: null,
      })

      // Mock inserting milestone record
      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: mockInsert,
          single: mockSingle,
        })),
        rpc: mockRpc,
      })

      await (require('@/lib/credits/service').awardFirstSessionBonus)('user-1')

      expect(mockRpc).toHaveBeenCalledWith('add_credits', expect.objectContaining({
        p_amount: 100,
        p_type: 'bonus_first_session',
      }))
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should not award if already given', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'milestone-1' },
        error: null,
      })

      const mockRpc = jest.fn()

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        })),
        rpc: mockRpc,
      })

      await (require('@/lib/credits/service').awardFirstSessionBonus)('user-1')

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('awardFirstStreamBonus', () => {
    it('should award bonus for first stream', async () => {
      const { createClient } = require('@/lib/supabase/server')

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          success: true,
          transaction_id: 'tx-1',
          new_balance: 200,
          amount: 200,
        },
        error: null,
      })

      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: mockInsert,
          single: mockSingle,
        })),
        rpc: mockRpc,
      })

      await (require('@/lib/credits/service').awardFirstStreamBonus)('user-1')

      expect(mockRpc).toHaveBeenCalledWith('add_credits', expect.objectContaining({
        p_amount: 200,
        p_type: 'bonus_first_session',
      }))
    })

    it('should not award if already given', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'milestone-1' },
        error: null,
      })

      const mockRpc = jest.fn()

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        })),
        rpc: mockRpc,
      })

      await (require('@/lib/credits/service').awardFirstStreamBonus)('user-1')

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('getUserStats', () => {
    it('should return user credit statistics', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockStats = {
        credits_balance: 100,
        total_credits_earned: 500,
        total_credits_spent: 400,
        sessions_attended: 10,
        sessions_hosted: 5,
        total_hours_watched: 25.5,
        total_hours_streamed: 12.0,
        milestones_achieved: 3,
      }

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        })),
      })

      const result = await (require('@/lib/credits/service').getUserStats)('user-1')

      expect(result).toEqual(mockStats)
    })

    it('should return null on error', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        })),
      })

      const result = await (require('@/lib/credits/service').getUserStats)('user-1')

      expect(result).toBeNull()
    })
  })
})
