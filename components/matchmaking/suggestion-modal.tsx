"use client"

import { useState } from "react"
import { X, Loader2, Clock, Sparkles } from "lucide-react"
import { UserMatchCard } from "./user-match-card"
import { useRouter } from "next/navigation"
import { MatchReason } from "@/types/database"
import { logger } from '@/lib/logger'

interface SuggestionUser {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  skills: string[]
  interests: string[]
  experienceLevel: string
}

interface Suggestion {
  id: string
  matchScore: number
  matchReasons: MatchReason[]
  status: string
  expiresAt: string
  createdAt: string
  sessionId?: string
  suggestedUsers: SuggestionUser[]
}

interface SuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  suggestion: Suggestion
}

export function SuggestionModal({ isOpen, onClose, suggestion }: SuggestionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matchPercentage = Math.round(suggestion.matchScore * 100)
  const expiresAt = new Date(suggestion.expiresAt)
  const now = new Date()
  const minutesLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 60000))

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/matchmaking/suggestions/${suggestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted',
          createSession: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept suggestion')
        return
      }

      // Navigate to session
      if (data.session) {
        router.push(`/session/${data.session.roomCode}`)
        onClose()
      }
    } catch (err) {
      logger.error('Accept suggestion error', { error: err })
      setError('Failed to accept suggestion')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/matchmaking/suggestions/${suggestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to decline suggestion')
        return
      }

      onClose()
    } catch (err) {
      logger.error('Decline suggestion error:', { error: err })
      setError('Failed to decline suggestion')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-mono text-2xl font-bold">Perfect Match!</h2>
                <span className="px-3 py-1 bg-lime-400 text-black text-sm font-bold rounded-full">
                  {matchPercentage}% Match
                </span>
              </div>
              <p className="text-sm text-[#a1a1aa] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Expires in {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">
                {suggestion.suggestedUsers.length} {suggestion.suggestedUsers.length === 1 ? 'Developer' : 'Developers'} Match Your Interests
              </h3>
              <p className="text-sm text-[#a1a1aa]">
                We found compatible developers who are online right now and share your skills and interests
              </p>
            </div>

            {/* User Cards */}
            <div className="space-y-3">
              {suggestion.suggestedUsers.map(user => {
                // Calculate match info from matchReasons
                const userReasons = Array.isArray(suggestion.matchReasons)
                  ? suggestion.matchReasons.find((r) => r.user_id === user.id)
                  : null

                return (
                  <UserMatchCard
                    key={user.id}
                    user={{
                      ...user,
                      matchScore: suggestion.matchScore,
                      sharedSkills: userReasons?.shared_skills || [],
                      sharedInterests: userReasons?.shared_interests || [],
                    }}
                    showMatchDetails={true}
                  />
                )
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-lime-400/10 border border-lime-400/20 rounded-xl">
              <p className="text-sm text-lime-400">
                💡 <strong>Accepting</strong> will create a new session and invite these developers to join you
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#27272a] p-6">
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Maybe Later'}
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Accept & Create Session
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
