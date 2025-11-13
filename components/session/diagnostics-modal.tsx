"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Wifi, Activity, MonitorPlay, Chrome } from "lucide-react"

interface DiagnosticsModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
}

interface DiagnosticResult {
  status: "success" | "warning" | "error"
  message: string
}

interface DiagnosticResults {
  connectivity: DiagnosticResult | null
  bandwidth: DiagnosticResult | null
  browser: DiagnosticResult | null
  webrtc: DiagnosticResult | null
}

interface BandwidthTestResult {
  downloadSpeed: number // Mbps
  uploadSpeed: number // Mbps
  latency: number // ms
}

export function DiagnosticsModal({ isOpen, onClose, onContinue }: DiagnosticsModalProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<DiagnosticResults>({
    connectivity: null,
    bandwidth: null,
    browser: null,
    webrtc: null,
  })
  const [canProceed, setCanProceed] = useState(false)

  // Run diagnostics when modal opens
  useEffect(() => {
    if (isOpen && !isRunning && !canProceed) {
      runDiagnostics()
    }
  }, [isOpen])

  const runDiagnostics = async () => {
    setIsRunning(true)
    setCanProceed(false)

    // Reset results
    setResults({
      connectivity: null,
      bandwidth: null,
      browser: null,
      webrtc: null,
    })

    // 1. Browser Compatibility Check
    await new Promise(resolve => setTimeout(resolve, 300))
    const browserResult = checkBrowserCompatibility()
    setResults(prev => ({ ...prev, browser: browserResult }))

    // 2. WebRTC Support Check
    await new Promise(resolve => setTimeout(resolve, 300))
    const webrtcResult = checkWebRTCSupport()
    setResults(prev => ({ ...prev, webrtc: webrtcResult }))

    // 3. Connectivity Test
    await new Promise(resolve => setTimeout(resolve, 300))
    const connectivityResult = await testConnectivity()
    setResults(prev => ({ ...prev, connectivity: connectivityResult }))

    // 4. Bandwidth Test
    const bandwidthResult = await testBandwidth()
    setResults(prev => ({ ...prev, bandwidth: bandwidthResult }))

    setIsRunning(false)
    setCanProceed(true)
  }

  function checkBrowserCompatibility(): DiagnosticResult {
    const userAgent = navigator.userAgent.toLowerCase()
    const isChrome = userAgent.includes("chrome") && !userAgent.includes("edg")
    const isFirefox = userAgent.includes("firefox")
    const isSafari = userAgent.includes("safari") && !userAgent.includes("chrome")
    const isEdge = userAgent.includes("edg")

    if (isChrome || isFirefox || isEdge) {
      return {
        status: "success",
        message: "Browser fully supported",
      }
    } else if (isSafari) {
      return {
        status: "warning",
        message: "Safari has limited features. Chrome recommended.",
      }
    } else {
      return {
        status: "error",
        message: "Unsupported browser. Please use Chrome, Firefox, or Edge.",
      }
    }
  }

  function checkWebRTCSupport(): DiagnosticResult {
    const hasGetUserMedia = !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    )
    const hasRTCPeerConnection = !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
    )

    if (hasGetUserMedia && hasRTCPeerConnection) {
      return {
        status: "success",
        message: "WebRTC fully supported",
      }
    } else if (hasGetUserMedia || hasRTCPeerConnection) {
      return {
        status: "warning",
        message: "Partial WebRTC support detected",
      }
    } else {
      return {
        status: "error",
        message: "WebRTC not supported by your browser",
      }
    }
  }

  async function testConnectivity(): Promise<DiagnosticResult> {
    try {
      const startTime = performance.now()

      // Test connection to 100ms servers
      const response = await fetch("https://prod-in2.100ms.live/health", {
        method: "GET",
        mode: "no-cors",
        cache: "no-cache",
      })

      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      if (latency < 100) {
        return {
          status: "success",
          message: `Excellent connection (${latency}ms latency)`,
        }
      } else if (latency < 300) {
        return {
          status: "success",
          message: `Good connection (${latency}ms latency)`,
        }
      } else if (latency < 500) {
        return {
          status: "warning",
          message: `Slow connection (${latency}ms latency)`,
        }
      } else {
        return {
          status: "error",
          message: `Very slow connection (${latency}ms latency)`,
        }
      }
    } catch (error) {
      return {
        status: "error",
        message: "Cannot reach video servers. Check your internet.",
      }
    }
  }

  async function testBandwidth(): Promise<DiagnosticResult> {
    try {
      // Simplified bandwidth test using image download
      const imageUrl = "https://via.placeholder.com/1000x1000.png?text=Test"
      const startTime = performance.now()

      const response = await fetch(imageUrl, {
        cache: "no-cache",
      })

      const blob = await response.blob()
      const endTime = performance.now()

      const durationSeconds = (endTime - startTime) / 1000
      const sizeBytes = blob.size
      const speedMbps = ((sizeBytes * 8) / (durationSeconds * 1000000)).toFixed(2)

      const speed = parseFloat(speedMbps)

      // Estimate connection quality based on download speed
      if (speed >= 5) {
        return {
          status: "success",
          message: `Excellent bandwidth (~${speedMbps} Mbps) - HD video ready`,
        }
      } else if (speed >= 2) {
        return {
          status: "success",
          message: `Good bandwidth (~${speedMbps} Mbps) - SD video ready`,
        }
      } else if (speed >= 1) {
        return {
          status: "warning",
          message: `Limited bandwidth (~${speedMbps} Mbps) - Lower quality recommended`,
        }
      } else {
        return {
          status: "error",
          message: `Low bandwidth (~${speedMbps} Mbps) - Video may be unstable`,
        }
      }
    } catch (error) {
      return {
        status: "warning",
        message: "Could not measure bandwidth. Proceed with caution.",
      }
    }
  }

  const getStatusIcon = (status: DiagnosticResult["status"] | null) => {
    if (!status) return <Activity className="w-5 h-5 animate-pulse text-blue-400" />
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusColor = (status: DiagnosticResult["status"] | null) => {
    if (!status) return "text-blue-400"
    switch (status) {
      case "success":
        return "text-green-500"
      case "warning":
        return "text-yellow-500"
      case "error":
        return "text-red-500"
    }
  }

  const hasErrors = Object.values(results).some(
    result => result?.status === "error"
  )

  const hasWarnings = Object.values(results).some(
    result => result?.status === "warning"
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1a1a] border-[#27272a] text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Connection Diagnostics</DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Testing your connection to ensure the best video quality
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          {/* Browser Compatibility */}
          <div className="flex items-start gap-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#27272a]">
            <div className="mt-0.5">
              <Chrome className="w-6 h-6 text-[#a1a1aa]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Browser Compatibility</h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(results.browser?.status || null)}
                <p className={`text-sm ${getStatusColor(results.browser?.status || null)}`}>
                  {results.browser?.message || "Checking..."}
                </p>
              </div>
            </div>
          </div>

          {/* WebRTC Support */}
          <div className="flex items-start gap-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#27272a]">
            <div className="mt-0.5">
              <MonitorPlay className="w-6 h-6 text-[#a1a1aa]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">WebRTC Support</h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(results.webrtc?.status || null)}
                <p className={`text-sm ${getStatusColor(results.webrtc?.status || null)}`}>
                  {results.webrtc?.message || "Checking..."}
                </p>
              </div>
            </div>
          </div>

          {/* Connectivity */}
          <div className="flex items-start gap-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#27272a]">
            <div className="mt-0.5">
              <Wifi className="w-6 h-6 text-[#a1a1aa]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Server Connectivity</h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(results.connectivity?.status || null)}
                <p className={`text-sm ${getStatusColor(results.connectivity?.status || null)}`}>
                  {results.connectivity?.message || "Testing..."}
                </p>
              </div>
            </div>
          </div>

          {/* Bandwidth */}
          <div className="flex items-start gap-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#27272a]">
            <div className="mt-0.5">
              <Activity className="w-6 h-6 text-[#a1a1aa]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Bandwidth Test</h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(results.bandwidth?.status || null)}
                <p className={`text-sm ${getStatusColor(results.bandwidth?.status || null)}`}>
                  {results.bandwidth?.message || "Measuring..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {canProceed && (hasErrors || hasWarnings) && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h4 className="font-semibold text-yellow-500 mb-2">Recommendations</h4>
            <ul className="text-sm text-yellow-200 space-y-1 list-disc list-inside">
              {hasErrors && (
                <li>Fix critical errors before joining for the best experience</li>
              )}
              {results.bandwidth?.status === "warning" && (
                <li>Close other apps using internet to improve connection</li>
              )}
              {results.bandwidth?.status === "error" && (
                <li>Consider using lower video quality settings</li>
              )}
              {results.connectivity?.status !== "success" && (
                <li>Move closer to your WiFi router or use ethernet</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={runDiagnostics}
            disabled={isRunning}
          >
            {isRunning ? "Testing..." : "Run Again"}
          </Button>
          <Button
            onClick={() => {
              onContinue()
              onClose()
            }}
            disabled={isRunning}
            className="bg-lime-400 hover:bg-lime-500 text-black"
          >
            Continue to Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
