# Kulti Status Page Setup Guide

**Version:** 1.0
**Effective Date:** December 2025
**Last Updated:** November 2025

---

## Executive Summary

This guide covers the setup and management of Kulti's status page, which communicates system health and incidents to users in real-time.

**Status Page URL:** https://status.kulti.club (TBD - to be set up before launch)

**Key Objectives:**
- Provide real-time service status to users
- Communicate incidents transparently
- Reduce support requests during outages
- Build trust through status transparency
- Enable users to make informed decisions

---

## Part A: Status Page Configuration

### Service Selection

**Recommended Platform:** Statuspage.io (by Atlassian)

**Why Statuspage.io:**
- Easy integration with monitoring systems
- Professional appearance
- Customizable domain (status.kulti.club)
- Automatic incident webhooks
- Historical incident tracking
- Subscriber notifications
- Mobile-friendly design

**Alternative Options:**
- Instatus.com (lightweight, affordable)
- Freshstatus.com (integrated with Freshworks)
- Better Uptime (monitors + status page)

### Initial Setup

**Step 1: Create Statuspage Account**
1. Visit https://www.statuspage.io
2. Click "Sign up free"
3. Enter company name: "Kulti"
4. Create workspace: "Kulti Platform"
5. Choose plan: [Select based on needs]

**Step 2: Domain Configuration**
1. Purchase or configure domain: status.kulti.club
2. Update DNS to point to Statuspage.io
3. Verify domain ownership
4. Enable custom domain in settings

**Step 3: Brand and Appearance**
1. Upload Kulti logo
2. Set brand color: #00ff88 (Kulti green)
3. Configure header/footer
4. Customize favicon
5. Add company description
6. Set timezone: UTC

### Component Definition

**Component Hierarchy:**
```
Kulti Platform
├─ API & Core Services
│  ├─ Authentication
│  ├─ User Management
│  └─ Dashboard
├─ Video Sessions
│  ├─ Video Streaming (100ms)
│  ├─ Screen Sharing
│  └─ Recording System
├─ Database & Storage
│  ├─ Database (Supabase)
│  ├─ Session Data
│  └─ Recording Storage
├─ Supporting Services
│  ├─ SMS OTP (Twilio)
│  ├─ Email Service
│  ├─ AI Features (Anthropic)
│  └─ Chat System
└─ Infrastructure
   ├─ Web Application (Vercel)
   ├─ Edge Functions
   └─ CDN & Caching
```

**Component Definitions:**

**1. Authentication**
```
Name: Authentication & User Accounts
Description: User signup, login, and account management
Monitor: /api/auth/* endpoints
Depends on: None (critical)
Status: [Green/Red]
```

**2. Video Streaming**
```
Name: Video Streaming (100ms)
Description: Real-time video and audio for sessions
Monitor: HMS API health
Depends on: Video Sessions component
Status: [Green/Red]
```

**3. Screen Sharing**
```
Name: Screen Sharing
Description: Real-time screen sharing with control passing
Monitor: HMS screen share features
Depends on: Video Streaming component
Status: [Green/Red]
```

**4. Recording System**
```
Name: Session Recording
Description: Recording, processing, and playback of sessions
Monitor: Recording API and storage
Depends on: Database, Video Streaming
Status: [Green/Red]
```

**5. Database**
```
Name: Database (Supabase)
Description: Primary database for all application data
Monitor: Supabase dashboard
Depends on: None (critical)
Status: [Green/Red]
```

**6. Chat System**
```
Name: Real-time Chat
Description: Live messaging within sessions
Monitor: WebSocket/Realtime APIs
Depends on: Database
Status: [Green/Red]
```

**7. SMS OTP**
```
Name: SMS Verification (Twilio)
Description: SMS-based one-time passwords for authentication
Monitor: Twilio service
Depends on: None (authentication fallback)
Status: [Green/Red]
```

**8. Email Service**
```
Name: Email Notifications
Description: Email notifications and digests
Monitor: Email service status
Depends on: None (non-critical)
Status: [Green/Red]
```

**9. AI Features**
```
Name: AI Chat Assistant
Description: Claude AI integration for session assistance
Monitor: Anthropic API
Depends on: None (enhancement)
Status: [Green/Red]
```

