# Monitoring & Error Tracking Setup Guide

## Overview

Kulti uses Sentry for production error tracking, performance monitoring, and user session replay. This guide covers setup, configuration, and daily operations.

---

## Initial Setup

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Create an account or sign in
3. Create a new project:
   - Platform: **Next.js**
   - Project name: **kulti**
   - Set alert frequency

### 2. Get DSN (Data Source Name)

After creating the project:
1. Navigate to **Settings > Projects > kulti > Client Keys (DSN)**
2. Copy the DSN URL (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 3. Configure Environment Variables

Add to your `.env.production` file:

```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

The SDK is already installed and configured in:
- `/sentry.client.config.ts` - Browser/client-side
- `/sentry.server.config.ts` - Server-side (API routes)
- `/sentry.edge.config.ts` - Edge runtime (middleware)

---

## Accessing the Dashboard

### Sentry Dashboard
- URL: `https://sentry.io/organizations/your-org/projects/kulti/`
- View errors, performance, and replays

### Key Sections

1. **Issues** - All captured errors
2. **Performance** - API response times, page loads
3. **Replays** - Session recordings when errors occur
4. **Alerts** - Email notifications for critical errors

---

## Setting Up Alerts

### Critical Error Alert

1. Go to **Alerts > Create Alert Rule**
2. Choose **Issues**
3. Configure:
   ```
   When: An issue is first seen
   Then: Send notification to: [your-email]
   ```

### High Error Rate Alert

1. Create new alert
2. Choose **Issues**
3. Configure:
   ```
   When: Number of events > 50 in 1 hour
   Then: Send notification to: [your-email]
   ```

### Performance Degradation Alert

1. Create new alert
2. Choose **Performance**
3. Configure:
   ```
   When: P95 response time > 3000ms
   Then: Send notification to: [your-email]
   ```

### Recommended Alerts

- First seen issue (immediate)
- Error spike (>50 errors/hour)
- Performance degradation (P95 > 3s)
- HMS connection failures (custom)
- Credit system failures (custom)

---

## Monitoring Checklist

### Daily Operations

- [ ] Check Sentry dashboard for new issues
- [ ] Review error trends (increasing/decreasing)
- [ ] Monitor performance metrics
- [ ] Check for user-reported issues matching Sentry errors

### Weekly Review

- [ ] Analyze most common errors
- [ ] Review slow API endpoints
- [ ] Check HMS connection success rate
- [ ] Review session replay for UX issues
- [ ] Update error filters if needed

### Monthly Review

- [ ] Analyze error trends over time
- [ ] Review performance improvements
- [ ] Update alert thresholds
- [ ] Clean up resolved issues
- [ ] Review Sentry quota usage

---

## Key Metrics to Monitor

### Error Tracking

- **Total Errors**: Should remain low and stable
- **Unique Issues**: Track new vs recurring errors
- **Error Rate**: Errors per user session
- **Affected Users**: Number of users experiencing errors

### Performance Monitoring

- **Page Load Time**: Target < 2s (P95)
- **API Response Time**: Target < 500ms (P95)
- **HMS Connection Time**: Target < 3s (P95)
- **Database Query Time**: Target < 100ms (P95)

### HMS Specific Metrics

- Connection success rate: Target > 99%
- Video quality issues: Track bitrate, jitter, packet loss
- Recording failures: Should be < 1%
- Token refresh failures: Should be 0%

### Critical Errors to Watch

1. **Authentication failures**
   - Path: `lib/auth/*`
   - Alert threshold: > 10/hour

2. **Credit system errors**
   - Path: `lib/credits/*`
   - Alert threshold: Any error (critical)

3. **HMS connection failures**
   - Path: `components/session/*`
   - Alert threshold: > 5% failure rate

4. **Database errors**
   - Path: `lib/supabase/*`
   - Alert threshold: > 5/hour

5. **Webhook processing failures**
   - Path: `app/api/webhooks/*`
   - Alert threshold: > 2% failure rate

---

## Debugging with Sentry

### Reading Error Reports

Each error includes:
- **Error message**: What went wrong
- **Stack trace**: Where it happened
- **Breadcrumbs**: User actions leading to error
- **User context**: Who experienced it
- **Environment**: Browser, OS, app version

### Using Breadcrumbs

Breadcrumbs show user actions before error:
```
1. User logged in
2. Navigated to /dashboard
3. Created new session
4. HMS connection initiated
5. ERROR: Failed to get user media
```

### Session Replay

- Available for errors in production
- Shows actual user screen recording
- Masked sensitive text/media
- Shows clicks, navigation, console logs

### Common Error Patterns

**HMS Connection Failures**
- Check: Browser permissions
- Check: Network connectivity
- Check: HMS token validity

**Credit System Errors**
- Check: Database connection
- Check: Credit balance calculation
- Check: Transaction atomicity

**Authentication Errors**
- Check: Supabase connection
- Check: Token expiration
- Check: RLS policies

---

## Integration with Logger

The app's logger automatically sends to Sentry:

```typescript
import { logger } from "@/lib/logger"

// Automatically sent to Sentry
logger.error("Failed to create session", { error, userId })

// Sent as warning to Sentry
logger.warn("Slow database query", { queryTime, query })

// Creates breadcrumb in Sentry
logger.info("User started session", { sessionId })
```

---

## Performance Monitoring

### Tracking API Calls

```typescript
import { measureApiCall } from "@/lib/monitoring/performance"

const data = await measureApiCall("/api/sessions", async () => {
  return fetch("/api/sessions").then(r => r.json())
})
```

### Tracking HMS Connections

```typescript
import { measureHMSConnection } from "@/lib/monitoring/performance"

const tracker = measureHMSConnection(roomId)

try {
  await hmsActions.join({ userName, authToken })
  tracker.success()
} catch (error) {
  tracker.fail(error)
}
```

### Tracking Video Quality

```typescript
import { trackVideoQuality } from "@/lib/monitoring/performance"

trackVideoQuality({
  roomId,
  bitrate: 2500,
  packetsLost: 10,
  jitter: 20,
  resolution: "720p"
})
```

---

## Troubleshooting

### No Data in Sentry

1. Check `NEXT_PUBLIC_SENTRY_DSN` is set
2. Verify Sentry config files exist
3. Check browser console for Sentry errors
4. Test with manual error: `throw new Error("Test")`

### Too Many Events

1. Review and filter noisy errors
2. Adjust sampling rates in `lib/monitoring/sentry.ts`
3. Add errors to `ignoreErrors` list

### Missing Breadcrumbs

1. Ensure logger is imported from `@/lib/logger`
2. Check Sentry is initialized before logging
3. Verify DSN is set correctly

### Session Replay Not Working

1. Check Sentry plan includes replays
2. Verify `replaysSessionSampleRate` is > 0
3. Check browser privacy settings

---

## Cost Optimization

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 replays/month

### Staying Within Limits

1. **Reduce sampling rates**:
   ```typescript
   tracesSampleRate: 0.1 // 10% of transactions
   replaysSessionSampleRate: 0.1 // 10% of sessions
   ```

2. **Filter non-critical errors**:
   ```typescript
   ignoreErrors: [
     "NetworkError",
     "Failed to fetch"
   ]
   ```

3. **Rate limit by user**:
   - Track errors per user
   - Skip Sentry for repeat offenders

### Upgrading

If exceeding free tier:
- **Team Plan**: $26/month for 50K errors
- **Business Plan**: $80/month for 100K errors

---

## Production Runbook

### Critical Error Response

1. **Receive alert** → Check Sentry immediately
2. **Assess impact** → How many users affected?
3. **Identify cause** → Review stack trace and breadcrumbs
4. **Quick fix if possible** → Deploy hotfix
5. **Monitor resolution** → Watch error rate drop
6. **Post-mortem** → Document and prevent recurrence

### HMS Connection Issues Spike

1. Check HMS dashboard for outages
2. Review recent code changes to HMS integration
3. Check browser console errors
4. Test connection from multiple devices/networks
5. Contact HMS support if needed

### Database Error Spike

1. Check Supabase dashboard for outages
2. Review slow query logs
3. Check connection pool exhaustion
4. Verify RLS policies not blocking queries
5. Consider adding indexes

### Credit System Errors

1. **Stop transactions** → Prevent data corruption
2. Check database consistency
3. Review recent credit transactions
4. Verify balance calculations
5. Resume after verification

---

## Support Contacts

- **Sentry Support**: support@sentry.io
- **HMS Support**: support@100ms.live
- **Supabase Support**: support@supabase.io
- **Internal Escalation**: [Your team contact]

---

## Next Steps

1. Create Sentry account
2. Add DSN to environment variables
3. Deploy to production
4. Set up alerts
5. Monitor for 24 hours
6. Adjust sampling/filtering as needed

---

Last Updated: 2025-01-16
