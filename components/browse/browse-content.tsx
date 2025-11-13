"use client"

import { useState, useMemo } from "react"
import { Search, Filter, SlidersHorizontal } from "lucide-react"
import { SessionCard } from "@/components/dashboard/session-card"
import { SessionCardSkeleton } from "@/components/ui/loading-skeleton"
import { Session, Profile } from "@/types/database"

interface BrowseContentProps {
  sessions: (Session & { host: Profile })[]
  currentUserId: string
  isLoading?: boolean
}

type StatusFilter = "all" | "live" | "scheduled" | "ended"
type SortOption = "featured" | "newest" | "popular"

export function BrowseContent({ sessions, currentUserId, isLoading = false }: BrowseContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortBy, setSortBy] = useState<SortOption>("featured")
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(query) ||
          session.description?.toLowerCase().includes(query) ||
          session.host.display_name.toLowerCase().includes(query) ||
          session.host.username.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((session) => session.status === statusFilter)
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "featured":
          // Boosted sessions first
          const aIsBoosted = a.boosted_until && new Date(a.boosted_until) > new Date()
          const bIsBoosted = b.boosted_until && new Date(b.boosted_until) > new Date()
          if (aIsBoosted && !bIsBoosted) return -1
          if (!aIsBoosted && bIsBoosted) return 1
          // Then by featured rank
          if (a.featured_rank !== b.featured_rank) {
            return (b.featured_rank || 0) - (a.featured_rank || 0)
          }
          // Then by created date
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

        case "popular":
          // Sort by current participants count
          return (b.current_participants || 0) - (a.current_participants || 0)

        default:
          return 0
      }
    })

    return filtered
  }, [sessions, searchQuery, statusFilter, sortBy])

  // Count sessions by status
  const statusCounts = useMemo(() => {
    return {
      all: sessions.length,
      live: sessions.filter((s) => s.status === "live").length,
      scheduled: sessions.filter((s) => s.status === "scheduled").length,
      ended: sessions.filter((s) => s.status === "ended").length,
    }
  }, [sessions])

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-[#71717a] w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <label htmlFor="session-search" className="sr-only">
            Search sessions, topics, or hosts
          </label>
          <input
            id="session-search"
            type="text"
            placeholder="Search sessions, topics, or hosts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 min-h-[48px] bg-[#1a1a1a] border border-[#27272a] rounded-xl text-white placeholder-[#71717a] focus:border-lime-400 focus:outline-none transition-colors text-base sm:text-lg"
            aria-label="Search sessions"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`min-h-[48px] px-5 sm:px-6 py-3 sm:py-4 rounded-xl border transition-colors flex items-center justify-center gap-2 font-medium ${
            showFilters
              ? "bg-lime-400 text-black border-lime-400"
              : "bg-[#1a1a1a] border-[#27272a] hover:border-lime-400"
          }`}
          aria-label={showFilters ? "Hide filters" : "Show filters"}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Status Filter */}
          <div>
            <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Status</h3>
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              {(["all", "live", "scheduled", "ended"] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    statusFilter === status
                      ? "bg-lime-400 text-black"
                      : "bg-[#2a2a2a] text-[#a1a1aa] hover:text-white hover:bg-[#333333]"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-2 text-xs opacity-70">
                    ({statusCounts[status]})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Sort By</h3>
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              {(["featured", "newest", "popular"] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    sortBy === option
                      ? "bg-lime-400 text-black"
                      : "bg-[#2a2a2a] text-[#a1a1aa] hover:text-white hover:bg-[#333333]"
                  }`}
                >
                  {option === "featured" && "Featured"}
                  {option === "newest" && "Newest"}
                  {option === "popular" && "Most Popular"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm sm:text-base text-[#a1a1aa]">
          {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 sm:py-20"
          role="status"
          aria-label="No sessions found"
        >
          <Filter className="w-12 h-12 sm:w-16 sm:h-16 text-[#a1a1aa] mx-auto mb-4" aria-hidden="true" />
          <p className="text-lg sm:text-xl text-[#a1a1aa] mb-2">No sessions found</p>
          <p className="text-sm sm:text-base text-[#71717a]">
            Try adjusting your filters or search query
          </p>
        </div>
      )}
    </div>
  )
}
