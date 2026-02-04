# Kulti Launch Runbook

**Launch Date:** December 2025
**Platform:** kulti.club
**Status:** Production MVP

---

## Executive Summary

This runbook provides step-by-step instructions for launching Kulti to production. It covers pre-launch verification, deployment procedures, smoke testing, rollback procedures, and post-launch monitoring.

**Key Contacts:**
- Launch Lead: [TBD]
- Engineering On-Call: [TBD]
- Monitoring Team: [TBD]
- Communication Lead: [TBD]

---

## Part A: Pre-Launch Checklist

### Day Before Launch (T-1 Day)

**Code and Quality Verification:**
- [ ] All code merged to main branch
- [ ] All CI/CD pipelines passing
- [ ] Test coverage >= 80% (currently 70%, target improvement)
- [ ] 0 TypeScript errors in strict mode
- [ ] 0 ESLint errors
- [ ] 0 security vulnerabilities in dependencies
- [ ] Code review completed and approved
- [ ] Performance benchmarks reviewed (target: P95 <2s)

**Environment Configuration:**
- [ ] Production Vercel environment configured
- [ ] Production Supabase project verified
- [ ] 100ms HMS production workspace ready
- [ ] Sentry production project active with alert rules
- [ ] Upstash Redis configured for rate limiting
- [ ] Anthropic API keys configured
- [ ] Twilio SMS service ready
- [ ] All environment variables set in production

**External Services Verification:**
- [ ] 100ms HMS: Roles configured, recording setup tested
- [ ] Supabase: Database replicated, backups automated
- [ ] Vercel: CDN ready, edge functions tested
- [ ] Sentry: Error tracking enabled, dashboards configured
- [ ] Monitoring: Uptime monitoring active
- [ ] Status page: Set to "operational"

**Security Audit:**
- [ ] All RLS policies verified on database tables
- [ ] Rate limiting configured and tested
- [ ] Security headers in place (HSTS, CSP, etc.)
- [ ] Secrets not exposed in code or logs
- [ ] SSL certificates valid and renewed
- [ ] Authentication flow verified
- [ ] Authorization checks tested

**Backup and Disaster Recovery:**
- [ ] Database backup created and tested
- [ ] Rollback plan documented
- [ ] Previous version tagged and accessible
- [ ] Data migration scripts tested
- [ ] Recovery time objective (RTO) < 1 hour verified

**Team Preparation:**
- [ ] All team members briefed on launch plan
- [ ] On-call engineer assigned
- [ ] War room channel created
- [ ] Communication templates reviewed
- [ ] Escalation contacts confirmed
- [ ] Monitoring dashboards shared with team
- [ ] Incident response playbooks reviewed

**Monitoring and Observability:**
- [ ] All monitoring dashboards live
- [ ] Alert thresholds configured
- [ ] Error logging operational
- [ ] Performance metrics baseline established
- [ ] Real-time log aggregation ready
- [ ] Status page components configured

**Load and Stress Testing:**
- [ ] Load test completed (target: 100 concurrent users)
- [ ] Stress test results reviewed
- [ ] HMS capacity verified
- [ ] Database performance acceptable
- [ ] API rate limits configured
- [ ] Cache strategy validated

**Documentation Verification:**
- [ ] Runbook reviewed by team
- [ ] Incident response plan reviewed
- [ ] Monitoring procedures confirmed
- [ ] Communication templates tested
- [ ] Rollback steps verified
- [ ] Customer documentation ready

**Customer Preparation:**
- [ ] Help page updated
- [ ] FAQ current
- [ ] Support contact information verified
- [ ] Initial user cohort confirmed
- [ ] Welcome email templates ready
- [ ] Onboarding documentation ready

---

## Part B: Launch Day Timeline

### T-2 Hours: Final Verification (09:00 AM)

**Tasks:**
1. **System Health Check**
   - [ ] All services responding to health checks
   - [ ] Database connection pool healthy
   - [ ] 100ms HMS workspace status: operational
   - [ ] Sentry alerts working
   - [ ] Rate limiting service online
   - [ ] Cache systems warmed

2. **Team Coordination**
   - [ ] All team members present and ready
   - [ ] War room established (Slack, Zoom, etc.)
   - [ ] On-call rotation confirmed
   - [ ] Communication lead ready
   - [ ] Escalation matrix reviewed

3. **External Services Verification**
   - [ ] Vercel deployment ready (no pending builds)
   - [ ] DNS configured and propagating
   - [ ] CDN cache cleared
   - [ ] Email service ready for notifications
   - [ ] SMS service ready for OTP

4. **Final Smoke Tests in Staging**
   - [ ] User signup/login flow works
   - [ ] Session creation works
   - [ ] Video stream connects
   - [ ] Screen sharing activates
   - [ ] Chat messages send
   - [ ] Recording initiates
   - [ ] User profiles load
   - [ ] Dashboard displays correctly

### T-1 Hour: Team Standup (10:00 AM)

**Duration:** 15-30 minutes

**Agenda:**
1. Launch lead reviews timeline
2. Each team member confirms readiness
3. On-call engineer reviews monitoring setup
4. Communication lead reviews notification templates
5. Q&A on any concerns
6. Final confirmation to proceed

**Decision Point:** Go/No-Go for deployment
- If issues found, delay launch and resolve
- Document any delays and reasons

### T-0: Deploy to Production (11:00 AM)

**Duration:** 30-45 minutes

**Deployment Steps:**

1. **Pre-deployment Freeze**
   - [ ] No other deployments to production
   - [ ] Communication lead post: "Deployment starting"
   - [ ] Team monitoring dashboard opened
   - [ ] Logging enabled and monitored

2. **Vercel Deployment**
   - [ ] Tag current commit with release version (v1.0.0)
   - [ ] Trigger production deployment via Vercel dashboard
   - [ ] Monitor deployment progress
   - [ ] Wait for "Deployment Complete" status
   - [ ] Verify URL is accessible
   - [ ] Check version matches expected commit

3. **Database Migrations**
   - [ ] Run any pending migrations
   - [ ] Verify all tables exist and have data
   - [ ] Check RLS policies applied
   - [ ] Verify indexes created
   - [ ] Monitor query performance

4. **Edge Functions Deployment** (if applicable)
   - [ ] Deploy any edge functions
   - [ ] Verify function endpoints respond
   - [ ] Check function logs for errors

5. **Configuration Verification**
   - [ ] Environment variables correct in production
   - [ ] API keys and secrets present
   - [ ] Feature flags set appropriately
   - [ ] Rate limiting configured
   - [ ] Monitoring enabled

6. **External Service Activation**
   - [ ] 100ms HMS room templates active
   - [ ] Sentry error tracking receiving events
   - [ ] SendGrid email service ready
   - [ ] Twilio SMS service active

**What to Monitor During Deployment:**
- Vercel deployment logs for errors
- Sentry for immediate error spikes
- Real-time logs for exception traces
- Database query performance
- API response times
- HMS room creation success

**Proceed vs Rollback Decision Points:**

