# Production Runbook

## Quick Reference

**Emergency Contacts:** See bottom of document
**Status Pages:** Supabase, Vercel, HMS links in Monitoring section

---

## Daily Operations

### Morning Checklist

- [ ] Check Sentry for overnight errors
- [ ] Review Vercel deployment logs
- [ ] Check database connection health
- [ ] Verify backup completed
- [ ] Review user signup/activity metrics
- [ ] Check HMS usage/costs

### Weekly Checklist

- [ ] Review error trends in Sentry
- [ ] Analyze slow queries
- [ ] Check storage usage
- [ ] Review API rate limits hit
- [ ] Update dependencies (if needed)
- [ ] Review user feedback/support tickets

### Monthly Checklist

- [ ] Cost review (all services)
- [ ] Security audit
- [ ] Backup restore test
- [ ] Performance benchmarks
- [ ] Update documentation
- [ ] Team retrospective

---

## Incident Response Matrix

| Severity | Response Time | Escalation | Examples |
|----------|--------------|------------|----------|
| P0 (Critical) | 15 minutes | Immediate | Site down, data breach, payment failure |
| P1 (High) | 1 hour | After 30 min | High error rate, slow performance |
| P2 (Medium) | 4 hours | After 2 hours | Feature broken, minor bugs |
| P3 (Low) | 1 day | After 1 day | UI issues, documentation |

---

## Common Scenarios

### 1. Site Down (P0)

**Detection:**
- Uptime monitor alert
- User reports
- Health check fails

**Immediate Response:**
```bash
# 1. Check Vercel status
curl -I https://kulti.app
# If 500/502/503 errors

# 2. Check Vercel dashboard
# Go to vercel.com/[project]/deployments
# Look for failed deployment

# 3. Quick rollback if needed
# In Vercel: Promote previous deployment

# 4. Check external services
# - Supabase: status.supabase.com
# - HMS: status.100ms.live
# - Vercel: status.vercel.com
```

**Investigation:**
1. Check Vercel logs for errors
2. Check Sentry for error spike
3. Check database connectivity
4. Review recent changes

**Resolution:**
- If deployment issue: Rollback
- If database issue: Check connections, restart if needed
- If external service: Wait for resolution or implement fallback

**Post-Incident:**
- Document what happened
- Create prevention measures
- Update monitoring
- Team debrief

---

### 2. High Error Rate (P1)

**Detection:**
- Sentry alert: >50 errors/hour
- User complaints
- Vercel logs show errors

**Diagnosis:**
```bash
# Check Sentry dashboard
# - What's the most common error?
# - When did it start?
# - What changed recently?

# Check recent deployments
git log --oneline -10

# Check database
# In Supabase: Logs > Database
```

**Common Causes:**

**API Errors:**
```typescript
// Check rate limiting
// Check authentication
// Check input validation
```

**Database Errors:**
```sql
-- Check for connection issues
SELECT count(*) FROM pg_stat_activity;

-- Check for long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;
```

**HMS Errors:**
```typescript
// Check token generation
// Check HMS credentials
// Check room creation
```

**Resolution:**
1. Identify error source
2. Quick fix if possible
3. Deploy hotfix
4. Monitor error rate drop
5. Document fix

---

### 3. Database Connection Issues (P0/P1)

**Symptoms:**
- "Too many connections" errors
- Timeouts
- Slow queries

**Immediate Actions:**
```sql
-- Check active connections
SELECT count(*) as connections,
       state,
       wait_event_type
FROM pg_stat_activity
GROUP BY state, wait_event_type;

-- Kill idle connections if needed
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '1 hour';
```

**Diagnosis:**
```sql
-- Check connection pool size
SELECT setting::int
FROM pg_settings
WHERE name = 'max_connections';

-- Check who's using connections
SELECT usename, application_name, count(*)
FROM pg_stat_activity
GROUP BY usename, application_name;
```

**Resolution:**
1. Close idle connections
2. Restart application if needed
3. Optimize connection pooling
4. Consider upgrading Supabase plan

**Prevention:**
- Implement connection pooling properly
- Set connection timeouts
- Monitor connection usage
- Add alerts for high connection count

---

### 4. HMS Video Issues (P1)

**Symptoms:**
- Users can't join sessions
- Black screen
- No audio/video
- High latency

**Diagnosis:**
```typescript
// Check HMS dashboard
// - Active rooms
// - Error logs
// - Bandwidth usage

// Check token generation
const token = await generateHMSToken(userId, roomId)
console.log('Token generated:', token)

// Check room existence
const room = await getHMSRoom(roomId)
console.log('Room status:', room.active)
```

**Common Issues:**

**Token Expired:**
```typescript
// Verify token expiration
jwt.verify(token, HMS_APP_SECRET)

// Generate new token
const newToken = await generateHMSToken(userId, roomId)
```

**Room Not Found:**
```typescript
// Check database for HMS room ID
const session = await supabase
  .from('sessions')
  .select('hms_room_id')
  .eq('id', sessionId)
  .single()

// Create room if missing
if (!session.hms_room_id) {
  const room = await createHMSRoom()
  // Update database
}
```

