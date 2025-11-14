'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface OnboardingProgress {
  welcomeTourCompleted: boolean
  firstSessionCompleted: boolean
  firstCreditEarned: boolean
  profileSetupCompleted: boolean
  firstMatchCompleted: boolean
  matchmakingIntroSeen: boolean
  communityIntroSeen: boolean
  creditsIntroSeen: boolean
  sessionBoostIntroSeen: boolean
}

interface OnboardingContextType {
  progress: OnboardingProgress
  markStepComplete: (step: keyof OnboardingProgress) => void
  startTour: (tourName: string) => void
  resetOnboarding: () => void
  shouldShowTour: (tourName: string) => boolean
  isNewUser: boolean
}

const defaultProgress: OnboardingProgress = {
  welcomeTourCompleted: false,
  firstSessionCompleted: false,
  firstCreditEarned: false,
  profileSetupCompleted: false,
  firstMatchCompleted: false,
  matchmakingIntroSeen: false,
  communityIntroSeen: false,
  creditsIntroSeen: false,
  sessionBoostIntroSeen: false,
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [progress, setProgress] = useState<OnboardingProgress>(defaultProgress)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return
    }

    const saved = localStorage.getItem('onboardingProgress')
    if (saved) {
      try {
        const parsedProgress = JSON.parse(saved)
        setProgress(parsedProgress)
        setIsNewUser(false)
      } catch (error) {
        logger.error('Failed to parse onboarding progress:', error)
        setIsNewUser(true)
      }
    } else {
      setIsNewUser(true)
    }
  }, [])

  const markStepComplete = (step: keyof OnboardingProgress) => {
    const newProgress = { ...progress, [step]: true }
    logger.info('[Onboarding] markStepComplete called:', step, 'new progress:', newProgress)
    setProgress(newProgress)

    // SSR safety check
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboardingProgress', JSON.stringify(newProgress))
    }

    if (step === 'welcomeTourCompleted') {
      setIsNewUser(false)
    }
  }

  const startTour = (tourName: string) => {
    // Reset specific tour completion
    const tourStepMap: Record<string, keyof OnboardingProgress> = {
      welcome: 'welcomeTourCompleted',
    }

    const step = tourStepMap[tourName]
    if (step) {
      const newProgress = { ...progress, [step]: false }
      setProgress(newProgress)

      // SSR safety check
      if (typeof window !== 'undefined') {
        localStorage.setItem('onboardingProgress', JSON.stringify(newProgress))
      }
    }
  }

  const resetOnboarding = () => {
    setProgress(defaultProgress)
    setIsNewUser(true)

    // SSR safety check
    if (typeof window === 'undefined') {
      return
    }

    localStorage.removeItem('onboardingProgress')

    // Clear feature intro flags (including invite-codes-intro)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('feature-intro-') || key?.startsWith('invite-codes-intro-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  const shouldShowTour = (tourName: string) => {
    if (tourName === 'welcome') {
      // Only show welcome tour after profile setup is completed and tour hasn't been shown yet
      return !progress.welcomeTourCompleted && progress.profileSetupCompleted
    }
    return false
  }

  return (
    <OnboardingContext.Provider
      value={{
        progress,
        markStepComplete,
        startTour,
        resetOnboarding,
        shouldShowTour,
        isNewUser
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
