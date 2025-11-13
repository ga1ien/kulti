"use client"

import { useEffect, useState } from "react"
import { X, Coins, Trophy, Clock, TrendingUp, Star } from "lucide-react"
import { formatCredits } from "@/lib/credits/config"
import Link from "next/link"

interface SessionEndModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
}

interface SessionSummary {
  total_credits_earned: number
  base_credits: number
  bonuses: {
    active_chat?: number
    helped_others?: number
    repeat_viewer?: number
    completion?: number
  }
  milestones?: Array<{
    label: string
    reward: number
  }>
  watch_duration_seconds: number
  role: string
}

export function SessionEndModal({ isOpen, onClose, sessionId }: SessionEndModalProps) {
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchSessionSummary()
    }
  }, [isOpen, sessionId])

  const fetchSessionSummary = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/summary`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error("Failed to fetch session summary:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const totalBonuses = summary
    ? Object.values(summary.bonuses).reduce((sum, val) => sum + (val || 0), 0)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
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
              <Coins className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold">Session Complete!</h2>
              <p className="text-sm text-[#a1a1aa]">Here's what you earned</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#a1a1aa]">Calculating your earnings...</p>
            </div>
          ) : summary ? (
            <>
              {/* Total Credits Earned */}
              <div className="text-center py-8 bg-[#2a2a2a] rounded-xl border border-[#27272a]">
                <p className="text-sm text-[#a1a1aa] mb-2">Total Credits Earned</p>
                <p className="font-mono text-5xl font-bold text-lime-400 mb-4">
                  +{formatCredits(summary.total_credits_earned)}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-[#71717a]">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(summary.watch_duration_seconds)}</span>
                  <span>·</span>
                  <span className="capitalize">{summary.role}</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-[#a1a1aa]">Breakdown</h3>

                {/* Base Credits */}
                <div className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-lime-400" />
                    <span>Base Credits</span>
                  </div>
                  <span className="font-mono font-bold text-lime-400">
                    +{formatCredits(summary.base_credits)}
                  </span>
                </div>

                {/* Bonuses */}
                {totalBonuses > 0 && (
                  <div className="space-y-2">
                    {summary.bonuses.active_chat && (
                      <div className="flex items-center justify-between p-3 bg-[#2a2a2a]/50 rounded-lg text-sm">
                        <span className="text-[#a1a1aa]">Active Chat Bonus</span>
                        <span className="font-mono text-green-500">
                          +{formatCredits(summary.bonuses.active_chat)}
                        </span>
                      </div>
                    )}
                    {summary.bonuses.helped_others && (
                      <div className="flex items-center justify-between p-3 bg-[#2a2a2a]/50 rounded-lg text-sm">
                        <span className="text-[#a1a1aa]">Helper Bonus</span>
                        <span className="font-mono text-green-500">
                          +{formatCredits(summary.bonuses.helped_others)}
                        </span>
                      </div>
                    )}
                    {summary.bonuses.repeat_viewer && (
                      <div className="flex items-center justify-between p-3 bg-[#2a2a2a]/50 rounded-lg text-sm">
                        <span className="text-[#a1a1aa]">Repeat Viewer Bonus</span>
                        <span className="font-mono text-green-500">
                          +{formatCredits(summary.bonuses.repeat_viewer)}
                        </span>
                      </div>
                    )}
                    {summary.bonuses.completion && (
                      <div className="flex items-center justify-between p-3 bg-[#2a2a2a]/50 rounded-lg text-sm">
                        <span className="text-[#a1a1aa]">Completion Bonus</span>
                        <span className="font-mono text-green-500">
                          +{formatCredits(summary.bonuses.completion)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Milestones */}
              {summary.milestones && summary.milestones.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-500 animate-bounce" />
                    <h3 className="font-bold text-yellow-500">Milestones Unlocked!</h3>
                  </div>
                  <div className="space-y-2">
                    {summary.milestones.map((milestone, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>{milestone.label}</span>
                        </div>
                        <span className="font-mono font-bold text-yellow-500">
                          +{formatCredits(milestone.reward)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Link
                  href="/credits"
                  className="flex-1 px-6 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors text-center"
                >
                  View Credits
                </Link>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#a1a1aa]">Failed to load session summary</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-[#2a2a2a] hover:bg-[#333333] rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
