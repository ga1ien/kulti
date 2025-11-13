"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, User, Video, MessageSquare, Users, ArrowUpCircle } from "lucide-react"
import Link from "next/link"

interface SearchResult {
  type: 'user' | 'session' | 'topic' | 'room'
  id: string
  title: string
  subtitle: string
  link: string
  avatar?: string
  icon?: string
  meta?: string
}

interface SearchResponse {
  results: {
    users: SearchResult[]
    sessions: SearchResult[]
    topics: SearchResult[]
    rooms: SearchResult[]
  }
  query: string
  totalCount: number
}

type FilterType = 'all' | 'users' | 'sessions' | 'topics' | 'rooms'

function SearchResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      if (!query || query.length < 2) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${activeFilter}`)

        if (response.ok) {
          const data = await response.json()
          setResults(data)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, activeFilter])

  const getFilteredResults = (): SearchResult[] => {
    if (!results) return []

    switch (activeFilter) {
      case 'users':
        return results.results.users
      case 'sessions':
        return results.results.sessions
      case 'topics':
        return results.results.topics
      case 'rooms':
        return results.results.rooms
      default:
        return [
          ...results.results.users,
          ...results.results.sessions,
          ...results.results.topics,
          ...results.results.rooms
        ]
    }
  }

  const getFilterCount = (filter: FilterType): number => {
    if (!results) return 0

    switch (filter) {
      case 'users':
        return results.results.users.length
      case 'sessions':
        return results.results.sessions.length
      case 'topics':
        return results.results.topics.length
      case 'rooms':
        return results.results.rooms.length
      case 'all':
        return results.totalCount
      default:
        return 0
    }
  }

  const filters: { label: string; value: FilterType; icon: React.ReactNode }[] = [
    { label: 'All', value: 'all', icon: <Search className="w-4 h-4" /> },
    { label: 'Users', value: 'users', icon: <User className="w-4 h-4" /> },
    { label: 'Sessions', value: 'sessions', icon: <Video className="w-4 h-4" /> },
    { label: 'Topics', value: 'topics', icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Rooms', value: 'rooms', icon: <Users className="w-4 h-4" /> }
  ]

  const renderResultCard = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        return (
          <Link
            href={result.link}
            key={`${result.type}-${result.id}`}
            className="block bg-[#1a1a1a] border border-[#27272a] rounded-lg p-4 hover:border-lime-400 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-lime-400 flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
                {result.title[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{result.title}</h3>
                <p className="text-sm text-[#a1a1aa] truncate">{result.subtitle}</p>
              </div>
              {result.meta && (
                <span className="px-3 py-1 rounded-lg bg-lime-400/20 text-lime-400 text-xs font-medium">
                  {result.meta}
                </span>
              )}
            </div>
          </Link>
        )

      case 'session':
        return (
          <Link
            href={result.link}
            key={`${result.type}-${result.id}`}
            className="block bg-[#1a1a1a] border border-[#27272a] rounded-lg p-4 hover:border-lime-400 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#27272a] flex items-center justify-center flex-shrink-0">
                <Video className="w-6 h-6 text-lime-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{result.title}</h3>
                  {result.meta && (
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                      result.meta === 'Live'
                        ? 'bg-red-500/20 text-red-400 animate-pulse'
                        : 'bg-[#27272a] text-[#a1a1aa]'
                    }`}>
                      {result.meta}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#a1a1aa] mt-1">{result.subtitle}</p>
              </div>
            </div>
          </Link>
        )

      case 'topic':
        return (
          <Link
            href={result.link}
            key={`${result.type}-${result.id}`}
            className="block bg-[#1a1a1a] border border-[#27272a] rounded-lg p-4 hover:border-lime-400 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#27272a] flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{result.title}</h3>
                  {result.meta && (
                    <span className="px-3 py-1 rounded-lg bg-[#27272a] text-[#a1a1aa] text-xs font-medium flex-shrink-0 capitalize">
                      {result.meta}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <ArrowUpCircle className="w-4 h-4 text-purple-400" />
                  <p className="text-sm text-[#a1a1aa]">{result.subtitle}</p>
                </div>
              </div>
            </div>
          </Link>
        )

      case 'room':
        return (
          <Link
            href={result.link}
            key={`${result.type}-${result.id}`}
            className="block bg-[#1a1a1a] border border-[#27272a] rounded-lg p-4 hover:border-lime-400 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#27272a] flex items-center justify-center text-2xl flex-shrink-0">
                {result.icon || '💬'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{result.title}</h3>
                  {result.meta && (
                    <span className="px-3 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-medium flex-shrink-0 capitalize">
                      {result.meta}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <p className="text-sm text-[#a1a1aa]">{result.subtitle}</p>
                </div>
              </div>
            </div>
          </Link>
        )

      default:
        return null
    }
  }

  if (!query || query.length < 2) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-16 h-16 text-[#a1a1aa] mb-4" />
            <h2 className="text-2xl font-bold mb-2">Start searching</h2>
            <p className="text-[#a1a1aa]">Enter at least 2 characters to search</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Search Results for "{query}"
          </h1>
          {!loading && results && (
            <p className="text-[#a1a1aa]">
              {results.totalCount} {results.totalCount === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeFilter === filter.value
                  ? 'bg-lime-400 text-black'
                  : 'bg-[#1a1a1a] border border-[#27272a] text-[#a1a1aa] hover:border-lime-400'
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
              {results && (
                <span className={`px-2 py-0.5 rounded text-xs ${
                  activeFilter === filter.value
                    ? 'bg-black/20'
                    : 'bg-[#27272a]'
                }`}>
                  {getFilterCount(filter.value)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results Grid */}
        {!loading && results && (
          <div className="grid gap-4 pb-12">
            {getFilteredResults().length > 0 ? (
              getFilteredResults().map(result => renderResultCard(result))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-16 h-16 text-[#a1a1aa] mb-4" />
                <h2 className="text-2xl font-bold mb-2">No results found</h2>
                <p className="text-[#a1a1aa]">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  )
}
