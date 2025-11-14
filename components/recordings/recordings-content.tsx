"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Recording } from "@/types/database"
import { RecordingFiltersComponent, RecordingFilters } from "./recording-filters"
import { RecordingPlayerModal } from "./recording-player-modal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Trash2,
  Play,
  Clock,
  Calendar,
  AlertCircle,
  Loader2,
  Film,
  CheckCircle2,
} from "lucide-react"
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth, isThisYear } from "date-fns"
import { toast } from "react-hot-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { logger } from "@/lib/logger"

interface RecordingWithSession extends Recording {
  sessions: {
    id: string
    title: string
    description: string | null
    host_id: string
    started_at: string | null
    ended_at: string | null
  }
}

export function RecordingsContent() {
  const [recordings, setRecordings] = useState<RecordingWithSession[]>([])
  const [filteredRecordings, setFilteredRecordings] = useState<RecordingWithSession[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [playingRecording, setPlayingRecording] = useState<RecordingWithSession | null>(null)
  const [filters, setFilters] = useState<RecordingFilters>({
    search: "",
    status: "all",
    sortBy: "newest",
    dateRange: "all",
  })

  useEffect(() => {
    fetchRecordings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [recordings, filters])

  const fetchRecordings = async () => {
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to view recordings")
        return
      }

      const { data, error } = await supabase
        .from("recordings")
        .select(`
          *,
          sessions!inner (
            id,
            title,
            description,
            host_id,
            started_at,
            ended_at
          )
        `)
        .eq("sessions.host_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        logger.error("Error fetching recordings", { error })
        toast.error("Failed to load recordings")
      } else {
        setRecordings(data || [])
      }
    } catch (error) {
      logger.error("Error fetching recordings", { error })
      toast.error("Failed to load recordings")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...recordings]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter((r) =>
        r.sessions.title.toLowerCase().includes(searchLower) ||
        r.sessions.description?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((r) => r.status === filters.status)
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      filtered = filtered.filter((r) => {
        const date = new Date(r.created_at)
        switch (filters.dateRange) {
          case "today":
            return isToday(date)
          case "week":
            return isThisWeek(date)
          case "month":
            return isThisMonth(date)
          case "year":
            return isThisYear(date)
          default:
            return true
        }
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "longest":
          return (b.duration || 0) - (a.duration || 0)
        case "shortest":
          return (a.duration || 0) - (b.duration || 0)
        default:
          return 0
      }
    })

    setFilteredRecordings(filtered)
  }

  const handleDelete = async (recordingId: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete recording")
      }

      setRecordings((prev) => prev.filter((r) => r.id !== recordingId))
      toast.success("Recording deleted successfully")
    } catch (error) {
      logger.error("Delete recording error", { error, recordingId })
      toast.error("Failed to delete recording")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedRecording(null)
    }
  }

  const openDeleteDialog = (recordingId: string) => {
    setSelectedRecording(recordingId)
    setDeleteDialogOpen(true)
  }

  const getStatusColor = (status: Recording["status"]) => {
    switch (status) {
      case "recording":
        return "bg-red-500 hover:bg-red-600"
      case "processing":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "completed":
        return "bg-green-500 hover:bg-green-600"
      case "failed":
        return "bg-gray-500 hover:bg-gray-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getStatusIcon = (status: Recording["status"]) => {
    switch (status) {
      case "recording":
        return <AlertCircle className="w-3 h-3" />
      case "processing":
        return <Clock className="w-3 h-3" />
      case "completed":
        return <CheckCircle2 className="w-3 h-3" />
      case "failed":
        return <AlertCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-12 w-full max-w-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-20 border border-[#27272a] border-dashed rounded-2xl bg-[#1a1a1a]/30 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-6">
          <div className="p-6 bg-[#27272a] rounded-full">
            <Film className="w-12 h-12 text-lime-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-3">No recordings yet</h3>
            <p className="text-[#a1a1aa] max-w-md mx-auto text-lg">
              Start recording your sessions to create video content that can be shared
              later. Recordings will appear here once they finish processing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <RecordingFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        recordingCount={filteredRecordings.length}
      />

      {/* Recordings Grid */}
      {filteredRecordings.length === 0 ? (
        <div className="text-center py-20 border border-[#27272a] border-dashed rounded-2xl bg-[#1a1a1a]/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="p-6 bg-[#27272a] rounded-full">
              <Film className="w-10 h-10 text-[#a1a1aa]" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">No recordings found</h3>
              <p className="text-[#a1a1aa] max-w-md mx-auto">
                Try adjusting your filters to see more results
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRecordings.map((recording) => (
            <Card
              key={recording.id}
              className="group bg-[#1a1a1a] border-[#27272a] hover:border-lime-400/50 transition-all duration-300 overflow-hidden"
            >
              {/* Thumbnail / Preview */}
              <div className="relative aspect-video bg-gradient-to-br from-[#27272a] to-[#1a1a1a] flex items-center justify-center overflow-hidden">
                {recording.status === "completed" && recording.recording_url ? (
                  <div className="relative w-full h-full">
                    <video
                      src={recording.recording_url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPlayingRecording(recording)}
                        className="p-6 bg-lime-400 hover:bg-lime-500 rounded-full transition-all transform hover:scale-110"
                        aria-label={`Play ${recording.sessions.title}`}
                      >
                        <Play className="w-8 h-8 text-black fill-black" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-[#a1a1aa]">
                    <Film className="w-16 h-16" />
                    {recording.status === "processing" && (
                      <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                    )}
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <Badge
                    className={`${getStatusColor(recording.status)} text-white border-0 px-3 py-1 flex items-center gap-1`}
                  >
                    {getStatusIcon(recording.status)}
                    <span className="capitalize">{recording.status}</span>
                  </Badge>
                </div>

                {/* Duration Badge */}
                {recording.duration && (
                  <div className="absolute bottom-3 right-3">
                    <Badge className="bg-black/70 text-white border-0 px-3 py-1 backdrop-blur-sm">
                      {formatDuration(recording.duration)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Title & Description */}
                <div>
                  <h3 className="text-xl font-bold mb-2 line-clamp-1">
                    {recording.sessions.title}
                  </h3>
                  {recording.sessions.description && (
                    <p className="text-sm text-[#a1a1aa] line-clamp-2">
                      {recording.sessions.description}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-[#a1a1aa]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDistanceToNow(new Date(recording.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {recording.metadata?.recording_type && (
                    <div className="flex items-center gap-1">
                      <Film className="w-4 h-4" />
                      <span className="capitalize">{recording.metadata.recording_type}</span>
                    </div>
                  )}
                </div>

                {/* Error/Processing Messages */}
                {recording.status === "failed" && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-red-500">Recording failed</p>
                      {recording.metadata?.error && (
                        <p className="text-red-500/80 mt-1">{recording.metadata.error}</p>
                      )}
                    </div>
                  </div>
                )}

                {recording.status === "processing" && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin flex-shrink-0" />
                    <p className="text-sm text-yellow-500">
                      Processing recording... This may take a few minutes.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {recording.status === "completed" && recording.recording_url && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setPlayingRecording(recording)}
                        className="flex-1"
                        aria-label={`Watch ${recording.sessions.title}`}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Watch
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        aria-label={`Download ${recording.sessions.title}`}
                      >
                        <a
                          href={recording.recording_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(recording.id)}
                    className="hover:bg-red-500/10 hover:text-red-500"
                    aria-label={`Delete ${recording.sessions.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Player Modal */}
      {playingRecording && (
        <RecordingPlayerModal
          recording={playingRecording}
          isOpen={!!playingRecording}
          onClose={() => setPlayingRecording(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-[#27272a]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#a1a1aa]">
              This action cannot be undone. The recording will be permanently deleted
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-[#27272a] text-white hover:bg-[#3a3a3a] border-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRecording && handleDelete(selectedRecording)}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
