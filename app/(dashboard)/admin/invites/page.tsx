'use client'

import { useEffect, useState } from 'react'
import { Ticket, Plus, Search, TrendingUp } from 'lucide-react'
import { InviteCodeTable } from '@/components/admin/invite-code-table'
import { CreateInviteModal } from '@/components/admin/create-invite-modal'
import { StatsCard } from '@/components/admin/stats-card'
import type { Invite } from '@/types/database'
import { logger } from '@/lib/logger'

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [filteredInvites, setFilteredInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stats, setStats] = useState({
    total_codes: 0,
    total_uses: 0,
    active_codes: 0,
  })

  useEffect(() => {
    fetchInvites()
    fetchStats()
  }, [])

  useEffect(() => {
    filterInvites()
  }, [searchQuery, invites])

  async function fetchInvites() {
    try {
      const response = await fetch('/api/invites')
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
        setFilteredInvites(data)
      }
    } catch (error) {
      logger.error('Failed to fetch invites', { error })
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/invites/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      logger.error('Failed to fetch stats', { error })
    }
  }

  function filterInvites() {
    if (!searchQuery) {
      setFilteredInvites(invites)
      return
    }

    const query = searchQuery.toLowerCase()
    setFilteredInvites(
      invites.filter(
        (invite) =>
          invite.code.toLowerCase().includes(query) ||
          invite.metadata?.note?.toLowerCase().includes(query)
      )
    )
  }

  async function handleCreateInvite(params: {
    maxUses: number
    expiresAt: string | null
    metadata: Record<string, unknown>
  }) {
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (response.ok) {
        await fetchInvites()
        await fetchStats()
        setShowCreateModal(false)
      } else {
        alert('Failed to create invite code')
      }
    } catch (error) {
      logger.error('Failed to create invite', { error, params })
      alert('Failed to create invite code')
    }
  }

  async function handleToggleActive(inviteId: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isActive ? 'deactivate' : 'reactivate',
        }),
      })

      if (response.ok) {
        await fetchInvites()
        await fetchStats()
      } else {
        alert('Failed to update invite code')
      }
    } catch (error) {
      logger.error('Failed to update invite', { error, inviteId, isActive })
      alert('Failed to update invite code')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Invite Codes</h1>
          <p className="mt-2 text-gray-400">
            Manage platform invite codes and track referrals
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Create Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <StatsCard
          title="Total Codes"
          value={stats.total_codes.toLocaleString()}
          description="All time"
          icon={<Ticket className="h-6 w-6" />}
          loading={loading}
        />
        <StatsCard
          title="Active Codes"
          value={stats.active_codes.toLocaleString()}
          description="Currently usable"
          icon={<Ticket className="h-6 w-6" />}
          loading={loading}
        />
        <StatsCard
          title="Total Uses"
          value={stats.total_uses.toLocaleString()}
          description="Successful signups"
          icon={<TrendingUp className="h-6 w-6" />}
          loading={loading}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by code or note..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
        />
      </div>

      {/* Table */}
      <InviteCodeTable
        invites={filteredInvites}
        onToggleActive={handleToggleActive}
        loading={loading}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateInviteModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateInvite}
        />
      )}
    </div>
  )
}
