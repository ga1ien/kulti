# Kulti Team Onboarding Guide

**Version:** 1.0
**Effective Date:** December 2025
**Last Updated:** November 2025

---

## Executive Summary

This guide provides comprehensive onboarding instructions for new team members joining Kulti, covering developer setup, production access, operations training, and knowledge base resources.

**Estimated Time to Full Productivity:** 1-2 weeks

---

## Part A: Developer Setup

### Prerequisite Access

**Before Starting:**

```
Request Access To:
- [ ] GitHub repository
- [ ] Vercel project
- [ ] Supabase project (staging)
- [ ] Sentry project
- [ ] 100ms account
- [ ] Slack workspace
- [ ] Google Drive (shared docs)
- [ ] Notion or internal wiki (if used)
```

### Local Environment Setup

**Step 1: Install Prerequisites**

```bash
# Required tools:
- Node.js (v18+) - https://nodejs.org/
- npm or yarn (npm recommended)
- Git (v2.30+) - https://git-scm.com/
- Code editor (VS Code recommended)
- Docker (optional, for database simulation)

# Verify installations:
node --version    # Should be v18.0.0 or higher
npm --version     # Should be v8.0.0 or higher
git --version     # Should be v2.30.0 or higher
```

**Step 2: Clone Repository**

```bash
# Clone the repository
git clone https://github.com/[org]/kulti.git
cd kulti

# Verify clone
git log --oneline -n 5
# Should show recent commits
```

**Step 3: Install Dependencies**

```bash
# Install npm packages
npm install

# Verify installation
npm list
# Should show all packages installed without errors

# Expected packages:
# - next
# - react
# - @100ms/react-sdk
# - supabase-js
# - typescript
# - tailwindcss
# - etc.
```

**Step 4: Environment Configuration**

```bash
# Copy environment template
cp .env.example .env.local

# Get environment variables from secure storage
# (Ask team lead for credentials)

# Update .env.local with:
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
SUPABASE_SERVICE_KEY=[key]
NEXT_PUBLIC_HMS_AUTH_TOKEN=[token]
HMS_MANAGEMENT_TOKEN=[token]
SENTRY_AUTH_TOKEN=[token]
SENTRY_PROJECT_ID=[id]
ANTHROPIC_API_KEY=[key]
UPSTASH_REDIS_REST_URL=[url]
UPSTASH_REDIS_REST_TOKEN=[token]
TWILIO_ACCOUNT_SID=[sid]
TWILIO_AUTH_TOKEN=[token]
TWILIO_PHONE_NUMBER=[number]

# Important: Do NOT commit .env.local to git
# Verify it's in .gitignore
cat .gitignore | grep env.local
```

**Step 5: Database Setup (Local)**

```bash
# Start local database (if using Docker Compose)
docker-compose up -d

# Or use Supabase local development
supabase start

# Verify database connection
npm run db:check

# Expected output: "Database connected successfully"
```

**Step 6: Build and Run**

```bash
# Build project
npm run build

# Expected: Build completes with 0 errors
# Check: No critical TypeScript errors

# Start development server
npm run dev

# Expected: Server running on http://localhost:3000
# Check: No errors in console

# Visit http://localhost:3000 in browser
# Expected: Landing page loads
```

**Step 7: Run Tests**

```bash
# Run test suite
npm run test

# Expected: All tests passing
# Target: 70%+ coverage

# Run type checker
npm run type-check

# Expected: 0 TypeScript errors
# Check: Strict mode enabled

# Run linter
npm run lint

# Expected: 0 ESLint errors
# Check: Code style compliant
```

### Access Levels and Permissions

**Developer Access (All Developers):**

```
GitHub:
- [ ] Read access to repository
- [ ] Can create branches
- [ ] Can create pull requests
- [ ] Cannot merge to main

Vercel (Staging):
- [ ] Can view deployments
- [ ] Can view logs
- [ ] Can view analytics
- [ ] Cannot trigger production deploy

Supabase (Staging):
- [ ] Can view database schema
- [ ] Can run queries in SQL editor
- [ ] Can view logs
- [ ] Cannot drop tables or delete data

Sentry:
- [ ] Can view errors
- [ ] Can view performance metrics
- [ ] Can create issues
- [ ] Read-only access
```

**Senior Developer Access (Lead + Seniors):**

