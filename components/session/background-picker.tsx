"use client"

import { useState, useRef, useEffect } from "react"
import { useHMSActions, useHMSStore, selectLocalPeer } from "@100mslive/react-sdk"
import { HMSVirtualBackgroundPlugin } from "@100mslive/hms-virtual-background"
import { Button } from "@/components/ui/button"
import { X, Upload, Check, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import Image from "next/image"

interface BackgroundPickerProps {
  isOpen: boolean
  onClose: () => void
  virtualBgPlugin: HMSVirtualBackgroundPlugin | null
}

type BackgroundType = "none" | "blur" | "image"

interface BackgroundOption {
  id: string
  type: BackgroundType
  label: string
  description: string
  preview?: string
}

export function BackgroundPicker({
  isOpen,
  onClose,
  virtualBgPlugin,
}: BackgroundPickerProps) {
  const hmsActions = useHMSActions()
  const localPeer = useHMSStore(selectLocalPeer)
  const [selectedBackground, setSelectedBackground] = useState<string>("none")
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const backgrounds: BackgroundOption[] = [
    {
      id: "none",
      type: "none",
      label: "No Background",
      description: "Show your actual background",
    },
    {
      id: "blur-low",
      type: "blur",
      label: "Slight Blur",
      description: "Subtle background blur",
    },
    {
      id: "blur-high",
      type: "blur",
      label: "Strong Blur",
      description: "Heavy background blur",
    },
  ]

  // Add custom image option if uploaded
  if (customImage) {
    backgrounds.push({
      id: "custom",
      type: "image",
      label: "Custom Image",
      description: "Your uploaded background",
      preview: customImage,
    })
  }

  useEffect(() => {
    // Initialize with no background selected
    // Virtual background plugin doesn't expose current state easily
  }, [virtualBgPlugin])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setCustomImage(result)
      setSelectedBackground("custom")
      toast.success("Background image uploaded")
    }
    reader.readAsDataURL(file)
  }

  const handleApply = async () => {
    if (!virtualBgPlugin) {
      toast.error("Virtual background not supported")
      return
    }

    setIsApplying(true)

    try {
      const selected = backgrounds.find((bg) => bg.id === selectedBackground)
      if (!selected) return

      switch (selected.type) {
        case "none":
          // Remove virtual background by disabling the plugin
          // @ts-ignore - HMS plugin API
          await virtualBgPlugin.disable?.() || virtualBgPlugin.removeBackground?.()
          toast.success("Background removed")
          break

        case "blur":
          // Apply blur - HMS virtual background uses "blur" and "slight-blur" presets
          const blurPreset = selected.id === "blur-high" ? "blur" : "slight-blur"
          await virtualBgPlugin.setBackground(blurPreset)
          toast.success("Blur effect applied")
          break

        case "image":
          // Apply custom image
          if (customImage) {
            await virtualBgPlugin.setBackground(customImage)
            toast.success("Custom background applied")
          }
          break
      }

      onClose()
    } catch (error) {
      console.error("Failed to apply background:", error)
      toast.error("Failed to apply background effect")
    } finally {
      setIsApplying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#27272a]">
          <div>
            <h2 className="text-2xl font-bold">Virtual Background</h2>
            <p className="text-[#a1a1aa] text-sm mt-1">
              Choose a background effect for your video
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setSelectedBackground(bg.id)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  selectedBackground === bg.id
                    ? "border-lime-400 bg-lime-400/5"
                    : "border-[#27272a] hover:border-[#3a3a3a] bg-[#0a0a0a]"
                }`}
              >
                {/* Preview */}
                <div className="aspect-video rounded-lg mb-3 overflow-hidden bg-[#2a2a2a] flex items-center justify-center relative">
                  {bg.preview ? (
                    <Image
                      src={bg.preview}
                      alt={bg.label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : bg.type === "blur" ? (
                    <div className="text-4xl">🌫️</div>
                  ) : (
                    <div className="text-4xl">📹</div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{bg.label}</h3>
                    {selectedBackground === bg.id && (
                      <Check className="w-4 h-4 text-lime-400" />
                    )}
                  </div>
                  <p className="text-xs text-[#a1a1aa]">{bg.description}</p>
                </div>
              </button>
            ))}

            {/* Upload Custom Image */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative p-4 rounded-xl border-2 border-dashed border-[#27272a] hover:border-[#3a3a3a] bg-[#0a0a0a] transition-all text-left"
            >
              <div className="aspect-video rounded-lg mb-3 flex items-center justify-center bg-[#2a2a2a]">
                <Upload className="w-8 h-8 text-[#a1a1aa]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">Upload Image</h3>
                <p className="text-xs text-[#a1a1aa]">
                  Choose a custom background
                </p>
              </div>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400">
              💡 <strong>Tip:</strong> Virtual backgrounds work best with good lighting
              and a clear separation between you and your background.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#27272a]">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isApplying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplying}
            className="bg-lime-400 hover:bg-lime-500 text-black font-semibold"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Applying...
              </>
            ) : (
              "Apply Background"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
