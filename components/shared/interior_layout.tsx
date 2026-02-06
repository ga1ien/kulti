'use client'

import { InteriorNav } from './interior_nav'

interface InteriorLayoutProps {
  route: string
  theme?: string
  children: React.ReactNode
}

export function InteriorLayout({ route, theme, children }: InteriorLayoutProps) {
  return (
    <div
      className="min-h-screen bg-black text-white relative"
      data-theme={theme}
    >
      <InteriorNav active_route={route} />

      {/* Ambient background blobs — uses accent-glow so color adapts per theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[250px] bg-accent-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[300px] bg-surface-1" />
      </div>

      {/* Film grain overlay */}
      <div className="fixed inset-0 pointer-events-none grain-overlay" />

      {/* Content with nav offset */}
      <div className="relative z-10 pt-16">
        {children}
      </div>
    </div>
  )
}