**Proceed if:**
- Deployment completes without errors
- All health checks pass
- No spike in error rates
- Core services responding normally

**Rollback if:**
- Deployment fails to complete
- Database migrations fail
- Security issues detected
- Critical services unavailable
- Error rate > 10%
- Response times > 5s

### T+15 Minutes: Smoke Tests (11:15 AM)

**Duration:** 30 minutes

**Primary Testing User:** Launch lead or QA engineer

**Critical User Flows to Test:**

1. **Authentication Flow**
   ```
   Test Case: User Registration
   - Navigate to /signup
   - Enter valid phone number
   - Request OTP
   - Expected: SMS delivered within 30 seconds
   - Enter OTP
   - Expected: Redirected to dashboard
   - Verification: User appears in Supabase auth
   ```

2. **Dashboard Access**
   ```
   Test Case: View Dashboard
   - Login to application
   - Navigate to /dashboard
   - Expected: Load within 2 seconds
   - Expected: Session list visible
   - Expected: No console errors
   ```

3. **Session Creation**
   ```
   Test Case: Create Session
   - Click "Create Session" button
   - Fill in session details (title, description, tags)
   - Expected: Form submits successfully
   - Expected: Redirect to session page
   - Expected: Session appears in dashboard
   - Verification: Session created in Supabase
   ```

4. **Video Stream**
   ```
   Test Case: Connect to Video
   - Create or join session
   - Expected: Camera permission request
   - Grant permissions
   - Expected: Video stream visible within 5 seconds
   - Expected: Participant count correct
   - Expected: Audio works both directions
   ```

5. **Screen Sharing**
   ```
   Test Case: Share Screen
   - In active session, click "Share Screen"
   - Expected: Permission dialog
   - Grant screen sharing permission
   - Expected: Screen visible within 3 seconds
   - Expected: Control indicator visible
   - Expected: Smooth video at 30fps
   ```

6. **Chat Functionality**
   ```
   Test Case: Send Message
   - In active session, send chat message
   - Expected: Message appears instantly
   - Expected: Message visible to other participants within 1 second
   - Expected: No console errors
   ```

7. **Recording**
   ```
   Test Case: Start Recording
   - In active session, start recording
   - Expected: Recording indicator visible
   - Expected: No performance degradation
   - Expected: Recording status in HMS dashboard
   ```

**Expected Response Times:**
- Page loads: <2s
- API calls: <1s
- Video stream connection: <5s
- Chat message delivery: <1s
- Recording initiation: <3s

**Error Rate Thresholds:**
- Overall error rate: <1%
- API error rate: <0.5%
- Video connection failures: <2%
- HMS errors: <1%

**Smoke Test Report:**
- [ ] All tests passed
- [ ] Document any failures
- [ ] Screenshot evidence of successful flows
- [ ] Performance metrics baseline recorded
- [ ] All systems responding normally

**Proceed vs Rollback Decision:**
- If all smoke tests pass: Proceed to T+1 Hour review
- If any critical flow fails: Investigate immediately, escalate if unresolvable

### T+1 Hour: First Metrics Review (12:00 PM)

**Duration:** 15-30 minutes

**Metrics to Review:**

1. **Application Metrics**
   ```
   - Total requests: [Expected baseline]
   - Error rate: [Should be <1%]
   - Average response time: [Should be <1s]
   - P95 response time: [Should be <2s]
   - P99 response time: [Should be <5s]
   ```

2. **User Metrics**
   ```
   - Total signups: [Expected number]
   - Total logins: [Expected number]
   - Active sessions: [Expected number]
   - Session creation success rate: [Should be >95%]
   - Session duration: [Expected average]
   ```

3. **Video Metrics**
   ```
   - Rooms created: [Expected number]
   - Participants: [Total connected]
   - Average session duration: [Expected]
   - Video quality: [Expected bitrate]
   - Screen share usage: [Expected percentage]
   ```

4. **Infrastructure Metrics**
   ```
   - Vercel function duration: [Should be <1s]
   - Vercel memory usage: [Should be <200MB]
   - Database connections: [Should be <50]
   - Database query time: [Should be <100ms]
   - Cache hit rate: [Should be >80%]
   ```

5. **Error Analysis**
   ```
   - Top errors in Sentry: [List top 5]
   - Error sources: [Break down by component]
   - Error timeline: [Any spikes noted]
   - Critical errors: [None expected]
   ```

**Dashboard Views:**
- Vercel Analytics
- Sentry Issues
- 100ms HMS Dashboard
- Custom monitoring dashboard

**Decision Criteria:**

**Continue Normal Monitoring if:**
- All metrics within expected ranges
- Error rate < 1%
- No critical errors
- Performance acceptable
- User signups normal

**Investigate if:**
- Error rate > 5%
- Response times > 3s
- Spike in specific error type
- Unusual user behavior
- Failed video connections > 5%

**Escalate/Rollback if:**
- Error rate > 10%
- Complete service outage
- Data corruption detected
- Security breach
- Database connection pool exhausted

### T+4 Hours: Extended Monitoring (3:00 PM)

**Duration:** 30-60 minutes

**Additional Checks:**

1. **Load Distribution**
   - Verify traffic distributed across regions
   - Check edge function execution times
   - Monitor serverless function cold starts
   - Verify database replication lag

2. **User Behavior Analysis**
   - Review signup patterns
   - Check session creation trends
   - Monitor feature usage
   - Verify successful authentication

3. **System Health**
   - All services responding to health checks
   - Database performance optimal
   - Cache efficiency good
   - No resource exhaustion

4. **Error Pattern Analysis**
   - Identify any recurring errors
   - Check for error spikes
   - Review error severity distribution
   - Verify error recovery

5. **Infrastructure Capacity**
   - Database connections < 50%
   - Memory usage < 70%
   - CPU usage < 60%
   - Storage usage < 20%

**Report:**
- Generate extended monitoring report
- Share with team in war room
- Document any issues found
- Update status with communication lead

### T+24 Hours: Post-Launch Review (Next Day, 11:00 AM)

**Duration:** 1 hour

**Full System Review:**

1. **Metrics Summary**
   - Total users: [Report]
   - Total sessions created: [Report]
   - Average session duration: [Report]
   - Unique daily active users: [Report]
   - Error rate over 24 hours: [Report]
   - Performance metrics: [Report]

2. **Incident Review**
   - Any incidents occurred? [List]
   - How were they handled? [Summary]
   - Response time? [Duration]
   - Resolution time? [Duration]
   - Root cause identified? [Yes/No]

3. **Feature Usage**
   - Most used features: [List top 5]
   - Features with issues: [List any]
   - Unexpected user behavior: [Describe]
   - Feature adoption rate: [Percentage]

4. **Infrastructure Review**
   - Peak load handled: [Number of users]
   - Scale events needed: [Yes/No]
   - Resource utilization: [Summary]
   - Cost tracking: [Summary]

5. **Team Feedback**
   - What went well?
   - What could be improved?
   - Any process changes needed?
   - Knowledge gaps identified?

