# Pre-Testing Fix Plan - Complete Code Quality & Sentry Setup

**Created**: November 14, 2025
**Target**: Fix all remaining issues before staging deployment testing
**Estimated Total Time**: 6-8 hours
**Current Status**: 92/100 → Target: 98/100

---

## Executive Summary

This plan addresses all remaining code quality, accessibility, Sentry configuration, and minor issues before staging deployment. We'll execute fixes in priority order to maximize production readiness.

**Current State**:
- ✅ TypeScript build: PASSING
- ✅ Unit tests: 100% (204/204)
- ⚠️ ESLint: 260 problems (231 errors, 29 warnings) across 72 files
- ⚠️ Accessibility: 63/95 passing (66%)
- ⚠️ Sentry: Configured but needs DSN and testing
- ⚠️ E2E tests: Need environment configuration

**Target State**:
- ✅ ESLint: <10 errors (all critical issues fixed)
- ✅ Accessibility: 90/95 passing (95%+)
- ✅ Sentry: Fully configured and tested
- ✅ E2E tests: Environment ready for staging

---

## Phase 1: Critical Code Quality Fixes (2-3 hours)

### Priority: P0 (CRITICAL) - Must Fix Before Production

#### Task 1.1: Fix ARIA Role Hierarchy Violations (30 minutes)

**Issue**: Tab components missing parent `tablist` role (CRITICAL accessibility violation)
**Impact**: Screen readers cannot navigate auth tabs properly
**Files**: 1 file
- `app/(dashboard)/auth/page.tsx` (or wherever auth tabs are)

**Fix**:
```tsx
// BEFORE (BROKEN):
<div className="flex justify-center mb-8">
  <button type="button" role="tab" aria-selected="true">Phone Login</button>
  <button type="button" role="tab" aria-selected="false">Email Login</button>
</div>

// AFTER (FIXED):
<div className="flex justify-center mb-8" role="tablist" aria-label="Authentication methods">
  <button type="button" role="tab" aria-selected="true" aria-controls="phone-panel">Phone Login</button>
  <button type="button" role="tab" aria-selected="false" aria-controls="email-panel">Email Login</button>
</div>
<div id="phone-panel" role="tabpanel" aria-labelledby="phone-tab">
  {/* Phone login form */}
</div>
<div id="email-panel" role="tabpanel" aria-labelledby="email-tab" hidden>
  {/* Email login form */}
</div>
```

**Verification**:
```bash
npm run test:accessibility -- --grep "should not have accessibility violations on login page"
# Expected: PASS (currently FAIL)
```

---

#### Task 1.2: Fix Color Contrast Violations (30 minutes)

**Issue**: Footer copyright text has insufficient contrast (4.09:1, needs 4.5:1)
**Impact**: SERIOUS - Users with vision impairments cannot read footer text
**Files**: 1 file
- `components/landing/footer.tsx` (or wherever footer is)

**Fix**:
```tsx
// BEFORE (4.09:1 contrast):
<p className="text-sm text-[#71717a] pt-2">© 2025 Kulti</p>

// AFTER (5.1:1 contrast):
<p className="text-sm text-[#8a8a8f] pt-2">© 2025 Kulti</p>

// OR use Tailwind:
<p className="text-sm text-zinc-400 pt-2">© 2025 Kulti</p>
```

**Color Reference**:
- Current: `#71717a` (zinc-500) = 4.09:1 contrast
- Target: `#8a8a8f` (zinc-400) = 5.1:1 contrast ✅

**Verification**:
```bash
npm run test:accessibility -- --grep "should have sufficient color contrast"
# Expected: PASS on all pages
```

---

#### Task 1.3: Add Landmark Regions to Modals and Loading Screens (45 minutes)

**Issue**: Loading screens and modals not contained in proper landmarks (32 failures)
**Impact**: MODERATE - Screen readers have difficulty navigating
**Files**: 3-5 files
- Loading screen components
- Modal components
- Auth pages

**Fix**:
```tsx
// BEFORE (NO LANDMARK):
<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a]">
  <div className="text-center">
    <h1>Loading...</h1>
  </div>
</div>

// AFTER (WITH LANDMARK):
<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a]" role="dialog" aria-modal="true" aria-labelledby="loading-title">
  <main className="text-center">
    <h1 id="loading-title">Loading...</h1>
  </main>
</div>

// OR for non-modal loading:
<main className="text-center space-y-6" aria-busy="true" aria-live="polite">
  <h1>Welcome Back</h1>
  <p>Sign in to your Kulti account</p>
</main>
```

