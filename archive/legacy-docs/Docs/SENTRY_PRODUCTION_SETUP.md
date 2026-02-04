# Sentry Production Setup Guide

**Last Updated:** November 14, 2025
**Status:** Complete Production Documentation
**Audience:** DevOps, Backend Engineers, QA Engineers

---

## Table of Contents

1. [Project Creation](#project-creation)
2. [SDK Installation and Configuration](#sdk-installation-and-configuration)
3. [Source Maps](#source-maps)
4. [Error Tracking Configuration](#error-tracking-configuration)
5. [Performance Monitoring](#performance-monitoring)
6. [Alert Rules](#alert-rules)
7. [Issue Assignment](#issue-assignment)
8. [Integrations](#integrations)
9. [Dashboard Configuration](#dashboard-configuration)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Project Creation

### Creating Sentry Organization

**Prerequisites:**
- Valid email address for account
- Company information
- Production domain

### Step 1: Sign Up

1. **Visit Sentry** - https://sentry.io
2. **Click "Sign Up"**
3. **Enter Details:**
   ```
   Email: your-email@company.com
   Password: Strong password (12+ chars, mixed case, numbers, symbols)
   Company: Your company name
   ```

4. **Accept Terms**
   - ✅ Terms of Service
   - ✅ Privacy Policy

5. **Verify Email**
   - Check inbox for verification email
   - Click verification link
   - Organization will be created

### Step 2: Create Next.js Project

1. **Navigate to Projects**
   - Click "Projects" in sidebar
   - Click "Create Project"

2. **Select Platform**
   ```
   Platform: Next.js
   Alert Frequency: High (to catch all errors)
   ```

3. **Project Details**
   ```
   Project Name: kulti
   Team: [Select team or create new]
   Alert Rule: Default
   ```

4. **Installation**
   - Sentry will show installation instructions
   - We'll cover detailed setup in next section

### Step 3: Get DSN

After project creation, you'll receive a **Data Source Name (DSN)**:

```
Format: https://<key>@<host>.ingest.sentry.io/<project-id>
Example: https://examplePublicKey@o0.ingest.sentry.io/0
```

**Store Securely:**
```bash
# Add to Vercel environment variables
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

### Step 4: Configure Alert Rules

1. **Navigate to Alerts**
   - Settings → Alerts → Create Alert Rule

2. **New Issue Alert** (default)
   ```
   Filter: All projects
   Condition: When new issue is created
   Action: Send email notification
   Team: Select your team
   ```

3. **High Error Rate Alert**
   - We'll configure this in detail later

---

## SDK Installation and Configuration

### Current Installation Status

**Already Installed Packages:**
```json
{
  "@sentry/nextjs": "^10.25.0",
  "@sentry/react": "^7.x",
  "@sentry/node": "^7.x"
}
```

**Verify Installation:**

```bash
npm list @sentry/nextjs
# Should show: @sentry/nextjs@10.25.0
```

### Configuration Files

The Sentry SDK uses three configuration files for different environments:

#### 1. Client-Side Configuration (`sentry.client.config.ts`)

**Current Configuration:**

```typescript
/**
 * Sentry Client Configuration
 * This file configures Sentry for the browser/client-side
 */

import { initSentry } from "./lib/monitoring/sentry"

// Initialize Sentry on the client
initSentry()
```

**Implementation File (`lib/monitoring/sentry.ts`):**

```typescript
// File: /lib/monitoring/sentry.ts

import * as Sentry from '@sentry/nextjs'
import { logger } from './logger'

const ENV = process.env.NODE_ENV || 'development'
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const RELEASE = process.env.NEXT_PUBLIC_BUILD_ID || 'unknown'

export function initSentry(): void {
  if (!DSN) {
    console.warn('NEXT_PUBLIC_SENTRY_DSN not set, Sentry disabled')
    return
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE,

    // Performance Monitoring
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: ENV === 'production' ? 0.05 : 1.0,

    // Error Tracking
    normalizeDepth: 5,
    maxBreadcrumbs: 50,
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException

        // Ignore network errors and client disconnections
        if (
          error instanceof TypeError &&
          (error.message.includes('fetch') ||
            error.message.includes('AbortError'))
        ) {
          return null
        }

        // Ignore 4xx errors (usually client-side issues)
        if (
          event.status &&
          event.status >= 400 &&
          event.status < 500
        ) {
          return null
        }
      }

      return event
    },

    integrations: (integrations) => {
      return integrations
        .filter((integration) => {
          // Remove certain integrations if needed
          return true
        })
        .concat([
          // Custom integrations
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true
          })
        ])
    },

    // Session Replay
    replaysSessionSampleRate: ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Additional configuration
    ignoreErrors: [
      // Ignore browser extensions
      'top.GLOBALS',
      // Ignore 3rd party errors
      /^Non-Error promise rejection captured/
    ]
  })
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(userId: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    email: email,
    ip_address: '{{auto}}'
  })
}

/**
 * Clear user context on logout
 */
export function clearSentryUser(): void {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addSentryBreadcrumb(
  message: string,
  data?: Record<string, any>
): void {
  Sentry.captureMessage(message, {
    level: 'info',
    contexts: {
      user_action: data
    }
  })
}
```

#### 2. Server-Side Configuration (`sentry.server.config.ts`)

```typescript
/**
 * Sentry Server Configuration
 * This file configures Sentry for the server-side (API routes, middleware, etc.)
 */

import { initSentry } from "./lib/monitoring/sentry"

// Initialize Sentry on the server
initSentry()
```

#### 3. Edge Runtime Configuration (`sentry.edge.config.ts`)

```typescript
/**
 * Sentry Edge Configuration
 * This file configures Sentry for Edge runtime (middleware)
 */

import { initSentry } from "./lib/monitoring/sentry"

// Initialize Sentry on the edge
initSentry()
```

### DSN Configuration

**Setting DSN for Different Environments:**

```bash
# Production
NEXT_PUBLIC_SENTRY_DSN=https://key1@org.ingest.sentry.io/project1

# Staging
NEXT_PUBLIC_SENTRY_DSN=https://key2@org.ingest.sentry.io/project2

# Development
NEXT_PUBLIC_SENTRY_DSN=https://key3@org.ingest.sentry.io/project3

# Or use same project for all (not recommended)
NEXT_PUBLIC_SENTRY_DSN=https://key@org.ingest.sentry.io/project
```

**Environment-Specific Configuration:**

```typescript
// In sentry initialization
const config = {
  production: {
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    maxBreadcrumbs: 50
  },
  staging: {
    tracesSampleRate: 0.5,
    replaysSessionSampleRate: 0.5,
    maxBreadcrumbs: 100
  },
  development: {
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 1.0,
    maxBreadcrumbs: 100
  }
}

const environment = process.env.NODE_ENV || 'development'
const sentryConfig = config[environment as keyof typeof config]
```

---

## Source Maps

### Understanding Source Maps

Source maps allow Sentry to display original TypeScript/source code in error reports instead of minified JavaScript.

**Without Source Maps:**
```
Error at webpack:///./components/Button.tsx?ab12:1:5000
```

**With Source Maps:**
```
Error at components/Button.tsx:45:10
  const handleClick = () => {
                      ^
```

### Automatic Source Map Upload

**Configure in `next.config.js`:**

```javascript
// File: /next.config.js

import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = {
  // ... rest of config

  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    autoInstrumentAppDir: true,
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: true,

    // Source maps settings
    sourceMaps: {
      disable: false,
      deleteSourcemapsAfterUpload: true,
      rewriteFrames: {
        root: process.cwd()
      }
    }
  }
}

export default withSentryConfig(
  nextConfig,
  {
    // Further config options here
    org: 'your-org-slug',
    project: 'your-project-slug',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: false,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    skipBuildSourceMapUpload: false,
    autoInstrumentServerFunctions: true,
    autoInstrumentAppDir: true
  }
)
```

### Sentry CLI Authentication

**Generate Auth Token:**

1. **In Sentry Dashboard**
   - Settings → Organization → Developer Settings
   - Personal Authenticaton Tokens → Create New Token
   - Scopes needed:
     - `project:releases`
     - `project:read`
     - `project:write`
     - `org:read`

2. **Store Token**
   ```bash
   # In Vercel environment variables
   SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxx
   ```

3. **In `.env.local` (local development)**
   ```bash
   SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxx
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=kulti
   ```

### Manual Source Map Upload

If automatic upload fails, use Sentry CLI:

```bash
# Install Sentry CLI
npm install --save-dev @sentry/cli

# Build application
npm run build

# Upload source maps
sentry-cli --auth-token $SENTRY_AUTH_TOKEN \
  releases -o your-org -p your-project \
  files upload-sourcemaps ./out
```

### Verification

**Check Source Maps in Sentry:**

1. Go to Issues → Select an error
2. Look for stack trace
3. Click on a frame
4. Should show original source code, not minified

If showing minified code:
- Verify `SENTRY_AUTH_TOKEN` is set
- Check build output contains `.js.map` files
- Verify `deleteSourcemapsAfterUpload` is `true`
- Check Sentry project settings

---

## Error Tracking Configuration

### Error Sampling Rates

**Production Configuration:**

```typescript
// Only sample 10% of errors in production
// This reduces costs while capturing critical issues
const config = {
  production: {
    sampleRate: 0.1,  // 10% of errors
    tracesSampleRate: 0.1,  // 10% of transactions
  },
  staging: {
    sampleRate: 0.5,
    tracesSampleRate: 0.5,
  },
  development: {
    sampleRate: 1.0,  // All errors
    tracesSampleRate: 1.0,  // All transactions
  }
}
```

**Error Type-Specific Sampling:**

```typescript
beforeSend(event, hint) {
  // Always capture critical errors
  if (event.level === 'fatal' || event.level === 'error') {
    return event
  }

  // Sample warnings (20%)
  if (event.level === 'warning') {
    return Math.random() < 0.2 ? event : null
  }

  // Sample info (5%)
  if (event.level === 'info') {
    return Math.random() < 0.05 ? event : null
  }

  return event
}
```

### Release Tracking

**Set Release Version:**

```typescript
// In sentry initialization
Sentry.init({
  release: process.env.NEXT_PUBLIC_BUILD_ID || 'unknown',
  // ...
})
```

**In Deployment:**

```bash
# Set release during build
export NEXT_PUBLIC_BUILD_ID=$(git rev-parse --short HEAD)
npm run build
```

**Verify Release:**

1. Go to Sentry Dashboard
2. Click Release section
3. Should see your build ID

### Environment Configuration

**Multi-Environment Setup:**

```typescript
// Automatically detect environment
const environment = process.env.VERCEL_ENV || 'development'

Sentry.init({
  environment: environment,
  // Different config per environment
  enabled: environment !== 'development'
})
```

**Environment Aliases:**

- `production`: Live users
- `staging`: Pre-release testing
- `development`: Local development (usually disabled)

### User Context Tracking

**Capture User Information:**

```typescript
// File: /lib/monitoring/sentry.ts

export function setSentryUser(user: {
  id: string
  email?: string
  phone?: string
  username?: string
  ip_address?: string
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    phone: user.phone,
    username: user.username,
    ip_address: user.ip_address || '{{auto}}'
  })
}

// Usage
setSentryUser({
  id: user.id,
  email: user.email,
  phone: user.phone
})
```

**Important:** Set user context early (after login)

```typescript
// In auth/login route
if (user) {
  setSentryUser({
    id: user.id,
    email: user.email
  })
}
```

### PII Considerations

**Sensitive Data Handling:**

By default, Sentry masks:
- Email addresses
- Phone numbers
- IP addresses (when `ip_address: '{{auto}}'`)

**Custom Data Scrubbing:**

```typescript
beforeSend(event, hint) {
  // Remove custom sensitive data
  if (event.request?.cookies) {
    delete event.request.cookies
  }

  if (event.contexts?.user?.custom_data) {
    delete event.contexts.user.custom_data
  }

  return event
}
```

### Custom Error Boundaries

**React Error Boundary:**

```typescript
// File: /components/error-boundary.tsx

import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/monitoring/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Component error caught', {
      error: error.message,
      componentStack: errorInfo.componentStack
    })

    // Send to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h2 className="text-red-900 font-bold">Something went wrong</h2>
            <p className="text-red-700 text-sm mt-2">
              Our team has been notified. Please refresh the page.
            </p>
          </div>
        )
      )
    }

    return this.props.children
  }
}

