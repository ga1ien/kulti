"use client"

import { useEffect, useState } from "react"
import { Trophy, Star, Target } from "lucide-react"
import { formatCredits } from "@/lib/credits/config"
import { logger } from '@/lib/logger'

interface CreditsMilestonesProps {
  userId: string
}

interface Milestone {
  id: string
  milestone_type: string
  credits_awarded: number
  achieved_at: string
}

interface MilestoneProgress {
  type: string
  label: string
  description: string
  reward: number
  achieved: boolean
  progress?: number
  total?: number
  achieved_at?: string
}

const MILESTONE_DEFINITIONS = [
  {
    type: "first_session",
    label: "First Steps",
    description: "Join your first session",
    reward: 100,
    icon: Star,
  },
  {
    type: "first_stream",
    label: "First Stream",
    description: "Host your first session",
    reward: 500,
    icon: Star,
  },
  {
    type: "sessions_attended_10",
    label: "Regular Attendee",
    description: "Attend 10 sessions",
    reward: 500,
    icon: Target,
  },
  {
    type: "sessions_attended_50",
    label: "Dedicated Learner",
    description: "Attend 50 sessions",
    reward: 3000,
    icon: Target,
  },
  {
    type: "sessions_attended_100",
    label: "Session Master",
    description: "Attend 100 sessions",
    reward: 7500,
    icon: Trophy,
  },
  {
    type: "sessions_hosted_10",
    label: "Active Streamer",
    description: "Host 10 sessions",
    reward: 2500,
    icon: Target,
  },
  {
    type: "sessions_hosted_50",
    label: "Community Leader",
    description: "Host 50 sessions",
    reward: 15000,
    icon: Trophy,
  },
  {
    type: "hours_watched_10",
    label: "10 Hour Club",
    description: "Watch 10 hours of content",
    reward: 1000,
    icon: Target,
  },
  {
    type: "hours_watched_100",
    label: "Century Watcher",
    description: "Watch 100 hours of content",
    reward: 15000,
    icon: Trophy,
  },
  {
    type: "credits_earned_10k",
    label: "Credit Collector",
    description: "Earn 10,000 credits",
    reward: 2000,
    icon: Target,
  },
  {
    type: "credits_earned_100k",
    label: "Credit Tycoon",
    description: "Earn 100,000 credits",
    reward: 25000,
    icon: Trophy,
  },
]

export function CreditsMilestones({ userId }: CreditsMilestonesProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch achieved milestones
        const milestonesResponse = await fetch(`/api/credits/milestones`)
        if (milestonesResponse.ok) {
          const data = await milestonesResponse.json()
          setMilestones(data.milestones)
        }

        // Fetch stats for progress
        const statsResponse = await fetch(`/api/credits/balance?includeStats=true`)
        if (statsResponse.ok) {
          const data = await statsResponse.json()
          setStats(data.stats)
        }
      } catch (error) {
        logger.error("Failed to fetch milestones:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const getMilestoneProgress = (): MilestoneProgress[] => {
    if (!stats) return []

    const achievedTypes = new Set(milestones.map((m) => m.milestone_type))

    return MILESTONE_DEFINITIONS.map((def) => {
      const achieved = achievedTypes.has(def.type)
      const achievedMilestone = milestones.find((m) => m.milestone_type === def.type)

      let progress = 0
      let total = 0

      // Calculate progress for unachieved milestones
      if (!achieved) {
        if (def.type.includes("sessions_attended")) {
          const target = parseInt(def.type.split("_").pop() || "0")
          progress = stats.sessions_attended
          total = target
        } else if (def.type.includes("sessions_hosted")) {
          const target = parseInt(def.type.split("_").pop() || "0")
          progress = stats.sessions_hosted
          total = target
        } else if (def.type.includes("hours_watched")) {
          const target = parseInt(def.type.split("_").pop() || "0")
          progress = Math.floor(stats.total_watch_hours)
          total = target
        } else if (def.type.includes("credits_earned")) {
          const target = parseInt(def.type.split("_").pop()?.replace("k", "000") || "0")
          progress = stats.total_credits_earned
          total = target
        }
      }

      return {
        type: def.type,
        label: def.label,
        description: def.description,
        reward: def.reward,
        achieved,
        progress,
        total,
        achieved_at: achievedMilestone?.achieved_at,
      }
    })
  }

  const milestoneProgress = getMilestoneProgress()
  const achievedMilestones = milestoneProgress.filter((m) => m.achieved)
  const nextMilestones = milestoneProgress
    .filter((m) => !m.achieved && m.total && m.progress !== undefined)
    .sort((a, b) => {
      const aPercent = (a.progress || 0) / (a.total || 1)
      const bPercent = (b.progress || 0) / (b.total || 1)
      return bPercent - aPercent
    })
    .slice(0, 3)

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6 animate-pulse">
        <h2 className="font-mono text-2xl font-bold mb-6">Milestones</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#2a2a2a] rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-2xl font-bold">Milestones</h2>
        <div className="px-3 py-1 bg-lime-400/10 rounded-full">
          <span className="text-sm font-bold text-lime-400">
            {achievedMilestones.length}/{MILESTONE_DEFINITIONS.length}
          </span>
        </div>
      </div>

      {/* Next Milestones */}
      {nextMilestones.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Up Next</h3>
          <div className="space-y-3">
            {nextMilestones.map((milestone) => {
              const def = MILESTONE_DEFINITIONS.find((d) => d.type === milestone.type)
              const Icon = def?.icon || Star
              const progressPercent = milestone.total
                ? Math.min(100, ((milestone.progress || 0) / milestone.total) * 100)
                : 0

              return (
                <div
                  key={milestone.type}
                  className="p-4 bg-[#2a2a2a] rounded-lg border border-[#27272a]"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-[#1a1a1a] rounded-lg">
                      <Icon className="w-4 h-4 text-[#a1a1aa]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{milestone.label}</p>
                        <span className="text-xs font-mono text-lime-400">
                          +{formatCredits(milestone.reward)}
                        </span>
                      </div>
                      <p className="text-sm text-[#71717a]">{milestone.description}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[#71717a]">
                      <span>
                        {milestone.progress?.toLocaleString()} / {milestone.total?.toLocaleString()}
                      </span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Achieved Milestones */}
      {achievedMilestones.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Achieved</h3>
          <div className="space-y-2">
            {achievedMilestones.map((milestone) => {
              const def = MILESTONE_DEFINITIONS.find((d) => d.type === milestone.type)
              const Icon = def?.icon || Trophy

              return (
                <div
                  key={milestone.type}
                  className="flex items-center gap-3 p-3 bg-[#2a2a2a]/50 rounded-lg"
                >
                  <div className="p-2 bg-lime-400/10 rounded-lg">
                    <Icon className="w-4 h-4 text-lime-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{milestone.label}</p>
                    <p className="text-xs text-[#71717a]">
                      {milestone.achieved_at &&
                        new Date(milestone.achieved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-lime-400">
                    +{formatCredits(milestone.reward)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {achievedMilestones.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-[#a1a1aa] mx-auto mb-4" />
          <p className="text-[#a1a1aa]">No milestones yet</p>
          <p className="text-sm text-[#71717a] mt-2">
            Start earning to unlock achievements
          </p>
        </div>
      )}
    </div>
  )
}
