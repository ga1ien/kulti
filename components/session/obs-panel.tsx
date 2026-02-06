"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Monitor, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logger } from '@/lib/logger'

interface OBSPanelProps {
  sessionId: string
  isHost: boolean
}

export function OBSPanel({ sessionId, isHost }: OBSPanelProps) {
  const [streamKey, setStreamKey] = useState<string | null>(null)
  const [rtmpUrl, setRtmpUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchStreamKey()
  }, [sessionId])

  const fetchStreamKey = async () => {
    try {
      const response = await fetch(`/api/hms/stream-key/${sessionId}`)
      const data = await response.json()

      if (data.enabled && data.streamKey) {
        setEnabled(true)
        setStreamKey(data.streamKey)
        setRtmpUrl(data.rtmpUrl)
      }
    } catch (error) {
      logger.error("Failed to fetch stream key:", { error })
    } finally {
      setLoading(false)
    }
  }

  const createStreamKey = async () => {
    setCreating(true)
    try {
      const response = await fetch("/api/hms/stream-key/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (response.ok) {
        setEnabled(true)
        setStreamKey(data.streamKey)
        setRtmpUrl(data.rtmpUrl)
      }
    } catch (error) {
      logger.error("Failed to create stream key:", { error })
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = async (text: string, type: "url" | "key") => {
    await navigator.clipboard.writeText(text)
    if (type === "url") {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="border border-border-default rounded-lg p-6 bg-surface-1">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">OBS Streaming</h3>
        </div>
        <p className="text-muted-3 text-sm">Loading...</p>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="border border-border-default rounded-lg p-6 bg-surface-1">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">OBS Streaming</h3>
        </div>
        <p className="text-muted-3 text-sm mb-4">
          Stream directly from OBS with custom overlays and scenes.
        </p>
        {isHost ? (
          <Button
            onClick={createStreamKey}
            disabled={creating}
            variant="primary"
            size="sm"
          >
            {creating ? "Enabling..." : "Enable OBS Streaming"}
          </Button>
        ) : (
          <p className="text-muted-3 text-sm">
            OBS streaming not enabled for this session
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="border border-border-default rounded-lg p-6 bg-surface-1 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Monitor className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold">OBS Streaming</h3>
        <div className="ml-auto">
          <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">
            ACTIVE
          </span>
        </div>
      </div>

      <div className="bg-black/30 rounded-lg p-4 border border-border-default">
        <div className="flex items-start gap-2 mb-3">
          <Info className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-2">
            Configure OBS to stream directly into this session alongside browser
            participants
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted-3 mb-1 block">
            Server URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rtmpUrl || ""}
              readOnly
              className="flex-1 bg-black/50 border border-border-default rounded px-3 py-2 text-sm font-mono"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(rtmpUrl || "", "url")}
            >
              {copiedUrl ? (
                <Check className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-3 mb-1 block">
            Stream Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={streamKey || ""}
              readOnly
              className="flex-1 bg-black/50 border border-border-default rounded px-3 py-2 text-sm font-mono"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(streamKey || "", "key")}
            >
              {copiedKey ? (
                <Check className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-black/30 rounded-lg p-4 border border-border-default">
        <h4 className="text-sm font-medium mb-2">OBS Setup Instructions</h4>
        <ol className="text-xs text-muted-3 space-y-1 list-decimal list-inside">
          <li>Open OBS Studio</li>
          <li>Go to Settings → Stream</li>
          <li>Select "Custom" as the service</li>
          <li>Paste the Server URL above</li>
          <li>Paste the Stream Key above</li>
          <li>Click "Start Streaming" in OBS</li>
        </ol>
        <p className="text-xs text-muted-3 mt-3">
          Your stream will appear as a participant in this session
        </p>
      </div>
    </div>
  )
}
