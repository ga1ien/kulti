# E2E Testing Guide

## Table of Contents
1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Running E2E Tests](#running-e2e-tests)
4. [Test Categories](#test-categories)
5. [Troubleshooting](#troubleshooting)
6. [CI/CD Integration](#cicd-integration)

## Overview

This guide covers how to run E2E tests for the Kulti application using Playwright. Tests can run with either mock services (for quick feedback) or real services (for full integration testing).

### Test Stack
- **Framework**: Playwright
- **Language**: TypeScript
- **Test Types**: E2E, Integration, Accessibility
- **Services**: Supabase, 100ms HMS, Anthropic, Upstash Redis

## Environment Setup

### Required Environment Variables

#### Supabase (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Public anon key
SUPABASE_SERVICE_ROLE_KEY=     # Service role key for admin operations
```

#### 100ms HMS (Required for video features)
```bash
NEXT_PUBLIC_HMS_APP_ID=        # HMS application ID
HMS_APP_ACCESS_KEY=            # HMS access key
HMS_APP_SECRET=                # HMS secret
HMS_TEMPLATE_ID=               # HMS room template ID
HMS_MANAGEMENT_TOKEN=          # HMS management token
```

#### Application Configuration
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3002  # Base URL for testing
NODE_ENV=test
```

#### Optional Services
```bash
ANTHROPIC_API_KEY=             # For AI features (optional)
UPSTASH_REDIS_REST_URL=        # For rate limiting (optional)
UPSTASH_REDIS_REST_TOKEN=      # Redis token (optional)
```

### Setup Options

#### Option 1: Mock Services (Recommended for development)

The `.env.test` file contains safe mock values that allow basic E2E tests to run:

```bash
# Already configured in .env.test
# No action needed - tests will use mock values
npm run test:e2e:local
```

**What works with mocks:**
- Accessibility tests (all)
- Navigation and UI tests
- Form validation
- Basic page rendering
- Client-side interactions

**What doesn't work with mocks:**
- Database operations (create/read/update/delete)
- Authentication flows
- Video session joining
- Real-time features
- AI integrations

#### Option 2: Real Services (For full integration testing)

1. Copy `.env.test` to `.env.test.local`:
   ```bash
   cp .env.test .env.test.local
   ```

2. Update `.env.test.local` with real credentials:
   ```bash
   # Get these from your Supabase project dashboard
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_real_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_real_service_role_key

   # Get these from 100ms dashboard
   NEXT_PUBLIC_HMS_APP_ID=your_real_hms_app_id
   HMS_APP_ACCESS_KEY=your_real_access_key
   HMS_APP_SECRET=your_real_secret
   HMS_TEMPLATE_ID=your_real_template_id
   HMS_MANAGEMENT_TOKEN=your_real_token
   ```

3. Run tests with real services:
   ```bash
   npm run test:e2e:staging
   ```

**Important**: `.env.test.local` is gitignored and should never be committed.

## Running E2E Tests

### Basic Commands

```bash
# Run all E2E tests with mock services
npm run test:e2e:local

# Run all E2E tests with real services
npm run test:e2e:staging

# Run all E2E tests (uses current .env.test)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug
```

### Browser-Specific Tests

```bash
# Run on Chromium only
npm run test:e2e:chromium

# Run on Firefox only
npm run test:e2e:firefox

# Run on WebKit (Safari) only
npm run test:e2e:webkit

# Run on mobile browsers
npm run test:e2e:mobile
```

### Test-Specific Commands

```bash
# Run accessibility tests only
npm run test:accessibility

# Run integration tests only
npm run test:integration

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests matching pattern
npx playwright test --grep "login"
```

### View Reports

```bash
# Show HTML report of last test run
npm run test:e2e:report
```

## Test Categories

### 1. Accessibility Tests (`tests/e2e/accessibility.spec.ts`)

**Service Requirements**: None (uses mocks)

**What it tests:**
- WCAG compliance
- ARIA labels and roles
- Keyboard navigation
- Color contrast
- Screen reader compatibility
- Touch target sizes (mobile)
- Form labels
- Heading hierarchy

**Run with:**
```bash
npm run test:accessibility
```

### 2. Authentication Tests (`tests/e2e/auth.spec.ts`)

**Service Requirements**: Supabase (real database)

**What it tests:**
- Signup flow
- Login flow
- Phone number validation
- Invite code validation
- Profile completion
- Session persistence
- Logout functionality
- Protected route access

**Run with:**
```bash
# Requires real Supabase credentials
npm run test:e2e:staging -- tests/e2e/auth.spec.ts
```

**Database cleanup:** Tests automatically clean up test data after running.

### 3. Session Management Tests (`tests/e2e/sessions.spec.ts`)

**Service Requirements**: Supabase + 100ms HMS (for video features)

**What it tests:**
- Session creation
- Session listing
- Session filtering
- Join session flow
- Waiting room
- Host controls
- Participant count
- Session scheduling
- Search and filters

**Run with:**
```bash
# Requires real Supabase + HMS credentials
npm run test:e2e:staging -- tests/e2e/sessions.spec.ts
```

### 4. Invite Tests (`tests/e2e/invites.spec.ts`)

**Service Requirements**: Supabase (real database)

**What it tests:**
- Invite code generation
- Invite sharing
- Invite redemption
- Invite limits

**Run with:**
```bash
# Requires real Supabase credentials
npm run test:e2e:staging -- tests/e2e/invites.spec.ts
```

### 5. Credits Tests (`tests/e2e/credits.spec.ts`)

**Service Requirements**: Supabase (real database)

**What it tests:**
- Credit balance display
- Credit transactions
- Earning credits
- Spending credits

**Run with:**
```bash
# Requires real Supabase credentials
npm run test:e2e:staging -- tests/e2e/credits.spec.ts
```

### 6. Integration Tests (`tests/integration/webhooks.spec.ts`)

**Service Requirements**: Depends on webhook type

**What it tests:**
- Webhook endpoints
- External integrations
- API responses

**Run with:**
```bash
npm run test:integration
```

## Test Matrix

| Test Suite | Mock Services | Real Supabase | Real HMS | Real AI |
|------------|---------------|---------------|----------|---------|
| Accessibility | ✅ | Optional | Optional | Optional |
| Authentication | ⚠️ Limited | ✅ Required | Optional | Optional |
| Sessions | ⚠️ UI Only | ✅ Required | ✅ For video | Optional |
| Invites | ⚠️ UI Only | ✅ Required | Optional | Optional |
| Credits | ⚠️ UI Only | ✅ Required | Optional | Optional |
| Integration | Varies | Varies | Varies | Varies |

**Legend:**
- ✅ Fully supported
- ⚠️ Partial support (UI tests only)
- Optional: Feature works but not required

## Troubleshooting

### Common Errors

#### 1. "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL"

**Cause**: Supabase environment variables not loaded or invalid.

**Solutions:**
```bash
# Check if .env.test exists
ls -la .env.test

# Verify environment variables are loaded
cat .env.test | grep SUPABASE_URL

# For mock testing, ensure you're using the mock URL
npm run test:e2e:local

# For real testing, verify your .env.test.local has correct values
cat .env.test.local | grep SUPABASE_URL
```

#### 2. Database Connection Errors

**Cause**: Trying to run database-dependent tests with mock services.

**Solutions:**
```bash
# Option 1: Run only accessibility tests (work with mocks)
npm run test:accessibility

# Option 2: Set up real Supabase credentials
cp .env.test .env.test.local
# Edit .env.test.local with real credentials
npm run test:e2e:staging
```

#### 3. HMS Video Session Errors

**Cause**: HMS credentials missing or invalid.

**Solutions:**
```bash
# Skip video tests if not needed
npx playwright test --grep-invert "video|session"

# Or provide real HMS credentials in .env.test.local
npm run test:e2e:staging
```

#### 4. Tests Hanging or Timing Out

**Cause**: Application server not starting or slow network.

**Solutions:**
```bash
# Increase timeout in playwright.config.ts
# Or manually start dev server first
npm run dev &
sleep 10
npm run test:e2e

# Clean up
pkill -f "next dev"
```

#### 5. Port Already in Use

**Cause**: Port 3002 already occupied.

**Solutions:**
```bash
# Find and kill process using port 3002
lsof -ti:3002 | xargs kill -9

# Or change port in .env.test
NEXT_PUBLIC_APP_URL=http://localhost:3003
# Update playwright.config.ts baseURL accordingly
```

#### 6. Test Data Not Cleaned Up

**Cause**: Test failures before cleanup hooks run.

**Solutions:**
```bash
# Manually run cleanup script (create if needed)
npm run test:cleanup

# Or use Supabase dashboard to manually delete test data
# Look for records with pattern: 'E2E*', 'test-*', 'Test User*'
```

### Debug Strategies

#### 1. Visual Debugging

```bash
# Run in headed mode to see browser
npm run test:e2e:headed

# Run in UI mode for interactive debugging
npm run test:e2e:ui

# Run in debug mode with inspector
npm run test:e2e:debug
```

#### 2. Screenshot and Video

Tests automatically capture:
- Screenshots on failure
- Videos on failure
- Traces on retry

Find them in:
- `screenshots/`
- `test-results/`
- `playwright-report/`

#### 3. Verbose Logging

```bash
# Enable debug logs
DEBUG=pw:api npm run test:e2e

# Enable all playwright logs
DEBUG=pw:* npm run test:e2e
```

#### 4. Run Single Test

```bash
# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run specific test by name
npx playwright test -g "should display signup page correctly"

# Run in specific browser
npx playwright test --project=chromium tests/e2e/auth.spec.ts
```

### Getting Help

1. Check test output for specific error messages
2. Review `playwright-report/` for detailed results
3. Check application logs in terminal
4. Verify environment variables are loaded correctly
5. Ensure all services are accessible (for staging tests)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run accessibility tests (mock)
        run: npm run test:accessibility

      - name: Run E2E tests (staging)
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
        run: npm run test:e2e:staging

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables in CI

Store these as secrets in your CI/CD platform:
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY`
- `TEST_SUPABASE_SERVICE_KEY`
- `TEST_HMS_APP_ID`
- `TEST_HMS_ACCESS_KEY`
- `TEST_HMS_SECRET`
- `TEST_HMS_TEMPLATE_ID`
- `TEST_HMS_MANAGEMENT_TOKEN`

## Best Practices

### Writing E2E Tests

1. **Use page objects** for reusable interactions
2. **Clean up test data** in afterAll/afterEach hooks
3. **Use unique identifiers** for test data (timestamps, UUIDs)
4. **Avoid hardcoded waits** - use Playwright's auto-waiting
5. **Test critical paths** first, edge cases second
6. **Run accessibility tests** on every page

### Running Tests

1. **Local development**: Use mock services for speed
2. **Pre-commit**: Run accessibility tests
3. **Pre-push**: Run full E2E suite with staging
4. **CI/CD**: Run both mock and staging tests
5. **Regular cleanup**: Delete old test data from staging DB

### Test Data Management

1. Prefix test data with `E2E`, `TEST`, or `test-`
2. Include timestamps in test usernames/phones
3. Always clean up in test hooks
4. Use transactions when possible
5. Have a manual cleanup script as backup

## Quick Reference

```bash
# Fast feedback (mocks)
npm run test:e2e:local

# Full validation (real services)
npm run test:e2e:staging

# Accessibility only
npm run test:accessibility

# Debug specific test
npx playwright test --debug tests/e2e/auth.spec.ts

# View last results
npm run test:e2e:report

# Clean up test data (if script exists)
npm run test:cleanup
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [100ms Testing Documentation](https://www.100ms.live/docs/server-side/v2/introduction/testing)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