**10. Web Application**
```
Name: Web Application
Description: Frontend and API hosting on Vercel
Monitor: Vercel dashboard
Depends on: None (critical)
Status: [Green/Red]
```

### Status Values

**For Each Component:**
```
Operational: ✓ Working normally
Degraded Performance: ⚠ Slow but working
Partial Outage: ⚠ Some users affected
Major Outage: ✗ Service unavailable
Maintenance: 🔧 Planned maintenance
```

### Incident Templates

**Create incident notification templates for common scenarios:**

**Template 1: Performance Degradation**
```
Title: [Service] Experiencing Slow Response Times

We are investigating reports of slower than normal response times
for [service]. We are actively working to resolve this.

Status: Investigating
Affected Component: [Service]
Started: [Time UTC]

Updates:
[Timestamp] - Still investigating root cause
[Timestamp] - No service unavailability, performance issue only
```

**Template 2: Service Outage**
```
Title: [Service] Currently Unavailable

We are aware that [service] is currently unavailable.
Our team is actively working to restore the service.

Status: Investigating
Affected Users: [Description]
Started: [Time UTC]

Workaround: [If available]

We will provide updates every 15 minutes.
```

**Template 3: Partial Outage**
```
Title: [Service] Partially Unavailable

Some users are experiencing issues with [service].
We are investigating and working on a resolution.

Status: Investigating
Affected: [X% of users] or [User segment]
Started: [Time UTC]

Most users are unaffected. If you experience issues:
[Troubleshooting steps or workaround]
```

**Template 4: Maintenance**
```
Title: Scheduled Maintenance - [Service]

We have scheduled maintenance for [service] to improve performance
and reliability.

Status: Maintenance in progress
Affected: [Service and impact]
Duration: [X to Y minutes]
Scheduled: [Date and time]

Expected completion: [Time UTC]
```

**Template 5: Resolution**
```
Title: ✓ [Service] Restored

[Service] has been restored and is working normally.

Incident: [Brief description]
Duration: [X minutes]
Root Cause: [Explanation]
Impact: [Who was affected]

We apologize for the disruption.
Incident tracking: [Link to detailed post-mortem when available]
```

---

## Part B: Update Procedures

### When to Post Updates

**Automatic Posting (no manual action needed):**
- Scheduled maintenance windows (pre-planned)
- Service becomes unavailable (automated detection)

**Manual Posting Required:**
- Incident detected and confirmed (< 5 minutes)
- Status changes (investigating → resolved)
- New information on ongoing incidents (every 15 minutes)

### Update Frequency During Incidents

**P0 Incidents (Critical):**
```
Before resolution:
- Initial post: < 5 minutes
- Updates: Every 5-15 minutes
- Detailed timeline: During post-mortem

During resolution:
- First indication of fix: Immediate post
- Testing: Update when confirmed working
- Full resolution: Update when stable
```

**P1 Incidents (High):**
```
Before resolution:
- Initial post: < 10 minutes
- Updates: Every 15-30 minutes
- Investigation findings: When available

During resolution:
- Estimated time: Post immediately
- Fix deployed: Confirm working
- Full resolution: When stable
```

**P2 Incidents (Medium):**
```
Before resolution:
- Initial post: < 30 minutes
- Updates: Every 30-60 minutes or once daily
- Status: Only if changes

During resolution:
- Fix available: Update with timeline
- Deployed: Confirm working
- Full resolution: Final update
```

### Update Content Guidelines

**What to Include:**

```
INITIAL INCIDENT POST:
✓ What is happening (user-friendly explanation)
✓ Which services are affected
✓ What users should expect
✓ When we'll next update
✗ Technical jargon
✗ Blame or excuses
✗ Specific error codes

INVESTIGATION UPDATE:
✓ Latest findings
✓ What we're doing to fix it
✓ Estimated time to resolution
✓ Workaround if available
✓ Appreciation for patience
✗ Speculation
✗ Incomplete information
✗ Over-technical details
```

**Update Template:**

```
[Time UTC] - [Status change]

Update: [Brief description of change or finding]
- Finding: [What we discovered]
- Action: [What we're doing about it]
- Impact: [Who is affected]
- ETA: [Expected resolution time or next update]

[Optional: Workaround or next steps]
```

### Resolution Notifications