```
GitHub:
- [ ] Everything developer has
- [ ] Can merge pull requests
- [ ] Can push to main (with review)
- [ ] Can manage branches

Vercel (Staging + Production):
- [ ] Everything developer has
- [ ] Can view production deployments
- [ ] Can view production logs
- [ ] Can trigger staging deploys
- [ ] Cannot trigger production without approval

Supabase (Staging + Production Read):
- [ ] Everything developer has
- [ ] Can view production database schema
- [ ] Can view production logs
- [ ] Cannot modify production database

Sentry (All Projects):
- [ ] Everything developer has
- [ ] Can view all projects
- [ ] Can create alerts
```

**DevOps/Operations Access:**

```
All access needed by senior developers, plus:

GitHub:
- [ ] Can manage branches
- [ ] Can manage deployments
- [ ] Can manage webhooks

Vercel (All):
- [ ] Full access to all environments
- [ ] Can trigger any deployment
- [ ] Can view and modify settings
- [ ] Can manage environment variables
- [ ] Can configure integrations

Supabase (All):
- [ ] Full database access
- [ ] Can modify schema
- [ ] Can manage backups
- [ ] Can view all logs
- [ ] Can manage replication

AWS/Cloud:
- [ ] Access to storage buckets
- [ ] Access to CDN configuration
- [ ] Can manage backups
```

---

## Part B: Production Access

### Who Needs Production Access

**Always Need:**
- Lead Engineers (code deployments)
- DevOps Engineers (infrastructure)
- VP Engineering (incident management)

**May Need (Temporary):**
- Specific engineers (for specific incidents)
- Product Manager (read-only analytics)
- Operations team (monitoring and response)

**Should Not Have:**
- Junior developers (unless supervised)
- Contractors (unless explicitly approved)
- Interns (unless supervised)

### Access Request Process

**Step 1: Request Submission**

```
Email to: engineering-lead@kulti.club
Subject: Production Access Request - [Name]

Body:
Name: [Full name]
Role: [Role]
Reason: [Why you need access]
Duration: [Permanent / Temporary until [date]]
Supervisor: [Who's requesting this]
Required Permissions:
- [ ] Vercel production view
- [ ] Vercel production deploy
- [ ] Supabase production read
- [ ] Supabase production write
- [ ] AWS console access
- [ ] etc.
```

**Step 2: Security Training**

```
Before access granted, complete:
- [ ] Security fundamentals training (1 hour)
- [ ] Secure credential handling (30 min)
- [ ] Incident response procedures (1 hour)
- [ ] Data privacy and compliance (30 min)

Training provided by: Security lead or VP Engineering
Certification: Email confirmation of completion
Valid for: 1 year, must renew annually
```

**Step 3: Access Approval**

```
Required Approvers:
- VP Engineering (always)
- Security lead (if new or extensive access)
- CFO (if finance access)

Approval Process:
1. Submit request with training completion
2. Awaits approval (typically 1-2 business days)
3. Credentials provided once approved
4. Access audited monthly
```

**Step 4: Credential Setup**

```
Upon approval:
1. [ ] GitHub access granted
2. [ ] Vercel access granted
3. [ ] Supabase access granted
4. [ ] 100ms access granted (if needed)
5. [ ] Sentry access granted (if needed)
6. [ ] AWS access granted (if needed)
7. [ ] Password manager access granted
8. [ ] Two-factor authentication enabled
```

### Security Training Requirements

**All Team Members:**

```
1. Security Fundamentals (1 hour)
   - Security policies
   - Credential management
   - Data classification
   - Incident reporting
   - Secure development practices

2. Code Security (30 min)
   - OWASP top 10
   - Input validation
   - SQL injection prevention
   - XSS prevention
   - Rate limiting

3. Compliance (30 min)
   - Privacy policy
   - Data retention
   - User rights
   - GDPR/data laws
   - Compliance obligations
```

**Production Access Only:**

```
4. Production Security (1 hour)
   - Production access policies
   - Change management
   - Incident response
   - Audit logging
   - Credentials and secrets

5. Monitoring and Alerting (1 hour)
   - How to monitor production
   - How to respond to alerts
   - Escalation procedures
   - Status page updates
   - User communication
```

### Audit Logging

**All Production Access Logged:**

