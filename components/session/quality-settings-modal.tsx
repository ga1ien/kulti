"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Settings, Wifi, Video, Gauge, Save } from "lucide-react"
import { toast } from "react-hot-toast"

interface QualitySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onApply?: (settings: VideoQualitySettings) => void
}

export interface VideoQualitySettings {
  maxBitrate: number // kbps (256 - 2000)
  preferredLayer: "auto" | "low" | "medium" | "high"
  frameRate: 15 | 24 | 30
  resolution: "480p" | "720p" | "1080p"
  enableAdaptive: boolean
}

const DEFAULT_SETTINGS: VideoQualitySettings = {
  maxBitrate: 1000,
  preferredLayer: "auto",
  frameRate: 30,
  resolution: "720p",
  enableAdaptive: true,
}

// Quality presets
const QUALITY_PRESETS = {
  low: {
    maxBitrate: 256,
    preferredLayer: "low" as const,
    frameRate: 15 as const,
    resolution: "480p" as const,
    enableAdaptive: true,
  },
  medium: {
    maxBitrate: 512,
    preferredLayer: "medium" as const,
    frameRate: 24 as const,
    resolution: "720p" as const,
    enableAdaptive: true,
  },
  high: {
    maxBitrate: 1000,
    preferredLayer: "high" as const,
    frameRate: 30 as const,
    resolution: "1080p" as const,
    enableAdaptive: true,
  },
  auto: {
    maxBitrate: 1500,
    preferredLayer: "auto" as const,
    frameRate: 30 as const,
    resolution: "1080p" as const,
    enableAdaptive: true,
  },
}

const STORAGE_KEY = "kulti_video_quality_settings"