**Incident Resolved - What to Do:**

1. **Update Status Page**
```
1. Find the incident
2. Set component status to "Operational"
3. Post final update:
   - "This incident has been resolved"
   - "All systems are now operational"
   - "Brief summary of duration"
   - "Root cause identified: [explanation]"
   - Link to post-mortem when available

4. Set incident to "Resolved"
5. Post-mortem link (when available)
6. Apologize for disruption
7. Thank users for patience
```

2. **Email Notifications**
```
Status page auto-sends "resolved" email to subscribers
No additional action needed if using Statuspage.io
```

3. **Social Media**
```
Tweet/post:
"✓ [Service] is now fully operational.
Incident lasted X minutes.
Root cause: [brief explanation]
Thank you for your patience!"
```

### Maintenance Window Procedures

**Before Scheduled Maintenance:**

**72 Hours Before:**
- [ ] Create maintenance incident in Statuspage
- [ ] Set scheduled time
- [ ] Describe what's being maintained
- [ ] Estimate duration
- [ ] Notify users via email (auto-send)

**24 Hours Before:**
- [ ] Confirm maintenance time
- [ ] Brief team on procedures
- [ ] Prepare rollback plan
- [ ] Verify backup procedures

**1 Hour Before:**
- [ ] Update status page: "Maintenance in progress"
- [ ] Post: "Maintenance starting in 1 hour"
- [ ] Brief on-call team
- [ ] Verify monitoring active

**During Maintenance:**
- [ ] Don't perform unplanned work
- [ ] Stick to planned scope
- [ ] Monitor for issues
- [ ] Post updates every 30 minutes

**At Completion:**
- [ ] Test all services working
- [ ] Update status page: "Operational"
- [ ] Post final update
- [ ] Thank users
- [ ] Document any issues encountered

**After Maintenance:**
- [ ] Monitor for 1 hour
- [ ] Have engineers on standby
- [ ] Track any issues that arise

---

## Part C: Component Status Management

### Determining Component Status

**Operational (Green) - All Good:**
```
Criteria:
- ✓ Error rate < 1%
- ✓ P95 response time < 2s
- ✓ No active incidents
- ✓ Service fully available
- ✓ User reports: None

Action: No status update needed
Keep: "Operational"
```

**Degraded Performance (Yellow) - Slow:**
```
Criteria:
- ⚠ Error rate 1-5%
- ⚠ P95 response time 2-5s
- ⚠ Users can access but slow
- ⚠ Workaround available

Action: Post warning
Update component to: "Degraded Performance"
Message: "Experiencing slower response times"
```

**Partial Outage (Yellow) - Some Users Down:**
```
Criteria:
- ⚠ Error rate > 5%
- ⚠ Specific users/regions affected
- ⚠ Core feature broken for some
- ⚠ Majority can still access

Action: Post incident
Update component to: "Partial Outage"
Message: "Some users experiencing issues"
Impact: [X% of users]
```

**Major Outage (Red) - Service Down:**
```
Criteria:
- ✗ Service completely unavailable
- ✗ All users affected
- ✗ Core functionality broken
- ✗ No workaround

Action: Post critical incident immediately
Update component to: "Major Outage"
Message: "[Service] is currently unavailable"
```

**Maintenance (Blue) - Planned Work:**
```
Criteria:
- 🔧 Planned maintenance
- 🔧 Service temporarily unavailable
- 🔧 Time and duration known
- 🔧 Users pre-notified

Action: Post maintenance window
Update component to: "Maintenance"
Message: "Scheduled maintenance"
Time: [Exact duration]
```

### Updating Component Status

**In Statuspage.io:**

1. Navigate to "Components"
2. Find component to update
3. Click component name
4. Select status:
   - Operational
   - Degraded Performance
   - Partial Outage
   - Major Outage
   - Maintenance
5. Click "Save"
6. Create incident (if needed) with details
7. Affected users notified automatically

### Dependent Component Updates

**When one component fails, update dependents:**

