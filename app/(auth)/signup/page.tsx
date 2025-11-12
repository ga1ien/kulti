import { Suspense } from "react"
import { PhoneSignupForm } from "@/components/auth/phone-signup-form"
import Link from "next/link"

export default function SignupPage() {
  return (
    <div className="space-y-12 animate-fade-in">
      <div className="text-center space-y-6">
        <h1 className="text-6xl md:text-7xl font-bold font-mono">Join Kulti</h1>
        <p className="text-2xl md:text-3xl text-[#a1a1aa]">Create your account to start building together</p>
      </div>

      <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#27272a] rounded-2xl p-12 hover:border-lime-400/30 transition-all duration-300">
        <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
          <PhoneSignupForm />
        </Suspense>
      </div>

      <div className="text-center space-y-3">
        <p className="text-lg text-[#71717a]">
          Already have an account?{' '}
          <Link href="/login" className="text-lime-400 hover:text-lime-300 transition-colors">
            Sign in
          </Link>
        </p>
        <p className="text-lg text-[#71717a]">
          <Link href="/" className="hover:text-lime-400 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
