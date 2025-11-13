"use client"

import { useState, useEffect } from "react"
import { X, Link as LinkIcon, Copy, Check, RefreshCw, AlertCircle, Users } from "lucide-react"

interface PresenterInviteModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
}

export function PresenterInviteModal({
  isOpen,
  onClose,
  sessionId,
}: PresenterInviteModalProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [isRevoked, setIsRevoked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current invite status
  useEffect(() => {
    if (isOpen) {
      fetchInviteStatus()
    }
  }, [isOpen, sessionId])

  const fetchInviteStatus = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/presenter-invite`)
      if (response.ok) {
        const data = await response.json()
        setInviteUrl(data.inviteUrl)
        setIsRevoked(data.isRevoked)
      }
    } catch (error) {
      console.error('Failed to fetch invite status:', error)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/presenter-invite`,
        {
          method: 'POST',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to generate invite link')
        return
      }

      setInviteUrl(data.inviteUrl)
      setIsRevoked(false)
    } catch (error) {
      console.error('Failed to generate invite:', error)
      setError('Failed to generate invite link')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this invite link? It will no longer work.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/presenter-invite`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to revoke invite link')
        return
      }

      setIsRevoked(true)
    } catch (error) {
      console.error('Failed to revoke invite:', error)
      setError('Failed to revoke invite link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-[#27272a] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold">Presenter Invite</h2>
              <p className="text-sm text-[#a1a1aa]">Share this link to invite presenters</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Banner */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex gap-3">
              <LinkIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-400 font-medium mb-1">How it works</p>
                <ul className="text-[#a1a1aa] space-y-1 text-xs">
                  <li>• Share this link with people you want as presenters</li>
                  <li>• They can join as guests without creating an account</li>
                  <li>• They'll be able to share their screen</li>
                  <li>• Link is valid only for this session</li>
                  <li>• You can revoke the link anytime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Invite Link Display */}
          {inviteUrl && !isRevoked ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#a1a1aa]">
                Invite Link
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-[#27272a] rounded-lg font-mono text-sm text-[#e5e5e5] truncate">
                  {inviteUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-lime-400 hover:bg-lime-500 text-black rounded-lg transition-colors font-bold flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate Link
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Revoke Link
                </button>
              </div>
            </div>
          ) : isRevoked ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Link Revoked</span>
              </div>
              <p className="text-sm text-[#a1a1aa] mt-2">
                This invite link has been revoked and no longer works. Generate a new one to invite presenters.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-[#a1a1aa] text-sm mb-4">
                No active invite link. Generate one to start inviting presenters.
              </p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Invite Link'}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
