"use client"

import { useEffect } from "react"
import { Award, Coins, Sparkles, X } from "lucide-react"
import confetti from "canvas-confetti"

interface Achievement {
  type: "badge" | "credits" | "milestone"
  title: string
  description: string
  credits?: number
}

interface AchievementCelebrationProps {
  achievement: Achievement
  isOpen: boolean
  onClose: () => void
}

export const AchievementCelebration = ({
  achievement,
  isOpen,
  onClose,
}: AchievementCelebrationProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#a3e635", "#84cc16", "#65a30d"],
      })

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        onClose()
      }, 3000)

      return () => {
        clearTimeout(timer)
        document.body.style.overflow = "unset"
      }
    } else {
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getIcon = () => {
    switch (achievement.type) {
      case "badge":
        return <Award className="w-16 h-16 text-lime-400" />
      case "credits":
        return <Coins className="w-16 h-16 text-lime-400" />
      case "milestone":
        return <Sparkles className="w-16 h-16 text-lime-400" />
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-labelledby="achievement-title"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-[#18181b] via-[#27272a] to-[#18181b] border-2 border-lime-400/30 rounded-2xl shadow-2xl shadow-lime-400/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-lime-400/0 via-lime-400/10 to-lime-400/0 rounded-2xl animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5 text-[#a1a1aa]" />
        </button>

        {/* Content */}
        <div className="relative p-8 space-y-6 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-6 bg-lime-400/10 border-2 border-lime-400/30 rounded-full animate-bounce">
              {getIcon()}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="text-sm font-bold text-lime-400 uppercase tracking-wider">
              Achievement Unlocked!
            </div>
            <h2 id="achievement-title" className="text-3xl font-bold">
              {achievement.title}
            </h2>
            <p className="text-lg text-[#a1a1aa]">{achievement.description}</p>
          </div>

          {/* Credits Display */}
          {achievement.credits !== undefined && achievement.credits > 0 && (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-lime-400/10 border border-lime-400/20 rounded-full">
              <Coins className="w-5 h-5 text-lime-400" />
              <span className="text-xl font-bold text-lime-400">
                +{achievement.credits} Credits
              </span>
            </div>
          )}

          {/* Auto-dismiss notice */}
          <p className="text-xs text-[#a1a1aa]">
            This will close automatically in a few seconds
          </p>
        </div>
      </div>
    </div>
  )
}