**Network Issues:**
- Check HMS status page
- Test from different network
- Check firewall rules
- Verify TURN/STUN servers

**Resolution:**
1. Identify specific issue
2. Implement fix
3. Test with real users
4. Monitor HMS metrics

---

### 5. Credit System Issues (P1)

**Symptoms:**
- Users can't create sessions
- Incorrect balances
- Failed transactions

**Diagnosis:**
```sql
-- Check recent transactions
SELECT * FROM credit_transactions
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Check user balances
SELECT u.username, c.balance, c.updated_at
FROM users u
JOIN credits c ON u.id = c.user_id
WHERE c.balance < 0 OR c.balance > 10000;

-- Check for duplicate transactions
SELECT user_id, amount, reason, count(*)
FROM credit_transactions
WHERE created_at > now() - interval '1 day'
GROUP BY user_id, amount, reason
HAVING count(*) > 1;
```

**Common Issues:**

**Negative Balance:**
```sql
-- Find affected users
SELECT * FROM credits WHERE balance < 0;

-- Manual correction if needed
UPDATE credits
SET balance = 0
WHERE balance < 0 AND user_id = 'specific_user_id';
```

**Transaction Failed:**
```sql
-- Check failed transactions
SELECT * FROM credit_transactions
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Retry if needed
```

**Duplicate Charges:**
```sql
-- Refund duplicate
INSERT INTO credit_transactions (
  user_id, amount, type, reason
) VALUES (
  'user_id', 50, 'credit', 'Refund for duplicate charge'
);
```

**Resolution:**
1. Identify issue
2. Manual correction if needed
3. Fix underlying code issue
4. Monitor transactions

---

### 6. Authentication Issues (P0)

**Symptoms:**
- Users can't log in
- OTP not sent
- Session expired immediately

**Diagnosis:**
```typescript
// Check Supabase Auth logs
// Dashboard > Authentication > Logs

// Check OTP delivery
// Verify phone number format
// Check rate limiting

// Check session management
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
```

**Common Issues:**

**OTP Not Sent:**
```typescript
// Check Supabase auth settings
// Dashboard > Authentication > Settings
// - Enable phone auth
// - Configure phone provider
// - Check rate limits
```

**Invalid Phone Number:**
```typescript
// Verify format: +1XXXXXXXXXX
const phoneRegex = /^\+1[0-9]{10}$/
if (!phoneRegex.test(phone)) {
  throw new Error('Invalid phone format')
}
```

**Session Expired:**
```typescript
// Check token expiration
// Default: 1 hour access token

// Implement token refresh
const { data, error } = await supabase.auth.refreshSession()
```

**Resolution:**
1. Verify Supabase auth configuration
2. Check rate limiting
3. Test auth flow end-to-end
4. Monitor success rate

---

### 7. Recording Failures (P2)

**Symptoms:**
- Recording not starting
- Stuck in "processing"
- No recording URL after completion

