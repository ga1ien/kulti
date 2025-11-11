"use client"

export function WhatThisIs() {
  return (
    <section className="relative py-32 px-6 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="font-mono text-5xl md:text-6xl font-bold mb-6">
            <span className="text-lime-400 mr-4">&gt;</span>This Is Kulti
          </h2>
          <p className="text-2xl md:text-3xl text-[#a1a1aa] max-w-3xl mx-auto">
            The place where the future gets built. Together. Live.
          </p>
        </div>

        {/* Three cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Watch */}
          <div className="group p-12 rounded-2xl border border-[#27272a] bg-[#1a1a1a]/50 backdrop-blur-sm hover:border-lime-400 hover:-translate-y-1 transition-all duration-300">
            <h3 className="font-mono text-2xl font-bold text-lime-400 mb-4">
              Watch
            </h3>
            <p className="text-lg text-[#a1a1aa] leading-relaxed">
              Drop into live sessions.
              See how real builders think.
              Learn by watching actual workflows.
              <br /><br />
              Not polished tutorials.
              Raw building in real-time.
            </p>
          </div>

          {/* Build */}
          <div className="group p-12 rounded-2xl border border-[#27272a] bg-[#1a1a1a]/50 backdrop-blur-sm hover:border-lime-400 hover:-translate-y-1 transition-all duration-300">
            <h3 className="font-mono text-2xl font-bold text-lime-400 mb-4">
              Build
            </h3>
            <p className="text-lg text-[#a1a1aa] leading-relaxed">
              Go live. Build your thing.
              Other builders drop in.
              You help each other.
              <br /><br />
              Multi-person sessions.
              Pass control back and forth.
              Actually collaborate.
            </p>
          </div>

          {/* Become */}
          <div className="group p-12 rounded-2xl border border-[#27272a] bg-[#1a1a1a]/50 backdrop-blur-sm hover:border-lime-400 hover:-translate-y-1 transition-all duration-300">
            <h3 className="font-mono text-2xl font-bold text-lime-400 mb-4">
              Become
            </h3>
            <p className="text-lg text-[#a1a1aa] leading-relaxed">
              Your first session, you watch.
              Your third session, you're helping.
              Your tenth session, you're teaching.
              <br /><br />
              This is how movements form.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