// Usage in layout
export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <ErrorBoundary fallback={<div>Error occurred</div>}>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

---

## Performance Monitoring

### Transaction Tracking

**Track Page Load Performance:**

```typescript
// Automatic with Next.js instrumentation
// Sentry automatically tracks:
// - Page loads
// - API routes
// - Database queries
// - HTTP requests
```

### Custom Transactions

**Measure Custom Operations:**

```typescript
import * as Sentry from '@sentry/nextjs'

async function uploadRecording(recordingData: Buffer) {
  const transaction = Sentry.startTransaction({
    name: 'Upload Recording',
    op: 'recording.upload'
  })

  try {
    const span = transaction.startChild({
      op: 'upload',
      description: 'S3 upload'
    })

    const result = await uploadToS3(recordingData)

    span.finish()

    transaction.setStatus('ok')
  } catch (error) {
    transaction.setStatus('error')
    throw error
  } finally {
    transaction.finish()
  }
}
```

### Performance Metrics

**Key Metrics to Track:**

| Metric | Warning Threshold | Critical Threshold |
|--------|---|---|
| First Contentful Paint (FCP) | > 2.5s | > 4s |
| Largest Contentful Paint (LCP) | > 2.5s | > 4s |
| Cumulative Layout Shift (CLS) | > 0.1 | > 0.25 |
| Time to Interactive (TTI) | > 3.8s | > 7.3s |
| API Response Time | > 500ms | > 1s |

