/**
 * API Utilities
 *
 * Shared helpers for making API calls throughout the application.
 * Reduces duplication and provides consistent error handling.
 */

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  ok: boolean
  status: number
}

/**
 * Make a fetch request with consistent error handling
 */
export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : (data.error || 'An error occurred'),
      ok: response.ok,
      status: response.status,
    }
  } catch (error) {
    logger.error('API fetch error:', error)
    return {
      error: error instanceof Error ? error.message : 'Network error',
      ok: false,
      status: 0,
    }
  }
}

/**
 * Fetch user's current credit balance
 */
export async function fetchCreditBalance(): Promise<number | null> {
  const response = await apiFetch<{ credits_balance: number }>('/api/credits/balance')

  if (response.ok && response.data) {
    return response.data.credits_balance || 0
  }

  logger.error('Failed to fetch credit balance:', response.error)
  return null
}

/**
 * Send analytics heartbeat
 */
export async function sendHeartbeat(sessionId: string, isActive: boolean): Promise<void> {
  await fetch('/api/analytics/heartbeat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      isActive,
    }),
  }).catch((error) => logger.error('Heartbeat error', { error, sessionId, userId, isActive }))
}

/**
 * Validate invite code
 */
export async function validateInviteCode(code: string): Promise<ApiResponse<{ valid: boolean }>> {
  return apiFetch('/api/invites/validate', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

/**
 * Get HMS auth token for joining a session
 */
export async function getHMSToken(roomId: string, sessionId: string): Promise<ApiResponse<{
  token: string
  userName: string
  expiresAt: number
  useHLS?: boolean
  hlsStreamUrl?: string
}>> {
  return apiFetch('/api/hms/get-token', {
    method: 'POST',
    body: JSON.stringify({ roomId, sessionId }),
  })
}

/**
 * Tip a user
 */
export async function tipUser(params: {
  recipientId: string
  amount: number
  sessionId?: string
  message?: string
}): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch('/api/credits/tip', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Join session as presenter
 */
export async function joinAsPresenter(token: string): Promise<ApiResponse<{
  sessionId: string
  roomId: string
  userName: string
  authToken: string
}>> {
  return apiFetch('/api/sessions/join-as-presenter', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
