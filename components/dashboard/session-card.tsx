import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Session, Profile } from "@/types/database"
import { Users, Clock } from "lucide-react"
import { formatTime } from "@/lib/utils"

interface SessionCardProps {
  session: Session & {
    host: Profile
    participants?: { count: number }[]
  }
}

export function SessionCard({ session }: SessionCardProps) {
  const participantCount = session.participants?.[0]?.count || 0

  return (
    <div className="group border border-[#27272a] rounded-2xl p-8 bg-[#1a1a1a]/50 backdrop-blur-sm hover:border-lime-400 hover:-translate-y-1 transition-all duration-300 animate-fade-in">
      <div className="space-y-5">
        {/* Title */}
        <h3 className="text-2xl font-bold font-mono line-clamp-1 group-hover:text-lime-400 transition-colors">
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
            <span>{participantCount}/{session.max_participants}</span>
          </div>
          {session.started_at && (
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{formatTime(session.started_at)}</span>
            </div>
          )}
          <div className="px-3 py-1 bg-lime-400/10 text-lime-400 text-sm font-bold rounded-lg">
            LIVE
          </div>
        </div>

        {/* Join Button */}
        <Link
          href={`/s/${session.room_code}`}
          className="block w-full bg-lime-400 hover:bg-lime-500 text-black font-bold text-lg px-8 py-4 rounded-xl transition-colors duration-300 text-center"
        >
          Join Session
        </Link>
      </div>
    </div>
  )
}