**Track Web Vitals:**

```typescript
// File: /lib/monitoring/web-vitals.ts

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
import * as Sentry from '@sentry/nextjs'

export function trackWebVitals() {
  getCLS(metric => {
    Sentry.captureMessage('Web Vital: CLS', {
      level: 'info',
      contexts: {
        webVital: {
          name: 'CLS',
          value: metric.value,
          rating: metric.rating
        }
      }
    })
  })

  getFCP(metric => {
    Sentry.captureMessage('Web Vital: FCP', {
      level: 'info',
      contexts: {
        webVital: {
          name: 'FCP',
          value: metric.value,
          rating: metric.rating
        }
      }
    })
  })

  getLCP(metric => {
    Sentry.captureMessage('Web Vital: LCP', {
      level: 'info',
      contexts: {
        webVital: {
          name: 'LCP',
          value: metric.value,
          rating: metric.rating
        }
      }
    })
  })

  getTTFB(metric => {
    Sentry.captureMessage('Web Vital: TTFB', {
      level: 'info',
      contexts: {
        webVital: {
          name: 'TTFB',
          value: metric.value,
          rating: metric.rating
        }
      }
    })
  })
}
```

### Slow Query Tracking

**Monitor Database Performance:**

```typescript
// File: /lib/monitoring/db-monitoring.ts

import { logger } from './logger'
import * as Sentry from '@sentry/nextjs'

const SLOW_QUERY_THRESHOLD = 500 // ms

export async function trackSlowQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    const result = await queryFn()
    const duration = performance.now() - start

    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn('Slow query detected', {
        name,
        duration,
        threshold: SLOW_QUERY_THRESHOLD
      })

      Sentry.captureMessage('Slow Database Query', {
        level: 'warning',
        contexts: {
          database: {
            query: name,
            duration,
            threshold: SLOW_QUERY_THRESHOLD
          }
        }
      })
    }

    return result
  } catch (error) {
    const duration = performance.now() - start

    logger.error('Query failed', {
      name,
      duration,
      error
    })

    throw error
  }
}

// Usage
const users = await trackSlowQuery(
  'Get active users',
  () => db.query('SELECT * FROM users WHERE active = true')
)
```