6. **Customer Feedback**
   - User support tickets: [Count]
   - Common issues: [List top 3]
   - Feature requests: [List]
   - Overall sentiment: [Positive/Neutral/Mixed]

**Decision Points:**
- [ ] Launch successful, monitoring to continue
- [ ] Minor issues, plan quick fixes
- [ ] Major issues, escalate to leadership
- [ ] Begin Phase 2 planning

**Documentation:**
- Update launch runbook with actual timings
- Document lessons learned
- Update incident procedures if needed
- Share post-mortem report

---

## Part C: Deployment Steps

### Step-by-Step Production Deployment

**Prerequisites:**
- [ ] All pre-launch checklist items completed
- [ ] Code merged to main branch
- [ ] All tests passing
- [ ] Security audit passed
- [ ] Team ready in war room

**Deployment Process:**

**Step 1: Code Release**
```bash
# Tag the release
git tag -a v1.0.0 -m "Production launch release"
git push origin v1.0.0

# Verify tag
git describe --tags HEAD
# Expected output: v1.0.0
```

**Step 2: Vercel Deployment**
1. Navigate to Vercel dashboard
2. Select Kulti project
3. Click "Deployments" tab
4. Click "Deploy" to deploy from main branch
5. Monitor deployment progress:
   - Building: 3-5 minutes
   - Uploading: 1-2 minutes
   - Verifying: 1 minute
6. Wait for "Ready" status
7. Click on deployment to view preview
8. Verify URL is live and accessible

**Verification at Step 2:**
```bash
# Check site is accessible
curl -I https://kulti.club

# Expected: HTTP 200 OK
# Expected: Server headers present
```

**Step 3: Database Verification**
```bash
# Connect to production Supabase
# In Supabase dashboard:
1. Select production project
2. Go to SQL Editor
3. Run basic health checks

# Check table exists
SELECT COUNT(*) FROM users;
# Should return a number >= 0

# Check RLS is enabled
SELECT * FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'users';

# Verify indexes
SELECT * FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Verification at Step 3:**
- [ ] All tables exist
- [ ] RLS enabled on all user-facing tables
- [ ] Indexes present and functional
- [ ] No data corruption
- [ ] Query performance acceptable

**Step 4: Environment Configuration**
1. Verify production environment variables in Vercel:
   - NEXT_PUBLIC_SUPABASE_URL ✓
   - NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
   - SUPABASE_SERVICE_KEY ✓
   - NEXT_PUBLIC_HMS_AUTH_TOKEN ✓
   - HMS_MANAGEMENT_TOKEN ✓
   - SENTRY_AUTH_TOKEN ✓
   - ANTHROPIC_API_KEY ✓
   - UPSTASH_REDIS_REST_URL ✓
   - TWILIO_ACCOUNT_SID ✓
   - All other required keys ✓

**Verification at Step 4:**
```bash
# Verify environment variables loaded
curl https://kulti.club/api/health

# Expected response:
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2025-12-XX"
}
```

**Step 5: External Service Activation**
1. **100ms HMS Verification:**
   - Verify workspace active
   - Check room templates configured
   - Test recording storage
   - Verify HLS settings

2. **Sentry Activation:**
   - Verify DSN configured
   - Check error tracking events
   - Verify alert rules active
   - Test notification channels

3. **Third-party Services:**
   - Verify Twilio SMS ready
   - Verify Upstash Redis connection
   - Verify Anthropic API responding
   - Verify SendGrid email ready

**Verification at Step 5:**
- [ ] All external service health checks pass
- [ ] Test transactions processed
- [ ] Webhook endpoints receiving events
- [ ] Alert notifications working

**Step 6: CDN and Caching**
1. Clear Vercel CDN cache
2. Verify CDN distribution:
   - Static assets cached
   - API routes not cached
   - Images served from CDN
3. Test cache headers:
   ```bash
   curl -I https://kulti.club/
   # Check Cache-Control headers
   ```

**Verification at Step 6:**
- [ ] Static assets cached
- [ ] First page load complete within 2s
- [ ] Subsequent loads faster due to cache
- [ ] No stale content served

**Step 7: Security Headers Verification**
```bash
# Verify security headers
curl -I https://kulti.club/

# Expected headers:
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

**Verification at Step 7:**
- [ ] All security headers present
- [ ] HSTS enabled
- [ ] CSP configured correctly
- [ ] No mixed content warnings

**Step 8: SSL Certificate Verification**
```bash
# Check SSL certificate
openssl s_client -connect kulti.club:443

# Expected: Valid certificate
# Expected: Not expired
```

**Verification at Step 8:**
- [ ] Certificate valid and not expired
- [ ] Certificate properly signed
- [ ] No certificate warnings

**Step 9: DNS Verification**
```bash
# Verify DNS resolution
nslookup kulti.club
dig kulti.club

# Expected: Resolves to Vercel IP
```

**Verification at Step 9:**
- [ ] DNS points to Vercel
- [ ] Both A and AAAA records configured
- [ ] DNS propagated globally (check status)

**Step 10: Smoke Test Execution**
See "Part B: T+15 Minutes" section for detailed smoke tests

**Verification at Step 10:**
- [ ] All smoke tests passing
- [ ] Error rate < 1%
- [ ] Performance metrics acceptable
- [ ] User flows working

**Step 11: Monitoring Activation**
1. Verify all monitoring dashboards live
2. Enable all alert rules
3. Verify notifications configured
4. Set status page to "operational"

**Verification at Step 11:**
- [ ] Monitoring dashboards accessible
- [ ] Alert channels working
- [ ] Status page updated
- [ ] Team has access to dashboards

**Step 12: Communication**
1. Send launch announcement to users
2. Update status page with "Operational"
3. Notify team of successful deployment
4. Begin 24-hour monitoring cycle

**Verification at Step 12:**
- [ ] Users notified
- [ ] Status page updated
- [ ] Team acknowledged
- [ ] Monitoring cycle started

---

## Part D: Smoke Test Procedures

### Comprehensive Smoke Test Script

**Test Environment:** Production (kulti.club)
**Tester:** Launch QA Engineer
**Duration:** 30-45 minutes
**Go/No-Go Criteria:** All critical tests must pass

### Test 1: Site Accessibility

**Objective:** Verify site is accessible and loads properly

**Steps:**
1. Open https://kulti.club in Chrome
2. Observe page load
3. Check browser console for errors
4. Note load time

**Expected Results:**
- [ ] Page loads within 3 seconds
- [ ] No console errors (warnings allowed)
- [ ] Layout renders correctly
- [ ] All images load
- [ ] No broken links

**Evidence:**
- Screenshot of home page
- Screenshot of console (no errors)
- Load time measurement

---

### Test 2: User Signup Flow

**Objective:** Verify user registration works end-to-end

**Prerequisites:**
- Test phone number: [Reserve test number]
- Clean user credentials ready

