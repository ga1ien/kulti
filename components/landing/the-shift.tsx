"use client"

export function TheShift() {
  return (
    <section className="relative py-32 px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        {/* Main content - centered and larger */}
        <div className="text-center space-y-8 mb-20">
          <div className="space-y-6 text-3xl md:text-4xl text-[#a1a1aa] leading-relaxed">
            <p>We watch people game.</p>
            <p>We watch people cook.</p>
            <p>We watch people react to things.</p>
          </div>

          <div className="h-16 flex items-center justify-center">
            <div className="w-1 h-full bg-gradient-to-b from-transparent via-[#27272a] to-transparent"></div>
          </div>

          <div className="space-y-6 text-3xl md:text-4xl text-white font-medium leading-relaxed">
            <p>But the people building the future?</p>
            <p>Using AI to create things that have never existed?</p>
            <p>Making history in real-time?</p>
          </div>
        </div>

        {/* Bottom statement */}
        <div className="text-center space-y-8 pt-8">
          <p className="text-3xl md:text-4xl text-[#a1a1aa] leading-relaxed">
            That's not a stream.<br />
            That's not content.
          </p>

          <p className="text-5xl md:text-6xl font-bold text-lime-400 py-4">
            That's the story of our generation.
          </p>

          <p className="text-3xl md:text-4xl text-white">
            And it deserves to be seen.
          </p>
        </div>
      </div>
    </section>
  )
}