**Diagnosis:**
```sql
-- Check recent recordings
SELECT * FROM recordings
WHERE created_at > now() - interval '1 day'
ORDER BY created_at DESC;

-- Check stuck recordings
SELECT * FROM recordings
WHERE status = 'processing'
  AND created_at < now() - interval '1 hour';

-- Check failed recordings
SELECT * FROM recordings
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

**Common Issues:**

**Recording Won't Start:**
```typescript
// Check HMS recording API
const response = await fetch(`https://api.100ms.live/v2/recordings/room/${roomId}/start`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${HMS_APP_ACCESS_KEY}`
  }
})

// Check response
if (!response.ok) {
  const error = await response.json()
  console.error('HMS recording error:', error)
}
```

**Stuck in Processing:**
```sql
-- Check HMS webhook logs
SELECT * FROM webhook_logs
WHERE event_type LIKE 'recording.%'
  AND created_at > now() - interval '1 day'
ORDER BY created_at DESC;

-- Manually check HMS dashboard
-- Recordings > Status
```

**No Recording URL:**
```typescript
// Check webhook received
// Check database update

// Manually get recording from HMS
const recording = await getHMSRecording(recordingId)
if (recording.status === 'completed') {
  // Update database
  await supabase
    .from('recordings')
    .update({
      status: 'completed',
      recording_url: recording.url
    })
    .eq('hms_recording_id', recordingId)
}
```

**Resolution:**
1. Check HMS dashboard
2. Verify webhook delivery
3. Manual update if needed
4. Contact HMS support if persistent

---

### 8. Performance Degradation (P1)

**Symptoms:**
- Slow page loads
- API timeouts
- User complaints about lag

**Diagnosis:**
```bash
# Check Vercel analytics
# Go to vercel.com/[project]/analytics

# Check Lighthouse score
lighthouse https://kulti.app --output html

# Check slow queries
# In Supabase: Database > Performance
```

**Common Bottlenecks:**

**Slow Database Queries:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add indexes if needed
CREATE INDEX idx_name ON table_name (column_name);
```

**Large Bundle Size:**
```bash
# Check bundle size
npm run build

# Analyze
npm install -g webpack-bundle-analyzer
```

**Unoptimized Images:**
```typescript
// Use Next.js Image component
import Image from 'next/image'

<Image
  src="/path/to/image.jpg"
  width={500}
  height={300}
  alt="Description"
/>
```

**Resolution:**
1. Identify bottleneck
2. Optimize (add indexes, cache, etc.)
3. Test improvement
4. Monitor metrics

---

## Monitoring Dashboards

### Sentry
**URL:** sentry.io/organizations/[org]/projects/kulti/
**Check:**
- Error count trend
- Most common errors
- Affected users
- Release health

### Vercel
**URL:** vercel.com/[account]/[project]/analytics
**Check:**
- Response times
- Error rates
- Traffic patterns
- Function durations

### Supabase
**URL:** app.supabase.com/project/[ref]
**Check:**
- Database CPU usage
- Active connections
- Storage usage
- API requests

### HMS
**URL:** dashboard.100ms.live
**Check:**
- Active rooms
- Concurrent users
- Recording status
- Bandwidth usage

---

## Service Status Pages

- **Supabase:** status.supabase.com
- **Vercel:** status.vercel.com
- **HMS:** status.100ms.live
- **Anthropic:** status.anthropic.com

---

## Useful SQL Queries

### User Statistics

```sql
-- Total users
SELECT COUNT(*) as total_users FROM users;

-- New users today
SELECT COUNT(*) as new_users_today
FROM users
WHERE created_at >= CURRENT_DATE;

-- Active users (last 7 days)
SELECT COUNT(DISTINCT user_id) as active_users
FROM session_participants
WHERE created_at > now() - interval '7 days';
```

### Session Statistics

```sql
-- Total sessions
SELECT COUNT(*) as total_sessions FROM sessions;

-- Active sessions
SELECT COUNT(*) as active_sessions
FROM sessions
WHERE status = 'active';

-- Sessions today
SELECT COUNT(*) as sessions_today
FROM sessions
WHERE created_at >= CURRENT_DATE;

-- Average session duration
SELECT AVG(EXTRACT(EPOCH FROM (ended_at - created_at))/60) as avg_duration_minutes
FROM sessions
WHERE ended_at IS NOT NULL;
```

### Credit Statistics

```sql
-- Total credits in system
SELECT SUM(balance) as total_credits FROM credits;

-- Credits distributed today
SELECT SUM(amount) as credits_today
FROM credit_transactions
WHERE type = 'credit'
  AND created_at >= CURRENT_DATE;

-- Top users by credits
SELECT u.username, c.balance
FROM users u
JOIN credits c ON u.id = c.user_id
ORDER BY c.balance DESC
LIMIT 10;
```

### Recording Statistics

```sql
-- Total recordings
SELECT COUNT(*) as total_recordings FROM recordings;

-- Recordings by status
SELECT status, COUNT(*) as count
FROM recordings
GROUP BY status;

-- Failed recordings (last 24h)
SELECT * FROM recordings
WHERE status = 'failed'
  AND created_at > now() - interval '1 day';

-- Total storage used (estimate)
SELECT SUM(
  CAST(metadata->>'size' AS BIGINT)
) / (1024*1024*1024) as total_gb
FROM recordings
WHERE metadata->>'size' IS NOT NULL;
```

---

## Emergency Contacts

### Internal Team

**On-Call Engineer:**
- Name: [Your Name]
- Phone: [Phone Number]
- Email: [Email]
- Hours: 24/7

**DevOps Lead:**
- Name: [Name]
- Phone: [Phone Number]
- Email: [Email]
- Escalation: After 30 minutes

**CTO:**
- Name: [Name]
- Phone: [Phone Number]
- Email: [Email]
- Escalation: Critical issues only

### External Support

**Supabase:**
- Support: support@supabase.io
- Dashboard: app.supabase.com/support
- Status: status.supabase.com

**Vercel:**
- Support: vercel.com/support
- Dashboard: vercel.com/dashboard
- Status: status.vercel.com

**100ms (HMS):**
- Support: support@100ms.live
- Dashboard: dashboard.100ms.live
- Docs: docs.100ms.live

**Sentry:**
- Support: support@sentry.io
- Status: status.sentry.io

---

## Escalation Procedures

### Minor Issue (P3)
- Handle during business hours
- Document in ticket system
- Fix in next sprint

### Medium Issue (P2)
- Start investigation within 4 hours
- Escalate if unresolved in 2 hours
- Fix within 24 hours

### High Priority (P1)
- Start investigation within 1 hour
- Escalate if unresolved in 30 minutes
- Fix within 4 hours
- Post-incident review required

### Critical (P0)
- All hands on deck
- Immediate escalation
- Fix immediately
- External communication required
- Full post-mortem required

---

## Tools & Access

### Required Tools
- `psql` - PostgreSQL client
- `curl` - API testing
- `jq` - JSON parsing
- `git` - Version control
- Vercel CLI
- Supabase CLI

### Access Required
- Vercel account (admin)
- Supabase project (owner)
- HMS dashboard (admin)
- Sentry project (admin)
- GitHub repository (write)

---

Last Updated: 2025-01-16
Version: 1.0