**Files to Update**:
1. `components/loading-screen.tsx` (if exists)
2. `app/(dashboard)/auth/page.tsx`
3. `app/(dashboard)/page.tsx`
4. Modal components in `components/ui/`

**Verification**:
```bash
npm run test:accessibility -- --grep "All page content should be contained by landmarks"
# Expected: Significant reduction in failures
```

---

#### Task 1.4: Fix Unused Variable Violations (1 hour)

**Issue**: 180+ unused variable/import errors
**Impact**: Code quality, potential bugs
**Files**: 72 files

**Strategy**: Fix in order of priority
1. **API routes** (10 files) - Production code
2. **Page components** (15 files) - User-facing
3. **Component library** (20 files) - Reusable code
4. **Test files** (27 files) - Can be deferred

**Common Fixes**:

```typescript
// PATTERN 1: Unused function parameters
// BEFORE:
export async function GET(request: Request) {
  return NextResponse.json({ status: "ok" })
}

// AFTER (prefix with underscore):
export async function GET(_request: Request) {
  return NextResponse.json({ status: "ok" })
}

// PATTERN 2: Unused imports
// BEFORE:
import { Button, Card, Alert } from "@/components/ui"
export default function Page() {
  return <div>No components used</div>
}

// AFTER (remove unused):
export default function Page() {
  return <div>No components used</div>
}

// PATTERN 3: Unused destructured variables
// BEFORE:
const { id, isActive, metadata } = invite
return <div>{metadata.code}</div>

// AFTER (prefix with underscore):
const { id: _id, isActive: _isActive, metadata } = invite
return <div>{metadata.code}</div>
```

**Automated Fix**:
```bash
# Auto-fix what's possible
npm run lint:fix

# Manually fix remaining (estimated 50-80 errors after auto-fix)
```

**Target**: Reduce from 231 errors to <50 errors

---

#### Task 1.5: Fix TypeScript 'any' Types (45 minutes)

**Issue**: 29 warnings for `@typescript-eslint/no-explicit-any`
**Impact**: Type safety, potential runtime bugs
**Files**: ~15 files

**Common Patterns**:

```typescript
// PATTERN 1: Event handlers
// BEFORE:
const handleChange = (e: any) => {
  console.log(e.target.value)
}

// AFTER:
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value)
}

// PATTERN 2: Metadata objects
// BEFORE:
interface Recording {
  metadata: any
}

// AFTER:
interface RecordingMetadata {
  duration?: number
  size?: number
  format?: string
  [key: string]: unknown
}
interface Recording {
  metadata: RecordingMetadata
}

// PATTERN 3: API responses
// BEFORE:
const data: any = await response.json()

// AFTER:
interface ApiResponse {
  status: string
  data?: unknown
  error?: string
}
const data: ApiResponse = await response.json()
```

**Files to Fix** (based on lint output):
1. `app/(dashboard)/admin/invites/page.tsx`
2. `app/(dashboard)/settings/page.tsx`
3. `app/api/credits/transactions/route.ts`
4. `app/api/recordings/[recordingId]/route.ts`
5. `components/community/topic-detail-modal.tsx`
6. `components/credits/credits-milestones.tsx`
7. `lib/badges/service.ts`
8. `lib/credits/service.ts`
9. `lib/monitoring/sentry.ts`
10. `lib/notifications/service.ts`
11. `lib/utils/api.ts`

**Target**: Reduce from 29 warnings to 0 warnings

---

### Phase 1 Summary

**Time**: 2-3 hours
**Impact**: Fixes all CRITICAL and SERIOUS accessibility violations + major code quality issues

**Checklist**:
- [ ] Task 1.1: Fix ARIA role hierarchy (30 min)
- [ ] Task 1.2: Fix color contrast (30 min)
- [ ] Task 1.3: Add landmark regions (45 min)
- [ ] Task 1.4: Fix unused variables (1 hour)
- [ ] Task 1.5: Fix TypeScript 'any' types (45 min)

**Expected Results**:
- Accessibility: 66% → 90%+ pass rate
- ESLint errors: 231 → <50 errors
- ESLint warnings: 29 → 0 warnings

---

## Phase 2: Sentry Production Configuration (1-2 hours)