```
What's Logged:
- Who accessed what resource
- When access occurred
- What actions were taken
- Results of actions
- Duration of access

Access Logs Location:
- GitHub: Push logs, merge logs
- Vercel: Deployment logs
- Supabase: Audit logs in dashboard
- AWS: CloudTrail logs
- Sentry: User activity logs

Retention: 1 year minimum
Review: Monthly access audit
```

**Monthly Access Review:**

```
Every month:
1. [ ] Review production access list
2. [ ] Verify all access is justified
3. [ ] Remove access for departed employees
4. [ ] Update access for role changes
5. [ ] Audit high-risk activities
6. [ ] Report to VP Engineering
```

### Offboarding Procedures

**When Employee Leaves:**

```
Immediate (Day 1):
- [ ] Disable GitHub access
- [ ] Disable Vercel access
- [ ] Disable Supabase access
- [ ] Revoke API keys and tokens
- [ ] Remove from Slack
- [ ] Collect equipment

Within 24 Hours:
- [ ] Remove from all services
- [ ] Change any shared passwords
- [ ] Audit what they accessed
- [ ] Document final activity
- [ ] Notify security team

Within 1 Week:
- [ ] Review all their commits/changes
- [ ] Ensure code quality standards met
- [ ] Archive their documentation
- [ ] Update access control lists
- [ ] Complete offboarding checklist
```

---

## Part C: Operations Training

### Monitoring Dashboard Walkthrough

**Goal:** Understand how to monitor production system

**Duration:** 1 hour with experienced team member

**Topics:**

```
1. Vercel Analytics (15 min)
   - [ ] How to access analytics
   - [ ] Understanding response times
   - [ ] Identifying slow endpoints
   - [ ] Reading deployment history
   - [ ] Interpreting metrics

2. Sentry Error Tracking (15 min)
   - [ ] How to access Sentry
   - [ ] Understanding error grouping
   - [ ] Finding stack traces
   - [ ] Identifying patterns
   - [ ] Creating alerts

3. Custom Monitoring Dashboard (15 min)
   - [ ] How to access dashboard
   - [ ] Understanding metrics
   - [ ] Setting thresholds
   - [ ] Reading graphs/charts
   - [ ] Exporting data

4. Status Page (15 min)
   - [ ] How to check status
   - [ ] Understanding incident history
   - [ ] Component status meanings
   - [ ] How to create incidents
   - [ ] How to update status
```

### Alert Interpretation

**Learn to Interpret Alerts:**

```
Alert: "Error Rate > 5%"
- Meaning: More than 5% of requests are failing
- Severity: High (needs immediate attention)
- Action: Investigate Sentry for error patterns
- Response: < 15 minutes

Alert: "P95 Response Time > 3s"
- Meaning: 95% of requests taking longer than 3 seconds
- Severity: Medium (monitor, investigate)
- Action: Check database performance, external services
- Response: < 1 hour

Alert: "Database Connections > 50"
- Meaning: More than 50 active database connections
- Severity: Medium (approaching limit)
- Action: Check for connection leaks, scale if needed
- Response: < 1 hour

Alert: "Disk Space < 20%"
- Meaning: Less than 20% free disk space
- Severity: High (may impact service)
- Action: Review logs, clean up, scale storage
- Response: < 2 hours
```

### Incident Response Procedures

**Quick Start:**

```
1. ALERT RECEIVED
   → Acknowledge alert in monitoring system
   → Post in #incident-response Slack

2. ASSESS SEVERITY
   → Check: How many users affected?
   → Check: What's the error?
   → Check: Is it degradation or outage?
   → Determine: P0 / P1 / P2

3. IF P0 (CRITICAL):
   → Page incident commander immediately
   → Page on-call engineer
   → Initiate war room
   → See INCIDENT_RESPONSE_PLAN.md

4. IF P1 (HIGH):
   → Page incident commander
   → Begin investigation
   → Update status page
   → See incident response plan

5. IF P2 (MEDIUM):
   → Assign to owner
   → Update tracking system
   → Investigate during business hours
   → Document findings

6. INVESTIGATE
   → Check error logs (Sentry)
   → Check metrics (response time, CPU, etc.)
   → Check recent changes (deployments, migrations)
   → Form hypothesis of cause

7. RESOLVE
   → Fix code issue, or
   → Rollback deployment, or
   → Scale infrastructure, or
   → Implement workaround

8. VERIFY
   → Run smoke tests
   → Check error rates returned to normal
   → Confirm user reports stopped
   → Monitor for 30 minutes

9. DOCUMENT
   → Post on status page: "Resolved"
   → Notify team and users
   → Schedule post-mortem
   → Create action items
```

