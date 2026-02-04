# Onboarding System Quick Start Guide

## For Developers: How to Use the Onboarding System

### Table of Contents
1. [Adding Feature Intros](#adding-feature-intros)
2. [Triggering Achievements](#triggering-achievements)
3. [Tracking Progress](#tracking-progress)
4. [Testing & Debugging](#testing--debugging)

---

## Adding Feature Intros

When you create a new page or feature, add an intro modal to help users understand it.

### Step 1: Import the Hook and Component

```tsx
import { useFeatureIntro } from "@/hooks/use-feature-intro"
import { FeatureIntroModal } from "@/components/onboarding/feature-intro-modal"
```

### Step 2: Use the Hook

```tsx
const { showIntro, hideIntro } = useFeatureIntro("my-feature-name")
```

### Step 3: Render the Modal

```tsx
return (
  <>
    <FeatureIntroModal
      featureName="my-feature-name"
      title="Welcome to My Feature"
      description="This feature helps you accomplish X, Y, and Z"
      tips={[
        "First helpful tip about using this feature",
        "Second tip with important information",
        "Third tip for power users"
      ]}
      isOpen={showIntro}
      onClose={hideIntro}
    />

    {/* Your page content */}
  </>
)
```

### Complete Example

```tsx
"use client"

import { useFeatureIntro } from "@/hooks/use-feature-intro"
import { FeatureIntroModal } from "@/components/onboarding/feature-intro-modal"

export default function MyNewPage() {
  const { showIntro, hideIntro } = useFeatureIntro("my-new-page")

  return (
    <>
      <FeatureIntroModal
        featureName="my-new-page"
        title="Welcome to Analytics"
        description="Track your coding sessions and see your growth over time"
        tips={[
          "View detailed stats about your sessions",
          "Compare your progress week over week",
          "Export data for external analysis"
        ]}
        isOpen={showIntro}
        onClose={hideIntro}
      />

      <div className="space-y-8">
        <h1>Analytics Dashboard</h1>
        {/* Your content here */}
      </div>
    </>
  )
}
```

---

## Triggering Achievements

Celebrate user milestones with achievement animations.

### Step 1: Import Components

```tsx
import { useState } from "react"
import { AchievementCelebration } from "@/components/onboarding/achievement-celebration"
import { useOnboarding } from "@/contexts/onboarding-context"
```

### Step 2: Set Up State

```tsx
const [showAchievement, setShowAchievement] = useState(false)
const { markStepComplete, progress } = useOnboarding()
```

### Step 3: Trigger Achievement

```tsx
const handleFirstSession = async () => {
  // Your session creation logic
  await createSession()

  // Check if this is their first session
  if (!progress.firstSessionCompleted) {
    markStepComplete("firstSessionCompleted")
    setShowAchievement(true)
  }
}
```

### Step 4: Render Achievement Modal

```tsx
return (
  <>
    <AchievementCelebration
      achievement={{
        type: "milestone",
        title: "First Session Created!",
        description: "You've created your first coding session",
        credits: 5 // Optional
      }}
      isOpen={showAchievement}
      onClose={() => setShowAchievement(false)}
    />

    {/* Your component */}
  </>
)
```

### Achievement Types

```tsx
// Badge Achievement (for earning badges)
{
  type: "badge",
  title: "Code Warrior",
  description: "Completed 10 coding sessions"
}

// Credits Achievement (for earning credits)
{
  type: "credits",
  title: "First Credits Earned!",
  description: "You've earned your first 10 credits",
  credits: 10
}

// Milestone Achievement (for major accomplishments)
{
  type: "milestone",
  title: "100 Hours Coded!",
  description: "You've reached 100 hours of live coding",
  credits: 50
}
```

### Complete Example

```tsx
"use client"

import { useState } from "react"
import { AchievementCelebration } from "@/components/onboarding/achievement-celebration"
import { useOnboarding } from "@/contexts/onboarding-context"

export default function SessionCreator() {
  const [showAchievement, setShowAchievement] = useState(false)
  const { markStepComplete, progress } = useOnboarding()

  const handleCreateSession = async () => {
    try {
      const session = await fetch('/api/sessions/create', {
        method: 'POST',
        body: JSON.stringify({ /* session data */ })
      })

      // Trigger achievement for first session
      if (!progress.firstSessionCompleted) {
        markStepComplete("firstSessionCompleted")
        setShowAchievement(true)
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  return (
    <>
      <AchievementCelebration
        achievement={{
          type: "milestone",
          title: "First Session Created!",
          description: "Welcome to the Kulti community!",
          credits: 5
        }}
        isOpen={showAchievement}
        onClose={() => setShowAchievement(false)}
      />

      <button onClick={handleCreateSession}>
        Create Session
      </button>
    </>
  )
}
```

---

## Tracking Progress

Access and update onboarding progress throughout your app.

### Available Progress Flags

```tsx
const { progress } = useOnboarding()

// Progress flags you can check:
progress.welcomeTourCompleted      // Welcome tour finished
progress.firstSessionCompleted     // Created first session
progress.firstCreditEarned         // Earned first credit
progress.profileSetupCompleted     // Completed profile setup
progress.firstMatchCompleted       // Found first match
progress.matchmakingIntroSeen      // Seen matchmaking intro
progress.communityIntroSeen        // Seen community intro
progress.creditsIntroSeen          // Seen credits intro
progress.sessionBoostIntroSeen     // Seen session boost intro
```

### Checking Progress

```tsx
import { useOnboarding } from "@/contexts/onboarding-context"

const { progress, isNewUser } = useOnboarding()

// Check if user is new
if (isNewUser) {
  // Show special new user content
}

// Check specific progress
if (!progress.firstSessionCompleted) {
  // Encourage user to create their first session
}

// Check multiple conditions
if (progress.welcomeTourCompleted && !progress.firstSessionCompleted) {
  // User finished tour but hasn't created a session yet
}
```

### Updating Progress

```tsx
const { markStepComplete } = useOnboarding()

// Mark a step as complete
markStepComplete("firstCreditEarned")

// Mark multiple steps (do this in sequence)
markStepComplete("profileSetupCompleted")
markStepComplete("firstSessionCompleted")
```

### Conditional UI Example

```tsx
import { useOnboarding } from "@/contexts/onboarding-context"

export default function Dashboard() {
  const { progress, isNewUser } = useOnboarding()

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Show helpful message for new users */}
      {isNewUser && (
        <div className="p-4 bg-lime-400/10 border border-lime-400/20 rounded-lg">
          <h2>Welcome to Kulti!</h2>
          <p>Complete the tour to learn the basics</p>
        </div>
      )}

      {/* Encourage first session */}
      {!progress.firstSessionCompleted && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3>Ready to code?</h3>
          <p>Create your first session to get started!</p>
          <button>Create Session</button>
        </div>
      )}

      {/* Show advanced features after completing basics */}
      {progress.firstSessionCompleted && progress.firstCreditEarned && (
        <div className="advanced-features">
          <h3>Advanced Features</h3>
          {/* Advanced content */}
        </div>
      )}
    </div>
  )
}
```

---

## Testing & Debugging

### Reset Onboarding (Development Only)

```tsx
import { useOnboarding } from "@/contexts/onboarding-context"

const { resetOnboarding } = useOnboarding()

// Add a dev button to reset everything
<button onClick={resetOnboarding}>
  Reset Onboarding (Dev)
</button>
```

### Restart Welcome Tour

```tsx
const { startTour } = useOnboarding()

// Restart the welcome tour
<button onClick={() => startTour("welcome")}>
  Restart Tour
</button>
```

### Check Tour Visibility

```tsx
const { shouldShowTour } = useOnboarding()

// Check if welcome tour should show
const showWelcome = shouldShowTour("welcome")
console.log("Should show welcome tour:", showWelcome)
```

### Inspect LocalStorage

Open browser DevTools console:

```javascript
// View saved progress
JSON.parse(localStorage.getItem('onboardingProgress'))

// View feature intros seen
Object.keys(localStorage)
  .filter(key => key.startsWith('feature-intro-'))
  .forEach(key => console.log(key, localStorage.getItem(key)))

// Clear all onboarding data
localStorage.removeItem('onboardingProgress')
Object.keys(localStorage)
  .filter(key => key.startsWith('feature-intro-'))
  .forEach(key => localStorage.removeItem(key))
```

### Debug Component

```tsx
"use client"

import { useOnboarding } from "@/contexts/onboarding-context"

export default function OnboardingDebug() {
  const { progress, isNewUser, resetOnboarding, startTour } = useOnboarding()

  return (
    <div className="p-8 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">Onboarding Debug Panel</h2>

      <div className="space-y-4">
        <div>
          <strong>Is New User:</strong> {isNewUser ? 'Yes' : 'No'}
        </div>

        <div>
          <strong>Progress:</strong>
          <pre className="bg-gray-800 p-4 rounded mt-2 overflow-auto">
            {JSON.stringify(progress, null, 2)}
          </pre>
        </div>

        <div className="space-x-2">
          <button
            onClick={resetOnboarding}
            className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
          >
            Reset All Progress
          </button>

          <button
            onClick={() => startTour("welcome")}
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
          >
            Restart Welcome Tour
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Common Issues

**Tour doesn't start:**
- Check that `data-tour` attributes are present on target elements
- Verify user is new (`isNewUser === true`)
- Check localStorage is not blocked
- Ensure OnboardingProvider wraps your components

**Feature intro shows every time:**
- Confirm `featureName` is consistent
- Check localStorage permissions
- Verify "Don't show again" checkbox is working

**Achievement doesn't show:**
- Check `isOpen` state is true
- Verify component is rendered
- Check z-index conflicts
- Ensure confetti library loaded

---

## Quick Reference

### Hooks

```tsx
// Main onboarding hook
const {
  progress,           // Object with all progress flags
  markStepComplete,   // Function to mark step complete
  startTour,          // Function to restart a tour
  resetOnboarding,    // Function to reset all progress
  shouldShowTour,     // Function to check if tour should show
  isNewUser          // Boolean for new user detection
} = useOnboarding()

// Feature intro hook
const {
  showIntro,  // Boolean - should show intro
  hideIntro   // Function to hide intro
} = useFeatureIntro("feature-name")
```

### Components

```tsx
// Welcome Tour
<WelcomeTour />

// Feature Intro Modal
<FeatureIntroModal
  featureName="unique-name"
  title="Modal Title"
  description="Modal description"
  tips={["Tip 1", "Tip 2"]}
  isOpen={boolean}
  onClose={() => void}
/>

// Achievement Celebration
<AchievementCelebration
  achievement={{
    type: "badge" | "credits" | "milestone",
    title: "Title",
    description: "Description",
    credits: number // optional
  }}
  isOpen={boolean}
  onClose={() => void}
/>
```

### Data Attributes (for tour)

Add these to elements you want the tour to highlight:

```tsx
data-tour="create-session"  // Create session button
data-tour="browse"          // Browse navigation
data-tour="find-match"      // Find match button
data-tour="credits"         // Credits widget
data-tour="community"       // Community navigation
data-tour="profile"         // Profile menu
```

---

## Need Help?

- Check the full documentation: `ONBOARDING_IMPLEMENTATION_SUMMARY.md`
- Review examples: `/components/onboarding/onboarding-examples.tsx`
- Test with debug panel: Add the OnboardingDebug component shown above