---

## Alert Rules

### High Error Rate Alert

**Configure Alert:**

1. **Dashboard → Alerts → Create Alert Rule**

2. **When Alert Should Trigger**
   ```
   Condition: Error frequency > 5% in 5 minutes
   Filters: For all projects
   ```

3. **Notification**
   ```
   Send email to: team@company.com
   Also notify: Slack channel #errors
   ```

4. **Details**
   ```
   Alert Name: High Error Rate
   Severity: High
   Repeat Notifications: Every 15 minutes if active
   ```

### New Error Type Alert

**For First-Time Errors:**

1. **Alert Rule → Create Rule**
2. **When Alert Triggers**
   ```
   Condition: A new issue is created
   Filters: Error level = error
   ```
3. **Notification**
   ```
   Email: team@company.com
   Severity: High
   ```

### Performance Degradation Alert

**Monitor Slow Endpoints:**

1. **Create Alert Rule**
2. **When Alert Triggers**
   ```
   Condition: Transaction duration > 2 seconds (p95)
   For endpoint: /api/hms/token
   Over 10 minutes
   ```
3. **Notification**
   ```
   Send to: #performance-alerts (Slack)
   ```

### Critical Error Notifications

**For Fatal Errors:**

1. **Alert Rule**
   ```
   Condition: Error level = fatal
   ```
