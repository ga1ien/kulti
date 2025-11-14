"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { X, Loader2, Sparkles, Users, RefreshCw } from "lucide-react"
import { UserMatchCard } from "./user-match-card"
import { UserCardSkeleton } from "@/components/ui/loading-skeleton"
import { useRouter } from "next/navigation"
import { logger } from '@/lib/logger'

interface FindSessionModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CompatibleUser {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  skills: string[]
  interests: string[]
  experienceLevel: string
  matchScore: number
  sharedSkills: string[]
  sharedInterests: string[]
  presence?: {
    inSession: boolean
    lastSeen: string
  }
}

export function FindSessionModal({ isOpen, onClose }: FindSessionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<CompatibleUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [creatingSession, setCreatingSession] = useState(false)
  const [mode, setMode] = useState<'quick' | 'browse'>('quick')

  // Fetch compatible users
  const fetchCompatibleUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/matchmaking/available-users?limit=10')
      const data = await response.json()

      if (!response.ok) {
        let errorMessage = data.error || 'Failed to load compatible users'
        if (data.profileCompleted === false) {
          errorMessage = 'Please complete your profile to use matchmaking'
        }
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      setUsers(data.users || [])
    } catch (err) {
      logger.error('Fetch users error', { error: err })
      const errorMessage = 'Failed to load compatible users. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchCompatibleUsers()
      setSelectedUsers(new Set())
    }
  }, [isOpen])

  const handleQuickMatch = async () => {
    setCreatingSession(true)
    setError(null)

    try {
      const response = await fetch('/api/matchmaking/find-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createIfNoMatch: true,
          maxParticipants: 4,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to find session'
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      // Navigate to session
      if (data.type === 'new_session' || data.type === 'existing_session') {
        toast.success('Session found! Joining now...')
        const roomCode = data.session.roomCode
        router.push(`/session/${roomCode}`)
        onClose()
      } else {
        const errorMessage = 'No compatible sessions found'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (err) {
      logger.error('Quick match error', { error: err })
      const errorMessage = 'Failed to find session. Please check your connection and try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setCreatingSession(false)
    }
  }

  const handleCreateWithSelected = async () => {
    if (selectedUsers.size === 0) {
      const errorMessage = 'Please select at least one user'
      setError(errorMessage)
      toast.error(errorMessage)
      return
    }

    setCreatingSession(true)
    setError(null)

    try {
      const response = await fetch('/api/matchmaking/find-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createIfNoMatch: true,
          maxParticipants: selectedUsers.size + 1,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to create session'
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      if (data.type === 'new_session') {
        toast.success('Session created! Joining now...')
        const roomCode = data.session.roomCode
        router.push(`/session/${roomCode}`)
        onClose()
      } else {
        const errorMessage = 'Failed to create session'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (err) {
      logger.error('Create session error', { error: err })
      const errorMessage = 'Failed to create session. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setCreatingSession(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl mx-4 max-h-[90vh] bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-lime-400/10 to-green-500/10 border-b border-[#27272a] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-lime-400 rounded-xl">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold">Find a Session</h2>
              <p className="text-sm text-[#a1a1aa]">
                Connect with compatible developers who are online now
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setMode('quick')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'quick'
                  ? 'bg-lime-400 text-black'
                  : 'bg-[#2a2a2a] text-[#a1a1aa] hover:bg-[#333333]'
              }`}
            >
              ⚡ Quick Match
            </button>
            <button
              onClick={() => setMode('browse')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'browse'
                  ? 'bg-lime-400 text-black'
                  : 'bg-[#2a2a2a] text-[#a1a1aa] hover:bg-[#333333]'
              }`}
            >
              <Users className="inline-block w-4 h-4 mr-1" />
              Browse Users
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Quick Match Mode */}
          {mode === 'quick' && (
            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-lime-400/10 to-green-500/10 border border-lime-400/20 rounded-xl text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-lime-400" />
                <h3 className="text-xl font-bold mb-2">Instant Matchmaking</h3>
                <p className="text-sm text-[#a1a1aa] mb-4">
                  We'll find the best compatible users and create a session instantly
                </p>
                <button
                  onClick={handleQuickMatch}
                  disabled={creatingSession}
                  className="px-8 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {creatingSession ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Finding Match...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Find Match Now
                    </>
                  )}
                </button>
              </div>

              <div className="text-center text-sm text-[#71717a]">
                <p>or switch to Browse Users to select specific people</p>
              </div>
            </div>
          )}

          {/* Browse Mode */}
          {mode === 'browse' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Compatible Users Online</h3>
                  <p className="text-sm text-[#a1a1aa]">
                    {users.length} {users.length === 1 ? 'user' : 'users'} available
                    {selectedUsers.size > 0 && ` • ${selectedUsers.size} selected`}
                  </p>
                </div>
                <button
                  onClick={fetchCompatibleUsers}
                  disabled={loading}
                  className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <UserCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {/* User List */}
              {!loading && !error && users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-[#71717a]" />
                  <p className="text-[#a1a1aa]">No compatible users online right now</p>
                  <p className="text-sm text-[#71717a] mt-2">
                    Try again later or update your profile
                  </p>
                </div>
              )}

              {!loading && users.length > 0 && (
                <div className="space-y-3">
                  {users.map(user => (
                    <UserMatchCard
                      key={user.id}
                      user={user}
                      selected={selectedUsers.has(user.id)}
                      onSelect={() => toggleUserSelection(user.id)}
                      showMatchDetails={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'browse' && (
          <div className="border-t border-[#27272a] p-6">
            <button
              onClick={handleCreateWithSelected}
              disabled={selectedUsers.size === 0 || creatingSession}
              className="w-full px-6 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creatingSession ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Create Session with Selected Users
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
