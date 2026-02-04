# Onboarding System File Structure

## Directory Overview

```
kulti/
├── contexts/
│   └── onboarding-context.tsx         # Global state management for onboarding
│
├── components/
│   └── onboarding/
│       ├── welcome-tour.tsx           # Interactive guided tour component
│       ├── feature-intro-modal.tsx    # Feature introduction modal
│       ├── achievement-celebration.tsx # Achievement celebration with confetti
│       └── onboarding-examples.tsx    # Reusable examples and patterns
│
├── hooks/
│   └── use-feature-intro.ts           # Custom hook for feature intro logic
│
├── app/
│   ├── layout.tsx                     # Modified: Added OnboardingProvider wrapper
│   └── (dashboard)/
│       └── dashboard/
│           └── page.tsx               # Modified: Added WelcomeTour component
│
└── DOCUMENTATION/
    ├── ONBOARDING_IMPLEMENTATION_SUMMARY.md   # Complete implementation guide
    ├── ONBOARDING_QUICK_START.md              # Quick reference for developers
    └── ONBOARDING_FILE_STRUCTURE.md           # This file
```

## File Descriptions

### Core Files

#### `/contexts/onboarding-context.tsx`
- **Purpose**: Centralized state management for all onboarding-related data
- **Size**: ~130 lines
- **Key Exports**:
  - `OnboardingProvider` - Context provider component
  - `useOnboarding()` - Hook to access onboarding state
- **Dependencies**: React (useState, useEffect, useContext)
- **Storage**: Uses localStorage for persistence

#### `/components/onboarding/welcome-tour.tsx`
- **Purpose**: Interactive tour for new users on dashboard
- **Size**: ~120 lines
- **Dependencies**: 
  - react-joyride
  - @/contexts/onboarding-context
- **Features**: 7-step tour with skip functionality
- **Triggers**: Auto-starts 1 second after dashboard load (new users only)

#### `/components/onboarding/feature-intro-modal.tsx`
- **Purpose**: Reusable modal for introducing new features
- **Size**: ~130 lines
- **Dependencies**: lucide-react (Sparkles, X icons)
- **Features**: 
  - Tips display
  - "Don't show again" checkbox
  - Accessible modal with ARIA labels
  - Smooth animations

#### `/components/onboarding/achievement-celebration.tsx`
- **Purpose**: Celebration modal with confetti animation
- **Size**: ~100 lines
- **Dependencies**: 
  - canvas-confetti
  - lucide-react (Award, Coins, Sparkles)
- **Features**:
  - 3-second auto-dismiss
  - Confetti animation
  - Dynamic icons based on achievement type
  - Credits display

#### `/hooks/use-feature-intro.ts`
- **Purpose**: Manage feature intro visibility state
- **Size**: ~30 lines
- **Returns**: `{ showIntro: boolean, hideIntro: () => void }`
- **Dependencies**: React (useState, useEffect)
- **Storage**: Checks localStorage for seen status

#### `/components/onboarding/onboarding-examples.tsx`
- **Purpose**: Example implementations and reusable patterns
- **Size**: ~200 lines
- **Exports**:
  - `CreditsPageIntro`
  - `CommunityPageIntro`
  - `BrowsePageIntro`
  - `MatchmakingIntro`
  - `FirstCreditAchievement`
  - `BadgeAchievement`
  - `MilestoneAchievement`

### Modified Files

#### `/app/layout.tsx`
**Changes Made**:
- Added import: `import { OnboardingProvider } from "@/contexts/onboarding-context"`
- Wrapped children with `<OnboardingProvider>{children}</OnboardingProvider>`
- **Lines Modified**: ~5 lines

#### `/app/(dashboard)/dashboard/page.tsx`
**Changes Made**:
- Added import: `import { WelcomeTour } from "@/components/onboarding/welcome-tour"`
- Added component: `<WelcomeTour />` at top of JSX return
- Added data-tour attributes to Find Session and Create Session buttons
- **Lines Modified**: ~5 lines

#### `/components/dashboard/nav-bar.tsx`
**Changes Made**:
- Added `data-tour="create-session"` to Create Session button
- Added `data-tour="browse"` to Browse link
- Added `data-tour="community"` to Community link
- Added `data-tour="credits"` to Credits widget
- Added `data-tour="profile"` to Profile menu
- **Lines Modified**: ~5 lines

## Documentation Files

#### `ONBOARDING_IMPLEMENTATION_SUMMARY.md`
- **Purpose**: Comprehensive documentation of entire onboarding system
- **Contents**:
  - Complete feature overview
  - Component API documentation
  - Integration guide
  - Design system compliance
  - Testing instructions
  - Future enhancements
  - Accessibility features
- **Audience**: Project leads, senior developers, stakeholders

