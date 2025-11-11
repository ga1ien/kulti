"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const scrollToWaitlist = () => {
  const waitlistSection = document.getElementById("waitlist")
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

export function LandingNav() {
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => clearInterval(cursorInterval)
  }, [])

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl">
      <div className="bg-[#1a1a1a]/50 backdrop-blur-xl border border-[#27272a]/50 rounded-2xl px-6 shadow-2xl">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="font-mono text-xl font-bold text-white">
            kulti
            <span className={`text-lime-400 transition-opacity duration-100 ${showCursor ? "opacity-100" : "opacity-0"}`}>
              _
            </span>
          </div>

          {/* CTA Button */}
          <button
            onClick={scrollToWaitlist}
            className="inline-flex items-center justify-center px-5 py-2 bg-lime-400 hover:bg-lime-500 text-black rounded-full font-medium text-sm transition-colors"
          >
            Get Early Access
          </button>
        </div>
      </div>
    </nav>
  )
}
