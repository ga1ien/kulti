"use client"

import { useState, useEffect } from "react"

const scrollToWaitlist = () => {
  const waitlistSection = document.getElementById("waitlist")
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

export function Hero() {
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => clearInterval(cursorInterval)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#1a1a1a]" />

      {/* Subtle scan lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(163,230,53,0.03) 0px, transparent 1px, transparent 2px, rgba(163,230,53,0.03) 3px)',
        }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Main headline */}
        <h1 className="font-mono font-bold text-7xl md:text-8xl lg:text-9xl mb-8 animate-fade-in">
          Build The Future, Live
        </h1>

        {/* Subheadline */}
        <div className="max-w-3xl mx-auto space-y-4 text-xl md:text-2xl text-[#a1a1aa] animate-fade-in-delay-1">
          <p>This is the first time in history where being curious</p>
          <p className="font-semibold text-white">matters more than being credentialed.</p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute -bottom-[188px] left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-[#27272a] rounded-full flex justify-center">
            <div className="w-1.5 h-3 bg-lime-400 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}