**Steps:**
```
1. Click "Sign Up" button
   Expected: Redirected to /signup

2. Enter phone number (test number)
   Expected: Input accepted

3. Click "Request OTP"
   Expected:
   - Button changes to "Sending..."
   - SMS received within 30 seconds

4. Copy OTP from SMS
   Expected: Code format is 6 digits

5. Enter OTP
   Expected: Code input accepted

6. Click "Verify"
   Expected:
   - Code verified successfully
   - Redirected to /onboarding or /dashboard
   - New user created in database

7. Complete profile setup (if needed)
   Expected:
   - Form submission successful
   - Redirected to dashboard
```

**Expected Results:**
- [ ] Signup form loads within 2s
- [ ] Phone validation works
- [ ] OTP delivery within 30s
- [ ] OTP verification successful
- [ ] Profile page loads
- [ ] User appears in Supabase

**Performance Metrics:**
- Page load: < 2s
- Form submission: < 1s
- OTP delivery: < 30s
- OTP verification: < 2s

**Evidence:**
- Screenshots of each step
- SMS delivery confirmation
- User verified in Supabase dashboard

---

### Test 3: User Login Flow

**Objective:** Verify existing users can login

**Prerequisites:**
- Test user account created from Test 2

**Steps:**
```
1. Click "Log In" button
   Expected: Redirected to /login

2. Enter phone number
   Expected: Input accepted

3. Click "Request OTP"
   Expected: SMS received within 30 seconds

4. Enter OTP received via SMS
   Expected: Code input accepted

5. Click "Verify"
   Expected:
   - Logged in successfully
   - Redirected to /dashboard
   - User info displayed correctly
```

**Expected Results:**
- [ ] Login form loads quickly
- [ ] OTP delivery works
- [ ] Authentication successful
- [ ] Dashboard displays user data
- [ ] Session persists across page reload

**Performance Metrics:**
- Login page load: < 2s
- OTP delivery: < 30s
- Dashboard load: < 2s

**Evidence:**
- Screenshots of login and dashboard
- Session confirmation (check cookies/localStorage)

---

### Test 4: Dashboard Access

**Objective:** Verify dashboard displays correctly with user data

**Prerequisites:**
- Logged in as test user (from Test 3)

**Steps:**
```
1. Navigate to /dashboard
   Expected: Page loads within 2 seconds

2. Observe dashboard content
   Expected:
   - Welcome message shows username
   - Session list visible
   - Create session button visible
   - Upcoming sessions listed (if any)
   - Recent activity visible

3. Check navigation
   Expected:
   - Profile link works
   - Settings link works
   - Logout button works

4. Verify data accuracy
   Expected:
   - User name correct
   - Session list matches database
   - No duplicate sessions
   - Timestamps correct
```

**Expected Results:**
- [ ] Dashboard loads within 2s
- [ ] All UI elements render
- [ ] Data displays correctly
- [ ] Navigation works
- [ ] No console errors

**Performance Metrics:**
- Dashboard load: < 2s
- Data fetch: < 1s
- Interactive: < 500ms

**Evidence:**
- Dashboard screenshot
- Data accuracy confirmation

---

### Test 5: Session Creation

**Objective:** Verify users can create a new session

**Prerequisites:**
- Logged in as test user
- On dashboard page

**Steps:**
```
1. Click "Create Session" button
   Expected: Modal/form opens

2. Fill in session details:
   - Title: "Test Session - [Current Date]"
   - Description: "Automated smoke test session"
   - Tags: "testing", "smoke-test"
   - Category: "Development"
   Expected:
   - Form fields accept input
   - Input validation works

3. Click "Create Session"
   Expected:
   - Form submits successfully
   - Loading indicator shows
   - Redirects to session page
   - Session appears in dashboard

4. Verify session data
   Expected:
   - Session ID assigned
   - Creator is test user
   - Status is "active" or "waiting"
   - Timestamp is current
```

**Expected Results:**
- [ ] Form loads quickly
- [ ] Input validation works
- [ ] Session created successfully
- [ ] Session appears in dashboard
- [ ] Session data persists

**Performance Metrics:**
- Form load: < 1s
- Form submission: < 2s
- Session fetch: < 1s

**Database Verification:**
```sql
-- Verify session created
SELECT * FROM sessions
WHERE title = 'Test Session - [Date]'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: 1 row returned with correct data
```

**Evidence:**
- Screenshot of session creation
- Session list showing new session
- Database query results

---

### Test 6: Join Session

**Objective:** Verify users can join an active session

**Prerequisites:**
- Test session created (from Test 5)
- Two test users available

**Steps:**
```
1. User 2 navigates to /sessions
   Expected: Sessions list loads

2. Find the test session from Test 5
   Expected: Session visible in list

3. Click "Join Session"
   Expected:
   - Join request sent
   - Button changes to "Joining..."
   - Redirected to session room page

4. Observe participant list
   Expected:
   - Both participants listed
   - Participant count shows "2"
   - Online status indicated
```

**Expected Results:**
- [ ] Sessions list loads
- [ ] Test session visible
- [ ] Join successful
- [ ] Participant list updates
- [ ] No errors during join

**Performance Metrics:**
- Sessions list load: < 2s
- Join action: < 1s
- Participant update: < 1s

**Evidence:**
- Screenshots of join flow
- Participant list verification

---

### Test 7: Video Streaming

**Objective:** Verify video/audio works in a session

**Prerequisites:**
- Two users joined to test session (from Test 6)
- Devices have camera and microphone

**Steps:**
```
1. User 1 - Grant camera permission
   Expected:
   - Browser permission dialog
   - Permission granted
   - Camera light activates

2. User 1 - Observe own video preview
   Expected:
   - Preview shows within 3 seconds
   - Quality is acceptable
   - No freezing observed

3. User 2 - Grant camera permission
   Expected: Same as User 1

4. User 1 - Observe User 2's video
   Expected:
   - User 2 video visible
   - Video synced with audio
   - Quality acceptable
   - Latency < 2 seconds

5. User 1 - Speak and observe User 2
   Expected:
   - User 2 hears audio
   - Audio quality clear
   - No echo
   - Latency < 200ms

6. Check session metrics
   Expected:
   - Video bitrate: 500-2000 kbps
   - Frame rate: 24-30 fps
   - Audio quality: clear
```

**Expected Results:**
- [ ] Camera permissions work
- [ ] Both videos visible
- [ ] Audio working bidirectionally
- [ ] No lag or stuttering
- [ ] Quality acceptable
- [ ] Session duration tracked

**Performance Metrics:**
- Camera initialization: < 5s
- Remote video rendering: < 3s
- Audio latency: < 200ms
- Video frame rate: 24-30 fps

**Troubleshooting:**
- If video doesn't appear: Check HMS logs
- If audio doesn't work: Check microphone permissions
- If lag: Check network speed, try reducing video quality

**Evidence:**
- Screenshot showing both videos
- Audio quality confirmation
- Performance metrics from HMS

---

### Test 8: Screen Sharing

**Objective:** Verify screen sharing works with control passing

**Prerequisites:**
- Two users in active video session (from Test 7)

