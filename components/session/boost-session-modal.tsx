"use client"

import { useState } from "react"
import { X, TrendingUp, Star, Coins, Clock, Eye } from "lucide-react"
import { formatCredits, FEATURE_COSTS } from "@/lib/credits/config"
import { notifyCreditsSpent, notifyInsufficientCredits } from "@/lib/credits/notifications"
import { logger } from '@/lib/logger'

interface BoostSessionModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  sessionTitle: string
  currentBalance: number
  onSuccess?: () => void
}

export function BoostSessionModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  currentBalance,
  onSuccess,
}: BoostSessionModalProps) {
  const [loading, setLoading] = useState(false)
  const boostCost = FEATURE_COSTS.FEATURED_SESSION

  const handleBoost = async () => {
    if (currentBalance < boostCost) {
      notifyInsufficientCredits(boostCost, currentBalance)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/boost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        notifyCreditsSpent(boostCost, 'Session Boosted')
        onSuccess?.()
        onClose()
      } else {
        if (response.status === 402) {
          notifyInsufficientCredits(boostCost, currentBalance)
        } else {
          alert(data.error || 'Failed to boost session')
        }
      }
    } catch (error) {
      logger.error('Boost error:', error)
      alert('Failed to boost session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const canAfford = currentBalance >= boostCost

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-lime-400/10 to-green-500/10 border-b border-[#27272a] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-lime-400 rounded-xl">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold">Boost Session</h2>
              <p className="text-sm text-[#a1a1aa]">Feature your session</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Session Title */}
          <div className="p-4 bg-[#2a2a2a] rounded-xl">
            <p className="text-sm text-[#a1a1aa] mb-1">Boosting:</p>
            <p className="font-bold text-lg line-clamp-1">{sessionTitle}</p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-[#a1a1aa]">Benefits</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-[#2a2a2a]/50 rounded-lg">
                <Star className="w-5 h-5 text-lime-400 mt-0.5" />
                <div>
                  <p className="font-medium">Featured Badge</p>
                  <p className="text-sm text-[#71717a]">
                    Stand out with a prominent featured badge
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#2a2a2a]/50 rounded-lg">
                <Eye className="w-5 h-5 text-lime-400 mt-0.5" />
                <div>
                  <p className="font-medium">Top Placement</p>
                  <p className="text-sm text-[#71717a]">
                    Appear at the top of browse and dashboard
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#2a2a2a]/50 rounded-lg">
                <Clock className="w-5 h-5 text-lime-400 mt-0.5" />
                <div>
                  <p className="font-medium">24 Hour Duration</p>
                  <p className="text-sm text-[#71717a]">
                    Boost lasts for a full 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost & Balance */}
          <div className="p-4 bg-[#2a2a2a] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#a1a1aa]">Cost</span>
              <span className="font-mono font-bold text-lime-400 text-lg">
                {formatCredits(boostCost)} credits
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#a1a1aa]">Your Balance</span>
              <span className={`font-mono font-bold text-lg ${
                canAfford ? 'text-white' : 'text-red-500'
              }`}>
                {formatCredits(currentBalance)} credits
              </span>
            </div>
            {canAfford && (
              <div className="pt-3 border-t border-[#27272a]">
                <div className="flex items-center justify-between">
                  <span className="text-[#a1a1aa]">After Boost</span>
                  <span className="font-mono font-bold">
                    {formatCredits(currentBalance - boostCost)} credits
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Insufficient Balance Warning */}
          {!canAfford && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-500">
                You need {formatCredits(boostCost - currentBalance)} more credits to boost this session.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBoost}
              disabled={loading || !canAfford}
              className={`flex-1 px-6 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                canAfford && !loading
                  ? 'bg-lime-400 hover:bg-lime-500 text-black'
                  : 'bg-[#2a2a2a] text-[#71717a] cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Boosting...
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5" />
                  Boost Session
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
