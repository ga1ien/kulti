"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Clock, User, Video, MessageSquare, Users, X, Loader2 } from "lucide-react"
import { logger } from '@/lib/logger'

interface SearchSuggestion {
  type: 'user' | 'session' | 'topic' | 'room'
  id: string
  title: string
  subtitle: string
  link: string
  avatar?: string
  icon?: string
  meta?: string
}

interface SearchBarProps {
  className?: string
}

export function SearchBar({ className = "" }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('kulti_recent_searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (e) {
        logger.error('Failed to parse recent searches:', e)
      }
    }
  }, [])

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setShowDropdown(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`)

      if (response.ok) {
        const data = await response.json()
        const allResults: SearchSuggestion[] = [
          ...data.results.users,
          ...data.results.sessions,
          ...data.results.topics,
          ...data.results.rooms
        ].slice(0, 5)

        setSuggestions(allResults)
      }
    } catch (error) {
      logger.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length >= 2) {
      setLoading(true)
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query)
      }, 300)
    } else {
      setSuggestions([])
      setLoading(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, performSearch])

  const saveRecentSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('kulti_recent_searches', JSON.stringify(updated))
  }

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery)
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowDropdown(false)
      setQuery("")
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    saveRecentSearch(query)
    router.push(suggestion.link)
    setShowDropdown(false)
    setQuery("")
  }

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery)
    handleSearch(recentQuery)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('kulti_recent_searches')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false)
      inputRef.current?.blur()
      return
    }

    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex])
      } else {
        handleSearch()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
      return
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'session':
        return <Video className="w-4 h-4" />
      case 'topic':
        return <MessageSquare className="w-4 h-4" />
      case 'room':
        return <Users className="w-4 h-4" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      user: 'bg-blue-500/20 text-blue-400',
      session: 'bg-lime-500/20 text-lime-400',
      topic: 'bg-purple-500/20 text-purple-400',
      room: 'bg-orange-500/20 text-orange-400'
    }
    return colors[type as keyof typeof colors] || colors.user
  }

  const showSuggestions = showDropdown && (suggestions.length > 0 || recentSearches.length > 0 || query.length >= 2)

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#a1a1aa]" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search users, sessions, topics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#1a1a1a] border border-[#27272a] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-[#a1a1aa] focus:outline-none focus:border-lime-400 transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setSuggestions([])
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#a1a1aa] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#27272a] rounded-lg shadow-2xl max-h-[400px] overflow-y-auto z-50"
        >
          {/* Recent searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-[#a1a1aa]">Recent Searches</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((recent, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(recent)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#27272a] transition-colors text-left"
                >
                  <Clock className="w-4 h-4 text-[#a1a1aa]" />
                  <span className="text-sm">{recent}</span>
                </button>
              ))}
            </div>
          )}

          {/* Loading state */}
          {loading && query.length >= 2 && (
            <div className="p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-lime-400 mx-auto mb-2" />
              <p className="text-sm text-[#a1a1aa]">Searching...</p>
            </div>
          )}

          {/* Suggestions */}
          {!loading && suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    index === selectedIndex ? 'bg-[#27272a]' : 'hover:bg-[#27272a]'
                  }`}
                >
                  {suggestion.avatar ? (
                    <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-black font-bold flex-shrink-0">
                      {suggestion.title[0].toUpperCase()}
                    </div>
                  ) : suggestion.icon ? (
                    <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center text-xl flex-shrink-0">
                      {suggestion.icon}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
                      {getIcon(suggestion.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{suggestion.title}</div>
                    <div className="text-xs text-[#a1a1aa] truncate">{suggestion.subtitle}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {suggestion.meta && (
                      <span className="text-xs text-[#a1a1aa]">{suggestion.meta}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${getTypeBadge(suggestion.type)}`}>
                      {suggestion.type}
                    </span>
                  </div>
                </button>
              ))}

              {/* View all results button */}
              {suggestions.length > 0 && (
                <button
                  onClick={() => handleSearch()}
                  className="w-full mt-2 px-3 py-2.5 rounded-lg bg-[#27272a] hover:bg-[#2a2a2a] transition-colors text-center text-sm font-medium text-lime-400"
                >
                  View all results for "{query}"
                </button>
              )}
            </div>
          )}

          {/* No results */}
          {!loading && query.length >= 2 && suggestions.length === 0 && (
            <div className="p-6 text-center text-[#a1a1aa]">
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