**Steps:**
```
1. User 1 - Click "Share Screen"
   Expected:
   - Permission dialog appears
   - Window/tab selection dialog
   - User can select screen to share

2. User 1 - Select screen and grant permission
   Expected:
   - Share button changes to "Stop Sharing"
   - Screen visible in session
   - "Screen Sharing Active" indicator

3. User 2 - Observe shared screen
   Expected:
   - Screen visible within 3 seconds
   - Quality acceptable
   - No artifacts

4. User 1 - Pass control to User 2
   Expected:
   - Click "Pass Control" or similar
   - Control transfers to User 2
   - Indicator shows "User 2 has control"
   - User 2 can control shared screen

5. User 2 - Operate shared screen
   Expected:
   - Can move mouse cursor
   - Cursor position synced
   - Actions reflected on shared screen
   - No lag (< 500ms)

6. User 2 - Stop screen sharing
   Expected:
   - Screen sharing ends
   - Indicator disappears
   - Session continues with video only
```

**Expected Results:**
- [ ] Screen share initiates within 3s
- [ ] Screen visible to all participants
- [ ] Control transfer works
- [ ] Control holder can operate screen
- [ ] Screen share stops cleanly
- [ ] Session continues after share ends

**Performance Metrics:**
- Screen share initiation: < 3s
- Screen visibility latency: < 3s
- Control operation latency: < 500ms
- Screen quality: 1080p or higher

**Troubleshooting:**
- If screen doesn't appear: Check browser permissions
- If lag is high: Check network bandwidth
- If control doesn't pass: Refresh page and retry

**Evidence:**
- Screenshots of shared screen
- Control transfer confirmation
- Performance metrics

---

### Test 9: Chat Messaging

**Objective:** Verify real-time chat works in sessions

**Prerequisites:**
- Two users in active session (from Test 7)

**Steps:**
```
1. User 1 - Locate chat panel
   Expected: Chat visible on right side

2. User 1 - Type message
   Message: "Test message from User 1"
   Expected: Input accepted

3. User 1 - Send message
   Expected:
   - Button click sends message
   - Message appears in chat immediately
   - Timestamp shows current time
   - User 1 identified as sender

4. User 2 - Observe message
   Expected:
   - Message appears within 1 second
   - Sender identified as User 1
   - Message text correct
   - Timestamp correct

5. User 2 - Reply to message
   Message: "Test message from User 2"
   Expected: Same as steps 2-4

6. User 1 - Observe reply
   Expected: Reply appears within 1 second

7. User 1 - Send special characters
   Message: "Testing @user #hashtag emoji 🎉"
   Expected:
   - Special characters display correctly
   - Emojis render properly
   - No encoding issues
```

**Expected Results:**
- [ ] Chat panel loads
- [ ] Messages send successfully
- [ ] Messages appear in real-time
- [ ] Message order correct
- [ ] Timestamps accurate
- [ ] Special characters handled
- [ ] No chat errors in console

**Performance Metrics:**
- Message send: < 500ms
- Message receive: < 1s
- Chat load: < 2s

**Database Verification:**
```sql
-- Verify messages stored
SELECT * FROM session_messages
WHERE session_id = '[test-session-id]'
ORDER BY created_at DESC;

-- Expected: Multiple messages from both users
```

**Evidence:**
- Screenshot of chat with multiple messages
- Message delivery confirmation
- Special character handling evidence

---

### Test 10: Recording

**Objective:** Verify session recording works

**Prerequisites:**
- Two users in active session with video (from Test 7)

**Steps:**
```
1. User 1 (Session Creator) - Locate recording button
   Expected: Recording button visible

2. User 1 - Click "Start Recording"
   Expected:
   - Button changes to "Stop Recording"
   - Red recording indicator appears
   - Recording status shows in participants list
   - Notification sent to all participants

3. User 2 - Observe recording indicator
   Expected:
   - Recording indicator visible
   - "Being Recorded" message displayed
   - Agrees to recording (if consent required)

4. Continue session for 30 seconds
   Expected:
   - Recording active indicator remains
   - No performance degradation
   - Audio/video continue normally

5. User 1 - Click "Stop Recording"
   Expected:
   - Recording stops
   - Button changes back to "Start Recording"
   - Recording indicator disappears
   - Notification sent

6. Verify recording in dashboard
   Expected:
   - Recording appears in session page
   - Recording status shows "Processing"
   - Recording duration shown
```

**Expected Results:**
- [ ] Recording initiates within 2s
- [ ] Recording indicator visible
- [ ] No performance impact
- [ ] Recording stops cleanly
- [ ] Recording appears in session
- [ ] Recording metadata correct

**Performance Metrics:**
- Recording start: < 2s
- Recording stop: < 1s
- Recording file size: ~50MB per minute (depends on bitrate)

**HMS Verification:**
```
In 100ms Dashboard:
- Verify recording session created
- Verify recording file uploaded
- Verify recording duration matches
- Verify recording quality acceptable
```

**Evidence:**
- Screenshots of recording interface
- HMS dashboard showing recording
- Recording file verification

---

### Test 11: User Profile

**Objective:** Verify user profiles display and update correctly

**Prerequisites:**
- Logged in as test user

**Steps:**
```
1. Navigate to profile page
   Expected: Page loads within 2 seconds

2. Observe profile information
   Expected:
   - Name displays correctly
   - Profile picture shows (if uploaded)
   - Bio visible
   - Social links displayed
   - Join date shown
   - Statistics displayed:
     - Sessions created
     - Sessions participated
     - Total hours streamed
     - Followers/Following count

3. Edit profile (if allowed)
   Expected:
   - Edit button visible
   - Form opens with current data
   - Can modify fields
   - Can save changes
   - Changes persist on reload

4. Visit another user's profile
   Expected:
   - Profile loads
   - Can see public information
   - Follow button available
   - Cannot edit other user's profile
```

**Expected Results:**
- [ ] Profile loads quickly
- [ ] All data displays correctly
- [ ] Edit functionality works
- [ ] Changes persist
- [ ] Other user's profile accessible
- [ ] Privacy rules enforced

**Performance Metrics:**
- Profile page load: < 2s
- Edit form open: < 1s
- Save changes: < 1s

**Evidence:**
- Screenshots of profile pages
- Edit confirmation

---

### Test 12: Error Handling

**Objective:** Verify application handles errors gracefully

**Prerequisites:**
- Application is running

**Steps:**
```
1. Test 404 Error
   Navigate to: https://kulti.club/invalid-page
   Expected:
   - 404 page displays
   - Error message clear
   - Navigation options provided
   - No console errors

2. Test Invalid Data
   Attempt to submit form with invalid data
   Expected:
   - Form validation prevents submission
   - Error message displayed
   - User can correct and retry

3. Test Session Error (if possible)
   Expected:
   - Error message displays
   - User offered resolution options
   - No crashes or blank pages

4. Check error logging
   In Sentry dashboard:
   Expected:
   - Errors logged with context
   - Stack traces visible
   - User information attached
```

**Expected Results:**
- [ ] 404 page displays properly
- [ ] Form validation works
- [ ] Error messages clear
- [ ] Errors logged in Sentry
- [ ] No unhandled exceptions
- [ ] Graceful error recovery