### Priority: P1 (HIGH) - Required for Production Monitoring

#### Task 2.1: Set Up Sentry Project (15 minutes)

**Steps**:
1. Go to sentry.io and create account (if not exists)
2. Create new project:
   - Platform: Next.js
   - Project name: `kulti-production`
   - Alert frequency: On every new issue
3. Copy DSN (Data Source Name)
4. Save DSN securely

**Output**: Sentry DSN for production

---

#### Task 2.2: Configure Sentry Environment Variables (10 minutes)

**Files to Update**:
1. `.env.local` (for local testing)
2. Vercel environment variables (for production)

**Environment Variables**:
```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=kulti-production
SENTRY_AUTH_TOKEN=your-auth-token

# Environment
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production  # or 'development', 'staging'

# Performance Monitoring
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1  # 10% of sessions
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0  # 100% of error sessions
```

**Add to `.env.example`**:
```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

---

#### Task 2.3: Verify Sentry Configuration Files (20 minutes)

**Files to Review**:

1. **`sentry.client.config.ts`** - Frontend error tracking
2. **`sentry.server.config.ts`** - Backend/API error tracking
3. **`sentry.edge.config.ts`** - Edge runtime error tracking
4. **`lib/monitoring/sentry.ts`** - Custom integration

**Verification Checklist**:
- [ ] `Sentry.init()` called with DSN
- [ ] Environment set correctly
- [ ] Sample rates configured
- [ ] Integrations enabled (BrowserTracing, Replay)
- [ ] Custom context added (user ID, session ID)
- [ ] Error filtering configured (ignore known errors)

**Update `sentry.client.config.ts`**:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),

  // Session Replay
  replaysSessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || "0.1"),
  replaysOnErrorSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || "1.0"),

  // Environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Integrations
  integrations: [
    new Sentry.BrowserTracing({
      // Set sampling rate for performance monitoring
      tracePropagationTargets: ["localhost", /^https:\/\/kulti\.club/],
    }),
    new Sentry.Replay({
      // Mask all text and user input by default
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Error filtering
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    // Filter out known issues
    const error = hint.originalException;
    if (error && typeof error === "object" && "message" in error) {
      const message = String(error.message);

      // Ignore ResizeObserver errors (browser quirk)
      if (message.includes("ResizeObserver loop")) {
        return null;
      }

      // Ignore HMS connection warnings (handled gracefully)
      if (message.includes("HMS WebSocket reconnecting")) {
        return null;
      }
    }

    return event;
  },
});
```

---

#### Task 2.4: Test Sentry Integration (30 minutes)

**Create Test Route**: `app/api/sentry-test/route.ts`

```typescript
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // Test 1: Capture manual message
    Sentry.captureMessage("Sentry test message from API", "info");

    // Test 2: Capture error with context
    Sentry.captureException(new Error("Test error from API"), {
      tags: {
        test: true,
        route: "/api/sentry-test",
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    // Test 3: Trigger actual error
    throw new Error("Intentional test error for Sentry");
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

**Create Test Button in UI**: Add to a dashboard page temporarily

```tsx
<button
  onClick={async () => {
    // Frontend error test
    Sentry.captureMessage("Frontend test message", "info");

    // API error test
    try {
      await fetch("/api/sentry-test");
    } catch (error) {
      console.log("Expected test error:", error);
    }
  }}
  className="px-4 py-2 bg-red-500 text-white rounded"
>
  Test Sentry (Remove in Production)
</button>
```

**Testing Steps**:
1. Start dev server: `npm run dev`
2. Open browser to dashboard
3. Click "Test Sentry" button
4. Check Sentry dashboard for 3 events:
   - Frontend message: "Frontend test message"
   - API message: "Sentry test message from API"
   - API error: "Intentional test error for Sentry"
5. Verify context/tags are present
6. **Remove test button before production**

---

#### Task 2.5: Configure Sentry Alerts (15 minutes)

**In Sentry Dashboard**:

1. **Create Alert Rule: Critical Errors**
   - Condition: When an event is seen
   - Filter: `level:error OR level:fatal`
   - Action: Send notification to email/Slack
   - Frequency: On every new issue

2. **Create Alert Rule: High Error Rate**
   - Condition: Error count > 50 in 1 hour
   - Filter: All errors
   - Action: Send notification to email/Slack
   - Frequency: At most once per hour

3. **Create Alert Rule: HMS Integration Issues**
   - Condition: When an event is seen
   - Filter: `error.message:*HMS* OR tags.service:hms`
   - Action: Send notification
   - Frequency: At most once per 10 minutes

4. **Create Alert Rule: Database Errors**
   - Condition: When an event is seen
   - Filter: `error.message:*Supabase* OR error.message:*database*`
   - Action: Send notification
   - Frequency: At most once per 10 minutes

**Documentation**: Update `/Docs/SENTRY_PRODUCTION_SETUP.md` with alert details

---

#### Task 2.6: Verify Sentry Coverage (15 minutes)

**Check Sentry Integration in Key Files**:

```bash
# Search for Sentry.captureException usage
grep -r "Sentry.captureException" --include="*.ts" --include="*.tsx" app/ lib/ | wc -l

