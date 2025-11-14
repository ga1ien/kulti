"use client"

import { useCallback, useState, useEffect } from "react"
import {
  useHMSActions,
  useHMSStore,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectIsLocalScreenShared,
} from "@100mslive/react-sdk"
import { HMSVirtualBackgroundPlugin } from "@100mslive/hms-virtual-background"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PictureInPicture, Sparkles, Volume2, VolumeX, Circle, Settings } from "lucide-react"
import { BackgroundPicker } from "./background-picker"
import { QualitySettingsModal } from "./quality-settings-modal"
import { toast } from "react-hot-toast"
import { logger } from "@/lib/logger"

/**
 * HMS Audio Settings interface
 */
interface HMSAudioSettings {
  codecParams?: {
    music?: boolean
  }
}

/**
 * HMS Video Codec type
 */
type HMSVideoCodec = 'vp8' | 'vp9' | 'h264'

interface ControlsProps {
  sessionId: string
  isHost: boolean
  virtualBgPlugin: HMSVirtualBackgroundPlugin | null
  noiseCancellationActive: boolean
  onToggleNoiseCancellation: () => void
}

export function Controls({
  sessionId,
  isHost,
  virtualBgPlugin,
  noiseCancellationActive,
  onToggleNoiseCancellation
}: ControlsProps) {
  const hmsActions = useHMSActions()
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled)
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled)
  const isLocalScreenShared = useHMSStore(selectIsLocalScreenShared)
  const [isPipEnabled, setIsPipEnabled] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [showQualitySettings, setShowQualitySettings] = useState(false)
  const [musicModeActive, setMusicModeActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRecordingLoading, setIsRecordingLoading] = useState(false)

  // Check if browser supports Picture-in-Picture
  useEffect(() => {
    // Check if PiP is supported by checking for the API
    const supported = 'pictureInPictureEnabled' in document
    setPipSupported(supported)

    // Listen for PiP events
    const handlePipEnter = () => {
      setIsPipEnabled(true)
      toast.success("Entered Picture-in-Picture mode", { icon: "📺" })
    }

    const handlePipExit = () => {
      setIsPipEnabled(false)
      toast("Exited Picture-in-Picture mode", { icon: "📺" })
    }

    document.addEventListener('enterpictureinpicture', handlePipEnter)
    document.addEventListener('leavepictureinpicture', handlePipExit)

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePipEnter)
      document.removeEventListener('leavepictureinpicture', handlePipExit)
    }
  }, [])

  // Memoize toggle functions to prevent unnecessary re-renders
  const toggleAudio = useCallback(async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled)
  }, [hmsActions, isLocalAudioEnabled])

  const toggleVideo = useCallback(async () => {
    await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled)
  }, [hmsActions, isLocalVideoEnabled])

  const toggleScreenShare = useCallback(async () => {
    await hmsActions.setScreenShareEnabled(!isLocalScreenShared)
  }, [hmsActions, isLocalScreenShared])

  const togglePip = useCallback(async () => {
    try {
      if (isPipEnabled) {
        // Exit PiP mode
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture()
        }
      } else {
        // Enter PiP mode - find first video element and request PiP
        const videoElements = document.querySelectorAll('video')
        if (videoElements.length > 0) {
          const videoElement = videoElements[0] as HTMLVideoElement
          if ('requestPictureInPicture' in videoElement) {
            await videoElement.requestPictureInPicture()
          } else {
            toast.error("Picture-in-Picture not supported on this video")
          }
        } else {
          toast.error("No video available for Picture-in-Picture")
        }
      }
    } catch (error) {
      logger.error("PiP toggle error", { error })
      toast.error("Failed to toggle Picture-in-Picture mode")
    }
  }, [isPipEnabled])

  const toggleMusicMode = useCallback(async () => {
    try {
      // @ts-expect-error - HMS music mode API uses codecParams which isn't in the official type
      await hmsActions.setAudioSettings({
        codecParams: {
          music: !musicModeActive,
        },
      } as HMSAudioSettings)
      setMusicModeActive(!musicModeActive)
      toast.success(
        musicModeActive
          ? "Music mode disabled"
          : "Music mode enabled - High quality audio active"
      )
    } catch (error) {
      logger.error("Failed to toggle music mode", { error })
      toast.error("Failed to toggle music mode")
    }
  }, [hmsActions, musicModeActive])

  const toggleRecording = useCallback(async () => {
    setIsRecordingLoading(true)
    try {
      if (isRecording) {
        // Stop recording
        const response = await fetch("/api/hms/stop-recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          throw new Error("Failed to stop recording")
        }

        setIsRecording(false)
        toast.success("Recording stopped. Processing will complete shortly.")
      } else {
        // Start recording
        const response = await fetch("/api/hms/start-recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          throw new Error("Failed to start recording")
        }

        setIsRecording(true)
        toast.success("Recording started")
      }
    } catch (error) {
      logger.error("Recording toggle error", { error, isRecording })
      toast.error(isRecording ? "Failed to stop recording" : "Failed to start recording")
    } finally {
      setIsRecordingLoading(false)
    }
  }, [isRecording, sessionId])

  return (
    <>
      <div className="flex items-center justify-center gap-3 p-4 flex-wrap">
        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500 rounded-full">
            <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-500">Recording</span>
          </div>
        )}
        {/* Microphone */}
        <Button
          variant={isLocalAudioEnabled ? "secondary" : "ghost"}
          size="lg"
          onClick={toggleAudio}
          className={!isLocalAudioEnabled ? "text-red-500 hover:text-red-400" : ""}
        >
          {isLocalAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </Button>

        {/* Camera */}
        <Button
          variant={isLocalVideoEnabled ? "secondary" : "ghost"}
          size="lg"
          onClick={toggleVideo}
          className={!isLocalVideoEnabled ? "text-red-500 hover:text-red-400" : ""}
        >
          {isLocalVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </Button>

        {/* Screen Share (only for host/presenter) */}
        {isHost && (
          <Button
            variant={isLocalScreenShared ? "primary" : "secondary"}
            size="lg"
            onClick={toggleScreenShare}
          >
            {isLocalScreenShared ? (
              <MonitorOff size={20} />
            ) : (
              <Monitor size={20} />
            )}
          </Button>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-[#27272a] mx-2 hidden sm:block" />

        {/* Effects Button - Virtual Background */}
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setShowBackgroundPicker(true)}
          disabled={!virtualBgPlugin}
          title="Virtual Background"
        >
          <Sparkles size={20} />
        </Button>

        {/* Noise Cancellation Toggle */}
        <Button
          variant={noiseCancellationActive ? "primary" : "secondary"}
          size="lg"
          onClick={onToggleNoiseCancellation}
          className={noiseCancellationActive ? "bg-purple-500 hover:bg-purple-600" : ""}
          title="Noise Cancellation"
        >
          {noiseCancellationActive ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </Button>

        {/* Music Mode Toggle (only for host/presenter) */}
        {isHost && (
          <Button
            variant={musicModeActive ? "primary" : "secondary"}
            size="lg"
            onClick={toggleMusicMode}
            className={musicModeActive ? "bg-pink-500 hover:bg-pink-600" : ""}
            title="Music Mode - High Quality Audio"
          >
            🎵
          </Button>
        )}

        {/* Recording Control (only for host) */}
        {isHost && (
          <Button
            variant="secondary"
            size="lg"
            onClick={toggleRecording}
            disabled={isRecordingLoading}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            <Circle
              size={20}
              className={isRecording ? "fill-current" : ""}
            />
          </Button>
        )}

        {/* Picture-in-Picture (only if browser supports it) */}
        {pipSupported && (
          <Button
            variant={isPipEnabled ? "primary" : "secondary"}
            size="lg"
            onClick={togglePip}
            className={isPipEnabled ? "bg-lime-500 hover:bg-lime-600" : ""}
          >
            <PictureInPicture size={20} />
          </Button>
        )}

        {/* Quality Settings */}
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setShowQualitySettings(true)}
          className="text-[#a1a1aa] hover:text-white"
          title="Video Quality Settings"
        >
          <Settings size={20} />
        </Button>
      </div>

      {/* Background Picker Modal */}
      <BackgroundPicker
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        virtualBgPlugin={virtualBgPlugin}
      />

      {/* Quality Settings Modal */}
      <QualitySettingsModal
        isOpen={showQualitySettings}
        onClose={() => setShowQualitySettings(false)}
        onApply={(settings) => {
          // Apply video quality settings to HMS
          hmsActions.setVideoSettings({
            maxBitrate: settings.maxBitrate,
            maxFramerate: settings.frameRate,
            // codec property has type issues, defaulting to SDK's choice
          })

          // Set preferred layer for simulcast
          // if (settings.preferredLayer !== "auto") {
          //   hmsActions.setPreferredLayer(settings.preferredLayer)
          // }

          toast.success("Video quality settings applied", { icon: "⚙️" })
        }}
      />
    </>
  )
}
