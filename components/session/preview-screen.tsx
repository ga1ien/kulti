"use client"

import { useState, useEffect, useRef } from "react"
import {
  useHMSActions,
  useDevices,
  useAVToggle,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectLocalPeer,
  useHMSStore,
  HMSException,
} from "@100mslive/react-sdk"
import { Camera, CameraOff, Mic, MicOff, Volume2, Loader2, AlertCircle, CheckCircle2, Settings, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DiagnosticsModal } from "./diagnostics-modal"
import { QualitySettingsModal } from "./quality-settings-modal"
import { toast } from "react-hot-toast"

export interface PreviewScreenProps {
  sessionId: string
  roomId: string
  onJoin: (token: string) => void
  onCancel: () => void
}

interface DeviceError {
  type: "permission_denied" | "device_not_found" | "browser_incompatible" | "unknown"
  message: string
  details?: string
}

export function PreviewScreen({ sessionId, roomId, onJoin, onCancel }: PreviewScreenProps) {
  const hmsActions = useHMSActions()
  const { allDevices, selectedDeviceIDs, updateDevice } = useDevices()
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio, toggleVideo } = useAVToggle()
  const localPeer = useHMSStore(selectLocalPeer)

  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [deviceError, setDeviceError] = useState<DeviceError | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isTesting, setIsTesting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showQualitySettings, setShowQualitySettings] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const testAudioRef = useRef<HTMLAudioElement | null>(null)

  // Check browser compatibility
  useEffect(() => {
    const checkBrowserSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDeviceError({
          type: "browser_incompatible",
          message: "Browser not supported",
          details: "Your browser doesn't support WebRTC. Please use Chrome, Firefox, Safari, or Edge.",
        })
        setIsLoading(false)
        return false
      }
      return true
    }

    if (!checkBrowserSupport()) return

    // Initialize preview
    const initPreview = async () => {
      try {
        setIsLoading(true)
        setDeviceError(null)

        // Request permissions and get devices
        await hmsActions.preview({
          userName: "Preview User",
          authToken: "", // Preview doesn't require actual token
          settings: {
            isAudioMuted: false,
            isVideoMuted: false,
          },
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Preview initialization error:", error)
        handleDeviceError(error)
        setIsLoading(false)
      }
    }

    initPreview()

    return () => {
      // Cleanup preview
      hmsActions.cancelMidCallPreview()
      cleanupAudioAnalyser()
    }
  }, [hmsActions])

  // Handle device errors
  const handleDeviceError = (error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as any).code

      if (code === 3008 || code === 3001) {
        setDeviceError({
          type: "permission_denied",
          message: "Camera or microphone access denied",
          details: "Please allow camera and microphone access in your browser settings and reload the page.",
        })
      } else if (code === 3003) {
        setDeviceError({
          type: "device_not_found",
          message: "No camera or microphone found",
          details: "Please connect a camera and microphone to join the session.",
        })
      } else {
        setDeviceError({
          type: "unknown",
          message: (error as any).message || "Failed to initialize preview",
          details: "Please check your device settings and try again.",
        })
      }
    } else {
      setDeviceError({
        type: "unknown",
        message: "Failed to initialize preview",
        details: "An unexpected error occurred. Please try again.",
      })
    }
  }

  // Setup video preview
  useEffect(() => {
    if (!localPeer?.videoTrack || !videoRef.current) return

    const videoElement = videoRef.current
    const videoTrack = localPeer.videoTrack

    if (videoTrack) {
      hmsActions.attachVideo(videoTrack, videoElement)
    }

    return () => {
      if (videoTrack) {
        hmsActions.detachVideo(videoTrack, videoElement)
      }
    }
  }, [localPeer?.videoTrack, hmsActions])

  // Setup audio level monitoring
  useEffect(() => {
    if (!localPeer?.audioTrack || !isLocalAudioEnabled) {
      cleanupAudioAnalyser()
      setAudioLevel(0)
      return
    }

    const setupAudioAnalyser = async () => {
      try {
        // Create audio context
        audioContextRef.current = new AudioContext()
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256

        // Get audio track stream
        const stream = new MediaStream([localPeer.audioTrack as unknown as MediaStreamTrack])
        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(analyserRef.current)

        // Monitor audio levels
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray)
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length
            setAudioLevel(Math.min(100, (average / 128) * 100))
            animationFrameRef.current = requestAnimationFrame(updateLevel)
          }
        }
        updateLevel()
      } catch (error) {
        console.error("Failed to setup audio analyser:", error)
      }
    }

    setupAudioAnalyser()

    return () => {
      cleanupAudioAnalyser()
    }
  }, [localPeer?.audioTrack, isLocalAudioEnabled])

  const cleanupAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
  }

  // Test speaker
  const handleTestSpeaker = () => {
    if (isTesting) {
      // Stop test
      if (testAudioRef.current) {
        testAudioRef.current.pause()
        testAudioRef.current.currentTime = 0
      }
      setIsTesting(false)
      toast.success("Speaker test stopped")
    } else {
      // Start test - play a test tone
      try {
        if (!testAudioRef.current) {
          testAudioRef.current = new Audio("/test-tone.mp3")
        }

        // Use selected audio output device if available
        const audioElement = testAudioRef.current as any
        if (selectedDeviceIDs.audioOutput && audioElement.setSinkId) {
          audioElement.setSinkId(selectedDeviceIDs.audioOutput)
        }

        testAudioRef.current.play()
        setIsTesting(true)
        toast.success("Playing test sound...")

        testAudioRef.current.onended = () => {
          setIsTesting(false)
        }
      } catch (error) {
        console.error("Failed to test speaker:", error)
        toast.error("Failed to play test sound")
      }
    }
  }

  // Join session
  const handleJoin = async () => {
    try {
      setIsJoining(true)

      // Get HMS auth token
      const response = await fetch("/api/hms/get-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          sessionId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to get session token")
      }

      onJoin(data.token)
    } catch (error) {
      console.error("Join error:", error)
      const message = error instanceof Error ? error.message : "Failed to join session"
      toast.error(message)
      setIsJoining(false)
    }
  }

  // Device selection handlers
  const handleVideoDeviceChange = async (deviceId: string) => {
    try {
      await updateDevice({ deviceType: 'videoInput' as any, deviceId })
      toast.success("Camera updated")
    } catch (error) {
      console.error("Failed to update video device:", error)
      toast.error("Failed to update camera")
    }
  }

  const handleAudioInputChange = async (deviceId: string) => {
    try {
      await updateDevice({ deviceType: 'audioInput' as any, deviceId })
      toast.success("Microphone updated")
    } catch (error) {
      console.error("Failed to update audio input:", error)
      toast.error("Failed to update microphone")
    }
  }

  const handleAudioOutputChange = async (deviceId: string) => {
    try {
      await updateDevice({ deviceType: 'audioOutput' as any, deviceId })
      toast.success("Speaker updated")
    } catch (error) {
      console.error("Failed to update audio output:", error)
      toast.error("Failed to update speaker")
    }
  }

  // Render device error
  if (deviceError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="max-w-md w-full space-y-6 p-8 bg-[#1a1a1a] border border-[#27272a] rounded-2xl">
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-8 h-8 flex-shrink-0" />
            <h2 className="text-2xl font-bold">{deviceError.message}</h2>
          </div>

          <p className="text-[#a1a1aa]">{deviceError.details}</p>

          {deviceError.type === "permission_denied" && (
            <div className="bg-[#27272a]/50 p-4 rounded-lg space-y-2">
              <p className="font-medium text-sm">To fix this:</p>
              <ol className="text-sm text-[#a1a1aa] space-y-1 list-decimal list-inside">
                <li>Click the camera/microphone icon in your browser's address bar</li>
                <li>Select "Allow" for camera and microphone access</li>
                <li>Reload this page</li>
              </ol>
            </div>
          )}

          {deviceError.type === "device_not_found" && allDevices.videoInput?.length === 0 && (
            <div className="bg-[#27272a]/50 p-4 rounded-lg space-y-2">
              <p className="font-medium text-sm">Available devices:</p>
              <div className="text-sm text-[#a1a1aa] space-y-1">
                <p>Cameras: {allDevices.videoInput?.length || "None"}</p>
                <p>Microphones: {allDevices.audioInput?.length || "None"}</p>
                <p>Speakers: {allDevices.audioOutput?.length || "None"}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()} variant="primary" className="flex-1">
              Retry
            </Button>
            <Button onClick={onCancel} variant="ghost" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-lime-400 mx-auto" />
          <p className="text-xl text-[#a1a1aa]">Setting up your devices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Setup Your Devices</h1>
          <p className="text-[#a1a1aa]">Test your camera and microphone before joining</p>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#27272a]">
          {isLocalVideoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-[#27272a] flex items-center justify-center mx-auto">
                  <CameraOff className="w-12 h-12 text-[#71717a]" />
                </div>
                <p className="text-[#a1a1aa]">Camera is off</p>
              </div>
            </div>
          )}

          {/* Device Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              {/* Toggle Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-all ${
                    isLocalVideoEnabled
                      ? "bg-[#27272a] hover:bg-[#3a3a3a]"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                  aria-label={isLocalVideoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {isLocalVideoEnabled ? (
                    <Camera className="w-6 h-6" />
                  ) : (
                    <CameraOff className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={toggleAudio}
                  className={`p-4 rounded-full transition-all ${
                    isLocalAudioEnabled
                      ? "bg-[#27272a] hover:bg-[#3a3a3a]"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                  aria-label={isLocalAudioEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  {isLocalAudioEnabled ? (
                    <Mic className="w-6 h-6" />
                  ) : (
                    <MicOff className="w-6 h-6" />
                  )}
                </button>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-4 rounded-full bg-[#27272a] hover:bg-[#3a3a3a] transition-all"
                aria-label="Device settings"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Audio Level Indicator */}
        {isLocalAudioEnabled && (
          <div className="bg-[#1a1a1a] border border-[#27272a] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-lime-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#a1a1aa]">Microphone Level</span>
                  <span className="text-xs text-[#a1a1aa]">{Math.round(audioLevel)}%</span>
                </div>
                <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime-400 transition-all duration-100 rounded-full"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-[#71717a] mt-2">
              {audioLevel > 5 ? "Speak to test your microphone" : "Try speaking louder"}
            </p>
          </div>
        )}

        {/* Device Settings Panel */}
        {showSettings && (
          <div className="bg-[#1a1a1a] border border-[#27272a] rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Device Settings
            </h3>

            {/* Camera Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#a1a1aa]">Camera</label>
              <select
                value={selectedDeviceIDs.videoInput}
                onChange={(e) => handleVideoDeviceChange(e.target.value)}
                className="w-full bg-[#27272a] border border-[#3a3a3a] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                {allDevices.videoInput?.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#a1a1aa]">Microphone</label>
              <select
                value={selectedDeviceIDs.audioInput}
                onChange={(e) => handleAudioInputChange(e.target.value)}
                className="w-full bg-[#27272a] border border-[#3a3a3a] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                {allDevices.audioInput?.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#a1a1aa]">Speaker</label>
              <div className="flex gap-2">
                <select
                  value={selectedDeviceIDs.audioOutput}
                  onChange={(e) => handleAudioOutputChange(e.target.value)}
                  className="flex-1 bg-[#27272a] border border-[#3a3a3a] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  {allDevices.audioOutput?.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTestSpeaker}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isTesting
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-lime-400 hover:bg-lime-500 text-black"
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[#71717a]">Click the speaker icon to test audio output</p>
            </div>
          </div>
        )}

        {/* Device Status */}
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              {isLocalVideoEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-lime-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">Camera</p>
                <p className="text-xs text-[#71717a]">
                  {isLocalVideoEnabled ? "Ready" : "Disabled"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLocalAudioEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-lime-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">Microphone</p>
                <p className="text-xs text-[#71717a]">
                  {isLocalAudioEnabled ? "Ready" : "Disabled"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-lime-400" />
              <div>
                <p className="text-sm font-medium">Connection</p>
                <p className="text-xs text-[#71717a]">Ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onCancel}
            variant="ghost"
            className="flex-1"
            disabled={isJoining}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setShowDiagnostics(true)}
            variant="secondary"
            className="flex-1 gap-2"
            disabled={isJoining}
          >
            <Activity className="w-5 h-5" />
            Run Connection Test
          </Button>
          <Button
            onClick={() => setShowQualitySettings(true)}
            variant="secondary"
            className="flex-1 gap-2"
            disabled={isJoining}
          >
            <Settings className="w-5 h-5" />
            Quality Settings
          </Button>
          <Button
            onClick={handleJoin}
            variant="primary"
            className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-bold"
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Session"
            )}
          </Button>
        </div>
      </div>

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        onContinue={handleJoin}
      />

      {/* Quality Settings Modal */}
      <QualitySettingsModal
        isOpen={showQualitySettings}
        onClose={() => setShowQualitySettings(false)}
      />
    </div>
  )
}