### Deployment Process

**Who Can Deploy:**

```
Staging: Any developer
Production: Senior engineers (with approval)

Staging Deployment (Self-Service):
1. Open Vercel dashboard
2. Click "Deploy"
3. Select branch
4. Verify preview link works
5. Monitoring happens automatically

Production Deployment (Controlled):
1. Code merged to main (peer reviewed)
2. All tests passing
3. Staging verified
4. Approval from lead engineer
5. Schedule deployment window
6. Execute deployment
7. Monitor actively
8. Have rollback ready
```

**Deployment Checklist:**

```
Before Deploying:
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No other deployments in progress
- [ ] Monitoring dashboard open
- [ ] Team aware of deployment
- [ ] Rollback plan documented

During Deployment:
- [ ] Monitor Vercel deployment status
- [ ] Watch error rates in Sentry
- [ ] Check performance metrics
- [ ] Look for unexpected errors
- [ ] Monitor database queries
- [ ] Watch user reports

After Deployment:
- [ ] Run smoke tests
- [ ] Verify key features working
- [ ] Check error rate is normal
- [ ] Monitor for 1 hour
- [ ] Document any issues
- [ ] Update team
```

### Rollback Procedures

**When to Rollback:**

```
Rollback Immediately If:
- Service completely unavailable
- Error rate > 20%
- Data corruption detected
- Critical feature broken
- Security issue discovered

Rollback After Investigation If:
- Error rate > 10% for > 15 minutes
- Multiple critical errors
- Cannot fix quickly
- Cause unclear
```

**How to Rollback:**

See LAUNCH_RUNBOOK.md Part E for detailed rollback procedures

**Quick Rollback Steps:**

```
1. In Vercel dashboard
2. Go to Deployments
3. Find previous stable version
4. Click "Redeploy"
5. Monitor for errors
6. Verify service restored
7. Document incident
```

---

## Part D: Knowledge Base

### Architecture Overview

**High-Level Architecture:**

```
┌─────────────────────────────────────┐
│     User's Browser                  │
│     (React Application)             │
└────────────┬────────────────────────┘
             │ HTTPS
┌────────────▼────────────────────────┐
│     Vercel (Frontend + API)         │
│  - Next.js pages & components       │
│  - API routes (/api/*)              │
│  - Edge functions                   │
└────────────┬────────────────────────┘
    ┌────────┼────────┬────────────┐
    │        │        │            │
    │        │        │            │
┌───▼─┐  ┌──▼──┐  ┌──▼──┐  ┌─────▼───┐
│ SMS │  │Auth │  │ HMS  │  │ Storage │
│(OTP)│  │     │  │Video │  │(S3)     │
└─────┘  └──┬──┘  └──┬───┘  └─────────┘
  Twilio │Supabase  100ms
         │
      ┌──▼────────────────────────┐
      │  Supabase                  │
      │  - PostgreSQL Database     │
      │  - Auth Service            │
      │  - Realtime (WebSockets)   │
      │  - Storage                 │
      └────────────────────────────┘
```

**Key Dependencies:**

```
Frontend:
- Next.js 14 (React framework)
- React 18 (UI library)
- TailwindCSS (styling)
- TypeScript (type safety)
- SWR (data fetching)

Backend:
- Next.js API routes
- Zod (validation)
- TypeScript
- Node.js runtime

Database:
- PostgreSQL (Supabase)
- Migrations (Supabase)
- Realtime subscriptions
- Row-level security

Video:
- 100ms React SDK
- 100ms Server SDK
- HLS streaming
- Recording storage

Services:
- Supabase Auth (Phone OTP)
- Twilio SMS (OTP delivery)
- Anthropic Claude API (AI)
- Upstash Redis (rate limiting)
- Vercel (hosting)
- Sentry (error tracking)
```

### Common Issues and Solutions

**Issue 1: "Cannot read property 'X' of undefined"**

```
Cause: Component rendering before data loads
Solution:
1. Add loading state
2. Add null check
3. Use optional chaining (?.)
4. Use SWR for data fetching

Example:
// Wrong
<p>{user.name}</p>

// Right
<p>{user?.name || 'Loading...'}</p>

Prevention:
- Always handle null/undefined
- Use TypeScript strict mode
- Test with loading states
```

