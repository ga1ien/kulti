"use client"

import { useState, useEffect } from "react"
import { logger } from '@/lib/logger'

export const useFeatureIntro = (featureName: string) => {
  const [showIntro, setShowIntro] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const key = `feature-intro-${featureName}`
      const seen = localStorage.getItem(key)
      setShowIntro(seen !== "seen")
    } catch (error) {
      logger.error("Failed to check feature intro status:", error)
      setShowIntro(false)
    } finally {
      setIsLoaded(true)
    }
  }, [featureName])

  const hideIntro = () => {
    setShowIntro(false)
  }

  return {
    showIntro: isLoaded ? showIntro : false,
    hideIntro,
  }
}
