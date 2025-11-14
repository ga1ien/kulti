'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import {
  Users,
  Video,
  DollarSign,
  MessageSquare,
} from 'lucide-react'
import { logger } from '@/lib/logger'

// Code split admin components
const StatsCard = dynamic(() => import('@/components/admin/stats-card').then(mod => ({ default: mod.StatsCard })), {
  loading: () => <LoadingSkeleton className="h-32 w-full" />,
  ssr: false
})

interface DashboardStats {
  totalUsers: number
  activeSessions: number
  totalCreditsCirculated: number
  totalRooms: number
}

interface RecentActivity {
  id: string
  type: 'user_joined' | 'session_started' | 'room_created'
  message: string
  timestamp: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/activity'),
        ])

        if (statsRes.ok) {
          setStats(await statsRes.json())
        }
        if (activityRes.ok) {
          setActivity(await activityRes.json())
        }
      } catch (error) {
        logger.error('Failed to fetch dashboard data', { error })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Platform overview and management tools
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers.toLocaleString() || '0'}
          description="Registered accounts"
          icon={<Users className="h-6 w-6" />}
          loading={loading}
        />
        <StatsCard
          title="Active Sessions"
          value={stats?.activeSessions || '0'}
          description="Currently live"
          icon={<Video className="h-6 w-6" />}
          loading={loading}
        />
        <StatsCard
          title="Credits Circulated"
          value={stats?.totalCreditsCirculated.toLocaleString() || '0'}
          description="Platform economy"
          icon={<DollarSign className="h-6 w-6" />}
          loading={loading}
        />
        <StatsCard
          title="Community Rooms"
          value={stats?.totalRooms || '0'}
          description="Active discussion spaces"
          icon={<MessageSquare className="h-6 w-6" />}
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {loading ? (
            <div className="p-8 text-center text-gray-500" role="status">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" aria-hidden="true" />
              <span>Loading activity...</span>
            </div>
          ) : activity.length === 0 ? (
            <div className="p-8 text-center text-gray-500" role="status">
              <p>No recent activity</p>
              <p className="text-sm mt-2">Activity will appear here as users interact with the platform</p>
            </div>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-800/30">
                <p className="text-sm text-white">{item.message}</p>
                <p className="mt-1 text-xs text-gray-500">{item.timestamp}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/users"
            className="rounded-lg border border-gray-700 p-4 text-center transition-colors hover:border-purple-500 hover:bg-gray-800 min-h-[120px] flex flex-col items-center justify-center"
            aria-label="Navigate to user management"
          >
            <Users className="mx-auto h-8 w-8 text-purple-500" aria-hidden="true" />
            <h3 className="mt-2 font-medium text-white">Manage Users</h3>
            <p className="mt-1 text-sm text-gray-400">
              View and moderate user accounts
            </p>
          </a>
          <a
            href="/admin/rooms"
            className="rounded-lg border border-gray-700 p-4 text-center transition-colors hover:border-purple-500 hover:bg-gray-800 min-h-[120px] flex flex-col items-center justify-center"
            aria-label="Navigate to room management"
          >
            <MessageSquare className="mx-auto h-8 w-8 text-purple-500" aria-hidden="true" />
            <h3 className="mt-2 font-medium text-white">Create Room</h3>
            <p className="mt-1 text-sm text-gray-400">
              Add new community discussion space
            </p>
          </a>
          <a
            href="/admin/sessions"
            className="rounded-lg border border-gray-700 p-4 text-center transition-colors hover:border-purple-500 hover:bg-gray-800 min-h-[120px] flex flex-col items-center justify-center"
            aria-label="Navigate to session monitoring"
          >
            <Video className="mx-auto h-8 w-8 text-purple-500" aria-hidden="true" />
            <h3 className="mt-2 font-medium text-white">Monitor Sessions</h3>
            <p className="mt-1 text-sm text-gray-400">
              Oversee active and past sessions
            </p>
          </a>
        </div>
      </div>
    </div>
  )
}
