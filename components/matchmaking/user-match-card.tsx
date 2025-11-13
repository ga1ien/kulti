"use client"

import { Users, Sparkles } from "lucide-react"
import Image from "next/image"

interface UserMatchCardProps {
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
    skills?: string[]
    interests?: string[]
    experienceLevel?: string
    matchScore: number
    sharedSkills?: string[]
    sharedInterests?: string[]
  }
  selected?: boolean
  onSelect?: () => void
  showMatchDetails?: boolean
}

export function UserMatchCard({
  user,
  selected = false,
  onSelect,
  showMatchDetails = true,
}: UserMatchCardProps) {
  const displayName = user.displayName || user.username
  const matchPercentage = Math.round(user.matchScore * 100)
  const experienceLabels = {
    beginner: '🌱 Beginner',
    intermediate: '⚡ Intermediate',
    advanced: '🚀 Advanced',
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
        selected
          ? 'border-lime-400 bg-lime-400/10'
          : 'border-[#27272a] bg-[#1a1a1a] hover:border-[#333333]'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={displayName}
              width={48}
              height={48}
              className="rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-black" />
            </div>
          )}
          {/* Match Score Badge */}
          {showMatchDetails && (
            <div className="absolute -top-1 -right-1 bg-lime-400 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {matchPercentage}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white truncate">{displayName}</h3>
            {user.experienceLevel && (
              <span className="text-xs text-[#a1a1aa]">
                {experienceLabels[user.experienceLevel as keyof typeof experienceLabels] || user.experienceLevel}
              </span>
            )}
          </div>

          {/* Shared Skills */}
          {showMatchDetails && user.sharedSkills && user.sharedSkills.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-lime-400 font-medium mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Shared Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {user.sharedSkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-lime-400/20 text-lime-400 text-xs rounded-md font-mono"
                  >
                    {skill}
                  </span>
                ))}
                {user.sharedSkills.length > 3 && (
                  <span className="text-xs text-[#a1a1aa]">
                    +{user.sharedSkills.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Shared Interests */}
          {showMatchDetails && user.sharedInterests && user.sharedInterests.length > 0 && (
            <div>
              <p className="text-xs text-green-400 font-medium mb-1">Shared Interests</p>
              <div className="flex flex-wrap gap-1">
                {user.sharedInterests.slice(0, 2).map((interest) => (
                  <span
                    key={interest}
                    className="px-2 py-0.5 bg-green-400/20 text-green-400 text-xs rounded-md"
                  >
                    {interest}
                  </span>
                ))}
                {user.sharedInterests.length > 2 && (
                  <span className="text-xs text-[#a1a1aa]">
                    +{user.sharedInterests.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* All Skills (if no match details) */}
          {!showMatchDetails && user.skills && user.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {user.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 bg-[#2a2a2a] text-[#a1a1aa] text-xs rounded-md font-mono"
                >
                  {skill}
                </span>
              ))}
              {user.skills.length > 3 && (
                <span className="text-xs text-[#a1a1aa]">
                  +{user.skills.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Selected Indicator */}
        {selected && (
          <div className="w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}