2. **Notification**
   ```
   Email: oncall@company.com
   SMS: +1-xxx-xxx-xxxx (optional)
   PagerDuty: Trigger incident
   ```

### Alert Delivery Channels

**Email:**
- To individual team members
- To mailing list
- Auto-escalation

**Slack Integration:**
- Channel notifications
- Thread replies
- Custom formatting

**PagerDuty Integration:**
- Create incidents
- Auto-escalation policies
- On-call rotation

**Webhook:**
- Custom integrations
- Third-party tools
- Custom processing

---

## Issue Assignment

### Auto-Assignment Rules

**Assign by Team:**

1. Settings → Rules Configuration
2. Rule: "Assign to team based on project"
3. Config:
   ```
   Project: kulti
   Team: Backend Team
   Condition: Error from API routes
   ```

**Assign by Keyword:**

1. Create Rule: "Assign to specialist"
2. Condition: "Error message contains 'HMS'"
3. Assign to: @john-hms-expert

### Team Notification

**Configure Team Alerts:**

1. **Navigate to Team Settings**
   - Settings → Teams → [Team Name]

2. **Alert Preferences**
   - Notification frequency: As it happens
   - Channel: Slack + Email
   - Escalation: After 1 hour

### Issue Ownership

**Codeowners Integration:**

1. **Add `.github/CODEOWNERS`**
   ```
   # HMS functionality
   /app/**/hms/**        @john-hms-expert
   /lib/hms/**           @john-hms-expert

   # Database
   /app/**/api/db/**     @db-team
   /lib/db/**            @db-team

   # Recording
   /app/**/api/recording/** @recording-team
   /lib/recording/**        @recording-team
   ```

2. **Link to Sentry**
   - Integrations → GitHub → Enable Codeowners
   - Sentry will auto-assign based on file ownership

### SLA Configuration

**Set Issue Response Times:**

1. **Settings → SLAs**
2. **Create SLA Rules**
   ```
   Critical Errors (fatal):
     - First response: 15 minutes
     - Resolution: 1 hour

   High Errors (error):
     - First response: 1 hour
     - Resolution: 4 hours

   Medium Warnings (warning):
     - First response: 4 hours
     - Resolution: 24 hours
   ```

