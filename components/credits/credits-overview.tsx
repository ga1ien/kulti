"use client"

import { useEffect, useState } from "react"
import { Coins, TrendingUp, TrendingDown, Activity, Loader2 } from "lucide-react"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { formatCredits } from "@/lib/credits/config"
import { logger } from '@/lib/logger'

interface CreditsOverviewProps {
  userId: string
}

interface UserStats {
  credits_balance: number
  total_credits_earned: number
  total_credits_spent: number
  sessions_attended: number
  sessions_hosted: number
  total_watch_hours: number
  milestones_achieved: number
}

export function CreditsOverview({ userId }: CreditsOverviewProps) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/credits/balance?includeStats=true`)
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (error) {
        logger.error("Failed to fetch stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  if (loading) {
    return (
      <div className="grid md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <LoadingSkeleton className="w-9 h-9 rounded-lg" />
              <LoadingSkeleton className="h-4 w-24" />
            </div>
            <LoadingSkeleton className="h-9 w-20 mb-2" />
            <LoadingSkeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6">
        <p className="text-[#a1a1aa]">Failed to load stats</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {/* Current Balance */}
      <div className="bg-[#1a1a1a] border border-[#27272a] hover:border-lime-400 rounded-xl p-6 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-lime-400/10 rounded-lg">
            <Coins className="w-5 h-5 text-lime-400" />
          </div>
          <h3 className="text-sm font-medium text-[#a1a1aa]">Current Balance</h3>
        </div>
        <p className="font-mono text-3xl font-bold text-lime-400">
          {formatCredits(stats.credits_balance)}
        </p>
      </div>

      {/* Total Earned */}
      <div className="bg-[#1a1a1a] border border-[#27272a] hover:border-green-500 rounded-xl p-6 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-[#a1a1aa]">Lifetime Earned</h3>
        </div>
        <p className="font-mono text-3xl font-bold text-green-500">
          {formatCredits(stats.total_credits_earned)}
        </p>
        <p className="text-xs text-[#71717a] mt-2">
          {stats.sessions_attended} sessions · {stats.sessions_hosted} hosted
        </p>
      </div>

      {/* Total Spent */}
      <div className="bg-[#1a1a1a] border border-[#27272a] hover:border-red-500 rounded-xl p-6 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-sm font-medium text-[#a1a1aa]">Lifetime Spent</h3>
        </div>
        <p className="font-mono text-3xl font-bold text-red-500">
          {formatCredits(stats.total_credits_spent)}
        </p>
      </div>

      {/* Activity Stats */}
      <div className="bg-[#1a1a1a] border border-[#27272a] hover:border-blue-500 rounded-xl p-6 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-sm font-medium text-[#a1a1aa]">Activity</h3>
        </div>
        <p className="font-mono text-3xl font-bold text-blue-500">
          {Math.round(stats.total_watch_hours)}h
        </p>
        <p className="text-xs text-[#71717a] mt-2">
          {stats.milestones_achieved} milestones achieved
        </p>
      </div>
    </div>
  )
}
