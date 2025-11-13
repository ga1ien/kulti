"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Session, Profile } from "@/types/database"
import { Users, Clock, Star, TrendingUp } from "lucide-react"
import { formatTime } from "@/lib/utils"
import { BoostSessionModal } from "@/components/session/boost-session-modal"
import { createClient } from "@/lib/supabase/client"

interface SessionCardProps {
  session: Session & {
    host: Profile
    participants?: { count: number }[]
  }
  currentUserId?: string
}

export function SessionCard({ session, currentUserId }: SessionCardProps) {
  const participantCount = session.participants?.[0]?.count || 0
  const isBoosted = session.boosted_until && new Date(session.boosted_until) > new Date()
  const isHost = currentUserId && session.host_id === currentUserId
  const canBoost = isHost && !isBoosted && session.status === 'live'

  const [showBoostModal, setShowBoostModal] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(0)

  useEffect(() => {
    if (isHost) {
      fetchBalance()
    }
  }, [isHost])

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/credits/balance')
      if (response.ok) {
        const data = await response.json()
        setCurrentBalance(data.credits_balance || 0)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  const handleBoostSuccess = () => {
    // Refresh the page to show updated boost status
    window.location.reload()
  }

  return (
    <>
      <div className={`relative group border rounded-2xl p-8 bg-[#1a1a1a]/50 backdrop-blur-sm hover:border-lime-400 hover:-translate-y-1 transition-all duration-300 animate-fade-in ${
        isBoosted ? "border-lime-400/50" : "border-[#27272a]"
      }`}>
        {/* Featured Badge */}
        {isBoosted && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 bg-lime-400 text-black text-xs font-bold rounded-full">
            <Star className="w-3 h-3 fill-current" />
            FEATURED
          </div>
        )}

        <div className="space-y-5">
          {/* Title */}
          <h3 className="text-2xl font-bold font-mono line-clamp-1 group-hover:text-lime-400 transition-colors pr-24">
            {session.title}
          </h3>

          {/* Description */}
          {session.description && (
            <p className="text-[#a1a1aa] text-base line-clamp-2">
              {session.description}
            </p>
          )}

          {/* Host Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-black text-sm font-bold">
              {session.host.display_name[0].toUpperCase()}
            </div>
            <span className="text-base text-[#a1a1aa]">
              {session.host.display_name}
            </span>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-5 text-base text-[#71717a]">
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>{participantCount} {participantCount === 1 ? 'viewer' : 'viewers'}</span>
            </div>
            {session.started_at && (
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{formatTime(session.started_at)}</span>
              </div>
            )}
            {session.status === 'live' && (
              <div className="px-3 py-1 bg-lime-400/10 text-lime-400 text-sm font-bold rounded-lg">
                LIVE
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {canBoost && (
              <button
                onClick={() => setShowBoostModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black font-bold text-lg rounded-xl transition-colors duration-300"
              >
                <TrendingUp size={20} />
                Boost
              </button>
            )}
            <Link
              href={`/s/${session.room_code}`}
              className={`flex items-center justify-center bg-lime-400 hover:bg-lime-500 text-black font-bold text-lg px-8 py-4 rounded-xl transition-colors duration-300 text-center ${
                canBoost ? 'flex-1' : 'w-full'
              }`}
            >
              {isHost ? 'Enter Session' : 'Join Session'}
            </Link>
          </div>
        </div>
      </div>

      {/* Boost Modal */}
      {showBoostModal && (
        <BoostSessionModal
          isOpen={showBoostModal}
          onClose={() => setShowBoostModal(false)}
          sessionId={session.id}
          sessionTitle={session.title}
          currentBalance={currentBalance}
          onSuccess={handleBoostSuccess}
        />
      )}
    </>
  )
}