**Issue 2: "Cannot access property of sessionStorage in SSR"**

```
Cause: Trying to access browser API on server
Solution:
1. Check if window is defined
2. Use useEffect for browser-only code
3. Move code to client component
4. Use dynamic imports

Example:
const user = typeof window !== 'undefined'
  ? window.sessionStorage.getItem('user')
  : null;

Prevention:
- Remember: Next.js runs on server and client
- Use 'use client' directive
- Test with SSR builds
```

**Issue 3: "CORS error when calling API"**

```
Cause: Missing CORS headers or wrong origin
Solution:
1. Check API has CORS headers
2. Check allowed origins
3. Check credentials included
4. Check preflight request

Vercel API Routes handle CORS, but:
- [ ] Verify requests are to same origin
- [ ] Check headers in responses
- [ ] Test with curl

Prevention:
- Use same domain for API
- Set CORS headers explicitly
- Test CORS in development
```

**Issue 4: "Database connection error in production"**

```
Cause: Connection pool exhausted or network issue
Solution:
1. Check connection pool status
2. Check replication lag
3. Restart API connections
4. Scale database if needed

Monitoring:
- Watch active connections count
- Watch connection pool usage
- Alert when > 80% full

Prevention:
- Implement connection pooling
- Use connection timeouts
- Monitor connection trends
- Scale proactively
```

**Issue 5: "HMS room creation fails"**

```
Cause: 100ms API error or room limit reached
Solution:
1. Check 100ms status page
2. Check workspace room limit
3. Verify tokens not expired
4. Check room configuration

Debugging:
- Check Sentry for error details
- Check HMS dashboard
- Verify API tokens fresh
- Test with 100ms SDK

Prevention:
- Monitor room creation success rate
- Alert on high error rates
- Use room pooling if available
- Test before deploying
```

### Troubleshooting Guides

**High Error Rate Troubleshooting:**

```
Step 1: Identify the error
- Check Sentry for error grouping
- What errors are most common?
- Where are they from?

Step 2: Identify the scope
- Is it all users or specific segment?
- Is it specific feature?
- Is it intermittent or consistent?

Step 3: Check for recent changes
- Was there a deployment?
- Did database migration run?
- Did external service status change?

Step 4: Investigate
- Check error logs
- Check metrics (CPU, memory, connections)
- Check external service status
- Check rate limiting

Step 5: Fix
- Fix code error
- Rollback bad deployment
- Scale resources
- Implement workaround

Step 6: Verify
- Error rate returns to normal
- Monitor for 30 minutes
- Update status page
- Document incident
```

**Slow Performance Troubleshooting:**

```
Step 1: Identify slow endpoint
- Check Vercel response times
- Which endpoint is slow?
- How much slower than baseline?

Step 2: Profile the code
- Use performance profiling
- Identify bottleneck
- Is it database? External call? Computation?

Step 3: Check resources
- Database CPU usage
- Memory usage
- Connection count
- Network bandwidth

Step 4: Optimize
- Add database index
- Optimize query
- Add caching
- Reduce payload size
- Optimize algorithm

Step 5: Verify
- Run performance test
- Compare to baseline
- Monitor in production
- Alert if regression
```

**Database Issues Troubleshooting:**

```
Cannot Connect:
1. Check database status
2. Check network connectivity
3. Check credentials
4. Check connection limit
5. Restart connections

Slow Queries:
1. Enable slow query log
2. Run EXPLAIN ANALYZE
3. Check for missing indexes
4. Check for N+1 queries
5. Optimize or rewrite query

High CPU:
1. Check active queries
2. Kill long-running queries
3. Check for locks
4. Monitor indexes
5. Scale if needed

Out of Space:
1. Check database size
2. Find large tables
3. Archive old data
4. Clean up logs
5. Increase storage
```

### Contact Information

**Key Contacts:**

```
Technical Leadership:
- VP Engineering: [name] - [email] - [phone]
- Tech Lead: [name] - [email] - [phone]
- DevOps Lead: [name] - [email] - [phone]

On-Call Rotation:
- Current on-call: Check PagerDuty
- Escalation: Use PagerDuty routing

Slack Channels:
- #engineering - General discussion
- #incident-response - Active incidents
- #product-launch - Launch coordination
- #ops-alerts - Infrastructure alerts
- #help - General questions

Support:
- User support: support@kulti.club
- Internal support: engineering@kulti.club
```

