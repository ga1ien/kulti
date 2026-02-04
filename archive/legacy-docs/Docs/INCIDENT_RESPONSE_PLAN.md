# Kulti Incident Response Plan

**Version:** 1.0
**Effective Date:** December 2025
**Last Updated:** November 2025

---

## Executive Summary

This document outlines Kulti's incident response procedures, severity levels, escalation paths, and response protocols. It ensures consistent, rapid response to production incidents while minimizing user impact and data loss.

**Key Contacts:**
- Incident Commander: [TBD]
- On-Call Engineer: [TBD]
- On-Call Manager: [TBD]
- Executive Escalation: [TBD]

---

## Part A: Incident Severity Levels

### P0 (Critical) - Complete Outage / Data Loss

**Definition:** Service entirely unavailable or user data at risk

**Characteristics:**
- All users affected
- Core features completely broken
- Data loss or corruption detected
- Security breach confirmed
- Regulatory compliance at risk
- Multiple service dependencies failed

**Examples:**
- All authentication fails (no users can login)
- Database offline (no data accessible)
- All sessions unable to start/connect
- Recording system loses customer data
- Security exploit actively exploited
- Complete Vercel infrastructure failure

**Impact:**
- Revenue impact: Severe
- Users affected: 100%
- Services affected: All
- Est. user cost: High

**Response SLA:** < 5 minutes
**Resolution SLA:** < 1 hour target

**Actions:**
- [ ] Immediate response required
- [ ] All hands on deck
- [ ] Executive notification mandatory
- [ ] Status page critical alert
- [ ] Consider rollback immediately
- [ ] Activate war room

---

### P1 (High) - Major Feature Broken / Security Risk

**Definition:** Major feature unavailable or security vulnerability exposed

**Characteristics:**
- Significant user base affected (> 10%)
- Critical feature broken
- Potential security issue
- Performance severely degraded
- Multiple errors for common actions
- Workaround exists but complex

**Examples:**
- Video streaming fails for most users
- Screen sharing broken
- Session creation fails (>5% failure rate)
- Authentication has security vulnerability
- Chat messages not delivering (> 10% loss)
- Recording fails for most sessions
- Database queries taking > 30 seconds

**Impact:**
- Revenue impact: Significant
- Users affected: 10-100%
- Services affected: Multiple
- Est. user cost: Moderate

**Response SLA:** < 15 minutes
**Resolution SLA:** < 4 hours target

**Actions:**
- [ ] Respond immediately
- [ ] Form incident team
- [ ] Notify engineering leadership
- [ ] Update status page
- [ ] Gather detailed metrics
- [ ] Plan rollback if needed

---

### P2 (Medium) - Feature Degraded / Workaround Exists

**Definition:** Feature partially broken with significant impact but with workaround

**Characteristics:**
- Specific user segment affected
- Non-critical feature broken
- Performance degraded (but usable)
- Error rate elevated (2-10%)
- Workaround available
- High user frustration expected

**Examples:**
- Screen sharing has occasional lag
- Session creation fails for < 5% of attempts
- Chat occasional message loss
- Login takes > 10 seconds
- Recording quality degraded
- Some user profiles not loading
- Performance > 2s for some endpoints

**Impact:**
- Revenue impact: Moderate
- Users affected: 1-10%
- Services affected: Single
- Est. user cost: Low

**Response SLA:** < 1 hour
**Resolution SLA:** < 24 hours target

**Actions:**
- [ ] Respond within 1 hour
- [ ] Assign owner/investigator
- [ ] Document workaround
- [ ] Update status page (if needed)
- [ ] Communicate workaround to affected users
- [ ] Plan fix for next deployment

---

### P3 (Low) - Cosmetic / Non-Impact

**Definition:** Minor issue with minimal user impact

**Characteristics:**
- No functional impact
- Cosmetic/UI issues
- Single user affected
- Documentation error
- No performance impact
- Not reproducible

**Examples:**
- Button styling incorrect
- Typo in UI
- Help page outdated
- Non-critical feature missing
- Isolated user-specific issue
- Minor layout shift

**Impact:**
- Revenue impact: None
- Users affected: 1 or unknown
- Services affected: None
- Est. user cost: None

**Response SLA:** No SLA
**Resolution SLA:** Backlog (next sprint)

