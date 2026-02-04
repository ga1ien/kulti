# Production Deployment Guide

## Overview

Complete guide for deploying Kulti to production on Vercel with Supabase backend.

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All TypeScript errors resolved
- [ ] `npm run build` succeeds locally
- [ ] `npm run lint` passes
- [ ] No console.log statements (except error/warn)
- [ ] All TODOs addressed or documented
- [ ] Code reviewed and approved

### Environment Variables

- [ ] All required variables documented in `.env.example`
- [ ] Production values ready for all variables
- [ ] Secrets stored securely (not in git)
- [ ] Environment validation script runs successfully

### Security

- [ ] Security headers configured (`next.config.js`)
- [ ] Rate limiting enabled (Upstash Redis)
- [ ] Input validation on all endpoints
- [ ] RLS policies enabled on all tables
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Webhook validation implemented

### Database

- [ ] All migrations applied to production database
- [ ] Indexes created for performance
- [ ] RLS policies tested
- [ ] Backup taken before deployment
- [ ] Database connection strings updated

### Third-Party Services

- [ ] Supabase production project created
- [ ] HMS production credentials obtained
- [ ] Anthropic API key for production
- [ ] Sentry project created and DSN obtained
- [ ] Upstash Redis database created
- [ ] Email service configured (if using)

### Testing

- [ ] Integration tests pass
- [ ] Critical user flows tested
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing complete
- [ ] Performance benchmarks met

### Monitoring

- [ ] Sentry error tracking configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring set up
- [ ] Alert recipients configured
- [ ] Log aggregation working

### Documentation

- [ ] README updated
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Deployment procedure documented
- [ ] Runbook created

---

## Deployment Steps

### 1. Prepare Production Environment

#### 1.1 Create Supabase Production Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Configure:
   - **Name:** kulti-production
   - **Database Password:** Generate strong password (save securely!)
   - **Region:** Choose closest to users
   - **Plan:** Pro recommended (includes better backups)

4. Wait for project creation (2-3 minutes)

5. Get credentials:
   - **Project URL:** `https://[project-ref].supabase.co`
   - **Anon Key:** Settings > API > anon (public)
   - **Service Role Key:** Settings > API > service_role (secret!)

#### 1.2 Set Up Production Database

```bash
# Set production project ref
export SUPABASE_PROJECT_REF=your_production_ref

# Run migrations
supabase db push --project-ref $SUPABASE_PROJECT_REF

# Verify migrations
supabase migration list --project-ref $SUPABASE_PROJECT_REF
```

#### 1.3 Configure HMS Production

