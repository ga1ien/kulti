# Console Logging Cleanup - Technical Debt

## Summary
The codebase contains 155 files using direct `console.log`, `console.error`, `console.warn` statements instead of the structured logger (`@/lib/logger`).

## Why This Matters
- Direct console statements don't integrate with Sentry for error tracking
- Missing structured metadata for debugging
- No environment-based log level control
- Harder to filter and analyze logs in production

## Completed
- ✅ Created structured logger at `/lib/logger.ts` with Sentry integration
- ✅ Replaced console statements in `app/api/webhooks/hms/route.ts`

## Remaining Work
Replace console statements in 154 files with structured logger calls:

### Priority 1: Security-Sensitive Routes
- Auth routes (send-otp, complete-phone-signup)
- Admin routes (all routes in /api/admin/*)
- Payment/Credits routes (/api/credits/*)
- Invite system (/api/invites/*)

### Priority 2: Core Infrastructure
- HMS integration (/api/hms/*)
- Session management (/api/sessions/*)
- Recording management (/api/recordings/*)

### Priority 3: Features
- Matchmaking (/api/matchmaking/*)
- Community (/api/community/*)
- Notifications (/api/notifications/*)
- AI features (/api/ai/*)

### Priority 4: Client Components
- React components and hooks (less critical, client-side only)

## Migration Pattern

### Before:
```typescript
console.error('Failed to process request:', error)
console.log('User logged in:', userId)
```

### After:
```typescript
import { logger } from '@/lib/logger'

logger.error('Failed to process request', { error })
logger.info('User logged in', { userId })
```

## Future Automation
Consider creating an ESLint rule to prevent direct console usage:
```json
{
  "rules": {
    "no-console": ["error", { "allow": [] }]
  }
}
```

## Status
- **Total Files**: 155
- **Completed**: 1 (webhook handler)
- **Remaining**: 154
- **Estimated Effort**: 8-10 hours for full migration
