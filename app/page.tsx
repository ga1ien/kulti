"use client"

import { useState, useEffect } from "react"
import { IntroScreen } from "@/components/landing/intro-screen"
import { LandingNav } from "@/components/landing/landing-nav"
import { Hero } from "@/components/landing/hero"
import { TheMoment } from "@/components/landing/the-moment"
import { WhatThisIs } from "@/components/landing/what-this-is"
import { WhyThisMatters } from "@/components/landing/why-this-matters"
import { TheShift } from "@/components/landing/the-shift"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => clearInterval(cursorInterval)
  }, [])

  return (
    <>
      <IntroScreen />
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <LandingNav />
        <Hero />
      <TheMoment />
      <WhatThisIs />
      <WhyThisMatters />
      <TheShift />
      <section id="waitlist" className="relative py-32 px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="font-mono text-5xl md:text-6xl font-bold mb-8">
            <span className="text-lime-400 mr-4">&gt;</span>Join The Movement
            <span className={`text-lime-400 transition-opacity duration-100 ${showCursor ? "opacity-100" : "opacity-0"}`}>
              _
            </span>
          </h2>
          <p className="text-2xl md:text-3xl text-[#a1a1aa] mb-12">
            Be part of the first generation building in public
          </p>
          <WaitlistForm />
        </div>
      </section>
      <Footer />
    </main>
    </>
  )
}
