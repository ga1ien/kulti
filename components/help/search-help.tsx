"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"

interface SearchHelpProps {
  onSearch: (query: string) => void
  className?: string
}

export const SearchHelp = ({ onSearch, className = "" }: SearchHelpProps) => {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleClear = () => {
    setSearchQuery("")
    onSearch("")
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#a1a1aa]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search help articles..."
          className="w-full pl-12 pr-12 py-4 bg-[#1a1a1a] border border-[#27272a] rounded-xl text-white placeholder:text-[#a1a1aa] focus:border-lime-400 focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5 text-[#a1a1aa]" />
          </button>
        )}
      </div>
    </div>
  )
}
