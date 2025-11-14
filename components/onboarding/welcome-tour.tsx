"use client"

import { useState, useEffect } from "react"
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride"
import { Ticket } from "lucide-react"
import { useOnboarding } from "@/contexts/onboarding-context"
import { logger } from '@/lib/logger'

export const WelcomeTour = () => {
  const { shouldShowTour, markStepComplete } = useOnboarding()
  const [run, setRun] = useState(false)

  // Store the result so useEffect can depend on the actual boolean value
  const shouldShow = shouldShowTour("welcome")

  useEffect(() => {
    if (shouldShow) {
      logger.info('[WelcomeTour] Starting tour in 1 second...')
      const timer = setTimeout(() => {
        setRun(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [shouldShow])

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">🎉 Welcome to Kulti!</h2>
          <p className="text-base">
            Let&apos;s take a quick tour of the platform. Learn how to start sessions,
            earn credits, and connect with developers and creatives!
          </p>
        </div>
      ),
      placement: "center",
    },
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-lime-400" />
            You&apos;ve Got 5 Invite Codes!
          </h2>
          <p className="text-base">
            Share your unique codes with friends to invite them to Kulti. You&apos;ll earn{" "}
            <span className="font-bold text-lime-400">50 credits</span> for each successful signup!
          </p>
          <p className="text-sm text-gray-400">
            Find your codes in your profile under the Invites tab.
          </p>
        </div>
      ),
      placement: "center",
    },
    {
      target: '[data-tour="find-match"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-xl font-bold">✨ Find Your Match</h3>
          <p>Get matched with compatible developers and creatives based on your skills, interests, and experience level. Perfect for collaboration and learning!</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="create-session"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-xl font-bold">🎥 Create Session</h3>
          <p>Start a live session and stream your work. Share knowledge, collaborate in real-time, and earn credits from viewers!</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="browse"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-xl font-bold">🔍 Browse Sessions</h3>
          <p>Discover active sessions across coding, design, video, music, and more. Join to learn, collaborate, and support creators.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="credits"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-xl font-bold">💰 Credits System</h3>
          <p>Earn credits by streaming sessions, receiving tips, and referring friends. Spend them to boost sessions or tip creators you love!</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="community"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-xl font-bold">🌐 Community Hub</h3>
          <p>Join chat rooms, propose discussion topics, and connect with developers and creatives who share your interests.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="profile"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-xl font-bold">👤 Your Profile</h3>
          <p>Manage your profile, settings, view your invite codes, and track your achievements. Build your reputation!</p>
        </div>
      ),
      placement: "bottom",
    },
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status)) {
      setRun(false)
      markStepComplete("welcomeTourCompleted")
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#a3e635",
          backgroundColor: "#18181b",
          textColor: "#ffffff",
          overlayColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipContent: {
          padding: "12px 0",
        },
        buttonNext: {
          backgroundColor: "#a3e635",
          color: "#000000",
          fontWeight: "bold",
          borderRadius: 8,
          padding: "10px 20px",
        },
        buttonBack: {
          color: "#a3e635",
          fontWeight: "bold",
          marginRight: 10,
        },
        buttonSkip: {
          color: "#a1a1aa",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  )
}