**Evidence:**
- Screenshots of error pages
- Sentry error log verification

---

### Smoke Test Pass/Fail Criteria

**Passing Score:** All critical tests must pass

**Critical Tests (Must Pass):**
1. Site Accessibility
2. User Signup
3. User Login
4. Dashboard
5. Session Creation
6. Video Streaming
7. Chat Messaging

**Important Tests (Should Pass):**
8. Screen Sharing
9. Recording
10. User Profile
11. Error Handling

**Test Result Summary:**

```
SMOKE TEST RESULTS
==================
Date: [Current Date]
Tester: [Name]
Duration: [XX minutes]

Test Results:
✓ Test 1: Site Accessibility
✓ Test 2: User Signup
✓ Test 3: User Login
✓ Test 4: Dashboard
✓ Test 5: Session Creation
✓ Test 6: Join Session
✓ Test 7: Video Streaming
✓ Test 8: Screen Sharing
✓ Test 9: Chat Messaging
✓ Test 10: Recording
✓ Test 11: User Profile
✓ Test 12: Error Handling

Performance Metrics:
- Avg Page Load: 1.5s
- Error Rate: 0.1%
- Video Stream Latency: 2s
- Chat Latency: 500ms

Issues Found:
[List any minor issues]

Recommendation:
[GO / NO-GO with reasons]
```

---

## Part E: Rollback Procedures

### When to Trigger Rollback

**Immediate Rollback Triggers (< 5 minutes):**
- Complete service outage
- All users unable to login
- Database corruption detected
- Data loss confirmed
- Security breach confirmed
- Critical function broken (video, recording, etc.)
- Error rate > 20%

**Escalated Rollback Triggers (after investigation):**
- Error rate sustained > 10% for 15 minutes
- P95 response time > 5s for 15 minutes
- HMS service completely unavailable
- Multiple critical features broken
- Data integrity compromised

**Do Not Rollback (investigate instead):**
- Isolated feature not working (< 1% affected)
- Error rate 1-5% with known cause
- Minor UI issues
- Performance slightly degraded
- Specific user segment affected

### Rollback Decision Process

1. **Detection and Assessment** (2-3 minutes)
   - Incident detected via monitoring
   - Initial severity assessment
   - Impact scope determined
   - Root cause hypothesis

2. **Investigation** (5-10 minutes)
   - Review error logs
   - Check recent changes
   - Assess blast radius
   - Determine fix timeline

3. **Decision** (1-2 minutes)
   - Launch lead decides: Rollback vs Fix
   - Criteria: Can be fixed in < 30 minutes?
   - If no: Rollback
   - If yes and confident: Fix in place
   - When in doubt: Rollback

4. **Communication** (Immediate)
   - Notify all team members
   - Update status page
   - Notify users if needed
   - Document decision

### Step-by-Step Rollback Process

**Duration:** 10-20 minutes (target: < 15 minutes)

**Step 1: Stop Current Deployment** (1 minute)
```
1. In Vercel dashboard, stop any active deployments
2. Verify no other deployments in progress
3. Confirm all traffic routed to current version
4. Document stop timestamp
```

**Step 2: Verify Previous Version** (2 minutes)
```bash
# Check previous release tag
git tag --list --sort=-version:refname | head -5

# Expected output:
# v1.0.0 (current - problematic)
# v0.9.9 (previous - stable)
# v0.9.8
# v0.9.7

# Check if v0.9.9 is stable
git log v0.9.9 --oneline -n 5
```

**Step 3: Deploy Previous Version** (5-10 minutes)
```
1. In Vercel dashboard:
   - Click "Deployments" tab
   - Find v0.9.9 release deployment
   - Click "Redeploy"
   - Monitor deployment progress

2. Alternative - Manual deployment:
   - Checkout previous tag: git checkout v0.9.9
   - Push to rollback branch: git push origin rollback-v0.9.9
   - Trigger Vercel deployment from rollback branch
   - Monitor build and deployment

3. Verification:
   - Wait for "Ready" status
   - Verify URL is live
   - Check version number in app
```

**Step 4: Database Rollback Considerations** (decision point)

**If No Database Changes:**
- Proceed with application rollback only
- No additional steps needed
- Users' data unaffected

**If Database Migrations Occurred:**

Option A: Rollback Migration
```sql
-- Only if migration is reversible
-- Get current migration version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;

-- Reverse migration (if provided)
-- Example: downgrade from v0.9.10 to v0.9.9
-- Run migration down script
ROLLBACK TRANSACTION;
```

Option B: Keep Database as-is
```
-- Keep v1.0.0 database schema
-- Deploy v0.9.9 application code
-- Verify backward compatibility
-- Monitor for errors

-- Risk: If v0.9.9 doesn't support v1.0.0 schema, may cause errors
-- Benefit: Faster rollback, no data modification
```

**Decision Criteria:**
- If migration is backward compatible: Keep database
- If migration is not compatible: Consider rollback
- If unsure: Consult database administrator
- If critical: Choose fastest safe path

**Step 5: Verify Rollback** (3 minutes)
```
1. Navigate to https://kulti.club
   Expected:
   - Site loads
   - No errors in console
   - Version shows v0.9.9
   - All services operational

2. Run smoke tests (abbreviated):
   - Test login flow
   - Test dashboard loading
   - Test video stream
   - Test basic functionality

3. Monitor error rates:
   Expected: Error rate returns to baseline

4. Check user reports:
   Expected: Issues reported resolve
```

**Step 6: Communicate Status** (2 minutes)

**Internal Communication:**
```
To: Engineering Team
Subject: Rollback Complete - Kulti v1.0.0 to v0.9.9

Issue: [Describe what went wrong]
Action Taken: Rolled back to v0.9.9
Status: All systems operational
Impact: Users may experience brief disruption

Next Steps:
- Investigate root cause
- Plan fix and testing
- Schedule re-deployment

Timeline:
- Incident detected: [Time]
- Rollback initiated: [Time]
- Rollback complete: [Time]
- Duration: [Minutes]
```

**External Communication (if user-facing):**
```
To: Users
Subject: Service Disruption - Now Resolved

We experienced a brief service issue that affected [features].
We have rolled back to a stable version.

Status: Service fully operational
Incident Duration: [XX minutes]
Impact: [Describe user impact]

We apologize for any inconvenience and appreciate your patience.

Support: If issues persist, contact support@kulti.club
```

**Status Page Update:**
```
INCIDENT RESOLVED

We experienced an issue with [feature] at [time].
We have rolled back the application to restore service.

All systems are now operational.

Investigating: Root cause analysis in progress
Updates: Follow this page for updates
```

**Step 7: Incident Documentation** (5 minutes)