export function QualitySettingsModal({ isOpen, onClose, onApply }: QualitySettingsModalProps) {
  const [settings, setSettings] = useState<VideoQualitySettings>(DEFAULT_SETTINGS)
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof QUALITY_PRESETS | null>(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as VideoQualitySettings
        setSettings(parsed)
      } catch (error) {
        console.error("Failed to load quality settings:", error)
      }
    }
  }, [])

  // Detect connection type for recommendations
  const [connectionType, setConnectionType] = useState<"4g" | "wifi" | "ethernet" | "unknown">("unknown")

  useEffect(() => {
    if ("connection" in navigator) {
      const conn = (navigator as any).connection
      const type = conn?.effectiveType || conn?.type

      if (type === "4g") setConnectionType("4g")
      else if (type === "wifi") setConnectionType("wifi")
      else if (type === "ethernet") setConnectionType("ethernet")
    }
  }, [])

  const applyPreset = (preset: keyof typeof QUALITY_PRESETS) => {
    setSettings(QUALITY_PRESETS[preset])
    setSelectedPreset(preset)
  }

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

    // Apply settings if callback provided
    if (onApply) {
      onApply(settings)
    }

    toast.success("Quality settings saved", {
      icon: "⚙️",
      duration: 2000,
    })

    onClose()
  }

  const getRecommendation = () => {
    switch (connectionType) {
      case "4g":
        return "On mobile data, we recommend Low or Medium quality to save bandwidth."
      case "wifi":
        return "On WiFi, you can use High quality for the best experience."
      case "ethernet":
        return "On ethernet, Auto quality will provide the best experience."
      default:
        return "Adjust quality based on your connection speed."
    }
  }

  const getDataUsageEstimate = () => {
    const mbPerMinute = (settings.maxBitrate * 60) / (8 * 1024)
    const mbPerHour = mbPerMinute * 60
    return mbPerHour.toFixed(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1a1a] border-[#27272a] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Video Quality Settings
          </DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Customize video quality to match your connection speed
          </DialogDescription>
        </DialogHeader>

        {/* Connection Info */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
          <Wifi className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-400 mb-1">Connection Detected</h4>
            <p className="text-sm text-blue-200">{getRecommendation()}</p>
          </div>
        </div>

        {/* Quality Presets */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Quick Presets</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => applyPreset("low")}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPreset === "low"
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-[#27272a] hover:border-[#3a3a3a] bg-[#0a0a0a]"
              }`}
            >
              <h4 className="font-semibold mb-1">Low Quality</h4>
              <p className="text-xs text-[#a1a1aa]">480p, 15fps - Best for slow connections</p>
            </button>
            <button
              onClick={() => applyPreset("medium")}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPreset === "medium"
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-[#27272a] hover:border-[#3a3a3a] bg-[#0a0a0a]"
              }`}
            >
              <h4 className="font-semibold mb-1">Medium Quality</h4>
              <p className="text-xs text-[#a1a1aa]">720p, 24fps - Balanced</p>
            </button>
            <button
              onClick={() => applyPreset("high")}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPreset === "high"
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-[#27272a] hover:border-[#3a3a3a] bg-[#0a0a0a]"
              }`}
            >
              <h4 className="font-semibold mb-1">High Quality</h4>
              <p className="text-xs text-[#a1a1aa]">1080p, 30fps - Best quality</p>
            </button>
            <button
              onClick={() => applyPreset("auto")}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPreset === "auto"
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-[#27272a] hover:border-[#3a3a3a] bg-[#0a0a0a]"
              }`}
            >
              <h4 className="font-semibold mb-1">Auto (Recommended)</h4>
              <p className="text-xs text-[#a1a1aa]">Adapts to your connection</p>
            </button>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-6 pt-4 border-t border-[#27272a]">
          <h3 className="font-semibold text-lg">Advanced Settings</h3>

          {/* Max Bitrate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Maximum Bitrate</Label>
              <span className="text-sm text-lime-400 font-mono">{settings.maxBitrate} kbps</span>
            </div>
            <Slider
              value={[settings.maxBitrate]}
              onValueChange={(value) => {
                setSettings({ ...settings, maxBitrate: value[0] })
                setSelectedPreset(null)
              }}
              min={256}
              max={2000}
              step={64}
              className="w-full"
            />
            <p className="text-xs text-[#a1a1aa]">
              Higher bitrate = better quality but uses more bandwidth
            </p>
          </div>

          {/* Resolution Cap */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Maximum Resolution</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["480p", "720p", "1080p"] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => {
                    setSettings({ ...settings, resolution: res })
                    setSelectedPreset(null)
                  }}
                  className={`py-2 px-4 rounded-lg border transition-all ${
                    settings.resolution === res
                      ? "border-lime-400 bg-lime-400/10 text-lime-400"
                      : "border-[#27272a] hover:border-[#3a3a3a] text-[#a1a1aa]"
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Rate */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Frame Rate Limit</Label>
            <div className="grid grid-cols-3 gap-2">
              {([15, 24, 30] as const).map((fps) => (
                <button
                  key={fps}
                  onClick={() => {
                    setSettings({ ...settings, frameRate: fps })
                    setSelectedPreset(null)
                  }}
                  className={`py-2 px-4 rounded-lg border transition-all ${
                    settings.frameRate === fps
                      ? "border-lime-400 bg-lime-400/10 text-lime-400"
                      : "border-[#27272a] hover:border-[#3a3a3a] text-[#a1a1aa]"
                  }`}
                >
                  {fps} fps
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Layer */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Preferred Quality Layer</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["auto", "low", "medium", "high"] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    setSettings({ ...settings, preferredLayer: layer })
                    setSelectedPreset(null)
                  }}
                  className={`py-2 px-4 rounded-lg border transition-all capitalize ${
                    settings.preferredLayer === layer
                      ? "border-lime-400 bg-lime-400/10 text-lime-400"
                      : "border-[#27272a] hover:border-[#3a3a3a] text-[#a1a1aa]"
                  }`}
                >
                  {layer}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#a1a1aa]">
              Which quality layer to prioritize when available
            </p>
          </div>

          {/* Adaptive Quality Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-[#27272a]">
            <div>
              <Label className="text-sm font-medium">Adaptive Quality</Label>
              <p className="text-xs text-[#a1a1aa] mt-1">
                Automatically adjust quality based on connection
              </p>
            </div>
            <button
              onClick={() => {
                setSettings({ ...settings, enableAdaptive: !settings.enableAdaptive })
                setSelectedPreset(null)
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enableAdaptive ? "bg-lime-400" : "bg-[#27272a]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enableAdaptive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Data Usage Estimate */}
        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-start gap-3">
          <Gauge className="w-5 h-5 text-purple-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-purple-400 mb-1">Estimated Data Usage</h4>
            <p className="text-sm text-purple-200">
              Approximately <span className="font-bold">{getDataUsageEstimate()} MB</span> per hour with current settings
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-[#27272a]">
          <Button
            variant="ghost"
            onClick={() => {
              setSettings(DEFAULT_SETTINGS)
              setSelectedPreset(null)
            }}
          >
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            className="bg-lime-400 hover:bg-lime-500 text-black gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Export function to get saved settings
export function getSavedQualitySettings(): VideoQualitySettings | null {
  if (typeof window === "undefined") return null

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as VideoQualitySettings
    } catch (error) {
      console.error("Failed to load quality settings:", error)
      return null
    }
  }
  return null
}
