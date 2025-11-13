"use client"

import { useState, useEffect } from "react"
import { Sparkles, X } from "lucide-react"

interface FeatureIntroModalProps {
  featureName: string
  title: string
  description: string
  tips?: string[]
  isOpen: boolean
  onClose: () => void
}

export const FeatureIntroModal = ({
  featureName,
  title,
  description,
  tips = [],
  isOpen,
  onClose,
}: FeatureIntroModalProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(`feature-intro-${featureName}`, "seen")
      } catch (error) {
        console.error("Failed to save feature intro preference:", error)
      }
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-labelledby="feature-intro-title"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-gradient-to-br from-[#18181b] to-[#27272a] border-2 border-lime-400/20 rounded-2xl shadow-2xl shadow-lime-400/10 animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-[#a1a1aa]" />
        </button>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-lime-400/10 border-2 border-lime-400/20 rounded-full">
              <Sparkles className="w-12 h-12 text-lime-400" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 id="feature-intro-title" className="text-3xl font-bold">
              {title}
            </h2>
            <p className="text-lg text-[#a1a1aa]">{description}</p>
          </div>

          {/* Tips */}
          {tips.length > 0 && (
            <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-sm font-bold text-lime-400 uppercase tracking-wide">
                Quick Tips
              </h3>
              <ul className="space-y-2">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-[#a1a1aa]">
                    <span className="text-lime-400 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dont-show-again"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-[#a1a1aa] bg-transparent checked:bg-lime-400 checked:border-lime-400 focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-[#18181b] cursor-pointer"
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm text-[#a1a1aa] cursor-pointer select-none"
              >
                Don&apos;t show this again
              </label>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-4 bg-lime-400 hover:bg-lime-500 text-black font-bold text-lg rounded-xl transition-colors duration-200"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