```
Database (Supabase) goes down:
├─ Update Database status: "Major Outage"
├─ Update Session Data: "Major Outage"
├─ Update Chat System: "Major Outage"
├─ Update User Management: "Major Outage"
├─ Update API: "Degraded" (returns errors)
└─ Update Web App: "Operational" (frontend ok, can't load data)

Video Streaming fails:
├─ Update Video Streaming: "Major Outage"
├─ Update Screen Sharing: "Major Outage"
├─ Update Recording System: "Degraded"
├─ Update Chat System: "Operational" (still works)
└─ Update Sessions: "Degraded" (can't video)
```

---

## Part D: Integration with Monitoring

### Webhook Integration

**Connect Monitoring Systems to Status Page:**

**Sentry to Statuspage:**
```
1. In Sentry:
   - Settings > Integrations
   - Search for "Statuspage"
   - Configure Statuspage integration
   - Add webhook URL

2. In Statuspage:
   - Settings > API
   - Generate API token
   - Add to Sentry integration

Result: High error rates create incidents automatically
```

**Vercel to Statuspage:**
```
1. Create custom monitoring webhook
2. Vercel sends deployment/error data
3. Webhook evaluates severity
4. Auto-creates incident if critical

Setup:
POST /api/webhooks/vercel-status
Body: { error_rate, response_time, status }
Response: Create Statuspage incident
```

**Custom Health Check:**
```
// Create endpoint that Statuspage can monitor
GET /api/health
Response: {
  status: 'ok' | 'degraded' | 'down',
  timestamp: '2025-12-01T10:00:00Z',
  checks: {
    database: 'ok' | 'down',
    hms: 'ok' | 'down',
    services: {}
  }
}

Statuspage settings:
- Monitor: /api/health
- Frequency: Every 60 seconds
- Alert if: Fails 3 times in a row
```

### Manual Incident Creation

**When Monitoring Alert Received:**

1. **Acknowledge** the alert immediately
2. **Assess** severity (P0/P1/P2)
3. **Create** incident in Statuspage (if P0 or P1)

**Create Incident Steps:**

```
1. Visit Statuspage.io dashboard
2. Click "New Incident"
3. Fill in:
   - Title: [Service] [Issue type]
   - Status: Investigating
   - Components affected: [Select]
   - Severity: [Critical/Major/Minor]
   - Description: [What's happening]
4. Click "Create Incident"
5. Post initial update immediately
6. Continue adding updates as investigation progresses
7. Close when resolved
```

---

## Part E: Subscriber Management

### Notification Channels

**Statuspage Sends Notifications Via:**
- Email (auto-subscribed if user provides email)
- SMS (if user subscribes)
- Webhook (for integrations)
- RSS feed
- Public status page

### Subscription Management

**User Subscription Options:**

```
All Users Can:
- [ ] View status page publicly
- [ ] Subscribe to email updates
- [ ] Subscribe to SMS updates
- [ ] Subscribe to specific components only
- [ ] Check RSS feed
- [ ] Enable push notifications
```

**Team Subscription:**

```
Marketing: Subscribe to all
Engineering: Subscribe to technical components
Support: Subscribe to all
Product: Subscribe to high-impact services
Operations: Subscribe to infrastructure
```

### Notification Frequency

**Email Notifications Sent For:**
```
- New incidents: Immediately
- Incident updates: With each update
- Resolved incidents: When marked resolved
- Scheduled maintenance: 72h, 24h, 1h before
- Post-mortem available: When published
```

---

## Part F: Communication Best Practices

### Tone and Language

**DO:**
- Use clear, jargon-free language
- Acknowledge the impact on users
- Provide specific, actionable information
- Apologize for disruption
- Appreciate user patience
- Provide regular updates
- Give realistic time estimates
- Explain root cause when resolved

**DON'T:**
- Use technical jargon
- Make excuses
- Blame third parties
- Provide no information
- Go silent
- Give overly optimistic estimates
- Share sensitive details

**Example Good Update:**
```
"We're investigating why some users are unable to start video calls.
Other features are working normally. We don't have a root cause yet
but are actively investigating. We'll post an update in 15 minutes."
```

**Example Bad Update:**
```
"Database connection pool exhaustion causing 500 errors.
Scaling horizontally. ETA 5 minutes."
(Too technical, no user context, unclear impact)
```

### Crisis Communication

**During Major Outage:**

1. **First Message (within 5 minutes):**
```
"We're aware that [service] is down. We're investigating and will
provide updates every 15 minutes. We apologize for this disruption."
```