```markdown
# Incident Report: Production Deployment Rollback

**Incident ID:** INC-001
**Date:** [Date and Time]
**Severity:** P0 / P1 / P2

## Timeline
- 11:00 AM: Deployment started
- 11:05 AM: Smoke tests completed
- 11:15 AM: Issue detected (describe)
- 11:17 AM: Severity assessed
- 11:20 AM: Rollback decision
- 11:23 AM: Rollback initiated
- 11:30 AM: Rollback complete
- 11:35 AM: Service verified

## Impact
- Users affected: [Number]
- Duration: 20 minutes
- Features affected: [List]
- Data impact: [Description]

## Root Cause
[Describe what went wrong]

## Contributing Factors
[List factors that led to the issue]

## Resolution
- Rolled back to v0.9.9
- All systems verified
- Service restored

## Action Items
1. [ ] Investigate root cause thoroughly
2. [ ] Fix identified issues
3. [ ] Add test coverage for regression
4. [ ] Update deployment checklist
5. [ ] Schedule post-mortem meeting
6. [ ] Brief team on lessons learned

## Lessons Learned
[Document what to do differently]

## Sign-off
- Incident Commander: [Name]
- Launch Lead: [Name]
- Date: [Date]
```

**Step 8: Post-Rollback Monitoring** (next 2 hours)

```
After rollback complete, monitor:

1. Error Rates
   Expected: Baseline or lower
   Threshold: Alert if > 2%

2. User Reports
   Expected: Issues resolve within 10 minutes
   Threshold: Escalate if new errors reported

3. Performance Metrics
   Expected: Return to normal
   Threshold: P95 < 2s, P99 < 5s

4. Service Health
   Expected: All green
   Threshold: Alert on any red

Monitoring Duration: 2 hours post-rollback
```

### Data Considerations During Rollback

**User Data Created During v1.0.0:**
- Preserve all user accounts
- Preserve session data
- Preserve chat messages
- Preserve recordings

**Database Schema Changes:**
- If v1.0.0 added columns: Keep them (backward compatible)
- If v1.0.0 modified constraints: Verify compatibility
- If v1.0.0 removed tables: Critical - may cause errors

**How to Handle Data:**
```
Scenario 1: New columns added
Action: Keep columns, v0.9.9 ignores them

Scenario 2: Columns removed
Action: Critical - requires careful rollback
Option A: Restore database to v0.9.9 backup (loose recent data)
Option B: Add back removed columns temporarily
Decision: Launch lead makes call

Scenario 3: New tables added
Action: Keep tables, v0.9.9 won't use them

Scenario 4: Breaking schema changes
Action: Cannot simply rollback
Solution: Revert code changes while fixing schema
Or: Rollback to previous database version (data loss risk)
```

### Recovery After Rollback

**Immediate (within 1 hour):**
- [ ] Incident documented
- [ ] Root cause identified
- [ ] Team briefed on what went wrong
- [ ] Fix planned

**Short-term (within 24 hours):**
- [ ] Fix implemented and tested
- [ ] Test coverage added
- [ ] Code review completed
- [ ] Re-deployment planned

**Before Re-deployment:**
- [ ] All smoke tests pass on fix
- [ ] New tests pass
- [ ] Performance verified
- [ ] Security reviewed
- [ ] Team sign-off

---

## Part F: Team Roles and Responsibilities

### Launch Lead

**Role:** Overall coordination and decision authority

**Responsibilities:**
- [ ] Final go/no-go decision on launch
- [ ] Coordinate all teams during launch
- [ ] Make real-time deployment decisions
- [ ] Escalate issues appropriately
- [ ] Lead post-mortem if needed
- [ ] Update status communications

**During Launch:**
- Monitors war room
- Reviews metrics and logs
- Communicates status every 30 minutes
- Escalates issues immediately
- Decides on fix vs rollback

**Required Skills:**
- System architecture understanding
- Incident management experience
- Team leadership
- Decision-making under pressure

**Contact:** [Name and number]

---

### Engineering On-Call

**Role:** Technical implementation and troubleshooting

**Responsibilities:**
- [ ] Execute deployment steps
- [ ] Monitor technical systems during launch
- [ ] Troubleshoot issues
- [ ] Make code/configuration decisions
- [ ] Verify fixes before re-deployment
- [ ] Document technical decisions

**During Launch:**
- Execute deployment procedures
- Monitor logs and errors
- Debug issues
- Propose solutions
- Verify all systems operational

**Required Skills:**
- Full-stack development
- Deployment experience
- Debugging and troubleshooting
- Infrastructure knowledge

**Contact:** [Name and number]

**Standby Engineer:** [Name and number] (for escalation)

---

### Monitoring Team

**Role:** Real-time system observation

**Responsibilities:**
- [ ] Monitor all dashboards during launch
- [ ] Alert to issues immediately
- [ ] Track key metrics continuously
- [ ] Provide metric summaries hourly
- [ ] Verify monitoring systems operational
- [ ] Document observations

**During Launch:**
- Watch monitoring dashboards
- Alert on anomalies
- Provide metric updates
- Track performance trends
- Identify optimization opportunities

**Required Skills:**
- Monitoring tool expertise (Sentry, etc.)
- Metrics interpretation
- Alert threshold understanding
- Performance analysis

**Contact:** [Name and number]

**Dashboard Access:**
- Vercel Analytics: [URL]
- Sentry: [URL]
- 100ms Dashboard: [URL]
- Custom Monitoring: [URL]

---

### Communication Lead

**Role:** Internal and external communications

**Responsibilities:**
- [ ] Prepare all communication templates
- [ ] Manage status page updates
- [ ] Send user notifications as needed
- [ ] Coordinate team updates
- [ ] Document incident timeline
- [ ] Manage post-incident communications

**During Launch:**
- Send launch announcement
- Update status page if issues
- Coordinate team messages
- Notify users of any disruptions
- Keep stakeholders informed
- Document all communications

**Required Skills:**
- Clear written communication
- Crisis communication experience
- Multi-channel management
- Audience awareness

**Contact:** [Name and number]

**Communication Channels:**
- Status Page: [URL]
- Email: support@kulti.club
- Twitter/X: @kulturlive
- In-app notifications

---

### Database Administrator

**Role:** Database health and migrations

**Responsibilities:**
- [ ] Verify all migrations tested
- [ ] Monitor database performance
- [ ] Manage database rollback if needed
- [ ] Verify data integrity
- [ ] Monitor connections and queries
- [ ] Handle database-related escalations

**During Launch:**
- Verify migrations applied
- Monitor database metrics
- Be ready for rollback decision
- Handle database-specific issues
- Verify no data loss

**Required Skills:**
- PostgreSQL expertise
- Migration management
- Performance tuning
- Backup/restore procedures

**Contact:** [Name and number]

---

### Product Manager

**Role:** Product decisions and user impact

**Responsibilities:**
- [ ] Approve feature readiness
- [ ] Validate smoke test procedures
- [ ] Prioritize issues if rollback needed
- [ ] Make feature/flag decisions
- [ ] Coordinate user communication
- [ ] Track user feedback during launch

**During Launch:**
- Monitor for user-facing issues
- Gather user feedback
- Make decisions on prioritization
- Validate feature functionality
- Communicate with leadership

**Contact:** [Name and number]

---

### Escalation Contacts

