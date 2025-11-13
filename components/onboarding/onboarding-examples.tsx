"use client"

import { useState } from "react"
import { FeatureIntroModal } from "./feature-intro-modal"
import { AchievementCelebration } from "./achievement-celebration"
import { useFeatureIntro } from "@/hooks/use-feature-intro"

/**
 * Example: Credits Page Feature Intro
 */
export const CreditsPageIntro = () => {
  const { showIntro, hideIntro } = useFeatureIntro("credits-page")

  return (
    <FeatureIntroModal
      featureName="credits-page"
      title="Welcome to Credits"
      description="Earn, manage, and spend your credits to support the community"
      tips={[
        "Earn credits by hosting sessions and streaming your work",
        "Spend credits to boost your sessions for more visibility",
        "Tip other creators to show your appreciation",
        "Track your earnings and spending in the transaction history",
      ]}
      isOpen={showIntro}
      onClose={hideIntro}
    />
  )
}

/**
 * Example: Community Page Feature Intro
 */
export const CommunityPageIntro = () => {
  const { showIntro, hideIntro } = useFeatureIntro("community-page")

  return (
    <FeatureIntroModal
      featureName="community-page"
      title="Join the Community"
      description="Connect with developers, join discussions, and propose topics"
      tips={[
        "Join chat rooms based on your interests and technologies",
        "Propose discussion topics and vote on what matters to you",
        "Meet developers who share your passion",
        "Build your network and learn from others",
      ]}
      isOpen={showIntro}
      onClose={hideIntro}
    />
  )
}

/**
 * Example: Browse Page Feature Intro
 */
export const BrowsePageIntro = () => {
  const { showIntro, hideIntro } = useFeatureIntro("browse-page")

  return (
    <FeatureIntroModal
      featureName="browse-page"
      title="Discover Sessions"
      description="Explore live coding sessions and find what interests you"
      tips={[
        "Filter sessions by technology, difficulty, and category",
        "Bookmark sessions to watch later",
        "Join sessions to learn and participate",
        "Support creators by spending credits to boost their sessions",
      ]}
      isOpen={showIntro}
      onClose={hideIntro}
    />
  )
}

/**
 * Example: Matchmaking Feature Intro
 */
export const MatchmakingIntro = () => {
  const { showIntro, hideIntro } = useFeatureIntro("matchmaking")

  return (
    <FeatureIntroModal
      featureName="matchmaking"
      title="Find Your Match"
      description="Get paired with compatible developers for collaboration"
      tips={[
        "Complete your profile for better matches",
        "Set your availability and skill preferences",
        "Get matched based on skills, interests, and experience",
        "Start coding together in seconds",
      ]}
      isOpen={showIntro}
      onClose={hideIntro}
    />
  )
}

/**
 * Example: First Credit Achievement
 */
export const FirstCreditAchievement = () => {
  const [showAchievement, setShowAchievement] = useState(true)

  return (
    <AchievementCelebration
      achievement={{
        type: "credits",
        title: "First Credits Earned!",
        description: "You've earned your first credits on Kulti",
        credits: 10,
      }}
      isOpen={showAchievement}
      onClose={() => setShowAchievement(false)}
    />
  )
}

/**
 * Example: Badge Achievement
 */
export const BadgeAchievement = () => {
  const [showAchievement, setShowAchievement] = useState(true)

  return (
    <AchievementCelebration
      achievement={{
        type: "badge",
        title: "Rising Star",
        description: "You've completed your first 5 coding sessions",
      }}
      isOpen={showAchievement}
      onClose={() => setShowAchievement(false)}
    />
  )
}

/**
 * Example: Milestone Achievement
 */
export const MilestoneAchievement = () => {
  const [showAchievement, setShowAchievement] = useState(true)

  return (
    <AchievementCelebration
      achievement={{
        type: "milestone",
        title: "100 Hours Coded!",
        description: "You've reached 100 hours of live coding sessions",
        credits: 50,
      }}
      isOpen={showAchievement}
      onClose={() => setShowAchievement(false)}
    />
  )
}

/**
 * Usage Examples:
 *
 * 1. In a Credits page:
 * ```tsx
 * import { CreditsPageIntro } from "@/components/onboarding/onboarding-examples"
 *
 * export default function CreditsPage() {
 *   return (
 *     <>
 *       <CreditsPageIntro />
 *       // ... rest of your page
 *     </>
 *   )
 * }
 * ```
 *
 * 2. Trigger achievement after earning credits:
 * ```tsx
 * import { useState } from "react"
 * import { AchievementCelebration } from "@/components/onboarding/achievement-celebration"
 *
 * const [showCelebration, setShowCelebration] = useState(false)
 *
 * const handleEarnCredits = async () => {
 *   // ... earn credits logic
 *   setShowCelebration(true)
 * }
 *
 * return (
 *   <>
 *     <AchievementCelebration
 *       achievement={{
 *         type: "credits",
 *         title: "Credits Earned!",
 *         description: "You earned credits from your session",
 *         credits: 25
 *       }}
 *       isOpen={showCelebration}
 *       onClose={() => setShowCelebration(false)}
 *     />
 *   </>
 * )
 * ```
 */