2. **Every 15 Minutes:**
```
"Update: [What we've found]
Action: [What we're doing]
ETA: [Estimated resolution time or next update]"
```

3. **When Resolved:**
```
"✓ Service is restored and fully operational.
Duration: [X minutes]
Root Cause: [Brief explanation]
We're sorry for the disruption and thank you for your patience."
```

4. **Post-Incident:**
```
"Post-mortem and detailed explanation available at [link]
We've taken these steps to prevent recurrence: [List]"
```

---

## Part G: Post-Mortem and Analysis

### After Incident Closed

**Create Post-Mortem Document:**
```
1. In Statuspage, close incident
2. Add link to post-mortem document
3. Summary of incident for public view
4. Post-mortem public or internal (per severity)
```

**Public Post-Mortem Should Include:**
```
- What happened (user-friendly explanation)
- When it happened and duration
- How many users were affected
- Root cause (non-technical summary)
- What we did to fix it
- What we're doing to prevent it
- Timeline of events
- Apology and appreciation
```

**Private Post-Mortem Should Include:**
```
- Detailed timeline
- Technical root cause
- Contributing factors
- What went well
- What could improve
- Action items to prevent recurrence
- Owner assignment
- Target completion dates
```

---

## Part H: Status Page Maintenance

### Weekly Review

**Every Monday:**
```
1. Check for stale incidents (> 7 days old)
2. Review open incidents (any still open?)
3. Check component status accurate
4. Review subscriber count
5. Check for any maintenance scheduled
6. Verify integrations working
7. Test status page accessibility
```

### Monthly Review

**End of Month:**
```
1. Review incident frequency
   - How many incidents this month?
   - P0: [count]
   - P1: [count]
   - P2: [count]

2. Review MTTR (Mean Time to Recovery)
   - Average time to resolve incidents
   - Any incidents > 1 hour?

3. Review communication effectiveness
   - User feedback on communication
   - Any complaints about slow updates?

4. Review infrastructure
   - Any performance issues?
   - Any unexpected outages?
   - Actionable improvements?

5. Plan improvements
   - Better alerting?
   - Faster response?
   - More transparency?
```

### Quarterly Review

**Every 3 Months:**
```
1. Review status page design
   - Is it professional?
   - Is it easy to understand?
   - Is it mobile-friendly?

2. Review component list
   - Are all services represented?
   - Any components no longer used?
   - Any new components to add?

3. Review incident trends
   - Are we getting more stable?
   - What type of incidents most common?
   - Patterns in root causes?

4. Review communication
   - Are updates clear?
   - Are response times good?
   - User satisfaction with transparency?

5. Plan improvements
   - Update design?
   - Add automation?
   - Improve monitoring?
   - Enhance communication?
```

---

## Part I: Status Page Launch Checklist

**Before Launch Day:**

- [ ] Status page configured
- [ ] Custom domain set up (status.kulti.club)
- [ ] Logo and branding applied
- [ ] All components defined
- [ ] Incident templates created
- [ ] Monitoring integrated
- [ ] Team trained on procedures
- [ ] Subscriber notification tested
- [ ] Status page mobile-friendly
- [ ] Public announcement prepared
- [ ] Social media links to status page
- [ ] Help page references status page
- [ ] Team bookmarked and can access
- [ ] Mobile app push notifications configured
- [ ] Test incident created and resolved

**At Launch:**

- [ ] Post launch announcement
- [ ] Set status page to "Operational"
- [ ] Monitor incidents during first 24h
- [ ] Brief team on procedures
- [ ] Ensure marketing can find link
- [ ] Train support team on status page
- [ ] Add status page link to help

---

## Appendix: Status Page Links

**Primary Links:**
```
Status Page (Public): https://status.kulti.club
Status Page (Admin): https://manage.statuspage.io/[workspace]
Statuspage.io Dashboard: https://www.statuspage.io
Statuspage API Docs: https://www.statuspage.io/api
```

**Internal Links:**
```
Incident Response Plan: /Docs/INCIDENT_RESPONSE_PLAN.md
Launch Runbook: /Docs/LAUNCH_RUNBOOK.md
Monitoring Plan: /Docs/POST_LAUNCH_MONITORING.md
```

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Maintained By:** Communications Team
**Review Frequency:** Quarterly
