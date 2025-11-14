"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Profile } from "@/types/database"
import { LogOut, User, Coins, Settings, Search, HelpCircle, Ticket } from "lucide-react"
import { formatCredits } from "@/lib/credits/config"
import NotificationBell from "@/components/notifications/notification-bell"
import { SearchBar } from "@/components/dashboard/search-bar"
import { logger } from '@/lib/logger'

/**
 * Supabase realtime payload interface
 */
interface SupabasePayload {
  new: {
    credits_balance?: number
    [key: string]: unknown
  }
}

interface NavBarProps {
  profile: Profile
}

export function NavBar({ profile }: NavBarProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showCursor, setShowCursor] = useState(true)
  const [credits, setCredits] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // Fetch credit balance
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/credits/balance')
        if (response.ok) {
          const data = await response.json()
          setCredits(data.credits_balance || 0)
        }
      } catch (error) {
        logger.error('Failed to fetch credits:', { error })
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()

    // Set up real-time subscription for balance updates
    const supabase = createClient()
    const channel = supabase
      .channel('credit_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload: SupabasePayload) => {
          if (payload.new.credits_balance !== undefined) {
            setCredits(payload.new.credits_balance)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [profile.id])

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => clearInterval(cursorInterval)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav className="border-b border-[#27272a] bg-[#1a1a1a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a1a1a]/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20 gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="font-mono text-lg sm:text-xl lg:text-2xl font-bold hover:text-lime-400 transition-colors flex-shrink-0">
            kulti<span className={`text-lime-400 transition-opacity duration-100 ${showCursor ? "opacity-100" : "opacity-0"}`}>_</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <SearchBar />
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center space-x-6">
            <Link href="/dashboard" className="text-base text-[#a1a1aa] hover:text-white transition-colors whitespace-nowrap">
              Dashboard
            </Link>
            <Link href="/browse" data-tour="browse" className="text-base text-[#a1a1aa] hover:text-white transition-colors whitespace-nowrap">
              Browse
            </Link>
            <Link href="/community" data-tour="community" className="text-base text-[#a1a1aa] hover:text-white transition-colors whitespace-nowrap">
              Community
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
            {/* Mobile Search Button */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#2a2a2a] transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-[#a1a1aa]" />
            </button>

            {/* Credits Display */}
            <Link
              href="/credits"
              data-tour="credits"
              className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 min-h-[44px] rounded-lg bg-[#1a1a1a] border border-[#27272a] hover:border-lime-400 transition-colors"
            >
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-lime-400" />
              <span className="font-mono font-bold text-lime-400 text-xs sm:text-sm lg:text-base">
                {loading ? '...' : formatCredits(credits)}
              </span>
            </Link>

            {/* Notification Bell */}
            <NotificationBell />

            <button
              onClick={() => router.push("/dashboard?create=true")}
              data-tour="create-session"
              className="hidden lg:block bg-lime-400 hover:bg-lime-500 text-black font-bold text-sm px-6 py-2.5 min-h-[44px] rounded-lg transition-colors duration-300"
            >
              Create Session
            </button>

            {/* User Menu */}
            <div className="relative" data-tour="profile">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-lime-400 flex items-center justify-center text-black font-bold text-base sm:text-lg">
                  {profile.display_name[0].toUpperCase()}
                </div>
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-[#1a1a1a] border border-[#27272a] rounded-xl shadow-2xl z-20">
                    <div className="p-4 sm:p-5 border-b border-[#27272a]">
                      <p className="font-medium text-base sm:text-lg">{profile.display_name}</p>
                      <p className="text-sm sm:text-base text-[#a1a1aa]">@{profile.username}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          router.push(`/profile/${profile.username}`)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg hover:bg-[#2a2a2a] transition-colors text-left text-base"
                      >
                        <User size={18} />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push(`/profile/${profile.username}?tab=invites`)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg hover:bg-[#2a2a2a] transition-colors text-left text-base"
                      >
                        <Ticket size={18} />
                        <span>My Invite Codes</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/settings')
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg hover:bg-[#2a2a2a] transition-colors text-left text-base"
                      >
                        <Settings size={18} />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/help')
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg hover:bg-[#2a2a2a] transition-colors text-left text-base"
                      >
                        <HelpCircle size={18} />
                        <span>Help</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg hover:bg-[#2a2a2a] transition-colors text-left text-base text-red-500"
                      >
                        <LogOut size={18} />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Modal */}
        {showMobileSearch && (
          <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setShowMobileSearch(false)}>
            <div className="p-4" onClick={(e) => e.stopPropagation()}>
              <SearchBar className="mt-2" />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