**Actions:**
- [ ] Log issue in tracking system
- [ ] Schedule for next release
- [ ] Inform user if reported
- [ ] No immediate response needed

---

## Part B: Response Procedures by Severity

### P0 Response Procedure

**Timeline:** First hour after detection

**Minute 0-2: Initial Assessment**
```
1. On-call engineer receives alert
2. Confirm incident is real (not false alarm)
3. Assess severity - is this P0?
4. Document: What? When? Scope?
```

**Minute 2-5: Escalation**
```
1. Immediately notify Incident Commander
2. Notify on-call manager
3. Page executive if needed
4. Create incident Slack channel
5. Start incident timeline documentation
```

**Minute 5-15: War Room Activation**
```
1. Incident Commander calls war room
   - Conference bridge: [Number]
   - Slack channel: #incident-response
   - Status page: Start updates

2. Participants:
   - Incident Commander (lead)
   - On-call engineer (technical)
   - On-call manager (escalation)
   - Communication lead (external)
   - Database admin (if data-related)
   - Each service owner

3. Initial briefing:
   - What is happening?
   - How many users affected?
   - What's the impact?
   - Initial hypotheses?
   - Actions in progress?
```

**Minute 15-30: Investigation + Fix Attempt**
```
1. Parallel investigation:
   - Check error logs (Sentry)
   - Check system metrics
   - Check recent deployments
   - Review service status pages

2. Root cause hypothesis:
   - Recent code change?
   - External service down?
   - Infrastructure issue?
   - Database issue?
   - Configuration error?

3. Fix attempts:
   - Can we fix in-place? (< 10 minutes)
   - If no: Prepare rollback
   - If yes: Implement with extreme caution

4. Decision point:
   - Fix available and safe? → Implement
   - Unclear? → Rollback
   - High risk? → Rollback
```

**Minute 30-60: Resolution**
```
1. Monitor fix/rollback
2. Verify service restored
3. Run smoke tests
4. Check error rates return to normal
5. Confirm all systems operational

6. Status updates:
   - Update status page: "Investigating" → "Monitoring"
   - Notify users service restored
   - Document timeline
```

**Post-Incident (within 24 hours):**
```
1. Schedule postmortem
2. Assign action items
3. Update monitoring/alerting
4. Brief team on prevention
5. Document lessons learned
```

---

### P1 Response Procedure

**Timeline:** First 2 hours after detection

**0-5 minutes: Assessment**
```
1. Confirm incident is P1
2. Determine scope (how many affected)
3. Notify Incident Commander
4. Assign incident responder
5. Document initial details
```

**5-15 minutes: Investigation**
```
1. Investigate in parallel:
   - Error logs
   - System metrics
   - User reports
   - Service status

2. Establish root cause hypothesis
3. Determine if rollback needed
4. Check for quick fix available
```

**15-30 minutes: Resolution Attempt**
```
1. If fix available:
   - Implement with caution
   - Monitor results
   - Verify fix effective

2. If no fix:
   - Prepare rollback
   - Execute rollback
   - Verify service restored

3. If investigation ongoing:
   - Implement workaround if possible
   - Communicate workaround to users
   - Continue investigation

4. Status updates:
   - Post status page update
   - Notify affected users
   - Update team
```

**30-60 minutes: Verify Resolution**
```
1. Monitor key metrics
2. Verify error rate improving
3. Confirm affected feature working
4. Check user reports ceasing
5. Begin normal monitoring

6. If not resolved:
   - Escalate to P0 procedures
   - Consider additional resources
   - Update timeline
```

---

### P2 Response Procedure

**Timeline:** First 4 hours after detection

**0-15 minutes: Report & Assignment**
```
1. Incident reported (by monitoring or user)
2. Confirm this is P2 (not P1)
3. Assign owner/investigator
4. Document issue with details
5. Update tracking system
```

**15-60 minutes: Investigation**
```
1. Owner investigates:
   - Review error logs
   - Identify pattern
   - Determine root cause
   - Estimate fix complexity

2. Workaround identification:
   - Is workaround available?
   - Document workaround
   - Communicate to affected users

3. Fix planning:
   - Can fix in current version?
   - Or needs next deployment?
   - What's the timeline?
```