---

## Integrations

### Slack Integration

**Setup:**

1. **Sentry Dashboard → Integrations → Slack**
2. **Click "Install"**
3. **In Slack:** Authorize Sentry app
4. **Test:** Create alert rule to send to Slack

**Sample Alert Message:**

```
[ERROR] High Error Rate
Project: kulti
Rate: 8% errors in 5 minutes
Threshold: 5%

View in Sentry | Acknowledge | Resolve
```

### GitHub Integration

**Setup:**

1. **Sentry → Integrations → GitHub**
2. **Authorize GitHub account**
3. **Select repository: kulti**
4. **Enable:**
   - Issue tracking
   - Commits
   - Source map uploads

**Auto-Create Issues:**

1. **Issue Detail → Create GitHub Issue**
2. Automatically files issue in repository
3. Links back to Sentry

### Vercel Integration

**Setup:**

1. **Sentry → Integrations → Vercel**
2. **Authorize Vercel**
3. **Select project: kulti**

**Automatic:**
- Release tracking
- Deployment tracking
- Source map upload

### Custom Webhooks

**Setup Webhook:**

```bash
curl -X POST https://sentry.io/api/0/organizations/your-org/integrations/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-webhook",
    "url": "https://your-api.com/webhooks/sentry",
    "events": ["issue.created", "issue.resolved"],
    "active": true
  }'
```

---

## Dashboard Configuration

### Custom Dashboards

**Create Dashboard:**

1. **Dashboard → Create Dashboard**
2. **Name:** "Kulti Production Overview"
3. **Add Widgets:**

**Widget 1: Error Rate**
```
Type: Errors
Query: Event count
Time period: 24 hours
Show: Graph + number
```

**Widget 2: Top Issues**
```
Type: Top Issues
Time period: 7 days
Show: 5 most critical
```

**Widget 3: Performance**
```
Type: Transactions
Query: Duration (p95)
Time period: 24 hours
Show: Graph
```

**Widget 4: User Impact**
```
Type: User Crashes
Query: Unique user count affected
Time period: 24 hours
```

### Key Metrics to Track

**Real-time Metrics:**

| Metric | Target | Warning |
|--------|--------|---------|
| Error Rate | < 1% | > 2% |
| Error Volume (per hour) | < 50 | > 100 |
| Unique Issues | < 10 new/day | > 20 |
| P95 Response Time | < 500ms | > 1s |
| Crash-Free Sessions | > 99% | < 99% |

**Dashboard Queries:**

```
# Errors by endpoint
event.transaction: /api/*

# Error rate in production
environment:production

# Performance issues
transaction.duration:[500 to *]

# User impact
event.user

# Crashes per version
release:*
```

### Performance Overview

**Performance Dashboard:**

1. **Add Widget: Transactions**
   ```
   Query: p50, p95, p99 latency
   Segments: By endpoint
   Time: Last 24 hours
   ```

2. **Add Widget: Throughput**
   ```
   Transactions per second
   By transaction name
   ```

3. **Add Widget: Slow Queries**
   ```
   Database queries > 500ms
   Sorted by frequency
   ```

---

## Monitoring and Maintenance

### Regular Checks

**Daily (5 minutes):**
- Check dashboard for new critical errors
- Review error rate trend
- Check if high error rate alert triggered

**Weekly (30 minutes):**
- Review all new issues created
- Check performance metrics
- Review slowest endpoints
- Check for patterns in errors

**Monthly (1 hour):**
- Review error budget usage
- Analyze error trends
- Plan for optimization
- Review alert effectiveness

### Health Checks

**Dashboard Health Script:**