#### `ONBOARDING_QUICK_START.md`
- **Purpose**: Quick reference guide for developers
- **Contents**:
  - How to add feature intros
  - How to trigger achievements
  - How to track progress
  - Testing & debugging tips
  - Code examples
  - Common issues
- **Audience**: Developers actively working with onboarding

#### `ONBOARDING_FILE_STRUCTURE.md`
- **Purpose**: Overview of file organization
- **Contents**: This file
- **Audience**: New developers, code reviewers

## Dependencies

### Required npm Packages

```json
{
  "dependencies": {
    "react-joyride": "^2.9.3",
    "canvas-confetti": "^1.9.4"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0"
  }
}
```

### Installation

```bash
npm install react-joyride canvas-confetti
npm install --save-dev @types/canvas-confetti
```

## Bundle Size Impact

Estimated additional bundle size:
- **react-joyride**: ~50 KB
- **canvas-confetti**: ~5 KB
- **Custom components**: ~15 KB
- **Total**: ~70 KB (0.07 MB)

## LocalStorage Keys

The onboarding system uses these localStorage keys:

```
onboardingProgress              # Main progress object
feature-intro-{featureName}     # Feature intro seen flags
```

Example keys:
```
onboardingProgress
feature-intro-credits-page
feature-intro-community-page
feature-intro-browse-page
feature-intro-matchmaking
feature-intro-session-room
```

## Data Tour Attributes

Components with these attributes are targeted by the welcome tour:

```tsx
data-tour="create-session"  // Create session button (navbar + dashboard)
data-tour="browse"          // Browse navigation link
data-tour="find-match"      // Find match button
data-tour="credits"         // Credits widget
data-tour="community"       // Community navigation link
data-tour="profile"         // Profile menu button
```

## Code Style

All files follow these conventions:

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indentation
- **Naming**: 
  - Components: PascalCase (e.g., `WelcomeTour`)
  - Hooks: camelCase with 'use' prefix (e.g., `useFeatureIntro`)
  - Files: kebab-case (e.g., `welcome-tour.tsx`)
- **Imports**: Absolute paths using `@/` alias
- **Comments**: JSDoc for public APIs, inline for complex logic

## Testing Strategy

### Manual Testing
1. Clear localStorage
2. Visit dashboard as new user
3. Verify tour auto-starts
4. Complete or skip tour
5. Navigate to feature pages
6. Verify feature intros appear
7. Trigger achievement
8. Verify confetti and auto-dismiss

### Automated Testing (Future)
- Unit tests for hooks and context
- Integration tests for components
- E2E tests for complete user flows

## Deployment Notes

### Environment Variables
No environment variables required.

### Build Process
Standard Next.js build process:
```bash
npm run build
```

### Runtime Dependencies
- localStorage must be available
- JavaScript must be enabled
- Modern browser with canvas support

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Maintenance

### Adding New Tour Steps
1. Add `data-tour` attribute to target element
2. Edit `/components/onboarding/welcome-tour.tsx`
3. Add step to `steps` array

### Adding New Progress Flags
1. Edit `/contexts/onboarding-context.tsx`
2. Add flag to `OnboardingProgress` interface
3. Add to `defaultProgress` object
4. Update documentation

### Updating Styles
All components use Tailwind classes. Key colors:
- Primary: `lime-400` (#a3e635)
- Background: `#18181b`, `#27272a`
- Text: `white`, `[#a1a1aa]`

## Related Files

The onboarding system integrates with:

- `/components/dashboard/nav-bar.tsx` - Navigation elements
- `/app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `/components/profile/profile-setup-modal.tsx` - Profile completion
- `/lib/credits/*` - Credits system integration
- `/components/matchmaking/*` - Matchmaking integration

## Migration Notes

If updating from a previous version:

1. **v1.0 → v2.0**: N/A (Initial implementation)

Future migrations will be documented here.

## Support & Troubleshooting

### Common Issues

**Issue**: Tour doesn't start
**Solution**: Check that OnboardingProvider wraps components in layout.tsx

**Issue**: Feature intro loops
**Solution**: Verify localStorage is not disabled or cleared on every load

**Issue**: Confetti doesn't show
**Solution**: Check canvas-confetti is installed and imported

### Debug Mode

Add this component to any page for debugging:

```tsx
import { useOnboarding } from "@/contexts/onboarding-context"

function DebugOnboarding() {
  const { progress, resetOnboarding } = useOnboarding()
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black border rounded">
      <pre>{JSON.stringify(progress, null, 2)}</pre>
      <button onClick={resetOnboarding}>Reset</button>
    </div>
  )
}
```

## Contributors

Initial implementation: Claude Code (January 2025)

## License

Same as parent project (Kulti)
