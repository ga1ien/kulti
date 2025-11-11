"use client"

import { useState, useEffect } from "react"

export function IntroScreen() {
  const [text, setText] = useState("")
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const [shouldRender, setShouldRender] = useState(true)

  const sequence = ["k", "ku", "kul", "kult", "kulti"]

  useEffect(() => {
    // Typing animation
    let currentIndex = 0
    const typingInterval = setInterval(() => {
      if (currentIndex < sequence.length) {
        setText(sequence[currentIndex])
        currentIndex++
      } else {
        clearInterval(typingInterval)
        // Wait before fading out
        setTimeout(() => {
          setIsComplete(true)
          // Remove from DOM after fade
          setTimeout(() => {
            setShouldRender(false)
          }, 800)
        }, 500)
      }
    }, 120)

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      clearInterval(typingInterval)
      clearInterval(cursorInterval)
    }
  }, [])

  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-[#0a0a0a] transition-opacity duration-700 ${
        isComplete ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="text-center">
        <div className="font-mono text-8xl md:text-9xl font-bold text-white">
          {text}
          <span className={`text-lime-400 transition-opacity duration-100 ${showCursor ? "opacity-100" : "opacity-0"}`}>
            _
          </span>
        </div>
      </div>
    </div>
  )
}