```typescript
// File: /scripts/sentry-health-check.ts

import * as Sentry from '@sentry/node'

async function checkSentryHealth() {
  // Check if Sentry is working
  Sentry.captureMessage('Health Check', {
    level: 'info',
    contexts: {
      health: {
        timestamp: new Date().toISOString(),
        status: 'ok'
      }
    }
  })

  // Wait for it to be sent
  await Sentry.close(2000)

  console.log('Health check sent to Sentry')
}

// Run: node -r esbuild-register scripts/sentry-health-check.ts
```

### Alert Tuning

**Reduce Alert Fatigue:**

1. **Review alert history**
   - What alerts trigger most often?
   - Which are false positives?

2. **Adjust thresholds**
   - Increase threshold for noisy alerts
   - Decrease for critical alerts

3. **Add filters**
   - Only alert on production environment
   - Only alert for specific endpoints

**Example: Reduce False Positives**

```
Original Rule:
  Error count > 10 in 5 minutes
  → Too many false alerts

Revised Rule:
  Error count > 50 AND error rate > 5% in 5 minutes
  AND environment = production
  → Much better
```

### Cleanup and Archiving

**Archive Old Issues:**

1. **Issues → Filter by date**
2. **Bulk select old issues**
3. **Action: Archive**

**Delete Old Releases:**

1. **Releases → Old releases**
2. **Delete if not needed**
3. **Keep last 5 releases**

---

## Troubleshooting

### Sentry Not Receiving Events

**Check:**

1. DSN is set correctly
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```

2. Sentry is initialized
   ```typescript
   import { initSentry } from './lib/monitoring/sentry'
   initSentry()
   ```

3. Send test event
   ```typescript
   import * as Sentry from '@sentry/nextjs'
   Sentry.captureMessage('Test event')
   ```

4. Check network tab (browser dev tools)
   - Look for sentry.io requests
   - Check if they return 200 OK

### Source Maps Not Uploading

**Check:**

1. `SENTRY_AUTH_TOKEN` is set
2. `SENTRY_ORG` and `SENTRY_PROJECT` match dashboard
3. Build completed successfully
4. `.js.map` files exist in build output

**Debug:**

```bash
# Enable verbose output
sentry-cli releases files list -o org -p project version

# Check file status
sentry-cli files list -o org -p project
```

### High Alert False Positive Rate

**Solutions:**

1. Increase threshold
2. Add more filters (environment, error type)
3. Exclude known third-party errors
4. Adjust sampling rate

---

## Checklist: Production Deployment

- [ ] Sentry organization created
- [ ] Next.js project created in Sentry
- [ ] DSN obtained and stored securely
- [ ] SDK installed (@sentry/nextjs)
- [ ] Configuration files reviewed
- [ ] SENTRY_AUTH_TOKEN generated and stored
- [ ] Source maps configured for upload
- [ ] Error tracking configured
- [ ] Performance monitoring enabled
- [ ] Web Vitals tracking configured
- [ ] Error boundaries implemented
- [ ] User context tracking implemented
- [ ] Alert rules created
- [ ] Slack integration configured
- [ ] GitHub integration configured
- [ ] Custom dashboard created
- [ ] Team trained on Sentry usage
- [ ] Test event sent and received
- [ ] Production deploy successful

---

## Quick Reference

**Key Environment Variables:**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://key@org.ingest.sentry.io/project
SENTRY_AUTH_TOKEN=sntrys_xxxxx
SENTRY_ORG=your-org
SENTRY_PROJECT=kulti
```

**Common Commands:**
```bash
# Test Sentry
curl -X POST https://your-sentry-url/api/catch/

# Upload source maps
sentry-cli releases files upload-sourcemaps ./out

# List releases
sentry-cli releases -o org -p project list
```

**Key URLs:**
- Dashboard: https://sentry.io/organizations/[org]/
- Project: https://sentry.io/organizations/[org]/projects/kulti/
- Settings: https://sentry.io/settings/[org]/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-14 | Initial comprehensive production setup guide |

---

**Last Updated:** November 14, 2025
**Maintained by:** DevOps Team
**Status:** Production Ready
