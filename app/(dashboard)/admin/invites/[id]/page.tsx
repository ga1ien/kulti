'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, TrendingUp, Calendar } from 'lucide-react'
import { StatsCard } from '@/components/admin/stats-card'
import type { InviteStats } from '@/types/database'
import { logger } from '@/lib/logger'

export default function InviteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState<InviteStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInviteDetails()
  }, [params.id])

  async function fetchInviteDetails() {
    try {
      const response = await fetch(`/api/invites/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setInvite(data)
      } else {
        router.push('/admin/invites')
      }
    } catch (error) {
      logger.error('Failed to fetch invite details', { error, inviteId: params.id })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !invite) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/admin/invites')}
          className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invites
        </button>
        <h1 className="text-3xl font-bold text-white">
          Invite Code: {invite.code}
        </h1>
        <p className="mt-2 text-gray-400">
          Created by {invite.creator_display_name || 'System'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <StatsCard
          title="Total Uses"
          value={invite.total_uses.toString()}
          description={`${invite.max_uses - invite.current_uses} remaining`}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Status"
          value={invite.is_active ? 'Active' : 'Inactive'}
          description={invite.is_active ? 'Accepting signups' : 'Deactivated'}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatsCard
          title="Created"
          value={new Date(invite.created_at).toLocaleDateString()}
          description={
            invite.expires_at
              ? `Expires ${new Date(invite.expires_at).toLocaleDateString()}`
              : 'No expiration'
          }
          icon={<Calendar className="h-6 w-6" />}
        />
      </div>

      {/* Users List */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white">
            Users ({invite.uses?.length || 0})
          </h2>
        </div>
        <div className="divide-y divide-gray-800">
          {invite.uses && invite.uses.length > 0 ? (
            invite.uses.map((use, index) => (
              <div
                key={`${use.user_id}-${index}`}
                className="flex items-center justify-between p-4 hover:bg-gray-800/30"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {use.display_name || use.username || `User: ${use.user_id.slice(0, 8)}...`}
                  </p>
                  {use.username && (
                    <p className="text-xs text-gray-500">@{use.username}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Signed up {new Date(use.used_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No users have used this code yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
