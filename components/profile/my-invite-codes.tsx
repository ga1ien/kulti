'use client'

import { useEffect, useState } from 'react'
import { Ticket, Users, TrendingUp, Copy, Check, Sparkles, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Invite } from '@/types/database'
import { logger } from '@/lib/logger'

interface MyInviteCodesProps {
  userId: string
}

export function MyInviteCodes({ userId }: MyInviteCodesProps) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    fetchMyCodes()
  }, [])

  useEffect(() => {
    // Show welcome toast if this is their first time viewing codes and they have codes
    const welcomeShownKey = `invite-codes-welcome-shown-${userId}`
    const hasShownWelcome = localStorage.getItem(welcomeShownKey)

    if (!hasShownWelcome && !loading && invites.length > 0) {
      // Show fun creative toast notification
      toast((t) => (
        <div className="flex items-start gap-3 max-w-md">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center">
            <Gift className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-lime-400" />
              <h3 className="font-bold text-white">You've Got Golden Tickets!</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Share your <span className="font-mono text-lime-400">{invites.length} invite codes</span> with friends and earn <span className="font-bold text-lime-400">50 credits</span> for each signup. That's potential <span className="font-bold text-lime-400">{invites.length * 50} credits</span> waiting for you! 🎉
            </p>
          </div>
        </div>
      ), {
        duration: 8000,
        position: 'top-center',
        style: {
          background: '#18181b',
          border: '2px solid #a3e635',
          borderRadius: '12px',
          padding: '16px',
          maxWidth: '500px',
        },
      })

      localStorage.setItem(welcomeShownKey, 'true')
    }
  }, [loading, invites.length, userId])

  async function fetchMyCodes() {
    try {
      const response = await fetch('/api/invites/my-codes')
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      }
    } catch (error) {
      logger.error('Failed to fetch my codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const copyLinkToClipboard = (code: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const shareableLink = `${baseUrl}/signup?invite=${code}`
    navigator.clipboard.writeText(shareableLink)
    setCopiedLink(code)
    toast.success('Shareable link copied!')
    setTimeout(() => setCopiedLink(null), 2000)
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-gray-500">Loading your invite codes...</p>
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
        <Ticket className="mx-auto h-12 w-12 text-gray-600" />
        <p className="mt-4 text-gray-500">
          Your invite codes are being generated...
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Refresh the page in a moment
        </p>
      </div>
    )
  }

  const totalUses = invites.reduce((sum, inv) => sum + inv.current_uses, 0)
  const totalCreditsEarned = totalUses * 50 // 50 credits per referral

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-5 w-5 text-lime-400" />
            <span className="text-sm text-gray-400">My Codes</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {invites.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-lime-400" />
            <span className="text-sm text-gray-400">Total Referrals</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalUses}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-lime-400" />
            <span className="text-sm text-gray-400">Credits Earned</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalCreditsEarned}
          </p>
        </div>
      </div>

      {/* Codes List */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 p-4">
          <h3 className="font-semibold text-white">Your Invite Codes</h3>
          <p className="text-sm text-gray-400 mt-1">
            Share these codes with friends. You'll earn 50 credits for each signup!
          </p>
        </div>
        <div className="divide-y divide-gray-800">
          {invites.map((invite) => (
            <div key={invite.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="rounded bg-gray-800 px-3 py-1.5 text-sm font-mono text-lime-400">
                    {invite.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(invite.code)}
                    className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
                    title="Copy code"
                  >
                    {copiedCode === invite.code ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyLinkToClipboard(invite.code)}
                    className="px-3 py-1.5 rounded bg-lime-400/10 hover:bg-lime-400/20 border border-lime-400/30 text-lime-400 text-sm font-medium transition-colors flex items-center gap-1.5"
                    title="Copy shareable link"
                  >
                    {copiedLink === invite.code ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  {invite.metadata?.note && (
                    <span className="text-xs text-gray-500 ml-2">
                      {invite.metadata.note}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {invite.current_uses} / {invite.max_uses} uses
                  </p>
                  <p className="text-xs text-lime-400">
                    {invite.current_uses * 50} credits earned
                  </p>
                </div>
              </div>
              {invite.expires_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                </p>
              )}
              {!invite.is_active && (
                <p className="text-xs text-red-500 mt-2">
                  This code is currently inactive
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
