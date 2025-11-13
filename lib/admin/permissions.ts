export type UserRole = 'user' | 'moderator' | 'admin'

export interface AdminProfile {
  id: string
  role: UserRole
  username: string
  display_name: string
}

/**
 * Client-side permission check (use in components)
 */
export async function checkClientPermissions(): Promise<{
  isAdmin: boolean
  isModerator: boolean
  role: UserRole
}> {
  try {
    const response = await fetch('/api/auth/permissions')
    if (!response.ok) {
      return { isAdmin: false, isModerator: false, role: 'user' }
    }
    return await response.json()
  } catch {
    return { isAdmin: false, isModerator: false, role: 'user' }
  }
}