# Should see Sentry in:
# - API error handlers
# - HMS integration error handling
# - Database operation error handling
# - Auth error handling
```

**Files to Verify**:
- [ ] `lib/hms/server.ts` - HMS API errors tracked
- [ ] `lib/supabase/client.ts` - Database errors tracked
- [ ] `app/api/*/route.ts` - All API routes have error tracking
- [ ] `lib/monitoring/sentry.ts` - Custom helpers exported

**Add Missing Coverage** (if needed):
```typescript
// Example: Add to HMS error handler
import { captureException } from "@/lib/monitoring/sentry";

try {
  const response = await fetchWithTimeout(url, options);
  // ...
} catch (error) {
  captureException(error, {
    tags: { service: "hms", operation: "createRoom" },
    extra: { url, options },
  });
  throw error;
}
```

---

### Phase 2 Summary

**Time**: 1-2 hours
**Impact**: Full production error tracking and monitoring

**Checklist**:
- [ ] Task 2.1: Set up Sentry project (15 min)
- [ ] Task 2.2: Configure environment variables (10 min)
- [ ] Task 2.3: Verify configuration files (20 min)
- [ ] Task 2.4: Test Sentry integration (30 min)
- [ ] Task 2.5: Configure alerts (15 min)
- [ ] Task 2.6: Verify coverage (15 min)

**Expected Results**:
- Sentry fully configured and tested
- All errors tracked in production
- Alert rules configured
- Test events visible in Sentry dashboard

---

## Phase 3: Minor Code Quality Improvements (1-2 hours)

### Priority: P2 (MEDIUM) - Nice to Have

#### Task 3.1: Fix Switch Statement Case Declarations (20 minutes)

**Issue**: 6 `no-case-declarations` errors
**Files**:
- `components/session/background-picker.tsx`
- `lib/hooks/use-hms-notifications.ts`

**Fix**:
```typescript
// BEFORE (ERROR):
switch (type) {
  case "blur":
    const blurAmount = settings.blur || 10;
    return applyBlur(blurAmount);
  case "image":
    const imageUrl = settings.imageUrl;
    return applyImage(imageUrl);
}

// AFTER (FIXED - wrap in block):
switch (type) {
  case "blur": {
    const blurAmount = settings.blur || 10;
    return applyBlur(blurAmount);
  }
  case "image": {
    const imageUrl = settings.imageUrl;
    return applyImage(imageUrl);
  }
}
```

---

#### Task 3.2: Fix jest.setup.js ESLint Errors (15 minutes)

**Issue**: 32 `no-undef` errors (jest, process, global, console not defined)
**File**: `jest.setup.js`

**Fix**: Add ESLint comments at top of file

```javascript
/* eslint-env node, jest */
/* global process, console, global */

