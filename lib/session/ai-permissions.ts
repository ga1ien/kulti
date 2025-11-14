/**
 * AI Permissions Helper Functions
 *
 * Check and manage AI module permissions
 */

export type AIAccessMode = 'host_only' | 'presenters' | 'manual'
export type ParticipantRole = 'host' | 'presenter' | 'viewer'

export interface AIPermissions {
  canChat: boolean
  canToggle: boolean
  moduleEnabled: boolean
  accessMode: AIAccessMode
  allowedUsers: string[]
  userRole: ParticipantRole | null
  isHost: boolean
}

/**
 * Fetch AI permissions for current user in a session
 */
export async function getAIPermissions(
  sessionId: string
): Promise<AIPermissions | null> {
  try {
    const response = await fetch(
      `/api/sessions/${sessionId}/ai-permissions`
    )

    if (!response.ok) {
      // Don't log - this is a client-side function, errors handled by caller
      return null
    }

    return await response.json()
  } catch (error) {
    // Don't log - this is a client-side function, errors handled by caller
    return null
  }
}

/**
 * Update AI module settings (host only)
 */
export async function updateAIModule(
  sessionId: string,
  settings: {
    enabled: boolean
    accessMode?: AIAccessMode
    allowedUsers?: string[]
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/ai-module`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update' }
    }

    return { success: true }
  } catch (error) {
    // Don't log - this is a client-side function, errors handled by caller
    return { success: false, error: 'Failed to update AI module' }
  }
}

/**
 * Get display label for access mode
 */
export function getAccessModeLabel(mode: AIAccessMode): string {
  switch (mode) {
    case 'host_only':
      return 'Host Only'
    case 'presenters':
      return 'Host + Presenters'
    case 'manual':
      return 'Manual Selection'
    default:
      return 'Unknown'
  }
}

/**
 * Get description for access mode
 */
export function getAccessModeDescription(mode: AIAccessMode): string {
  switch (mode) {
    case 'host_only':
      return 'Only you can chat with AI'
    case 'presenters':
      return 'You and all presenters can chat with AI'
    case 'manual':
      return 'Only selected users can chat with AI'
    default:
      return ''
  }
}

/**
 * Get reason why user cannot chat (for UI messaging)
 */
export function getNoAccessReason(permissions: AIPermissions): string {
  if (!permissions.moduleEnabled) {
    return 'AI module is currently disabled'
  }

  if (permissions.userRole === 'viewer') {
    return 'Viewers can read but not send messages'
  }

  switch (permissions.accessMode) {
    case 'host_only':
      return 'Only the host can chat with AI'
    case 'presenters':
      return 'Only host and presenters can chat with AI'
    case 'manual':
      return 'You are not in the allowed users list'
    default:
      return 'You do not have permission to chat with AI'
  }
}
