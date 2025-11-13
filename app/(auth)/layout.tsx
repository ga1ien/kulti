import { ErrorBoundary } from '@/components/error-boundary'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <div className="relative min-h-screen flex items-center justify-center px-6 bg-[#0a0a0a]">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]" />

        <div className="relative z-10 w-full max-w-4xl">
          {children}
        </div>
      </div>
    </ErrorBoundary>
  )
}