**If on-call engineer unavailable:**
- [Senior Engineer Name] - [Phone]
- [Tech Lead Name] - [Phone]
- [CTO Name] - [Phone]

**If launch lead unavailable:**
- [VP Engineering] - [Phone]
- [CEO] - [Phone]

**If service provider issue (100ms, Supabase, etc.):**
- [Provider contact info]
- Escalate via support portal immediately

---

## Part G: Communication Templates

### Launch Announcement Template

```
Subject: Kulti is Live! 🚀

Hi Waitlist!

We're thrilled to announce that Kulti is officially live!

After months of development and testing, kulti.club is now available
to our community. This is the platform for collaborative live streaming
and raw building sessions.

What You Can Do Now:
- Sign up with your phone number
- Create live sessions with other builders
- Share your screen and collaborate
- Build community around your projects
- Watch and learn from real-time workflows

Get Started: https://kulti.club

Features Included:
✓ Multi-person video streaming
✓ Turn-based screen control
✓ Real-time chat
✓ Session recording
✓ User profiles
✓ And more!

Questions? Check out our Help page or email support@kulti.club

Let's build together.

The Kulti Team
```

---

### Issue Notification Template

```
Subject: [PLATFORM] Service Issue - Kulti

We're aware of an issue affecting [description].

What's happening:
[Brief technical description]

Impact:
- [List affected features]
- [Estimated users: X%]
- Started: [Time]

What we're doing:
- Investigating root cause
- Working on fix / Rolling back
- Providing updates every 15 minutes

Expected resolution: [Time estimate]

In the meantime:
- [Workaround if available]
- [Alternative features]

Status updates: https://status.kulti.club

Thanks for your patience.

The Kulti Team
```

---

### Rollback Notification Template

```
Subject: [RESOLVED] Brief Service Interruption

We experienced a service issue at [time] that affected [features].

Action Taken:
We rolled back our recent deployment to restore service immediately.

Current Status:
- All systems operational
- Service fully available
- No data loss

Impact:
- Duration: [X minutes]
- Users affected: [X%]
- Data affected: None

Investigation:
We're investigating the root cause and will share findings soon.
A fix is being developed and will be tested thoroughly before re-deployment.

Next Steps:
1. Root cause analysis complete [target: 4 hours]
2. Fix implemented and tested [target: 8 hours]
3. Safe re-deployment [target: 24 hours]

We apologize for any inconvenience and appreciate your patience.

The Kulti Team
```

---

### All-Clear / Resolution Template

```
Subject: ✓ Service Fully Restored - Kulti

Following the issue we reported earlier, we're happy to confirm that
all systems are now fully operational.

Issue Summary:
- What happened: [Brief description]
- Duration: [X minutes]
- Root cause: [Explanation]

Resolution:
- Rolled back to stable version
- Fixed underlying issue
- Re-deployed safely
- All systems verified operational

What We Fixed:
[Describe the actual fix]

What We're Doing Better:
[Describe improvements made]

Thank you for your patience during the disruption. This kind of issue
is exactly why we have robust monitoring and rollback procedures in place.

Questions? Email support@kulti.club

The Kulti Team
```

---

### Post-Launch Metrics Summary Template

```
Subject: Launch Day Metrics Report

LAUNCH DAY SUMMARY
==================

Timeline:
- Deployment: [Time] UTC
- Smoke tests: [Result]
- First users: [Time]
- Issues: [Count]

User Metrics:
- Total signups: [Number]
- Total logins: [Number]
- Sessions created: [Number]
- Participants: [Number]
- Active users at peak: [Number]

Performance Metrics:
- Avg response time: [Xms]
- P95 response time: [Xms]
- Error rate: [X%]
- Video latency: [Xms]
- Chat latency: [Xms]

Session Metrics:
- Sessions created: [Number]
- Avg session duration: [X minutes]
- Recordings initiated: [Number]
- Screen shares: [Number]
- Peak concurrent: [Number]

Infrastructure:
- Database connections: [X]
- Database CPU: [X%]
- API response times: [Xms avg]
- HMS room count: [X active]
- HMS bitrate: [X kbps avg]

Issues Encountered:
[List any issues and resolutions]

Recommendations:
[List improvements for next deployment]

Next Steps:
[List follow-up actions]

Launch Lead: [Name]
Date: [Date]
```

---

## Part H: Monitoring and Alerting During Launch

### Real-Time Dashboard Setup

**Primary Dashboard:**
```
URL: [Custom monitoring dashboard]
Refresh: Every 30 seconds
Metrics:
- Error rate (overall)
- Response time (P50, P95, P99)
- Active users
- Active sessions
- HMS metrics (rooms, bitrate, quality)
- Database connections
- API call success rate
```

**Sentry Dashboard:**
```
URL: https://sentry.io/[org]/[project]
Refresh: Continuous
Alert on:
- New error type
- Error rate > 5%
- Unhanded exception
- Performance degradation
```

**Vercel Dashboard:**
```
URL: https://vercel.com/[org]/[project]
Monitor:
- Function duration trends
- Memory usage
- Edge locations
- Status updates
```

**100ms Dashboard:**
```
URL: https://dashboard.100ms.live
Monitor:
- Room count
- Participant count
- Recording status
- Stream health
- Error logs
```

### Alert Thresholds

**Critical Alerts (Immediate Notification):**
- Error rate > 10%
- Complete service outage (0% traffic)
- Database connection error
- All HMS rooms failing
- Unhandled exceptions
- Data loss detected

**High Priority Alerts (Within 5 minutes):**
- Error rate > 5%
- P95 response time > 3s
- Video connection failures > 20%
- Database CPU > 90%
- Memory usage > 95%

**Medium Priority Alerts (Within 30 minutes):**
- Error rate > 2%
- P95 response time > 2s
- Any specific feature errors
- Slow database queries
- Cache hit rate < 70%

**Low Priority Alerts (Log and review):**
- Error rate 0.5-2%
- P95 response time 1-2s
- Isolated errors
- Performance variations

---

## Appendix: Useful Commands

### Vercel CLI Commands
```bash
# Deploy current branch
vercel deploy --prod

# Check deployment status
vercel status

# View logs
vercel logs [project-name]

# List deployments
vercel deployments

# Rollback to previous
vercel rollback
```

### Git Commands
```bash
# Tag release
git tag -a v1.0.0 -m "Production launch release"
git push origin v1.0.0

# View tags
git tag --list

# Checkout previous version
git checkout v0.9.9

# Create release branch
git checkout -b release/v1.0.0
git push origin release/v1.0.0
```

### Supabase CLI Commands
```bash
# Run migration
supabase db push

# View migrations
supabase migration list

# Check database status
supabase status

# Backup database
supabase db dump > backup.sql
```

### Monitoring Commands
```bash
# Check site accessibility
curl -I https://kulti.club

# Check API endpoint
curl https://kulti.club/api/health

# Check SSL certificate
openssl s_client -connect kulti.club:443

# Check DNS resolution
nslookup kulti.club
dig kulti.club
```

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Maintained By:** Engineering Team
**Review Frequency:** Quarterly or after each major deployment
