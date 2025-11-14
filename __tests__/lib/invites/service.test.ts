/**
 * Tests for invite service
 */

import {
  createInviteCode,
  validateInviteCode,
  useInviteCode,
  getAllInvites,
  getUserInvites,
  getInviteAnalytics,
  getPlatformInviteStats,
  deactivateInvite,
  reactivateInvite,
  getInviteUsers,
} from '@/lib/invites/service'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    })),
  })),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}))

describe('Invite Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createInviteCode', () => {
    it('should create invite code with default parameters', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          success: true,
          invite_id: 'invite-123',
          code: 'ABC123',
        },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await createInviteCode()

      expect(result).toEqual({
        success: true,
        invite_id: 'invite-123',
        code: 'ABC123',
      })
      expect(mockRpc).toHaveBeenCalledWith('create_invite_code', {
        p_max_uses: 1,
        p_expires_at: null,
        p_metadata: {},
      })
    })

    it('should create invite code with custom parameters', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: {
          success: true,
          invite_id: 'invite-456',
          code: 'XYZ789',
        },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const expiresAt = new Date('2025-12-31').toISOString()
      const result = await createInviteCode({
        maxUses: 10,
        expiresAt,
        metadata: { campaign: 'launch' },
      })

      expect(result.code).toBe('XYZ789')
      expect(mockRpc).toHaveBeenCalledWith('create_invite_code', {
        p_max_uses: 10,
        p_expires_at: expiresAt,
        p_metadata: { campaign: 'launch' },
      })
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

      await expect(createInviteCode()).rejects.toThrow('Failed to create invite code')
    })
  })

  describe('validateInviteCode', () => {
    it('should validate a valid invite code', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'invite-123',
          code: 'ABC123',
          is_active: true,
          max_uses: 10,
          current_uses: 5,
          expires_at: null,
        },
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        })),
      })

      const result = await validateInviteCode('ABC123')

      expect(result.isValid).toBe(true)
      expect(result.invite).toBeDefined()
      expect(result.invite?.code).toBe('ABC123')
    })

    it('should reject non-existent invite code', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        })),
      })

      const result = await validateInviteCode('INVALID')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid invite code')
    })

    it('should reject fully used invite code', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'invite-123',
          code: 'ABC123',
          is_active: true,
          max_uses: 10,
          current_uses: 10,
          expires_at: null,
        },
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        })),
      })

      const result = await validateInviteCode('ABC123')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invite code has been fully used')
    })

    it('should reject expired invite code', async () => {
      const pastDate = new Date('2020-01-01').toISOString()
      const { createClient } = require('@/lib/supabase/server')
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'invite-123',
          code: 'ABC123',
          is_active: true,
          max_uses: 10,
          current_uses: 5,
          expires_at: pastDate,
        },
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        })),
      })

      const result = await validateInviteCode('ABC123')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invite code has expired')
    })

    it('should handle database errors gracefully', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        })),
      })

      const result = await validateInviteCode('ABC123')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid invite code')
    })
  })

  describe('useInviteCode', () => {
    it('should use invite code successfully', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await useInviteCode('ABC123', 'user-123')

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('use_invite_code', {
        p_code: 'ABC123',
        p_user_id: 'user-123',
        p_metadata: {},
      })
    })

    it('should pass metadata when provided', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const metadata = { source: 'email', campaign: 'launch' }
      await useInviteCode('ABC123', 'user-123', metadata)

      expect(mockRpc).toHaveBeenCalledWith('use_invite_code', {
        p_code: 'ABC123',
        p_user_id: 'user-123',
        p_metadata: metadata,
      })
    })

    it('should handle race condition errors', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'lock_not_available' },
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await useInviteCode('ABC123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('currently being processed')
    })

    it('should handle duplicate usage errors', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'unique_violation' },
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await useInviteCode('ABC123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already used')
    })

    it('should handle RPC failure responses', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: { success: false, error: 'Code is invalid' },
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await useInviteCode('ABC123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Code is invalid')
    })
  })

  describe('getAllInvites', () => {
    it('should get all active invites with default pagination', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockInvites = [
        { id: 'invite-1', code: 'ABC123', is_active: true },
        { id: 'invite-2', code: 'XYZ789', is_active: true },
      ]

      // Create a then-able promise-like object for the final query execution
      const executeQuery = Promise.resolve({
        data: mockInvites,
        error: null,
      })

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

      const result = await getAllInvites()

      expect(result).toEqual(mockInvites)
      expect(chainableMethods.range).toHaveBeenCalledWith(0, 49) // Default limit 50
    })

    it('should support custom pagination', async () => {
      const { createClient } = require('@/lib/supabase/server')

      const executeQuery = Promise.resolve({
        data: [],
        error: null,
      })

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

      await getAllInvites({ page: 3, limit: 10 })

      expect(chainableMethods.range).toHaveBeenCalledWith(20, 29) // Page 3 with limit 10
    })

    it('should include inactive invites when requested', async () => {
      const { createClient } = require('@/lib/supabase/server')

      const executeQuery = Promise.resolve({ data: [], error: null })

      const chainableMethods = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnValue(executeQuery),
      }

      createClient.mockReturnValue({
        from: jest.fn(() => chainableMethods),
      })

      const result = await getAllInvites({ includeInactive: true })

      // Should not call eq when includeInactive is true
      // Range should return a promise directly (not chainable with eq)
      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      const { createClient } = require('@/lib/supabase/server')

      const executeQuery = Promise.resolve({
        data: null,
        error: { message: 'Database error' },
      })

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

      const result = await getAllInvites()

      expect(result).toEqual([])
    })
  })

  describe('getUserInvites', () => {
    it('should get invites for specific user', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockInvites = [
        { id: 'invite-1', code: 'ABC123', created_by: 'user-123' },
        { id: 'invite-2', code: 'XYZ789', created_by: 'user-123' },
      ]

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockInvites,
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: mockOrder,
        })),
      })

      const result = await getUserInvites('user-123')

      expect(result).toEqual(mockInvites)
    })

    it('should return empty array on error', async () => {
      const { createClient } = require('@/lib/supabase/server')

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        })),
      })

      const result = await getUserInvites('user-123')

      expect(result).toEqual([])
    })
  })

  describe('getInviteAnalytics', () => {
    it('should get analytics for invite', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockAnalytics = {
        invite_id: 'invite-123',
        total_uses: 5,
        unique_users: 5,
      }

      const mockRpc = jest.fn().mockResolvedValue({
        data: mockAnalytics,
        error: null,
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await getInviteAnalytics('invite-123')

      expect(result).toEqual(mockAnalytics)
      expect(mockRpc).toHaveBeenCalledWith('get_invite_analytics', {
        p_invite_id: 'invite-123',
      })
    })

    it('should return null on error', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      createClient.mockReturnValue({
        rpc: mockRpc,
      })

      const result = await getInviteAnalytics('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('getPlatformInviteStats', () => {
    it('should get platform-wide statistics', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockInvites = [
        { id: 'invite-1', is_active: true, current_uses: 5 },
        { id: 'invite-2', is_active: true, current_uses: 3 },
        { id: 'invite-3', is_active: false, current_uses: 10 },
      ]
      const mockTopCodes = [
        { invite_id: 'invite-1', total_uses: 5 },
        { invite_id: 'invite-2', total_uses: 3 },
      ]

      createClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === 'invites') {
            return {
              select: jest.fn().mockResolvedValue({
                data: mockInvites,
                error: null,
              }),
            }
          } else if (table === 'invite_stats') {
            return {
              select: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: mockTopCodes,
                error: null,
              }),
            }
          }
          return {}
        }),
      })

      const result = await getPlatformInviteStats()

      expect(result.total_codes).toBe(3)
      expect(result.active_codes).toBe(2)
      expect(result.total_uses).toBe(18)
      expect(result.top_codes).toEqual(mockTopCodes)
    })

    it('should handle empty database', async () => {
      const { createClient } = require('@/lib/supabase/server')

      const inviteStatsChain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      createClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === 'invites') {
            return {
              select: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }
          } else if (table === 'invite_stats') {
            return inviteStatsChain
          }
          return {}
        }),
      })

      const result = await getPlatformInviteStats()

      expect(result.total_codes).toBe(0)
      expect(result.active_codes).toBe(0)
      expect(result.total_uses).toBe(0)
      expect(result.top_codes).toEqual([])
    })
  })

  describe('deactivateInvite', () => {
    it('should deactivate invite successfully', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          eq: mockEq,
        })),
      })

      const result = await deactivateInvite('invite-123')

      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          eq: mockEq,
        })),
      })

      const result = await deactivateInvite('invite-123')

      expect(result).toBe(false)
    })
  })

  describe('reactivateInvite', () => {
    it('should reactivate invite successfully', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          eq: mockEq,
        })),
      })

      const result = await reactivateInvite('invite-123')

      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          eq: mockEq,
        })),
      })

      const result = await reactivateInvite('invite-123')

      expect(result).toBe(false)
    })
  })

  describe('getInviteUsers', () => {
    it('should get users who used an invite', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockData = [
        {
          used_at: '2024-01-01T00:00:00Z',
          used_by: 'user-1',
          profiles: {
            id: 'user-1',
            username: 'alice',
            display_name: 'Alice',
            avatar_url: null,
          },
        },
        {
          used_at: '2024-01-02T00:00:00Z',
          used_by: 'user-2',
          profiles: {
            id: 'user-2',
            username: 'bob',
            display_name: 'Bob',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ]

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      })

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: mockOrder,
        })),
      })

      const result = await getInviteUsers('invite-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'user-1',
        username: 'alice',
        display_name: 'Alice',
        avatar_url: null,
        used_at: '2024-01-01T00:00:00Z',
      })
      expect(result[1]).toEqual({
        id: 'user-2',
        username: 'bob',
        display_name: 'Bob',
        avatar_url: 'https://example.com/avatar.jpg',
        used_at: '2024-01-02T00:00:00Z',
      })
    })

    it('should return empty array on error', async () => {
      const { createClient } = require('@/lib/supabase/server')

      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        })),
      })

      const result = await getInviteUsers('invite-123')

      expect(result).toEqual([])
    })
  })
})