**1-4 hours: Fix Implementation**
```
1. If quick fix available:
   - Implement and test
   - Deploy if necessary
   - Verify fix effective

2. If no quick fix:
   - Plan for next deployment
   - Continue monitoring
   - Support users with workaround

3. Status updates:
   - Keep status page informed
   - Update users with status
   - Document progress
```

---

### P3 Response Procedure

**No immediate response required**

**Logging:**
```
1. Create issue in tracking system
2. Assign low priority
3. Include in next sprint planning
4. Inform reporter if user-reported
```

---

## Part C: Incident Workflow

### Step 1: Detection and Alerting

**Automated Detection:**
- Sentry error tracking (5%+ error rate)
- Vercel uptime monitoring
- Custom dashboards (alert thresholds)
- 100ms service status
- Database performance alerts
- User reports via support

**Alert Channels:**
- PagerDuty (SMS/push)
- Slack: #alerts channel
- Email: oncall@kulti.club

**Alert Acknowledge:**
```
1. Engineer receives alert
2. Clicks "Acknowledge" in PagerDuty
3. Begins initial investigation
4. Updates Slack with status
```

---

### Step 2: Initial Assessment

**What to Determine:**
```
1. Is this a real incident? (confirm, not false alarm)
2. What is affected?
   - Which service/feature?
   - How many users?
   - What geographic region?

3. When did it start?
   - Exact time of first alert
   - When last working?
   - Ongoing or resolved?

4. What is the impact?
   - Users unable to do task X
   - Data being lost?
   - Security issue?
   - Performance degraded?

5. What's the severity?
   - P0: Complete outage
   - P1: Major feature broken
   - P2: Feature degraded
   - P3: Cosmetic issue
```

**Assessment Template:**
```
INCIDENT ASSESSMENT
===================
Severity: [P0/P1/P2/P3]
Service: [service affected]
Start Time: [UTC timestamp]
Duration: [if resolved]
Status: [investigating/resolving/resolved]

Scope:
- Users affected: [number or percentage]
- Features affected: [list]
- Geographic impact: [regions]

Description:
[What is happening in 2-3 sentences]

Initial Hypothesis:
[Suspected root cause]

Evidence:
[Error logs, metrics, etc.]
```

---

### Step 3: Escalation Paths

**P0 Escalation (Immediate):**
```
On-call Engineer (first response)
     ↓
Incident Commander (< 2 min)
     ↓
On-call Manager (< 5 min)
     ↓
VP Engineering (< 15 min)
     ↓
CTO/Founder (if not improving by 30 min)
```

**P1 Escalation (Within 15 minutes):**
```
On-call Engineer (first response)
     ↓
Incident Commander (< 5 min)
     ↓
On-call Manager (< 15 min)
     ↓
VP Engineering (< 30 min if not resolved)
```

**P2 Escalation (Within 1 hour):**
```
On-call Engineer (first response)
     ↓
Incident Commander (< 30 min)
     ↓
No urgent escalation unless P1/P0
```

**Escalation Contacts:**
```
Incident Commander: [Name] - [Phone]
On-call Manager: [Name] - [Phone]
VP Engineering: [Name] - [Phone]
CTO: [Name] - [Phone]
Database Admin: [Name] - [Phone]
Sentry Owner: [Name] - [Phone]
100ms Contact: [Support portal or PM contact]
Supabase Contact: [Support portal or PM contact]
```

---

### Step 4: Communication Protocol

**During Incident:**
```
Update Frequency:
- P0: Every 5 minutes
- P1: Every 15 minutes
- P2: Every 30 minutes

Update Channels:
- Internal: Slack #incident-response
- External: Status page + email
- Leadership: Direct Slack/call

Update Content:
- Current status
- Latest findings
- Actions in progress
- ETA for resolution
```

