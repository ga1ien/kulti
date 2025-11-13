"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Users, Loader2, AlertCircle, Video } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"

const PresenterJoinPageContent = () => {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionInfo, setSessionInfo] = useState<{
    title: string
    roomCode: string
  } | null>(null)

  // Validate token on mount
  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(
        `/api/sessions/join-as-presenter?token=${token}`
      )

      if (!response.ok) {
        setError('This invite link is invalid or has expired.')
        return
      }

      const data = await response.json()
      setSessionInfo({
        title: data.session.title,
        roomCode: data.session.roomCode,
      })
    } catch (error) {
      console.error('Token validation error:', error)
      setError('Failed to validate invite link.')
    } finally {
      setValidating(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions/join-as-presenter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          displayName: displayName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to join session')
        return
      }

      // Store guest session data in sessionStorage
      sessionStorage.setItem('guestPresenter', JSON.stringify({
        guestId: data.guestId,
        displayName: data.displayName,
        hmsToken: data.hmsToken,
        sessionId: data.sessionId,
      }))

      // Redirect to session room
      router.push(`/s/${data.roomCode}`)
    } catch (error) {
      console.error('Join error:', error)
      setError('Failed to join session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-lime-400 animate-spin mx-auto mb-4" />
          <p className="text-[#a1a1aa]">Validating invite link...</p>
        </div>
      </div>
    )
  }

  if (error && !sessionInfo) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a1a] border border-[#27272a] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-mono text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-[#a1a1aa] mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1a1a] border border-[#27272a] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-[#27272a] p-8 text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-mono text-3xl font-bold mb-2">Join as Presenter</h1>
          {sessionInfo && (
            <div className="mt-4 p-3 bg-[#2a2a2a] rounded-lg">
              <p className="text-sm text-[#71717a] mb-1">You're joining</p>
              <p className="font-bold text-lg">{sessionInfo.title}</p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleJoin} className="space-y-6">
            {/* Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-400 font-medium mb-1">As a presenter you can:</p>
                  <ul className="text-[#a1a1aa] space-y-1 text-xs">
                    <li>• Share your screen with viewers</li>
                    <li>• Collaborate with the host</li>
                    <li>• No account required</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-[#a1a1aa] mb-2"
              >
                Enter your name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white placeholder:text-[#71717a] focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
              <p className="text-xs text-[#71717a] mt-2">
                This is how you'll appear to others in the session
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  Join Session
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function PresenterJoinPage() {
  return (
    <ErrorBoundary>
      <PresenterJoinPageContent />
    </ErrorBoundary>
  )
}
