# Onboarding User Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ARRIVES AT KULTI                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Check localStorage│
              │ for progress      │
              └────────┬──────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼─────┐              ┌─────▼──────┐
    │ Progress │              │ No Progress│
    │  Found   │              │   Found    │
    └────┬─────┘              └─────┬──────┘
         │                           │
         │                    ┌──────▼──────┐
         │                    │ isNewUser = │
         │                    │    true     │
         │                    └──────┬──────┘
         │                           │
         │                    ┌──────▼──────────────────────┐
         │                    │  Dashboard Loads            │
         │                    │  Wait 1 second              │
         │                    └──────┬──────────────────────┘
         │                           │
         │                    ┌──────▼──────────────────────┐
         │                    │  WELCOME TOUR AUTO-STARTS   │
         │                    │  (react-joyride)            │
         │                    └──────┬──────────────────────┘
         │                           │
         │                    ┌──────┴──────┐
         │                    │             │
         │              ┌─────▼────┐  ┌────▼─────┐
         │              │ Complete │  │  Skip    │
         │              │   Tour   │  │  Tour    │
         │              └─────┬────┘  └────┬─────┘
         │                    │             │
         │                    └──────┬──────┘
         │                           │
         │                    ┌──────▼──────────────────────┐
         │                    │ Mark welcomeTourCompleted = │
         │                    │         true                │
         │                    │ Save to localStorage        │
         │                    └──────┬──────────────────────┘
         │                           │
         └───────────────────────────┴───────────────────────┐
                                                             │
                              ┌──────────────────────────────▼────┐
                              │    USER NAVIGATES PLATFORM         │
                              └──────────────────────────────┬────┘
                                                             │
                       ┌─────────────────────────────────────┤
                       │                                     │
              ┌────────▼────────┐                   ┌────────▼────────┐
              │ Visits New Page │                   │ Performs Action │
              │ (Credits, etc)  │                   │ (Create Session)│
              └────────┬────────┘                   └────────┬────────┘
                       │                                     │
              ┌────────▼─────────────┐             ┌────────▼─────────────┐
              │ Check localStorage:  │             │ Check progress flag  │
              │ feature-intro-{name} │             │ (firstSessionCreated)│
              └────────┬─────────────┘             └────────┬─────────────┘
                       │                                     │
              ┌────────┴────────┐                  ┌────────┴────────┐
              │                 │                  │                 │
         ┌────▼────┐     ┌─────▼─────┐      ┌────▼────┐     ┌─────▼─────┐
         │  Seen   │     │ Not Seen  │      │  Done   │     │First Time │
         │  Skip   │     │Show Modal │      │  Skip   │     │Celebrate! │
         └─────────┘     └─────┬─────┘      └─────────┘     └─────┬─────┘
                               │                                   │
                    ┌──────────▼──────────────┐         ┌─────────▼──────────┐
                    │ FEATURE INTRO MODAL     │         │ ACHIEVEMENT        │
                    │ - Title                 │         │ CELEBRATION        │
                    │ - Description           │         │ - Confetti 🎊      │
                    │ - Tips                  │         │ - Icon             │
                    │ - "Don't show again"    │         │ - Credits (if any) │
                    └──────────┬──────────────┘         │ - Auto-dismiss 3s  │
                               │                        └─────────┬──────────┘
                    ┌──────────▼──────────────┐                  │
                    │ User clicks "Got it!"   │                  │
                    │ or checks box           │                  │
                    └──────────┬──────────────┘                  │
                               │                                 │
                    ┌──────────▼──────────────┐                  │
                    │ Save preference to      │                  │
                    │ localStorage if checked │                  │
                    └──────────┬──────────────┘                  │
                               │                                 │
                               └─────────────┬───────────────────┘
                                             │
                              ┌──────────────▼────────────────┐
                              │ Continue Using Platform       │
                              │ - Build projects              │
                              │ - Earn credits                │
                              │ - Earn badges                 │
                              │ - Unlock achievements         │
                              └───────────────────────────────┘
```

## Detailed Step-by-Step Flow

### Phase 1: Initial Visit (New User)

```
1. User signs up and logs in
   ↓
2. OnboardingProvider loads
   ↓
3. Check localStorage for 'onboardingProgress'
   ↓
4. Not found → isNewUser = true
   ↓
5. Navigate to dashboard
   ↓
6. Dashboard renders
   ↓
7. WelcomeTour component mounts
   ↓
8. Checks shouldShowTour("welcome") → returns true
   ↓
9. Wait 1 second
   ↓
10. Tour begins automatically
```

### Phase 2: Welcome Tour

```
Step 1: Center modal - "Welcome to Kulti!"
   ↓
Step 2: Highlight Create Session button
   ↓
Step 3: Highlight Browse navigation
   ↓
Step 4: Highlight Find Match button
   ↓
Step 5: Highlight Credits widget
   ↓
Step 6: Highlight Community navigation
   ↓
Step 7: Highlight Profile menu
   ↓
User clicks "Finish" or "Skip tour"
   ↓
Mark welcomeTourCompleted = true
   ↓
Save to localStorage
   ↓
Tour closes
```

### Phase 3: Feature Discovery

```
User navigates to Credits page
   ↓
CreditsPageIntro component renders
   ↓
useFeatureIntro("credits-page") hook executes
   ↓
Check localStorage for "feature-intro-credits-page"
   ↓
Not found → showIntro = true
   ↓
FeatureIntroModal displays
   ↓
Shows:
   - Title: "Welcome to Credits"
   - Description
   - Tips (4 bullet points)
   - "Don't show again" checkbox
   ↓