1. Go to [dashboard.100ms.live](https://dashboard.100ms.live)
2. Create production app (or use existing)
3. Get credentials:
   - App ID
   - Access Key
   - App Secret
   - Template ID

4. Configure webhooks:
   - URL: `https://kulti.app/api/webhooks/hms`
   - Events: recording.*, live-stream.*, rtmp.*

#### 1.4 Set Up Sentry

1. Go to [sentry.io](https://sentry.io)
2. Create project:
   - Platform: Next.js
   - Name: kulti
3. Get DSN from project settings
4. Configure alerts

#### 1.5 Set Up Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create database:
   - Name: kulti-ratelimit
   - Region: Same as Vercel deployment
3. Get credentials:
   - REST URL
   - REST Token

---

### 2. Deploy to Vercel

#### 2.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Select framework preset: **Next.js**
4. Root directory: `./` (default)

#### 2.2 Configure Environment Variables

In Vercel project settings, add all environment variables:

**Required Variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 100ms HMS
NEXT_PUBLIC_HMS_APP_ID=your_hms_app_id
HMS_APP_ACCESS_KEY=your_hms_access_key
HMS_APP_SECRET=your_hms_app_secret
HMS_TEMPLATE_ID=your_hms_template_id

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Application
NEXT_PUBLIC_APP_URL=https://kulti.app
NODE_ENV=production

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

**Important:**
- Set for "Production" environment
- Mark sensitive keys as "Secret"
- Never expose service role keys to client

#### 2.3 Configure Build Settings

```yaml
# vercel.json (optional, for advanced config)
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

#### 2.4 Deploy

1. Click "Deploy"
2. Wait for build (3-5 minutes)
3. Deployment URL provided

---

### 3. Configure Custom Domain

#### 3.1 Add Domain in Vercel

1. Go to Project Settings > Domains
2. Add your domain: `kulti.app`
3. Add www subdomain: `www.kulti.app`

#### 3.2 Update DNS

Add DNS records at your domain registrar:

```dns
# Apex domain
A record: @ → 76.76.21.21

# WWW subdomain
CNAME record: www → cname.vercel-dns.com
```

#### 3.3 SSL Certificate

- Vercel automatically provisions SSL
- Wait 1-5 minutes for certificate
- Verify HTTPS works

---

### 4. Post-Deployment Verification

#### 4.1 Smoke Tests

Run these tests immediately after deployment:

1. **Homepage loads**
   ```
   curl -I https://kulti.app
   # Should return 200 OK
   ```

2. **Authentication works**
   - Try to sign up
   - Receive OTP
   - Complete login

3. **Session creation**
   - Create a new session
   - Join the session
   - Verify video/audio

4. **Credits system**
   - Check credit balance
   - Perform transaction
   - Verify database update

5. **Error tracking**
   - Trigger an error intentionally
   - Verify it appears in Sentry

#### 4.2 Performance Benchmarks

```bash
# Use Lighthouse CLI
npm install -g lighthouse

lighthouse https://kulti.app \
  --output html \
  --output-path ./lighthouse-report.html

# Target scores:
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 90
```

#### 4.3 Security Headers Check

```bash
curl -I https://kulti.app

# Verify headers present:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - X-XSS-Protection
```

#### 4.4 Rate Limiting Test

```bash
# Test rate limiting on auth endpoint
for i in {1..10}; do
  curl -X POST https://kulti.app/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"phone": "+15555555555"}'
done

# Should get 429 Too Many Requests after threshold
```

---

### 5. Update External Services

#### 5.1 HMS Webhooks

1. Go to HMS Dashboard > Webhooks
2. Update webhook URL to production:
   ```
   https://kulti.app/api/webhooks/hms
   ```
3. Test webhook delivery

#### 5.2 Supabase Auth Settings

1. Go to Supabase Dashboard > Authentication
2. Update site URL:
   ```
   https://kulti.app
   ```
3. Add redirect URLs:
   ```
   https://kulti.app/auth/callback
   https://kulti.app/auth/confirm
   ```

#### 5.3 CORS Settings

Verify CORS configured for production domain:
- `https://kulti.app`
- `https://www.kulti.app`

---

## Rollback Procedure

If deployment fails or critical issues arise:

### Immediate Rollback

**Vercel:**
1. Go to Deployments
2. Find last working deployment
3. Click "..." menu > "Promote to Production"
4. Confirm rollback

**Time:** < 1 minute

### Database Rollback

**If migration caused issue:**

```bash
# Restore from backup
npm run db:restore backups/pre_deployment_backup.sql.gz

# Or use Supabase point-in-time recovery
# Go to Dashboard > Database > Backups
# Select restore point before deployment
```

**Time:** 10-30 minutes

### Environment Variables Rollback

If environment variable change caused issue:
1. Go to Vercel Project Settings > Environment Variables
2. Revert changed variables
3. Redeploy

---

## Monitoring After Deployment

### First Hour

- [ ] Monitor Sentry for errors
- [ ] Check server logs in Vercel
- [ ] Watch response times
- [ ] Monitor database connections
- [ ] Check HMS connection success rate

### First 24 Hours

- [ ] Review error rates
- [ ] Check user signups
- [ ] Monitor session creation
- [ ] Verify recordings working
- [ ] Check credit transactions
- [ ] Review performance metrics

### First Week

- [ ] Analyze usage patterns
- [ ] Review slow queries
- [ ] Check storage usage
- [ ] Monitor costs (HMS, Supabase, Vercel)
- [ ] Gather user feedback

---

## Production Runbook

### Common Issues

#### 1. High Error Rate

**Symptoms:**
- Spike in Sentry errors
- Users reporting issues

**Diagnosis:**
1. Check Sentry dashboard
2. Identify most common error
3. Check recent deployments
4. Review error context

**Resolution:**
- If deployment caused: Rollback
- If external service: Check status pages
- If database: Check connection pool
- If rate limiting: Adjust limits

**Escalation:** If unresolved in 15 minutes

---

#### 2. Slow Response Times

**Symptoms:**
- Vercel logs show slow requests
- Users report lag
- Timeouts

**Diagnosis:**
```bash
# Check Vercel analytics
# Look for slow functions

# Check database slow queries
# In Supabase: Database > Performance
```

**Resolution:**
- Add database indexes
- Optimize slow queries
- Enable caching
- Scale up resources

---

#### 3. HMS Connection Failures

**Symptoms:**
- Users can't join sessions
- Black screens
- Connection timeouts

**Diagnosis:**
1. Check HMS dashboard status
2. Review HMS tokens expiration
3. Check network connectivity
4. Verify HMS credentials

**Resolution:**
- Check HMS status: status.100ms.live
- Verify token generation working
- Check rate limits
- Contact HMS support if needed

---

#### 4. Database Connection Pool Exhaustion

**Symptoms:**
- "Too many connections" errors
- Timeouts on database queries
- Sentry errors about connections

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection limit
SHOW max_connections;
```

**Resolution:**
- Close idle connections
- Optimize connection pooling
- Upgrade Supabase plan
- Add connection retry logic

---

#### 5. Out of Credits

**Symptoms:**
- Users can't create sessions
- "Insufficient credits" errors

**Diagnosis:**
```sql
-- Check user credits
SELECT user_id, balance
FROM credits
WHERE balance < 10;

-- Check failed transactions
SELECT * FROM credit_transactions
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

**Resolution:**
- Verify credit deduction logic
- Check for duplicate transactions
- Manual credit adjustment if needed
- Review pricing model

---

### Emergency Contacts

**Service Outages:**
- Supabase: support@supabase.io | status.supabase.com
- Vercel: vercel.com/support | status.vercel.com
- HMS: support@100ms.live | status.100ms.live

**Internal:**
- On-call Engineer: [Phone]
- DevOps Lead: [Phone]
- CTO: [Phone]

**Escalation Path:**
1. On-call Engineer (0-15 minutes)
2. DevOps Lead (15-30 minutes)
3. CTO (30+ minutes or critical)

---

## Maintenance Windows

### Scheduled Maintenance

**When:** First Sunday of each month, 2:00-4:00 AM UTC
**Duration:** Up to 2 hours
**Purpose:** Database maintenance, updates, backups

**Procedure:**
1. Announce maintenance 1 week prior
2. Post banner on site 24 hours before
3. Create backup before maintenance
4. Put up maintenance page
5. Perform maintenance
6. Verify all systems
7. Remove maintenance page
8. Announce completion

---

## Cost Monitoring

### Expected Monthly Costs

**Supabase Pro:** $25/month
- Database
- Storage
- Bandwidth

**100ms HMS:** ~$50-200/month (usage-based)
- Video calls: $0.004/participant-minute
- Recording: Additional fee
- Storage: $0.025/GB/month

**Vercel:** $20-100/month
- Pro plan: $20/month
- Additional usage

**Upstash Redis:** $0.20-10/month
- Pay as you go
- Free tier: 10K requests/day

**Sentry:** $26/month (Team plan)
- Error tracking
- Performance monitoring

**Total Estimated:** $120-360/month

### Cost Alerts

Set up alerts for:
- Supabase usage > 80% of included
- HMS costs > $100/day
- Vercel bandwidth > 80%
- Unexpected spikes

---

## Security Incident Response

### If Security Breach Detected

**Immediate Actions (First 15 minutes):**
1. Put site in maintenance mode
2. Rotate all API keys and secrets
3. Force logout all users
4. Disable affected features
5. Notify security team

**Investigation (15-60 minutes):**
1. Review Sentry errors
2. Check access logs
3. Identify breach vector
4. Assess data exposure
5. Document findings

**Remediation (1-4 hours):**
1. Fix vulnerability
2. Deploy hotfix
3. Verify fix
4. Restore service
5. Monitor closely

**Communication (Within 72 hours if data breach):**
1. Notify affected users
2. Disclose breach details
3. Explain remediation
4. Offer support
5. File reports (if required by law)

**Post-Mortem (Within 1 week):**
1. Document incident
2. Root cause analysis
3. Prevention measures
4. Update security policies
5. Team debrief

---

## Health Check Endpoints

### Application Health

**GET** `/api/health`

```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Database Health

```sql
-- Check database health
SELECT
  COUNT(*) as connection_count,
  MAX(query_start) as latest_query
FROM pg_stat_activity
WHERE state = 'active';
```

---

## Performance Optimization

### Caching Strategy

**Static Assets:**
- Cache-Control: public, max-age=31536000
- Use CDN for images
- Enable Next.js Image Optimization

**API Responses:**
- Cache session lists (5 minutes)
- Cache user profiles (1 hour)
- Cache recordings list (10 minutes)

**Database:**
- Add indexes for slow queries
- Use connection pooling
- Implement read replicas (Pro plan)

### Bundle Size

Monitor bundle size:
```bash
npm run build

# Check output
# First Load JS: < 100 kB (target)
```

Optimize if needed:
- Code splitting
- Dynamic imports
- Remove unused dependencies

---

Last Updated: 2025-01-16
