/**
 * Tests for AI permissions in sessions
 */

import {
  getAIPermissions,
  updateAIModule,
  getAccessModeLabel,
  getAccessModeDescription,
  getNoAccessReason,
} from '@/lib/session/ai-permissions'
import type { AIAccessMode, AIPermissions } from '@/lib/session/ai-permissions'

// Mock fetch globally
global.fetch = jest.fn()

describe('AI Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('getAIPermissions', () => {
    it('should fetch AI permissions successfully', async () => {
      const mockPermissions: AIPermissions = {
        canChat: true,
        canToggle: true,
        moduleEnabled: true,
        accessMode: 'host_only',
        allowedUsers: [],
        userRole: 'host',
        isHost: true,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPermissions,
      })

      const result = await getAIPermissions('session-123')

      expect(result).toEqual(mockPermissions)
      expect(global.fetch).toHaveBeenCalledWith('/api/sessions/session-123/ai-permissions')
    })

    it('should return null on API error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await getAIPermissions('session-123')

      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await getAIPermissions('session-123')

      expect(result).toBeNull()
    })

    it('should handle malformed JSON response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const result = await getAIPermissions('session-123')

      expect(result).toBeNull()
    })
  })

  describe('updateAIModule', () => {
    it('should update AI module with all settings', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await updateAIModule('session-123', {
        enabled: true,
        accessMode: 'presenters',
        allowedUsers: ['user-1', 'user-2'],
      })

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/session-123/ai-module',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: true,
            accessMode: 'presenters',
            allowedUsers: ['user-1', 'user-2'],
          }),
        })
      )
    })

    it('should update AI module with enabled only', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await updateAIModule('session-123', {
        enabled: false,
      })

      expect(result.success).toBe(true)
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body).toEqual({ enabled: false })
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Not authorized' }),
      })

      const result = await updateAIModule('session-123', { enabled: true })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authorized')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'))

      const result = await updateAIModule('session-123', { enabled: true })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update AI module')
    })

    it('should provide default error message when none provided', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      const result = await updateAIModule('session-123', { enabled: true })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update')
    })
  })

  describe('getAccessModeLabel', () => {
    it('should return correct label for host_only', () => {
      expect(getAccessModeLabel('host_only')).toBe('Host Only')
    })

    it('should return correct label for presenters', () => {
      expect(getAccessModeLabel('presenters')).toBe('Host + Presenters')
    })

    it('should return correct label for manual', () => {
      expect(getAccessModeLabel('manual')).toBe('Manual Selection')
    })

    it('should return Unknown for invalid mode', () => {
      expect(getAccessModeLabel('invalid' as AIAccessMode)).toBe('Unknown')
    })
  })

  describe('getAccessModeDescription', () => {
    it('should return correct description for host_only', () => {
      expect(getAccessModeDescription('host_only')).toBe('Only you can chat with AI')
    })

    it('should return correct description for presenters', () => {
      expect(getAccessModeDescription('presenters')).toBe(
        'You and all presenters can chat with AI'
      )
    })

    it('should return correct description for manual', () => {
      expect(getAccessModeDescription('manual')).toBe('Only selected users can chat with AI')
    })

    it('should return empty string for invalid mode', () => {
      expect(getAccessModeDescription('invalid' as AIAccessMode)).toBe('')
    })
  })

  describe('getNoAccessReason', () => {
    it('should return reason when module is disabled', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: false,
        accessMode: 'host_only',
        allowedUsers: [],
        userRole: 'viewer',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('AI module is currently disabled')
    })

    it('should return reason for viewers', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: true,
        accessMode: 'host_only',
        allowedUsers: [],
        userRole: 'viewer',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('Viewers can read but not send messages')
    })

    it('should return reason for host_only mode', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: true,
        accessMode: 'host_only',
        allowedUsers: [],
        userRole: 'presenter',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('Only the host can chat with AI')
    })

    it('should return reason for presenters mode when not a presenter', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: true,
        accessMode: 'presenters',
        allowedUsers: [],
        userRole: 'presenter',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('Only host and presenters can chat with AI')
    })

    it('should return reason for manual mode', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: true,
        accessMode: 'manual',
        allowedUsers: [],
        userRole: 'presenter',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('You are not in the allowed users list')
    })

    it('should return default reason for unknown mode', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: true,
        accessMode: 'unknown' as AIAccessMode,
        allowedUsers: [],
        userRole: 'presenter',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('You do not have permission to chat with AI')
    })

    it('should prioritize module disabled over other reasons', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: false,
        accessMode: 'presenters',
        allowedUsers: [],
        userRole: 'viewer',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('AI module is currently disabled')
    })

    it('should prioritize viewer role over access mode', () => {
      const permissions: AIPermissions = {
        canChat: false,
        canToggle: false,
        moduleEnabled: true,
        accessMode: 'manual',
        allowedUsers: [],
        userRole: 'viewer',
        isHost: false,
      }

      const reason = getNoAccessReason(permissions)
      expect(reason).toBe('Viewers can read but not send messages')
    })
  })

  describe('Integration scenarios', () => {
    it('should handle host updating module and checking permissions', async () => {
      // Update module
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const updateResult = await updateAIModule('session-123', {
        enabled: true,
        accessMode: 'presenters',
      })

      expect(updateResult.success).toBe(true)

      // Get permissions
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          canChat: true,
          canToggle: true,
          moduleEnabled: true,
          accessMode: 'presenters',
          allowedUsers: [],
          userRole: 'host',
          isHost: true,
        }),
      })

      const permissions = await getAIPermissions('session-123')

      expect(permissions?.moduleEnabled).toBe(true)
      expect(permissions?.accessMode).toBe('presenters')
      expect(permissions?.canChat).toBe(true)
    })

    it('should handle presenter checking restricted access', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          canChat: false,
          canToggle: false,
          moduleEnabled: true,
          accessMode: 'host_only',
          allowedUsers: [],
          userRole: 'presenter',
          isHost: false,
        }),
      })

      const permissions = await getAIPermissions('session-123')

      expect(permissions?.canChat).toBe(false)
      const reason = getNoAccessReason(permissions!)
      expect(reason).toBe('Only the host can chat with AI')
    })

    it('should handle manual selection with allowed users', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          canChat: true,
          canToggle: false,
          moduleEnabled: true,
          accessMode: 'manual',
          allowedUsers: ['user-1', 'user-2'],
          userRole: 'presenter',
          isHost: false,
        }),
      })

      const permissions = await getAIPermissions('session-123')

      expect(permissions?.canChat).toBe(true)
      expect(permissions?.allowedUsers).toContain('user-1')
      expect(permissions?.allowedUsers).toContain('user-2')
    })
  })
})
