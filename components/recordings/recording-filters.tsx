"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search, Filter, X, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export type RecordingFilters = {
  search: string
  status: "all" | "completed" | "processing" | "failed" | "recording"
  sortBy: "newest" | "oldest" | "longest" | "shortest"
  dateRange: "all" | "today" | "week" | "month" | "year"
}

interface RecordingFiltersProps {
  filters: RecordingFilters
  // eslint-disable-next-line no-unused-vars
  onFiltersChange: (filters: RecordingFilters) => void
  recordingCount: number
}

export function RecordingFiltersComponent({
  filters,
  onFiltersChange,
  recordingCount,
}: RecordingFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (key: keyof RecordingFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.sortBy !== "newest" ||
    filters.dateRange !== "all"

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      sortBy: "newest",
      dateRange: "all",
    })
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1aa]" />
          <Input
            type="text"
            placeholder="Search recordings by session title..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10 h-12 bg-[#1a1a1a] border-[#27272a] text-white placeholder:text-[#71717a] focus:border-lime-400 focus:ring-lime-400"
            aria-label="Search recordings"
          />
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant={showFilters ? "primary" : "ghost"}
          size="lg"
          className="h-12 whitespace-nowrap"
          aria-label="Toggle filters"
          aria-expanded={showFilters}
        >
          <Filter className="w-5 h-5 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 flex items-center justify-center w-5 h-5 bg-lime-500 text-black rounded-full text-xs font-bold">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="p-6 bg-[#1a1a1a] border border-[#27272a] rounded-xl space-y-6 animate-fade-in">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-white">
              Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: "all", label: "All", icon: Filter },
                { value: "completed", label: "Completed", icon: CheckCircle2 },
                { value: "processing", label: "Processing", icon: Clock },
                { value: "recording", label: "Recording", icon: AlertCircle },
                { value: "failed", label: "Failed", icon: X },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange("status", value)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    filters.status === value
                      ? "bg-lime-400 text-black"
                      : "bg-[#27272a] text-[#a1a1aa] hover:bg-[#3a3a3a] hover:text-white"
                  }`}
                  aria-label={`Filter by ${label} status`}
                  aria-pressed={filters.status === value}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-white">
              Date Range
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: "all", label: "All Time" },
                { value: "today", label: "Today" },
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
                { value: "year", label: "This Year" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange("dateRange", value)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${
                    filters.dateRange === value
                      ? "bg-lime-400 text-black"
                      : "bg-[#27272a] text-[#a1a1aa] hover:bg-[#3a3a3a] hover:text-white"
                  }`}
                  aria-label={`Filter by ${label}`}
                  aria-pressed={filters.dateRange === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-white">
              Sort By
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "newest", label: "Newest First" },
                { value: "oldest", label: "Oldest First" },
                { value: "longest", label: "Longest" },
                { value: "shortest", label: "Shortest" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange("sortBy", value)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${
                    filters.sortBy === value
                      ? "bg-lime-400 text-black"
                      : "bg-[#27272a] text-[#a1a1aa] hover:bg-[#3a3a3a] hover:text-white"
                  }`}
                  aria-label={`Sort by ${label}`}
                  aria-pressed={filters.sortBy === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-4 border-t border-[#27272a]">
              <Button
                onClick={clearFilters}
                variant="ghost"
                className="text-lime-400 hover:text-lime-300"
                aria-label="Clear all filters"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-[#a1a1aa]">
        Showing {recordingCount} {recordingCount === 1 ? "recording" : "recordings"}
        {hasActiveFilters && " (filtered)"}
      </div>
    </div>
  )
}
