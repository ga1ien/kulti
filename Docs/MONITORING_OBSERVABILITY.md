# Monitoring and Observability Guide

**Last Updated:** November 14, 2025
**Status:** Complete Monitoring Documentation
**Audience:** DevOps, Backend Engineers, Site Reliability Engineers

---

## Table of Contents

1. [Key Metrics to Monitor](#key-metrics-to-monitor)
2. [Dashboard Setup](#dashboard-setup)
3. [Alert Thresholds](#alert-thresholds)
4. [Log Aggregation](#log-aggregation)
5. [Performance Optimization](#performance-optimization)
6. [Incident Response](#incident-response)

---

## Key Metrics to Monitor

### Error Rates (by Endpoint)

**Metric Definition:**
```
Error Rate = (Errors / Total Requests) × 100
```

**By Endpoint:**

```
POST /api/hms/token:
  - Target: < 0.5% error rate
  - Monitor: Auth failures, rate limit issues
  - Alert: > 2% errors in 5 minutes

POST /api/sessions/create:
  - Target: < 1% error rate
  - Monitor: Room creation failures
  - Alert: > 3% errors in 5 minutes

POST /api/recordings/start:
  - Target: < 2% error rate
  - Monitor: HMS API failures
  - Alert: > 5% errors in 5 minutes

GET /api/recordings/:id:
  - Target: < 0.5% error rate
  - Monitor: Database query failures
  - Alert: > 2% errors in 5 minutes
```

**Calculate Error Rate:**

```typescript
// File: /lib/monitoring/metrics.ts

import { logger } from './logger'

interface EndpointMetrics {
  endpoint: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  errorRate: number
}

export async function calculateErrorRate(
  endpoint: string,
  timeWindowMinutes: number = 5
): Promise<EndpointMetrics> {
  const now = new Date()
  const since = new Date(now.getTime() - timeWindowMinutes * 60 * 1000)

  // Query Sentry for errors in time window
  const errors = await fetchSentryEvents({
    query: `transaction:"${endpoint}" error_level:[error TO fatal]`,
    since,
    until: now
  })

  // Query successful requests (from logs/analytics)
  const successful = await fetchSuccessfulRequests({
    endpoint,
    since,
    until: now
  })

  const total = errors.length + successful.length
  const errorRate = total > 0 ? (errors.length / total) * 100 : 0

  const metrics: EndpointMetrics = {
    endpoint,
    totalRequests: total,
    successfulRequests: successful.length,
    failedRequests: errors.length,
    errorRate
  }

  // Log metrics
  logger.info('Endpoint metrics', metrics)

  // Alert if over threshold
  const threshold = {
    '/api/hms/token': 2,
    '/api/sessions/create': 3,
    '/api/recordings/start': 5,
    '/api/recordings/': 2
  }

  const limit = threshold[endpoint] || 5

  if (errorRate > limit) {
    logger.warn('Error rate exceeds threshold', {
      endpoint,
      errorRate,
      threshold: limit
    })
  }

  return metrics
}
```

### Response Times

**Latency Percentiles:**

```
P50 (Median): 50% of requests faster than this
P95: 95% of requests faster than this (important for UX)
P99: 99% of requests faster than this (catching outliers)
Max: Maximum response time observed
```

**By Endpoint:**

```
GET / (Homepage):
  Target: P95 < 1s
  Alert: P95 > 2s

POST /api/hms/token:
  Target: P95 < 500ms
  Alert: P95 > 1s

GET /api/sessions/:id:
  Target: P95 < 500ms
  Alert: P95 > 1s

POST /api/recordings/start:
  Target: P95 < 1s
  Alert: P95 > 2s
```

**Track Response Times:**

```typescript
// Middleware to track response time
export async function trackResponseTime(
  endpoint: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const start = performance.now()

  try {
    const response = await handler()
    const duration = performance.now() - start

    logger.info('Request completed', {
      endpoint,
      status: response.status,
      duration
    })

    // Track in Sentry
    Sentry.captureMessage('Request timing', {
      level: 'info',
      contexts: {
        request: {
          endpoint,
          duration,
          status: response.status
        }
      }
    })

    return response
  } catch (error) {
    const duration = performance.now() - start

    logger.error('Request failed', {
      endpoint,
      duration,
      error
    })

    throw error
  }
}
```

### HMS Usage Metrics

**Track HMS Activity:**

```
Active Rooms:
  - Target: < 100 concurrent
  - Alert: > 150 concurrent rooms

Participants per Room:
  - Target: 5-10 average
  - Alert: > 20 participants

Recording Success Rate:
  - Target: > 99%
  - Alert: < 95%

HLS Broadcast Status:
  - Target: 100% availability
  - Alert: Any broadcast failures
```

**Query HMS Usage:**

```typescript
// File: /lib/monitoring/hms-metrics.ts

export async function getHmsMetrics(): Promise<{
  activeRooms: number
  totalParticipants: number
  recordingSuccessRate: number
  hlsBroadcasts: number
}> {
  // Get data from HMS Management API
  const rooms = await fetch('https://api.100ms.live/v2/rooms', {
    headers: {
      'Authorization': `Bearer ${process.env.HMS_MANAGEMENT_TOKEN}`
    }
  }).then(r => r.json())

  const activeRooms = rooms.filter((r: any) => r.active).length
  const totalParticipants = rooms.reduce(
    (sum: number, r: any) => sum + (r.peers?.length || 0),
    0
  )

  // Get recording success rate
  const recordings = await db.query(
    'SELECT COUNT(*) as total, SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as successful FROM recordings WHERE created_at > NOW() - INTERVAL $2',
    ['completed', '24 hours']
  )

  const recordingSuccessRate = recordings[0].total > 0
    ? (recordings[0].successful / recordings[0].total) * 100
    : 100

  // Get active HLS broadcasts
  const broadcasts = await db.query(
    'SELECT COUNT(*) as count FROM hls_broadcasts WHERE status = $1',
    ['active']
  )

  return {
    activeRooms,
    totalParticipants,
    recordingSuccessRate,
    hlsBroadcasts: broadcasts[0].count
  }
}
```

### Database Performance

**Key Metrics:**

```
Query Response Time:
  - Target: P95 < 100ms
  - Alert: P95 > 500ms

Active Connections:
  - Target: < 80% of max
  - Alert: > 90% of max

Slow Queries:
  - Target: < 5 per hour
  - Alert: > 10 per hour

Replication Lag:
  - Target: < 100ms
  - Alert: > 1s
```

**Monitor Database:**

```typescript
// File: /lib/monitoring/db-metrics.ts

export async function getDatabaseMetrics() {
  // Get slow query count
  const slowQueries = await db.query(
    'SELECT COUNT(*) FROM query_log WHERE duration > $1 AND created_at > NOW() - INTERVAL $2',
    [500, '1 hour'] // Queries > 500ms in last hour
  )

  // Get connection count
  const connections = await db.query(
    'SELECT COUNT(*) FROM pg_stat_activity'
  )

  // Get max connections
  const maxConnections = await db.query(
    'SELECT setting FROM pg_settings WHERE name = $1',
    ['max_connections']
  )

  const connectionPercent = (
    (connections[0].count / parseInt(maxConnections[0].setting)) * 100
  )

  return {
    slowQueryCount: slowQueries[0].count,
    activeConnections: connections[0].count,
    maxConnections: parseInt(maxConnections[0].setting),
    connectionPercent
  }
}
```

### Infrastructure Metrics

**CPU Usage:**
```
Target: < 70% average
Warning: > 80%
Critical: > 95%
```

**Memory Usage:**
```
Target: < 75% used
Warning: > 85%
Critical: > 95%
```

**Disk Usage:**
```
Target: < 70% full
Warning: > 85%
Critical: > 95%
```

**Monitor with Vercel:**

```bash
# View resource metrics in Vercel Dashboard
# Project → Analytics → Real-time → Resource Usage
```

### API Rate Limit Usage

**Track Usage:**

```
Target: < 80% of limit
Alert: > 90% of limit

Per endpoint:
- /api/hms/token: 100 requests/min
- /api/sessions: 50 requests/min
- /api/recordings: 50 requests/min
```

**Monitor Usage:**

```typescript
// Get from Upstash dashboard or API
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

export async function getRateLimitMetrics() {
  const info = await redis.info()

  return {
    keysCount: info.db0.keys,
    memoryUsedBytes: info.memory.used_memory,
    memoryUsedPercent: (
      (info.memory.used_memory / info.memory.total_system_memory) * 100
    ),
    commandsPerSecond: info.stats.instantaneous_ops_per_sec
  }
}
```

---

## Dashboard Setup

### Vercel Analytics Dashboard

**Key Metrics Tracked:**

1. **Real-time Traffic**
   - Requests per second
   - Error rate
   - Response time

2. **Top Pages**
   - Most visited URLs
   - Page views
   - Unique visitors

3. **Performance**
   - Web Vitals (FCP, LCP, CLS)
   - Response times by endpoint
   - Deployment comparison

**Access:**
```
vercel.com → [Project] → Analytics → Real-time
```

**Setup Custom Dashboards:**

1. Click "Create Dashboard"
2. Add widgets for:
   - Error rate
   - Response time (p95)
   - Active users
   - Top endpoints

### Sentry Performance Dashboard

**Setup Performance Monitoring:**

1. **Dashboard → Discover**
2. **Query Examples:**
   ```
   # All transactions over 1 second
   transaction.duration:[1000 TO *]

   # Errors by endpoint
   transaction:"POST /api/hms/token" error_level:[error TO fatal]

   # Crash-free sessions
   release:* -has:error
   ```

3. **Create Custom Dashboard:**
   - Click "Dashboards" → Create Dashboard
   - Add widgets for:
     - Error rate trend
     - Slow transactions
     - User impact
     - Release comparison

### Custom Monitoring Dashboard

**Create Dashboard with Multiple Data Sources:**

```typescript
// File: /lib/monitoring/dashboard.ts

export async function getDashboardMetrics() {
  const [
    errorMetrics,
    responseTimeMetrics,
    hmsMetrics,
    dbMetrics,
    rateLimitMetrics
  ] = await Promise.all([
    calculateErrorRate('/api/hms/token', 5),
    getResponseTimeMetrics(5),
    getHmsMetrics(),
    getDatabaseMetrics(),
    getRateLimitMetrics()
  ])

  return {
    timestamp: new Date().toISOString(),
    errors: errorMetrics,
    responseTimes: responseTimeMetrics,
    hms: hmsMetrics,
    database: dbMetrics,
    rateLimits: rateLimitMetrics,
    health: calculateOverallHealth({
      errorMetrics,
      responseTimeMetrics,
      hmsMetrics,
      dbMetrics,
      rateLimitMetrics
    })
  }
}

function calculateOverallHealth(metrics: any): 'healthy' | 'degraded' | 'critical' {
  const issues = []

  if (metrics.errorMetrics.errorRate > 2) issues.push('high_error_rate')
  if (metrics.responseTimeMetrics.p95 > 1000) issues.push('slow_response')
  if (metrics.hmsMetrics.recordingSuccessRate < 95) issues.push('recording_issues')
  if (metrics.dbMetrics.connectionPercent > 90) issues.push('db_connection_pool')
  if (metrics.rateLimitMetrics.memoryUsedPercent > 90) issues.push('rate_limit_memory')

  if (issues.length === 0) return 'healthy'
  if (issues.length <= 2) return 'degraded'
  return 'critical'
}
```

**Display Dashboard:**

```bash
# Create Grafana-like dashboard
# Or use: https://api.kulti.club/monitoring/dashboard
```

---

## Alert Thresholds

### Error Rate Alerts

**Configuration:**

```json
{
  "name": "High Error Rate",
  "condition": "error_rate > 5% in 5 minutes",
  "severity": "high",
  "notification": "email, slack, pagerduty",
  "escalation": [
    {
      "wait": "15 minutes",
      "action": "re-notify"
    },
    {
      "wait": "30 minutes",
      "action": "escalate to on-call"
    }
  ]
}
```

**By Severity:**

```
Severity: Critical (error rate > 10%)
  - Immediately notify: On-call engineer
  - Create: PagerDuty incident
  - Action: Page on-call

Severity: High (error rate 5-10%)
  - Notify: Team Slack
  - Create: GitHub issue
  - Action: Review within 1 hour

Severity: Medium (error rate 2-5%)
  - Notify: Email only
  - Action: Review within 4 hours

Severity: Low (error rate < 2%)
  - Notify: Daily digest
  - Action: No immediate action
```

### Response Time Alerts

```json
{
  "name": "Slow API Response",
  "conditions": [
    "p95_response_time > 1000ms for /api/hms/token",
    "p95_response_time > 1000ms for /api/sessions"
  ],
  "severity": "medium",
  "notification": "slack"
}
```

### Database Alerts

```json
{
  "name": "Database Connection Pool High",
  "condition": "active_connections > 90% of max",
  "severity": "high",
  "notification": "email, slack",
  "runbook": "https://docs.kulti.club/runbook#db-connection-pool"
}
```

### HMS Alerts

```json
{
  "name": "HMS Recording Failures",
  "condition": "recording_success_rate < 95%",
  "severity": "high",
  "notification": "slack, pagerduty"
}
```

### Resource Utilization Alerts

```
CPU > 80%:
  - Severity: Medium
  - Action: Check for running processes
  - Escalate if > 95%

Memory > 85%:
  - Severity: Medium
  - Action: Check for memory leaks
  - Escalate if > 95%

Disk > 85%:
  - Severity: High
  - Action: Investigate disk usage
  - May require emergency scaling
```

---

## Log Aggregation

### Structured Logging Format

**Current Implementation:**

```typescript
// File: /lib/monitoring/logger.ts

import { logger as sentryLogger } from '@sentry/nextjs'

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }))

    Sentry.captureMessage(message, {
      level: 'info',
      contexts: { data: context }
    })
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }))

    Sentry.captureMessage(message, {
      level: 'warning',
      contexts: { data: context }
    })
  },

  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      ...context
    }))

    Sentry.captureException(error, {
      tags: { errorType: 'application' },
      contexts: { data: context }
    })
  },

  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...context
      }))
    }
  }
}
```

### Log Levels

```
ERROR: Action failed, requires immediate attention
  Examples:
  - Database query failed
  - API call failed
  - Authentication failed
  - Webhook processing failed

WARN: Unexpected condition, may indicate issue
  Examples:
  - Rate limit exceeded
  - Retry attempt
  - Slow operation detected
  - Quota approaching limit

INFO: Informational, for audit trail
  Examples:
  - User logged in
  - Session created
  - Recording started
  - Webhook received

DEBUG: Detailed diagnostic information
  Examples:
  - SQL query executed
  - HTTP request made
  - State changes
  - Performance metrics
```

### Log Retention

**Vercel Logs:**
- Keep for 24 hours (real-time)
- Available via CLI: `vercel logs --prod`

**Sentry Logs:**
- Keep error logs: 30 days
- Keep performance data: 30 days
- Archive to S3: 365 days

**Database Query Logs:**
```sql
-- Configure in Postgres
CREATE TABLE query_log (
  id UUID PRIMARY KEY,
  query TEXT NOT NULL,
  duration BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Retention policy: Keep 30 days, auto-delete older
DELETE FROM query_log WHERE created_at < NOW() - INTERVAL '30 days';
```

### Search and Filtering

**Find Errors by User:**
```
context.user_id:123
```

**Find Errors by Endpoint:**
```
transaction:"/api/hms/token"
```

**Find Errors by Severity:**
```
error_level:[error TO fatal]
```

**Find Performance Issues:**
```
transaction.duration:[1000 TO *]
```

---

## Performance Optimization

### Monitoring Query Performance

**Identify Slow Queries:**

```sql
-- Find slow queries (> 500ms)
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 500
ORDER BY mean_exec_time DESC;
```

**Optimize Strategy:**

1. Add indexes on frequently filtered columns
2. Use EXPLAIN ANALYZE to understand query plan
3. Consider denormalization for read-heavy tables
4. Implement caching for frequent queries

### Monitoring API Performance

**Track Slow Endpoints:**

```typescript
// Automatic via Sentry Performance Monitoring
// Review in Sentry → Discover → Slow Transactions
```

**Top Improvements:**

```
1. Implement response caching
   - Cache: JWT tokens (1 hour)
   - Cache: Session list (5 minutes)
   - Cache: User profile (10 minutes)

2. Optimize N+1 queries
   - Use JOINs instead of loops
   - Batch database queries

3. Move slow operations to background
   - Recording processing
   - Email sending
   - Heavy computations

4. Add pagination
   - Limit default results
   - Implement cursor-based pagination
```

### Monitoring Frontend Performance

**Track Web Vitals:**

```typescript
// Already implemented in app
// Sends to Sentry via lib/monitoring/web-vitals.ts

// Monitor in Sentry → Performance → Web Vitals
```

**Targets:**

```
FCP (First Contentful Paint): < 1.8s
LCP (Largest Contentful Paint): < 2.5s
CLS (Cumulative Layout Shift): < 0.1
FID (First Input Delay): < 100ms
```

---

## Incident Response

### Classification System

**P0 - Critical (Resolve in < 15 min)**
- Service completely down
- Data loss occurring
- Security breach

**P1 - Severe (Resolve in < 1 hour)**
- Feature unavailable for users
- High error rate (> 10%)
- Performance severely degraded

**P2 - High (Resolve in < 4 hours)**
- Feature partially working
- Elevated error rate (5-10%)
- Some users affected

**P3 - Medium (Resolve in < 24 hours)**
- Minor issue
- Low error rate (< 5%)
- Workaround available

**P4 - Low (Resolve in < 1 week)**
- Cosmetic issue
- No user impact
- Nice to have

### Incident Response Checklist

**Phase 1: Detect & Alert (Automatic)**

```
1. Alert triggers (error rate > threshold)
2. Sentry notification sent
3. Slack message posted
4. PagerDuty incident created (P0/P1)
5. Engineer paged (P0)
```

**Phase 2: Acknowledge (< 5 minutes)**

```
1. Engineer acknowledges incident
2. Joins Slack incident channel
3. Starts investigation
4. Communicates status
```

**Phase 3: Investigate (< 15 minutes)**

```
1. Check dashboard for pattern
2. Review recent deployments
3. Check error logs in Sentry
4. Check database health
5. Check HMS status
```

**Phase 4: Mitigate (< 30 minutes)**

```
Options:
A. Rollback deployment
B. Scale infrastructure
C. Enable feature flags
D. Manual intervention
E. Partial service degradation
```

**Phase 5: Resolve (Varies)**

```
1. Implement fix
2. Test in staging
3. Deploy to production
4. Monitor closely
5. Post-incident review
```

### Runbooks

**For Common Issues:**

1. **High Error Rate**
   - Check Sentry for error pattern
   - Check recent deployments
   - Rollback if needed
   - Review error logs

2. **Slow Response Time**
   - Check database performance
   - Check Redis usage
   - Check HMS status
   - Scale if needed

3. **Recording Failures**
   - Check HMS status page
   - Check S3 connectivity
   - Check webhook logs
   - Restart service if stuck

4. **Database Connection Pool Exhausted**
   - Check for idle connections
   - Kill long-running queries
   - Scale database
   - Update connection pool settings

---

## Monitoring Checklist

- [ ] Error rate monitoring configured
- [ ] Response time monitoring configured
- [ ] HMS usage tracking implemented
- [ ] Database performance monitoring active
- [ ] Infrastructure metrics being collected
- [ ] Rate limit monitoring configured
- [ ] Sentry dashboard created
- [ ] Vercel analytics reviewed
- [ ] Alert rules configured (all severity levels)
- [ ] Alert notification channels tested
- [ ] Structured logging implemented
- [ ] Log retention policies set
- [ ] Performance optimization plan documented
- [ ] Incident response procedures documented
- [ ] On-call rotation established

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-14 | Initial comprehensive monitoring guide |

---

**Last Updated:** November 14, 2025
**Maintained by:** DevOps Team
**Status:** Production Ready
