"use client"

import { useState } from "react"
import { Recording } from "@/types/database"
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
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
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

interface RecordingsContentProps {
  recordings: RecordingWithSession[]
}

export function RecordingsContent({ recordings: initialRecordings }: RecordingsContentProps) {
  const [recordings, setRecordings] = useState(initialRecordings)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [playingRecording, setPlayingRecording] = useState<string | null>(null)

  function getStatusColor(status: Recording["status"]) {
    switch (status) {
      case "recording":
        return "bg-red-500"
      case "processing":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  function formatDuration(seconds: number | null) {
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

  async function handleDelete(recordingId: string) {
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
      console.error("Delete recording error:", error)
      toast.error("Failed to delete recording")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedRecording(null)
    }
  }

  function openDeleteDialog(recordingId: string) {
    setSelectedRecording(recordingId)
    setDeleteDialogOpen(true)
  }

  if (recordings.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-muted rounded-full">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
            <p className="text-muted-foreground max-w-md">
              Start recording your sessions to create video content that can be shared
              later. Recordings will appear here once they finish processing.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {recordings.map((recording) => (
          <Card key={recording.id} className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Recording Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">
                        {recording.sessions.title}
                      </h3>
                      <Badge className={getStatusColor(recording.status)}>
                        {recording.status}
                      </Badge>
                    </div>
                    {recording.sessions.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {recording.sessions.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDistanceToNow(new Date(recording.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {recording.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(recording.duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {recording.status === "failed" && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-red-500">Recording failed</p>
                      {recording.metadata?.error && (
                        <p className="text-red-500/80">{recording.metadata.error}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Message */}
                {recording.status === "processing" && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                    <p className="text-sm text-yellow-500">
                      Processing recording... This may take a few minutes.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {recording.status === "completed" && recording.recording_url && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setPlayingRecording(recording.id)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Watch
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                    >
                      <a
                        href={recording.recording_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDeleteDialog(recording.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Video Player */}
            {playingRecording === recording.id &&
              recording.status === "completed" &&
              recording.recording_url && (
                <div className="mt-4 rounded-lg overflow-hidden bg-black">
                  <video
                    src={recording.recording_url}
                    controls
                    className="w-full max-h-[600px]"
                    onEnded={() => setPlayingRecording(null)}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The recording will be permanently deleted
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRecording && handleDelete(selectedRecording)}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
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
