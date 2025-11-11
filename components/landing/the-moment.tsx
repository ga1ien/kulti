"use client"

export function TheMoment() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <p className="text-3xl md:text-4xl text-[#a1a1aa] animate-fade-in">
          Your grandparents built cars on assembly lines.
        </p>

        <p className="text-3xl md:text-4xl text-[#a1a1aa] animate-fade-in-delay-1">
          Your parents built companies in offices.
        </p>

        <p className="text-4xl md:text-5xl font-bold text-white animate-fade-in-delay-2">
          You're building the future<br />with AI in your bedroom.
        </p>

        <p className="text-3xl md:text-4xl text-lime-400 font-semibold animate-fade-in-delay-2">
          And nobody's watching.
        </p>
      </div>
    </section>
  )
}