// Existing code...
process.env.HMS_APP_ACCESS_KEY = 'test-access-key-123';
// ...
```

---

#### Task 3.3: Remove Unused Test Variables (30 minutes)

**Issue**: Many unused variables in E2E test files
**Files**: `tests/e2e/*.spec.ts`

**Strategy**: These are often intentional for test structure
- Review each one
- Remove if truly unused
- Add `_` prefix if needed for test clarity

**Example**:
```typescript
// BEFORE:
test('should load page', async ({ page }) => {
  const response = await page.goto('/');
  expect(page).toHaveTitle(/Kulti/);
});

// AFTER (response unused, remove):
test('should load page', async ({ page }) => {
  await page.goto('/');
  expect(page).toHaveTitle(/Kulti/);
});
```

---

#### Task 3.4: Remove Console Statement from proxy.ts (5 minutes)

**Issue**: 1 `no-console` error in `proxy.ts:14`
**File**: `proxy.ts`

**Fix**:
```typescript
// BEFORE:
console.log("Proxy middleware initialized");

// AFTER (use logger):
import { logger } from "@/lib/monitoring/logger";
logger.info("Proxy middleware initialized");

// OR remove if not needed:
// (delete the line)
```

---

### Phase 3 Summary

**Time**: 1-2 hours
**Impact**: Clean up remaining ESLint errors

**Checklist**:
- [ ] Task 3.1: Fix case declarations (20 min)
- [ ] Task 3.2: Fix jest.setup.js (15 min)
- [ ] Task 3.3: Remove unused test variables (30 min)
- [ ] Task 3.4: Remove console statement (5 min)

**Expected Results**:
- ESLint errors: <50 → <10 errors
- Clean lint output for production code

---

## Phase 4: E2E Test Environment Setup (30-45 minutes)

### Priority: P1 (HIGH) - Required for Staging Testing

#### Task 4.1: Fix Playwright Environment Loading (30 minutes)

**Issue**: Playwright not loading `.env.test` automatically
**Solution**: Update Playwright config to load env vars before server starts

**Update `playwright.config.ts`**:

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables BEFORE webServer starts
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // ... other projects
  ],

  webServer: {
    command: 'npm run dev',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Environment variables already loaded above
  },
});
```

**Install missing dependency**:
```bash
npm install -D dotenv
```

**Verification**:
```bash
npm run test:e2e -- tests/e2e/auth.spec.ts
# Expected: Server starts without Supabase URL error
```

---

#### Task 4.2: Create Staging Environment Config (15 minutes)

**Create `.env.test.local.example`**:

```bash
# Staging/Production-like Test Environment
# Copy this to .env.test.local and fill in real values for integration testing

# Supabase (Staging)
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key

# 100ms (Test Template)
HMS_APP_ID=your_test_app_id
HMS_APP_ACCESS_KEY=your_test_access_key
HMS_APP_SECRET=your_test_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3002
NODE_ENV=test
```

**Update `.gitignore`**:
```
# Test environments
.env.test.local
```

**Documentation**: Update `/tests/E2E_TESTING_GUIDE.md` with setup instructions

---

### Phase 4 Summary

**Time**: 30-45 minutes
**Impact**: E2E tests can run without crashes

**Checklist**:
- [ ] Task 4.1: Fix Playwright env loading (30 min)
- [ ] Task 4.2: Create staging env config (15 min)

**Expected Results**:
- E2E tests start successfully with mock data
- Clear path to staging environment testing
- Documentation for team

---

## Phase 5: Documentation & Verification (30 minutes)

### Priority: P2 (MEDIUM) - Good Practice

#### Task 5.1: Update ESLint Configuration Documentation (10 minutes)

**Create**: `/Docs/ESLINT_CONFIGURATION.md`

```markdown
# ESLint Configuration & Code Quality Standards

## Current Status
- ESLint 9 with TypeScript support
- Flat config format (eslint.config.mjs)
- Configured for Next.js 16
- Integration with Playwright and Jest

## Rules Enforced
- No console statements (use logger instead)
- No unused variables (prefix with _ if intentional)
- No explicit 'any' types (use proper TypeScript types)
- Proper ARIA attributes
- Switch case declarations in blocks

## Running ESLint
```bash
npm run lint          # Check all files
npm run lint:fix      # Auto-fix what's possible
npm run lint:strict   # Strict mode (fail on warnings)
```

## Ignoring False Positives
Use ESLint comments sparingly:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = externalLibrary.getConfig();
```

## Pre-commit Hook (Recommended)
Install husky to run lint before commits:
```bash
npm install -D husky
npx husky init
echo "npm run lint:fix" > .husky/pre-commit
```
```

---

#### Task 5.2: Run Final Verification Suite (20 minutes)

**Create verification script**: `scripts/pre-deployment-check.sh`

```bash
#!/bin/bash
set -e

echo "🔍 Pre-Deployment Verification Suite"
echo "======================================"
echo ""

# 1. TypeScript compilation
echo "✓ Checking TypeScript compilation..."
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ Build: PASS"
else
  echo "  ❌ Build: FAIL"
  cat /tmp/build.log
  exit 1
fi
echo ""

# 2. Unit tests
echo "✓ Running unit tests..."
npm test > /tmp/test.log 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ Unit Tests: PASS ($(grep -o '[0-9]* passed' /tmp/test.log))"
else
  echo "  ❌ Unit Tests: FAIL"
  cat /tmp/test.log
  exit 1
fi
echo ""

# 3. ESLint
echo "✓ Running ESLint..."
npm run lint > /tmp/lint.log 2>&1
ERROR_COUNT=$(grep -o '[0-9]* error' /tmp/lint.log | head -1 | grep -o '[0-9]*')
WARNING_COUNT=$(grep -o '[0-9]* warning' /tmp/lint.log | head -1 | grep -o '[0-9]*')
echo "  Errors: $ERROR_COUNT, Warnings: $WARNING_COUNT"
if [ "$ERROR_COUNT" -lt 10 ]; then
  echo "  ✅ ESLint: ACCEPTABLE (<10 errors)"
else
  echo "  ⚠️  ESLint: NEEDS WORK ($ERROR_COUNT errors)"
fi
echo ""

# 4. Accessibility tests
echo "✓ Running accessibility tests..."
npm run test:accessibility > /tmp/a11y.log 2>&1 || true
PASS_COUNT=$(grep -o '[0-9]* passed' /tmp/a11y.log | head -1 | grep -o '[0-9]*')
TOTAL_COUNT=$(grep -o 'Running [0-9]* test' /tmp/a11y.log | grep -o '[0-9]*')
PASS_RATE=$((PASS_COUNT * 100 / TOTAL_COUNT))
echo "  Pass Rate: $PASS_RATE% ($PASS_COUNT/$TOTAL_COUNT)"
if [ "$PASS_RATE" -gt 90 ]; then
  echo "  ✅ Accessibility: EXCELLENT (>90%)"
elif [ "$PASS_RATE" -gt 70 ]; then
  echo "  ⚠️  Accessibility: ACCEPTABLE (>70%)"
else
  echo "  ❌ Accessibility: NEEDS WORK (<70%)"
fi
echo ""

# 5. Environment check
echo "✓ Checking environment configuration..."
if [ -f ".env.test" ]; then
  echo "  ✅ .env.test exists"
else
  echo "  ❌ .env.test missing"
fi

if [ -f "sentry.client.config.ts" ]; then
  echo "  ✅ Sentry client config exists"
else
  echo "  ❌ Sentry client config missing"
fi
echo ""

# Summary
echo "======================================"
echo "📊 Verification Summary"
echo "======================================"
echo "Build:          ✅ PASS"
echo "Tests:          ✅ PASS (204/204)"
echo "ESLint:         $(if [ "$ERROR_COUNT" -lt 10 ]; then echo "✅ ACCEPTABLE"; else echo "⚠️  NEEDS WORK"; fi)"
echo "Accessibility:  $(if [ "$PASS_RATE" -gt 90 ]; then echo "✅ EXCELLENT"; elif [ "$PASS_RATE" -gt 70 ]; then echo "⚠️  ACCEPTABLE"; else echo "❌ NEEDS WORK"; fi)"
echo ""
echo "Production Readiness: $(if [ "$ERROR_COUNT" -lt 10 ] && [ "$PASS_RATE" -gt 70 ]; then echo "🟢 READY"; else echo "🟡 ALMOST READY"; fi)"
```

**Make executable**:
```bash
chmod +x scripts/pre-deployment-check.sh
```

**Run verification**:
```bash
./scripts/pre-deployment-check.sh
```

---

### Phase 5 Summary

**Time**: 30 minutes
**Impact**: Documentation and automated verification

**Checklist**:
- [ ] Task 5.1: ESLint documentation (10 min)
- [ ] Task 5.2: Verification script (20 min)

**Expected Results**:
- Clear ESLint standards documented
- Automated pre-deployment checks
- Repeatable verification process

---

## Execution Order & Timeline

### Recommended Execution Order

**Day 1 (4-5 hours)**:
1. **Phase 1** (2-3 hours) - Critical code quality fixes
2. **Phase 2** (1-2 hours) - Sentry configuration
3. **Break / Review**

**Day 2 (2-3 hours)**:
4. **Phase 3** (1-2 hours) - Minor code quality
5. **Phase 4** (30-45 min) - E2E environment
6. **Phase 5** (30 min) - Documentation & verification
7. **Final Review**

### Alternative: Sprint Execution (6-8 hours straight)

If doing in one session:
1. Phase 1: Tasks 1.1, 1.2, 1.3 (critical accessibility) → 1h 45min
2. Phase 2: Tasks 2.1-2.4 (Sentry setup & test) → 1h 15min
3. **Break** (15 min)
4. Phase 1: Tasks 1.4, 1.5 (unused vars & any types) → 1h 45min
5. Phase 4: E2E environment → 45min
6. **Break** (15 min)
7. Phase 3: Minor improvements → 1-2 hours
8. Phase 5: Documentation → 30min
9. **Final Verification** → 20min

**Total**: 6-8 hours

---

## Success Criteria

### Phase 1 Success
- [ ] Accessibility tests: 90/95 passing (95%+)
- [ ] ESLint errors: <50 (from 231)
- [ ] ESLint warnings: 0 (from 29)
- [ ] ARIA role violations: 0 CRITICAL
- [ ] Color contrast: All PASS

### Phase 2 Success
- [ ] Sentry DSN configured
- [ ] Test events appear in Sentry dashboard
- [ ] Alert rules configured (4 rules)
- [ ] Sentry coverage verified in key files
- [ ] Environment variables documented

### Phase 3 Success
- [ ] ESLint errors: <10 (from <50)
- [ ] All switch case declarations fixed
- [ ] jest.setup.js clean
- [ ] Console statement removed

### Phase 4 Success
- [ ] E2E tests start without crashes
- [ ] Environment loading working
- [ ] Staging config documented
- [ ] E2E guide updated

### Phase 5 Success
- [ ] ESLint documentation created
- [ ] Verification script working
- [ ] All checks documented

---

## Final Target Metrics

**Before Fixes** (Current):
- Production Readiness: 92/100
- TypeScript Build: ✅ PASS
- Unit Tests: ✅ 100% (204/204)
- ESLint: ⚠️ 260 problems
- Accessibility: ⚠️ 66% (63/95)
- Sentry: ⚠️ Configured but untested
- E2E: ⚠️ Crashes on start

**After Fixes** (Target):
- Production Readiness: 98/100
- TypeScript Build: ✅ PASS
- Unit Tests: ✅ 100% (204/204)
- ESLint: ✅ <10 errors (acceptable)
- Accessibility: ✅ 95%+ (90/95)
- Sentry: ✅ Fully tested and monitored
- E2E: ✅ Environment ready

---

## Risk Mitigation

### What Could Go Wrong

1. **Accessibility fixes break existing UI**
   - Mitigation: Test after each change
   - Rollback: Git commits after each task

2. **Sentry DSN not working**
   - Mitigation: Test thoroughly with test events
   - Fallback: Use console logging temporarily

3. **ESLint fixes introduce TypeScript errors**
   - Mitigation: Run `npm run build` after major changes
   - Rollback: Git reset if needed

4. **E2E tests still fail after fixes**
   - Mitigation: Document workaround in guide
   - Fallback: Use manual testing for staging

### Rollback Plan

All phases are independent - can rollback individual phases:
```bash
# Rollback Phase 1 (accessibility)
git log --oneline | grep "Phase 1"
git reset --hard <commit-before-phase-1>

# Rollback Sentry config
git checkout HEAD -- sentry.*.config.ts .env.example
```

---

## Post-Execution Checklist

After completing all phases:

- [ ] Run verification script: `./scripts/pre-deployment-check.sh`
- [ ] Verify build succeeds: `npm run build`
- [ ] Verify tests pass: `npm test`
- [ ] Check ESLint: `npm run lint` (<10 errors)
- [ ] Test Sentry: Check dashboard for test events
- [ ] Test E2E locally: `npm run test:e2e`
- [ ] Update Launch Readiness Report v3
- [ ] Commit all changes with clear messages
- [ ] Create summary document of what was fixed

---

## Next Steps After This Plan

Once all phases complete:

1. **Update Launch Readiness Report v3**
   - New score: 98/100
   - Document all fixes
   - Update GO/NO-GO recommendation

2. **Deploy to Staging**
   - Follow LAUNCH_RUNBOOK.md
   - Run smoke tests
   - Monitor Sentry for 24 hours

3. **Production Deployment**
   - After staging validation
   - Follow deployment checklist
   - Monitor closely for 48 hours

---

**End of Plan**

**Total Estimated Time**: 6-8 hours
**Target Completion**: Before staging deployment
**Production Readiness**: 92/100 → 98/100 (+6 points)
