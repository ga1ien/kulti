'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns'
import { Search, Star } from 'lucide-react'

interface Session {
  id: string
  title: string
  description: string | null
  room_code: string
  status: 'scheduled' | 'live' | 'ended'
  host: {
    username: string
    display_name: string
  }
  started_at: string | null
  ended_at: string | null
  created_at: string
  featured_rank: number
  total_credits_distributed: number
  avg_concurrent_viewers: number
  total_chat_messages: number
  category: string | null
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    filterSessions()
  }, [searchQuery, statusFilter, sessions])

  async function fetchSessions() {
    try {
      const response = await fetch('/api/admin/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterSessions() {
    let filtered = sessions

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(query) ||
          session.host.username.toLowerCase().includes(query) ||
          session.host.display_name.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'featured') {
        filtered = filtered.filter((s) => s.featured_rank > 0)
      } else {
        filtered = filtered.filter((s) => s.status === statusFilter)
      }
    }

    setFilteredSessions(filtered)
  }

  async function toggleFeatured(sessionId: string, currentRank: number) {
    const newRank = currentRank > 0 ? 0 : 100

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_rank: newRank }),
      })

      if (response.ok) {
        setSessions(
          sessions.map((s) =>
            s.id === sessionId ? { ...s, featured_rank: newRank } : s
          )
        )
      }
    } catch (error) {
      console.error('Failed to toggle featured status:', error)
    }
  }

  async function endSession(sessionId: string) {
    if (!confirm('Are you sure you want to end this session?')) return

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended', ended_at: new Date().toISOString() }),
      })

      if (response.ok) {
        fetchSessions()
      }
    } catch (error) {
      console.error('Failed to end session:', error)
      alert('Failed to end session')
    }
  }

  async function deleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId))
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      alert('Failed to delete session')
    }
  }

  function getSessionDuration(session: Session): string {
    if (!session.started_at) return 'Not started'

    const start = new Date(session.started_at)
    const end = session.ended_at ? new Date(session.ended_at) : new Date()

    const duration = intervalToDuration({ start, end })

    return formatDuration(duration, {
      format: ['hours', 'minutes'],
      zero: false,
    }) || '< 1 min'
  }

  const liveSessions = sessions.filter((s) => s.status === 'live')
  const featuredSessions = sessions.filter((s) => s.featured_rank > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Session Management</h1>
        <p className="mt-2 text-gray-400">
          Monitor and moderate platform sessions
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-400">
        <span>
          Total: <span className="font-medium text-white">{sessions.length}</span>
        </span>
        <span>
          Live: <span className="font-medium text-green-500">{liveSessions.length}</span>
        </span>
        <span>
          Featured:{' '}
          <span className="font-medium text-purple-500">{featuredSessions.length}</span>
        </span>
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
            placeholder="Search by title or host..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="all">All Sessions</option>
          <option value="live">Live Only</option>
          <option value="ended">Ended</option>
          <option value="scheduled">Scheduled</option>
          <option value="featured">Featured</option>
        </select>
      </div>

      {/* Sessions List */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No sessions found</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{session.title}</h3>
                      <span
                        className={`
                          inline-flex rounded-full px-2 py-0.5 text-xs font-medium
                          ${
                            session.status === 'live'
                              ? 'bg-green-500/10 text-green-500'
                              : session.status === 'ended'
                                ? 'bg-gray-500/10 text-gray-400'
                                : 'bg-blue-500/10 text-blue-500'
                          }
                        `}
                      >
                        {session.status}
                      </span>
                      {session.featured_rank > 0 && (
                        <Star className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      Hosted by @{session.host.username}
                    </p>
                    {session.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                        {session.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Duration: {getSessionDuration(session)}</span>
                      <span>
                        {session.avg_concurrent_viewers} avg viewers
                      </span>
                      <span>{session.total_chat_messages} messages</span>
                      <span>
                        {session.total_credits_distributed} credits distributed
                      </span>
                      {session.category && (
                        <span className="text-purple-400">{session.category}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFeatured(session.id, session.featured_rank)}
                      className={`
                        rounded-lg p-2 transition-colors
                        ${
                          session.featured_rank > 0
                            ? 'text-yellow-500 hover:bg-yellow-500/10'
                            : 'text-gray-400 hover:bg-gray-800'
                        }
                      `}
                      title={session.featured_rank > 0 ? 'Remove from featured' : 'Add to featured'}
                    >
                      {session.featured_rank > 0 ? (
                        <Star className="h-5 w-5" />
                      ) : (
                        <Star className="h-5 w-5" />
                      )}
                    </button>
                    <a
                      href={`/session/${session.room_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-purple-400 hover:bg-purple-500/10"
                    >
                      View
                    </a>
                    {session.status === 'live' && (
                      <button
                        onClick={() => endSession(session.id)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-orange-400 hover:bg-orange-500/10"
                      >
                        End
                      </button>
                    )}
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