User reads and clicks "Got it!"
   ↓
If checkbox checked:
   Save "feature-intro-credits-page" = "seen"
   ↓
Modal closes
```

### Phase 4: Achievements

```
User creates their first session
   ↓
Check progress.firstSessionCreated
   ↓
Returns false (first time)
   ↓
Mark firstSessionCreated = true
   ↓
Set showAchievement = true
   ↓
AchievementCelebration renders
   ↓
Confetti fires! 🎊
   ↓
Shows:
   - Achievement icon (Sparkles)
   - "Achievement Unlocked!"
   - "First Session Created!"
   - Description
   - Credits earned (if any)
   ↓
Auto-dismiss after 3 seconds
   ↓
User continues...
```

### Phase 5: Returning User

```
User returns to Kulti
   ↓
OnboardingProvider loads
   ↓
Check localStorage for 'onboardingProgress'
   ↓
Found! Load saved progress
   ↓
isNewUser = false
welcomeTourCompleted = true
   ↓
Navigate to dashboard
   ↓
WelcomeTour checks shouldShowTour("welcome")
   ↓
Returns false (already completed)
   ↓
Tour does NOT start
   ↓
User sees normal dashboard
   ↓
Feature intros respect saved preferences
   ↓
New achievements still trigger
```

## State Machine Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   ONBOARDING STATES                      │
└─────────────────────────────────────────────────────────┘

        NEW USER (No localStorage)
               │
               ▼
        ┌──────────────┐
        │   TOURING    │ ← Tour is active
        │              │
        └──────┬───────┘
               │
         Complete/Skip
               │
               ▼
        ┌──────────────┐
        │  DISCOVERING │ ← Learning features
        │              │   Feature intros show
        └──────┬───────┘
               │
         Visit all pages
               │
               ▼
        ┌──────────────┐
        │   ACHIEVING  │ ← Hitting milestones
        │              │   Celebrations trigger
        └──────┬───────┘
               │
         Complete onboarding
               │
               ▼
        ┌──────────────┐
        │   EXPERT     │ ← All onboarding done
        │              │   Normal usage
        └──────────────┘
```

## Progress Tracking

```
OnboardingProgress {
  
  TOUR:
  ✓ welcomeTourCompleted: false → true
  
  ACTIONS:
  ✓ firstSessionCompleted: false → true
  ✓ firstCreditEarned: false → true
  ✓ firstMatchCompleted: false → true
  ✓ profileSetupCompleted: false → true
  
  FEATURE INTROS:
  ✓ matchmakingIntroSeen: false → true
  ✓ communityIntroSeen: false → true
  ✓ creditsIntroSeen: false → true
  ✓ sessionBoostIntroSeen: false → true
}

LocalStorage:
  - onboardingProgress: { ...all flags }
  - feature-intro-credits-page: "seen"
  - feature-intro-community-page: "seen"
  - feature-intro-browse-page: "seen"
  - feature-intro-matchmaking: "seen"
```

## Component Interaction Flow

```
┌──────────────────┐
│   App Root       │
│   layout.tsx     │
└────────┬─────────┘
         │
         │ wraps with
         ▼
┌────────────────────────┐
│  OnboardingProvider    │ ← Global state
│  (Context)             │
└────────┬───────────────┘
         │
         │ provides state to
         ▼
┌────────────────────────────────────────┐
│         Child Components               │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────┐  ┌───────────────┐  │
│  │ WelcomeTour  │  │FeatureIntro   │  │
│  │ (Dashboard)  │  │ (Any Page)    │  │
│  └──────────────┘  └───────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Achievement Celebration          │ │
│  │ (Triggered by actions)           │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
         │
         │ all update
         ▼
┌────────────────────────┐
│   localStorage         │
│   - onboardingProgress │
│   - feature-intro-*    │
└────────────────────────┘
```

## Testing Flow

```
MANUAL TEST PROCEDURE:

1. Clear localStorage
   localStorage.clear()
   
2. Visit dashboard as new user
   - Tour should auto-start in 1 second
   - Should see welcome message
   
3. Complete tour
   - Click through all 7 steps
   - Check localStorage updated
   
4. Navigate to Credits
   - Should see feature intro
   - Check "Don't show again"
   - Confirm saves to localStorage
   
5. Create first session
   - Achievement should trigger
   - Confetti should fire
   - Auto-dismiss in 3s
   
6. Refresh page
   - Tour should NOT start
   - Feature intros should NOT show
   - Achievement should NOT show
   
7. Reset onboarding
   useOnboarding().resetOnboarding()
   
8. Repeat from step 2
```

## Key Decision Points

```
1. Should show welcome tour?
   → Check: isNewUser && !welcomeTourCompleted
   
2. Should show feature intro?
   → Check: localStorage["feature-intro-{name}"] !== "seen"
   
3. Should trigger achievement?
   → Check: !progress[achievementFlag]
   
4. Auto-start tour?
   → Yes, after 1 second delay
   
5. Auto-dismiss achievement?
   → Yes, after 3 seconds
```

## Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Check Current Progress (useOnboarding)
    ↓
Update Progress (markStepComplete)
    ↓
Context State Update
    ↓
Save to localStorage
    ↓
Re-render Components
    ↓
Show/Hide UI Elements
```

---

This flow ensures:
- ✅ New users get comprehensive onboarding
- ✅ Returning users aren't bothered
- ✅ Progress persists across sessions
- ✅ All major features are introduced
- ✅ Achievements celebrate milestones
- ✅ User can skip or dismiss at any time
- ✅ Respects user preferences
