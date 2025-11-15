import { Suspense } from "react"
import { PhoneSignupForm } from "@/components/auth/phone-signup-form"
import Link from "next/link"
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}): Promise<Metadata> {
  const { invite } = await searchParams

  if (invite) {
    // Fetch inviter name for personalized metadata
    const supabase = await createClient()
    const { data } = await supabase
      .from('invites')
      .select('creator:profiles!created_by(display_name)')
      .eq('code', invite)
      .single()

    // Type assertion: Supabase returns array for relationships, but we know it's single
    const creator = Array.isArray(data?.creator) ? data.creator[0] : data?.creator
    const inviterName = creator?.display_name || 'Someone'

    return {
      title: `${inviterName} wants you on Kulti!`,
      description: 'create the future, live',
      openGraph: {
        title: `${inviterName} wants you on Kulti!`,
        description: 'create the future, live',
        images: [{
          url: `/signup/opengraph-image?invite=${invite}`,
          width: 1200,
          height: 630,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${inviterName} wants you on Kulti!`,
        description: 'create the future, live',
        images: [`/signup/opengraph-image?invite=${invite}`],
      },
    }
  }

  // Default metadata for non-invite signups
  return {
    title: 'Join Kulti',
    description: 'create the future, live',
  }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  return (
    <main className="space-y-12 animate-fade-in">
      <div className="text-center space-y-6">
        <h1 className="text-3xl md:text-6xl font-bold font-mono">Join Kulti</h1>
        <p className="text-lg md:text-2xl text-[#a1a1aa]">create the future, live</p>
      </div>

      <div className="bg-[#1a1a1a]/50 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 md:p-12 hover:border-lime-400/30 transition-all duration-300">
        <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
          <PhoneSignupForm initialInviteCode={invite} />
        </Suspense>
      </div>

      <div className="text-center">
        <p className="text-base md:text-lg text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-lime-400 hover:text-lime-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