### Documentation References

**Key Docs to Read:**

```
Getting Started:
1. README.md (project overview)
2. KULTI_QUICK_START.md (first 5 minutes)
3. PROJECT_STRUCTURE.md (file organization)

Production:
1. /Docs/LAUNCH_RUNBOOK.md (deployment)
2. /Docs/INCIDENT_RESPONSE_PLAN.md (incident handling)
3. /Docs/POST_LAUNCH_MONITORING.md (monitoring)
4. /Docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md (checklist)

Configuration:
1. /Docs/ENV_VARIABLES_CHECKLIST.md (all env vars)
2. /Docs/SENTRY_PRODUCTION_SETUP.md (error tracking)
3. /Docs/HMS_PRODUCTION_SETUP.md (video setup)
4. /Docs/SUPABASE_PRODUCTION_SETUP.md (database)

Monitoring:
1. /Docs/MONITORING_OBSERVABILITY.md (what to monitor)
2. /Docs/STATUS_PAGE_SETUP.md (status page)
3. /Docs/MAINTENANCE_PROCEDURES.md (maintenance)
```

### Self-Learning Resources

**Official Documentation:**
- Next.js: https://nextjs.org/docs
- React: https://react.dev
- Supabase: https://supabase.com/docs
- 100ms: https://100ms.live/docs
- TypeScript: https://www.typescriptlang.org/docs

**Internal Resources:**
- Architecture diagrams in /Docs
- Decision records in ADRs
- Type definitions for API
- Component library documentation

**Team Knowledge:**
- Ask experienced team members for pair programming
- Review recent pull requests to learn patterns
- Attend team technical discussions
- Read architecture documents

---

## Part E: Complete Onboarding Checklist

### Week 1: Getting Started

**Day 1:**
- [ ] Receive welcome email
- [ ] Access laptop and accounts
- [ ] Join Slack workspace
- [ ] Clone repository
- [ ] Complete security training

**Day 2:**
- [ ] Install development environment
- [ ] Get environment variables
- [ ] Run application locally
- [ ] Pass all tests locally
- [ ] 1:1 with team lead

**Day 3:**
- [ ] Understand architecture overview
- [ ] Read key documentation
- [ ] Set up IDE (VS Code)
- [ ] Configure Git/GitHub
- [ ] Create first branch

**Day 4:**
- [ ] Pair program with senior developer
- [ ] Review code review process
- [ ] Learn testing standards
- [ ] Understand PR requirements
- [ ] Submit first PR

**Day 5:**
- [ ] PR feedback and iteration
- [ ] Merge first PR
- [ ] Celebrate 🎉
- [ ] Weekly team sync
- [ ] Get feedback on first week

### Week 2: Deepening Knowledge

**Day 6:**
- [ ] Learn monitoring and alerts
- [ ] Access staging environment
- [ ] Test your changes on staging
- [ ] Understand deployment process
- [ ] Review incident response plan

**Day 7:**
- [ ] Database setup and queries
- [ ] Understand schema
- [ ] Run migrations locally
- [ ] Learn troubleshooting steps
- [ ] Submit second PR

**Day 8:**
- [ ] Learn API structure
- [ ] Understand API routes
- [ ] Review validation patterns
- [ ] Learn error handling
- [ ] Submit third PR

**Day 9:**
- [ ] Frontend component patterns
- [ ] State management
- [ ] Data fetching with SWR
- [ ] Component testing
- [ ] Submit feature PR

**Day 10:**
- [ ] Full-week retrospective
- [ ] Address any gaps
- [ ] Get mid-point feedback
- [ ] Plan for week 2
- [ ] Celebrate progress

### Weeks 3-4: Ramp Up

**Week 3:**
- [ ] Take on feature task
- [ ] Work somewhat independently
- [ ] Code reviews from peers
- [ ] Learn CI/CD pipeline
- [ ] Deploy to staging
- [ ] 1:1 with lead

**Week 4:**
- [ ] Complete feature task
- [ ] Deploy to production (with supervision)
- [ ] Monitor deployment
- [ ] Gain production access (if applicable)
- [ ] Full onboarding retrospective
- [ ] Welcome to the team! 🎉

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Maintained By:** Engineering Team
**Review Frequency:** Quarterly