**Internal Communication (Slack #incident-response):**
```
Format:
[HH:MM UTC] Status update: [brief summary]
- Current status: [investigating/monitoring/resolved]
- User impact: [X users affected]
- Actions: [what we're doing now]
- ETA: [expected resolution time]
```

**External Communication (Status Page):**
```
Initial (< 5 min):
Title: [Brief description]
Status: Investigating
Message: We are aware of an issue affecting [service].
We are investigating and will provide updates every 15 minutes.

Ongoing (every 15-30 min):
Update: We have identified [finding] and are working on [solution].
ETA: [Expected resolution time]

Resolution:
Status: Resolved
Message: Issue has been resolved. All systems operational.
Cause: [Brief explanation]
Timeline: Issue from [time] to [time] (X minutes)
```

**User Notification (if widespread):**
```
Email to affected users:
Subject: Service Issue Alert - Kulti

We are aware that [feature] is currently unavailable.
We are actively working to resolve this issue.

Current status: [description]
Affected users: [scope]
Expected resolution: [time estimate]

We apologize for the disruption.
For updates: status.kulti.club

The Kulti Team
```

---

### Step 5: Resolution Steps

**Common Resolution Paths:**

**Path A: Quick Fix (< 15 minutes)**
```
1. Root cause identified
2. Fix coded and tested locally
3. Deploy to production
4. Verify fix effective
5. Monitor for 30 minutes
6. Close incident
```

**Path B: Rollback (< 20 minutes)**
```
1. Recent deployment identified as cause
2. Rollback initiated
3. Previous version deployed
4. Services verified operational
5. Monitor for 1 hour
6. Investigation continues for proper fix
7. Plan re-deployment
```

**Path C: Configuration Change (< 10 minutes)**
```
1. Configuration issue identified
2. Fix applied (env vars, feature flags, etc.)
3. Services restarted if needed
4. Verify fix effective
5. Monitor for stability
6. Document configuration change
```

**Path D: External Service (variable)**
```
1. Third-party service identified as cause
   - 100ms HMS
   - Supabase
   - Vercel
   - Twilio
   - Anthropic

2. Check their status page
3. Report issue to support if needed
4. Implement workaround or rollback
5. Wait for service recovery
6. Monitor for full resolution
```

**Path E: Long Investigation**
```
1. Cause not immediately apparent
2. Root cause investigation ongoing
3. Workaround implemented (if possible)
4. Communicate timeline to users
5. Continue investigation
6. Deploy fix when ready
7. Monitor thoroughly before closing
```

---

### Step 6: Post-Mortem Process

**Timing:** Schedule within 24 hours of incident

**Participants:**
- Incident Commander
- All responders involved
- Service owners
- Engineering leadership
- Product manager (if user-impacting)

**Duration:** 30-60 minutes

**Agenda:**
```
1. Timeline Review (10 min)
   - When detected
   - Actions taken
   - When resolved
   - Total duration

2. Root Cause Analysis (15 min)
   - What went wrong
   - Why it happened
   - Contributing factors

3. Impact Analysis (5 min)
   - Users affected
   - Duration of impact
   - Data impact (if any)
   - Business impact

4. Lessons Learned (10 min)
   - What went well
   - What could improve
   - Prevention strategies

5. Action Items (10 min)
   - Specific improvements
   - Owner assignment
   - Timeline
   - Priority level
```

**Post-Mortem Template:**
```markdown
# Incident Post-Mortem

## Incident Details
- ID: [INC-001]
- Severity: [P0/P1/P2]
- Start: [Time UTC]
- End: [Time UTC]
- Duration: [X minutes]

## Timeline
[Detailed timeline of events and actions]

## Root Cause
[What actually caused the incident]

## Impact
- Users affected: [X or X%]
- Features affected: [list]
- Duration: [X minutes]
- Data lost: [yes/no]

## What Went Well
- [Good response action]
- [Effective team coordination]

## What Didn't Go Well
- [Slow detection]
- [Unclear communication]

## Action Items
1. [ ] [Action] - Owner: [Name] - Due: [Date]
2. [ ] [Action] - Owner: [Name] - Due: [Date]

## Prevention
How do we prevent this in the future?
```

---

## Part D: On-Call Procedures

### On-Call Rotation

**Rotation:**
- On-Call Engineer: 1 week rotations
- Standby Engineer: Available for escalation
- On-Call Manager: Rotates with engineering
- Incident Commander: On-demand (multiple people trained)

**Handoff Process:**
```
1. Outgoing on-call schedules handoff call (30 min)
2. Review current issues
3. Review recent incidents
4. Walk through runbooks
5. Verify alerting working
6. Confirm contact info updated
7. Acknowledge transfer of on-call status
```

**On-Call Responsibilities:**
```
- Available 24/7 within 5 minutes of alert
- Alert acknowledgment within 2 minutes
- Initial investigation started within 5 minutes
- Communication updates as specified
- Document incident details
- Follow escalation procedures
- Participate in post-mortem
```

---

### Alert Acknowledgment

**Process:**
```
1. Alert received (PagerDuty, Slack, SMS)
2. Engineer receives notification
3. Acknowledges in PagerDuty (< 2 minutes)
4. Responds in Slack #incident-response
5. Begins investigation immediately
```

**Acknowledgment Message:**
```
In Slack #incident-response:
"[Name] acknowledged [Alert] at [time UTC]
Investigating now..."
```

---

### Response SLAs

**By Severity:**
```
P0 (Critical):
- Acknowledge: < 2 minutes
- Investigation start: < 5 minutes
- Status update: < 15 minutes
- Resolution target: < 1 hour

P1 (High):
- Acknowledge: < 5 minutes
- Investigation start: < 10 minutes
- Status update: < 30 minutes
- Resolution target: < 4 hours

P2 (Medium):
- Acknowledge: < 30 minutes
- Investigation start: < 1 hour
- Status update: < 1 hour
- Resolution target: < 24 hours

P3 (Low):
- Acknowledge: < 1 hour
- Investigation start: Within business day
- No SLA on resolution
```

---

## Part E: Common Incidents and Solutions

### Incident 1: Database Connection Errors

**Symptoms:**
- API returns 500 errors
- All database queries fail
- Sentry shows: "Too many connections" or "Connection refused"
- Users see: "Service temporarily unavailable"

**Severity:** P1 (if widespread), P2 (if isolated)

**Investigation Steps:**
```sql
-- 1. Check database status
SELECT pg_database.datname,
       pg_stat_activity.usename,
       pg_stat_activity.state,
       count(*) as connections
FROM pg_database
JOIN pg_stat_activity ON pg_database.oid = pg_stat_activity.datid
GROUP BY datname, usename, state;

-- 2. Check connection pool
SELECT COUNT(*) FROM pg_stat_activity;
-- If > 100, pool is exhausted

-- 3. Check for long-running queries
SELECT query, pg_stat_statements.query_time, state
FROM pg_stat_statements
WHERE query_time > 60000
ORDER BY query_time DESC;
```

**Solutions:**
```
Quick Fix (< 5 min):
1. Check Supabase dashboard for CPU/memory
2. If resources OK: Restart API connections
3. Vercel: Redeploy to refresh connections
4. Monitor connection pool return to normal

If Persists:
1. Check database logs for errors
2. Kill long-running queries (if safe)
3. Scale database (if capacity issue)
4. Consider rollback if recent deployment

Prevention:
1. Add connection pooling layer (PgBouncer)
2. Reduce connection per-API instance
3. Implement query timeouts
4. Monitor connection pool usage
```

---

### Incident 2: HMS API Failures

**Symptoms:**
- Users cannot join video sessions
- Sentry shows: 100ms API errors or timeouts
- Session creation succeeds but video fails
- "Failed to initialize HMS" in console

**Severity:** P1 (all video broken), P2 (intermittent)

**Investigation Steps:**
```
1. Check 100ms status page
   https://status.100ms.live

2. Check 100ms workspace health
   - Dashboard > Settings > Usage
   - Check concurrent room limit (default: 100)

3. Check API response codes
   - Sentry shows which endpoint failing
   - Check HMS webhook delivery

4. Test HMS endpoint directly
   curl -X GET \
   https://api.100ms.live/v2/rooms \
   -H "Authorization: Bearer [token]"

5. Review recent deployments
   - Did we change HMS integration?
   - Did we change room config?
```

**Solutions:**
```
Quick Fix:
1. If HMS service is down:
   - Check their status page
   - Wait for recovery
   - Implement fallback messaging to users

2. If HMS tokens expired:
   - Regenerate management token
   - Redeploy with new token

3. If room limit exceeded:
   - Check concurrent sessions
   - Upgrade 100ms plan if needed
   - Implement session limits

4. If integration broken:
   - Rollback recent deployment
   - Fix integration issues
   - Re-deploy after testing

Prevention:
1. Monitor HMS token expiration
2. Set alerts for room limit approaching
3. Test HMS integration in pre-deployment
4. Have fallback communication method
```

---

### Incident 3: Supabase Downtime

**Symptoms:**
- All API calls fail or timeout
- Cannot authenticate users
- Cannot load user data
- Sentry: Connection timeout or "Connection refused"

**Severity:** P0 (complete outage), P1 (partial)

**Investigation Steps:**
```
1. Check Supabase status
   https://status.supabase.com

2. Test database connectivity
   - Try connecting via psql
   - Check connection timeout

3. Check Supabase dashboard
   - Login to supabase.com
   - Check project status
   - Review any alerts

4. Test API directly
   curl -X GET \
   https://[project].supabase.co/rest/v1/health \
   -H "apikey: [key]"

5. Check recent migrations
   - Did we deploy migrations?
   - Are they causing locks?
```

**Solutions:**
```
If Supabase Service Down:
1. Check status page for ETA
2. Implement graceful degradation
3. Show status message to users
4. Wait for Supabase recovery
5. Monitor database recovery
6. Re-test all connections

If Local Database Issue:
1. Check database CPU/memory
2. Check for long-running queries
3. Check replication lag
4. Review recent migrations for locks
5. Kill blocking queries if safe
6. Rollback problematic migration

If Connection Pool Issue:
1. Restart API deployment
2. Clear stale connections
3. Increase pool size temporarily
4. Implement connection pooling

Prevention:
1. Have connection retry logic
2. Implement circuit breaker pattern
3. Cache frequently accessed data
4. Monitor replication lag
5. Alert on slow queries
```

---

### Incident 4: Memory Leaks / Out of Memory

**Symptoms:**
- API response time increases over time
- Vercel function memory usage approaches limit
- Server slowness or timeout
- Sentry: "Memory limit exceeded"

**Severity:** P1 (if service degraded), P2 (if isolated)

**Investigation Steps:**
```
1. Check Vercel memory metrics
   Dashboard > Monitoring > Memory

2. Check if memory grows over time
   - Graph shows consistent growth? Leak possible
   - Sudden jump? Unexpected load

3. Check for error patterns
   - Sentry: Group errors by cause
   - Specific feature causing it?

4. Review recent code changes
   - Memory leak typically introduced recently
   - Check for unbounded caches
   - Check for unclosed connections

5. Enable heap snapshots (local)
   node --inspect app.js
   Check Chrome DevTools for leaks
```

**Solutions:**
```
Quick Fix:
1. Redeploy to fresh instances
   - Vercel automatically rotates
   - Memory resets to baseline

2. Implement periodic cleanup
   - Clear unused caches
   - Close unused connections
   - Garbage collection hints

3. Add memory limits
   - Node.js: --max-old-space-size
   - Set alert threshold

If Persists:
1. Code review recent changes
2. Look for:
   - Global variables accumulating
   - Event listeners not removed
   - Unclosed database connections
   - Unbounded caches
   - Circular references preventing GC

3. Fix identified issues
4. Test with load simulation
5. Deploy fix with monitoring

Prevention:
1. Monitor memory trends
2. Alert on memory > 80% max
3. Code review for memory patterns
4. Load test before deployment
5. Implement metrics on memory usage
```

---

### Incident 5: High Error Rates

**Symptoms:**
- Error rate > 5% consistently
- Specific error appearing frequently
- Users report widespread failures
- Some features/users affected more

**Severity:** P1 (if >10%), P2 (if 2-10%)

**Investigation Steps:**
```
1. Check Sentry for top errors
   Dashboard > Issues
   Sorted by frequency

2. Analyze error pattern
   - Same endpoint failing?
   - Same user type affected?
   - Specific action causing it?
   - Intermittent or consistent?

3. Check error timeline
   - When did it start?
   - Coincide with deployment?
   - Coincide with traffic spike?

4. Review error context
   - Which users affected?
   - What were they doing?
   - What input values?
   - What environment?

5. Check related systems
   - Database query slow?
   - External API failing?
   - Rate limiting triggered?
```

**Solutions:**
```
If Deployment-Related:
1. Identify changed code
2. Review change for issues
3. Quick fix or rollback?
4. Test thoroughly
5. Re-deploy if fix, rollback if needed

If Traffic-Related:
1. Check server load
2. Check database load
3. Scale if needed
4. Implement rate limiting
5. Optimize problematic code

If Logic Error:
1. Fix incorrect logic
2. Test fix locally
3. Deploy with monitoring
4. Verify error rate drops

If External Service:
1. Check third-party status
2. Implement retry logic
3. Implement fallback
4. Wait for service recovery

Prevention:
1. Unit test all code paths
2. Integration test with realistic data
3. Load test before deployment
4. Monitor error rates in staging
5. Alert on error rate threshold
```

---

### Incident 6: Performance Degradation

**Symptoms:**
- Response times increase significantly
- P95 response time > 2s (normal < 1s)
- User complaints about slow loading
- Sentry shows slow transactions

**Severity:** P1 (if P95 > 5s), P2 (if P95 > 2s)

**Investigation Steps:**
```
1. Check performance metrics
   Vercel > Monitoring > Functions
   - Function duration trend
   - Increasing over time?

2. Check database query performance
   - Slow query logs
   - Missing indexes?
   - N+1 queries?

3. Check request size
   - Are payloads large?
   - Is response too large?
   - Compression working?

4. Check external calls
   - API calls slow?
   - Parallel or sequential?
   - Timeout thresholds?

5. Profile code (if possible)
   - Which functions slow?
   - Where is time spent?
   - Blocking operations?
```

**Solutions:**
```
Quick Wins:
1. Clear caches if not updated properly
2. Redeploy if performance degrading over time
3. Restart if memory growing

Optimization:
1. Add database indexes
   CREATE INDEX idx_sessions_user_id ON sessions(user_id);

2. Optimize queries
   - Remove N+1 queries
   - Select only needed columns
   - Use joins instead of loops

3. Implement caching
   - Cache frequently accessed data
   - Redis caching layer
   - Client-side caching

4. Optimize external calls
   - Parallel calls instead of sequential
   - Add timeouts to prevent hanging
   - Implement circuit breaker

5. Code optimization
   - Identify hot paths with profiling
   - Optimize algorithms
   - Remove unnecessary processing

Prevention:
1. Performance testing before deployment
2. Monitor query performance
3. Alert on response time increase
4. Code review for performance impact
5. Database review for missing indexes
```

---

## Part F: War Room Procedures

### When to Activate War Room

**Automatic Activation Triggers:**
- P0 incident detected
- Service unavailable to all users
- Data loss or security breach
- Any incident lasting > 15 minutes

**Manual Activation:**
- Incident Commander calls war room
- Can be for P1 or complex P2

### War Room Setup

**Channels:**
```
Primary: Zoom conference
- URL: [TBD]
- Phone: [TBD]
- Start call immediately on P0

Chat: Slack #incident-response
- For updates and context
- Timestamped log of actions

Documentation: Google Doc (shared)
- Real-time timeline
- Decisions made
- Action items
```

**Required Participants:**
```
Essential (Always):
- Incident Commander
- On-call Engineer
- On-call Manager
- Communication Lead

As Needed:
- Database Admin (if DB issue)
- Specific service owner (if service issue)
- VP Engineering (if P0 or unresolved)
- CTO (if critical decision needed)
```

### War Room Flow

**Opening (1 minute)**
```
Incident Commander: "Let's start. This is incident [ID], severity [P0/P1].
Background: [Brief summary]
Current status: [What we know]
Who's on the call?
```

**Investigation Phase (5-15 minutes)**
```
- On-call Engineer: "Here's what I'm seeing"
- Presents error logs, metrics
- Database Admin (if applicable): "Database status is..."
- Service owners: Status of their services
- All data presented together
```

**Hypothesis Phase (3-5 minutes)**
```
Incident Commander: "So our best hypotheses are:
1. [Hypothesis A]
2. [Hypothesis B]
3. [Hypothesis C]

Which do we test first?"

Engineer: "I recommend we check [Hypothesis A] first
because [reason]"
```

**Action Phase (5-10 minutes)**
```
Incident Commander: "Action items:
1. [Engineer A] - Test hypothesis A - Target 5 min
2. [Engineer B] - Check logs for pattern - Target 5 min
3. [DB Admin] - Scale database - Target 3 min

Let's reconvene in 5 minutes."
```

**Update Phase (every 5-15 min)**
```
Incident Commander: "Updates?"

Engineer A: "Hypothesis A confirmed. Cause is..."
Engineer B: "Logs show pattern starting at [time]"
DB Admin: "Database now scaled, monitoring"

Incident Commander: "Next steps are...
[New actions assigned]"
```

**Resolution Phase**
```
When fix/rollback in progress:

Incident Commander: "Fix deploying now.
Communication: Update status page to 'Monitoring'
Monitor: Watch error rate for improvement"

[Monitor deployment progress]

Engineer: "Fix deployed, restarting services"
Monitor: "Error rate improving, now at [X%]"
Engineer: "Services responding normally"

Incident Commander: "Incident resolved.
Continue monitoring for 30 minutes.
Postmortem scheduled for [time]"
```

### Communication During War Room

**Roles:**
```
Incident Commander:
- Asks questions
- Makes decisions
- Drives resolution
- Communicates status

On-call Engineer:
- Presents technical findings
- Proposes solutions
- Implements fixes
- Reports progress

Communication Lead:
- Updates status page
- Notifies users
- Documents timeline
- Manages external messaging

Monitor/Metrics:
- Tracks key metrics
- Alerts to changes
- Provides numeric updates
- Identifies trends
```

**Principles:**
```
1. One person speaks at a time
2. Technical jargon kept minimal
3. Decisions made quickly
4. Actions assigned clearly
5. Progress updates every 5 minutes
6. Escalation clear and immediate
```

### Documentation During War Room

**Real-time Log (shared doc):**
```
INCIDENT LOG - INC-001
=======================
Detection Time: [UTC]
Severity: P0
Status: Investigating

TIMELINE:
[HH:MM] Incident detected - error rate spiking
[HH:MM] War room activated
[HH:MM] Engineer investigating - checking recent deploy
[HH:MM] Recent deploy identified as cause
[HH:MM] Rollback initiated
[HH:MM] Rollback complete, services restarting
[HH:MM] Error rate normalizing
[HH:MM] All systems operational

DECISIONS MADE:
1. Rolled back to v0.9.9 - Incident Commander decision
2. Keep database schema as-is - Database Admin decision

ACTION ITEMS:
1. [ ] Root cause analysis - Engineer A - Due 2h
2. [ ] Fix implementation - Engineer B - Due 4h
3. [ ] Post-mortem meeting - Incident Commander - Due 24h

NOTES:
- Incident lasted 20 minutes
- Approximately 10% of users affected
- No data loss
```

---

## Part G: Off-Hours and Holiday Procedures

### Off-Hours Response

**During Business Hours (9 AM - 6 PM):**
- Full team available
- Quick response times
- All hands on deck for P0

**After Hours (6 PM - 9 AM):**
- On-call engineer responds
- On-call manager available for escalation
- Other team members woken only if P0

**Weekends / Holidays:**
- Same as after-hours
- Consider team rest/rotation
- Escalate critical items only

### Sleep Rotation for Extended Incidents

**If Incident > 4 hours:**
```
Primary responder: 2 hours on-call
Standby responder: Take next shift
Rotate every 2 hours to prevent fatigue
```

---

## Part H: Monitoring and Alerting

### Alert Channels

**Primary (< 5 min response time):**
- PagerDuty: SMS + app notification
- Slack: @oncall mention
- Phone call (for P0)

**Secondary (escalation):**
- Email to on-call group
- Backup on-call contact

### Alert Rules

**P0 Alerts (Immediate escalation):**
- Error rate > 10%
- All services down
- Database unreachable
- Complete Vercel outage
- Security alert

**P1 Alerts (Page on-call):**
- Error rate 5-10%
- Major service down
- Video failures > 20%
- Database CPU > 90%
- Response time > 5s

**P2 Alerts (Slack notification):**
- Error rate 1-5%
- Video quality issues
- Performance degradation
- Isolated feature errors
- Database CPU 70-90%

---

## Appendix: Useful Commands and Tools

### Debugging Commands

```bash
# Check Vercel logs
vercel logs --real-time

# Check Sentry errors
curl https://sentry.io/api/0/projects/[org]/[project]/events/ \
  -H "Authorization: Bearer [token]"

# Check database logs
psql [connection_string] -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check system resources
curl https://kulti.club/api/health

# Test external services
curl https://api.100ms.live/v2/rooms -H "Authorization: Bearer [token]"
```

### Monitoring Dashboards

```
Vercel: https://vercel.com/[org]/[project]
Sentry: https://sentry.io/[org]/[project]/
100ms: https://dashboard.100ms.live
Supabase: https://app.supabase.com/
PagerDuty: https://[org].pagerduty.com/
Status Page: https://status.kulti.club
```

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Maintained By:** Engineering Team
**Review Frequency:** Quarterly
