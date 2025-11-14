'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { Search } from 'lucide-react'
import type { UserRole } from '@/lib/admin/permissions'
import { logger } from '@/lib/logger'

// Code split UserTable component
const UserTable = dynamic(() => import('@/components/admin/user-table').then(mod => ({ default: mod.UserTable })), {
  loading: () => (
    <div className="space-y-3">
      <LoadingSkeleton className="h-16 w-full" />
      <LoadingSkeleton className="h-16 w-full" />
      <LoadingSkeleton className="h-16 w-full" />
      <LoadingSkeleton className="h-16 w-full" />
    </div>
  ),
  ssr: false
})

interface User {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  role: UserRole
  credits_balance: number
  total_credits_earned: number
  created_at: string
  is_approved: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchQuery, roleFilter, users])

  async function fetchUsers() {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        setFilteredUsers(data)
      }
    } catch (error) {
      logger.error('Failed to fetch users', { error })
    } finally {
      setLoading(false)
    }
  }

  function filterUsers() {
    let filtered = users

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.display_name.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  async function handleUserAction(userId: string, action: string) {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    switch (action) {
      case 'view':
        window.open(`/profile/${user.username}`, '_blank')
        break
      case 'edit':
        setSelectedUser(user)
        setShowEditModal(true)
        break
      case 'delete':
        if (confirm(`Are you sure you want to delete @${user.username}?`)) {
          await deleteUser(userId)
        }
        break
    }
  }

  async function deleteUser(userId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(users.filter((u) => u.id !== userId))
      } else {
        alert('Failed to delete user')
      }
    } catch (error) {
      logger.error('Failed to delete user', { error, userId })
      alert('Failed to delete user')
    }
  }

  async function updateUserRole(userId: string, newRole: UserRole) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        )
        setShowEditModal(false)
        setSelectedUser(null)
      } else {
        alert('Failed to update user role')
      }
    } catch (error) {
      logger.error('Failed to update user role', { error, userId, newRole })
      alert('Failed to update user role')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <p className="mt-2 text-gray-400">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or display name..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="moderator">Moderators</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-400">
        <span>
          Total: <span className="font-medium text-white">{users.length}</span>
        </span>
        <span>
          Showing:{' '}
          <span className="font-medium text-white">{filteredUsers.length}</span>
        </span>
      </div>

      {/* User Table */}
      <UserTable
        users={filteredUsers}
        onAction={handleUserAction}
        loading={loading}
      />

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Edit User: @{selectedUser.username}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={selectedUser.role}
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    updateUserRole(selectedUser.id, selectedUser.role)
                  }
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
