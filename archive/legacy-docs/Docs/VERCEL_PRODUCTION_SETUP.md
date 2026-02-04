# Vercel Production Setup Guide

## Overview

This guide provides step-by-step instructions for deploying Kulti to Vercel production. Vercel is the optimal choice for Next.js applications and provides seamless integration with GitHub for continuous deployment.

**Important:** This guide focuses on setup and configuration. You cannot actually execute deployments without valid Vercel account credentials.

---

## A. Pre-Deployment Checklist

Before starting the Vercel deployment, ensure your project is production-ready:

### Code Quality
- [ ] **All code committed to GitHub**
  ```bash
  git status  # Should show clean working directory
  git log --oneline -10  # Verify recent commits
  ```

- [ ] **All tests passing**
  ```bash
  npm run test              # Run Jest unit tests
  npm run test:coverage     # Should have >70% coverage
  npm run test:e2e          # Run Playwright end-to-end tests
  npm run lint              # 0 ESLint errors
  npm run type-check        # 0 TypeScript errors (if script exists)
  ```

- [ ] **Production build successful**
  ```bash
  npm run build  # Should complete without errors
  ```

- [ ] **Local build verification**
  ```bash
  npm run build
  npm run start  # Start production server on localhost:3001
  # Test at http://localhost:3001
  ```

### Environment Preparation
- [ ] **All environment variables documented** - See `ENV_VARIABLES_CHECKLIST.md`
- [ ] **Secrets secured** - Never commit `.env.local` or `.env.production`
- [ ] **GitHub repository synced** - Latest changes pushed to main branch

---

## B. Vercel Project Creation

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Authorize Vercel to access your GitHub repositories

### Step 2: Create New Project
1. Navigate to Dashboard → Add New → Project
2. Select the `kulti` repository
3. Click "Import"

### Step 3: Configure Project Settings

When the project creation wizard appears, configure the following:

#### Project Name
- **Name:** `kulti` (or your preferred name)
- **Framework Preset:** Next.js
- **Root Directory:** `.` (default)

#### Build Settings
| Setting | Value | Notes |
|---------|-------|-------|
| **Build Command** | `npm run build` | Builds optimized Next.js bundle |
| **Output Directory** | `.next` | Next.js default build output |
| **Install Command** | `npm install` | Install project dependencies |
| **Node.js Version** | `20.x` | Latest stable LTS version |

#### Development Settings
| Setting | Value | Notes |
|---------|-------|-------|
| **Development Command** | `npm run dev` | For preview deployments |
| **Development Port** | `3002` | Matches local development |

#### Environment Variables
Set up in the next section (Step 4)

#### Source Code Management
- **Repository:** GitHub integration should auto-detect
- **Branch:** `main` (default for production)
- **Settings:** Enable Automatic Deployments

### Step 4: Configure Environment Variables

1. After project creation, go to **Settings → Environment Variables**

2. Add each variable from the comprehensive checklist below:

**REQUIRED Variables (Production):**

| Variable | Source | Value Type | Notes |
|----------|--------|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard | String | Get from API Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard | String | Public, safe for frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | Secret | Server-only, never expose |
| `NEXT_PUBLIC_HMS_APP_ID` | 100ms Dashboard | String | HMS application ID |
| `HMS_APP_ACCESS_KEY` | 100ms Dashboard | Secret | HMS authentication |
| `HMS_APP_SECRET` | 100ms Dashboard | Secret | HMS authentication |
| `HMS_TEMPLATE_ID` | 100ms Dashboard | String | HMS meeting template |
| `ANTHROPIC_API_KEY` | Anthropic Console | Secret | Claude API key |
| `NEXT_PUBLIC_APP_URL` | User Domain | String | Production domain (https://...) |
| `NODE_ENV` | Manual | String | Set to `production` |

**OPTIONAL Variables (Recommended for Production):**

| Variable | Source | Value Type | Notes |
|----------|--------|-----------|-------|
| `UPSTASH_REDIS_REST_URL` | Upstash Dashboard | String | For rate limiting (recommended) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Dashboard | Secret | Redis authentication |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry Dashboard | String | Error tracking DSN |
| `SUPABASE_ACCESS_TOKEN` | Supabase Access Tokens | Secret | For CLI operations (optional) |

#### Adding Variables in Vercel Dashboard

1. Click "Add New"
2. Enter Variable Name (exactly as listed above)
3. Enter Value
4. Choose "Production" for Environment
5. Click "Save"

**Best Practices:**
- Use Production environment for all variables
- Never use Preview environment for secrets
- Keep a local copy in `.env.production` (in .gitignore)
- Rotate secrets every 90 days
- Document where each secret comes from

---

## C. Domain Configuration

### Step 1: Add Custom Domain

1. Go to **Settings → Domains**
2. Click "Add"
3. Enter your domain (e.g., `kulti.club`)
4. Choose domain provider:
   - **Vercel Nameservers** (Easiest - Vercel manages DNS)
   - **External DNS** (If using another provider)

### Step 2: Vercel Nameservers Method (Recommended)

If using Vercel to manage DNS:

1. In Vercel dashboard, copy the four nameservers provided
2. Go to your domain registrar (GoDaddy, Namecheap, etc.)
3. Update nameserver records to Vercel's nameservers
4. Wait 24-48 hours for DNS propagation
5. Verify in Vercel dashboard when "Valid Configuration" appears

### Step 3: External DNS Method

If managing DNS elsewhere:

1. In Vercel dashboard, note the CNAME record provided
2. Go to your DNS provider's dashboard
3. Create CNAME record:
   - **Name:** `www` (or subdomain)
   - **Value:** `cname.vercel-dns.com.`
4. For root domain, use A record:
   - **Name:** `@`
   - **IP:** `76.76.19.165`
5. Wait for DNS propagation

### Step 4: SSL Certificate

Vercel automatically provisions SSL certificates via Let's Encrypt:

- **Status:** Check in Settings → Domains
- **Auto-renewal:** Automatic, no action needed
- **Timeline:** Usually within 24 hours of domain addition

Verify SSL:
```bash
curl -I https://your-domain.com
# Should show: HTTP/2 200
```

### Step 5: Add Subdomain (Optional)

For additional subdomains (e.g., `api.kulti.club`):

1. Add DNS record pointing to same Vercel project
2. Or create separate Vercel project for API
3. Recommended: Use main project for both

---

## D. Deployment Settings

### Step 1: Configure Git Integration

1. Go to **Settings → Git**
2. Verify repository is connected: `/owner/kulti`

### Step 2: Production Deployments

**Main Branch Deployment:**
1. **Settings → Git → Production Branch:** Set to `main`
2. **Auto-deploy enabled:** Yes (default)
3. **Behavior:** Every push to main automatically deploys

**Rollback Instructions:**
1. Go to **Deployments**
2. Click on previous successful deployment
3. Click **Promote to Production**
4. Confirm rollback

### Step 3: Preview Deployments

**Pull Request Preview:**
1. Go to **Settings → Git → Preview**
2. **Deploy on PR:** Enabled (default)
3. **Deploy from pull requests:** All branches
4. Each PR gets unique preview URL (e.g., `kulti-pr-42.vercel.app`)

**Testing Preview Deployments:**
1. Push code to feature branch
2. Create pull request to main
3. Vercel automatically builds preview
4. Test in preview URL before merging
5. Merge to main to deploy to production

### Step 4: Build & Development Settings

**Optimization Settings:**
1. **Settings → Build & Development**
2. **Build Cache:** Enabled (faster builds)
3. **Automatic Deployments:** Enabled
4. **Ignored Build Step:**
   ```bash
   if [ "$VERCEL_ENV_STAGE" = "production" ]; then npm run build; else exit 0; fi
   ```

**Concurrency Limits:**
1. **Settings → Project → Limits**
2. **Max Build Concurrency:** Depends on plan
3. **Function Timeout:** 10 seconds (default)

### Step 5: Vercel Configuration File

Create or update `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "nodeVersion": "20.x",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production"
  },
  "git": {
    "deploymentEnabled": true,
    "production": {
      "redeployOnPush": true
    }
  },
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## E. Post-Deployment Verification

### Step 1: Check Deployment Status

1. Go to **Deployments** tab
2. Verify latest deployment shows "Ready"
3. Check deployment logs for errors

### Step 2: Test Core Functionality

**Landing Page:**
- [ ] Navigate to production URL
- [ ] Page loads without errors
- [ ] All images load
- [ ] Mobile responsive

**Authentication:**
- [ ] Signup with new test account
- [ ] Login with existing account
- [ ] Password reset flow works
- [ ] OTP verification works

**Main Features:**
- [ ] Create new session
- [ ] Join existing session
- [ ] Video/audio connections work
- [ ] Chat functionality works
- [ ] Screen sharing works
- [ ] Navigation between pages works

**Performance:**
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] No network errors
- [ ] Responsive on mobile

### Step 3: Monitor Initial Deployment

**First 24 Hours:**
- [ ] Monitor error logs in Sentry
- [ ] Check server response times
- [ ] Monitor database performance
- [ ] Monitor Upstash Redis (if configured)
- [ ] Check HMS metrics

**Analytics:**
1. View in **Analytics** tab:
   - Request count
   - Response times
   - Error rate
   - Bandwidth usage

### Step 4: Database Verification

Verify database connection and health:

```bash
# From your local machine
curl -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  https://your-supabase-url/rest/v1/users?limit=1

# Should return 200 OK
```

Or using Supabase dashboard:
1. Go to Supabase project
2. SQL Editor → New Query
3. Run: `SELECT 1 as health_check;`
4. Should return result instantly

### Step 5: DNS Verification

```bash
# Verify DNS resolution
nslookup kulti.club

# Should return Vercel's IP addresses

# Verify SSL certificate
openssl s_client -connect kulti.club:443

# Should show valid certificate
```

---

## F. Common Issues & Solutions

### Issue: Deployment Failed

**Symptoms:**
- Deployment stuck in "Building"
- Build error in logs
- Function timeout error

**Solutions:**
1. Check build logs: **Deployments → Click failing deployment → Logs**
2. Common causes:
   - Missing environment variable → Add in Settings
   - TypeScript error → Run `npm run type-check` locally
   - Out of memory → Check function size
3. Fix locally, commit, and push to redeploy

### Issue: Environment Variables Not Working

**Symptoms:**
- Application crashes with "undefined" errors
- API calls fail with 500 errors
- Configuration not found

**Solutions:**
1. Verify variable added to Vercel dashboard
2. Check exact variable name matches code
3. Verify "Production" environment selected
4. Wait 5 minutes after adding variable (cache delay)
5. Redeploy: **Deployments → Redeploy** on latest commit

### Issue: Domain Not Resolving

**Symptoms:**
- `DNS_PROBE_FINISHED_NXDOMAIN` error
- Domain shows "Invalid Configuration" in Vercel

**Solutions:**
1. Wait 24-48 hours for DNS propagation
2. Check nameserver update in registrar
3. Verify correct nameservers in Vercel dashboard
4. Test with: `nslookup kulti.club`
5. Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (macOS)

### Issue: SSL Certificate Not Issuing

**Symptoms:**
- Domain shows "Pending" for days
- Browser shows "NET::ERR_CERT_AUTHORITY_INVALID"

**Solutions:**
1. Verify domain properly resolves to Vercel IP
2. Ensure domain has valid registrar
3. Remove DNS validation records if manually added
4. Allow 24-48 hours for Let's Encrypt issuance
5. Contact Vercel support if > 48 hours

### Issue: High Build Times

**Symptoms:**
- Build takes > 5 minutes
- Frequent timeout errors
- Slow deploys affecting development

**Solutions:**
1. Enable Build Cache in Settings
2. Optimize dependencies: `npm ls` to find duplicates
3. Check for large files in build: `du -h .next`
4. Use dynamic imports for heavy components
5. Consider Turbo for monorepos

### Issue: API Routes Timing Out

**Symptoms:**
- POST requests fail with 504 error
- HMS integration calls timeout
- Database queries timeout

**Solutions:**
1. Check database connection pooling
2. Optimize database queries
3. Add caching for frequent queries
4. Increase function timeout in `vercel.json` (max 60s for paid plans)
5. Consider moving work to background jobs

---

## G. Monitoring & Maintenance

### Weekly Checks
- [ ] Review error logs in Sentry
- [ ] Check Vercel analytics for anomalies
- [ ] Monitor error rate in Application Insights
- [ ] Check database performance

### Monthly Checks
- [ ] Review security audit logs
- [ ] Update dependencies: `npm audit`
- [ ] Check Vercel plan usage
- [ ] Review cost optimization opportunities

### Quarterly Tasks
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Capacity planning for growth
- [ ] Backup verification

---

## H. Scaling & Performance

### Scaling Options

**Starter Plan ($20/mo):**
- Sufficient for < 100k monthly requests
- 1 concurrent build
- Limited function resources

**Pro Plan ($150/mo):**
- Sufficient for 100k-1M monthly requests
- Unlimited concurrent builds
- More function resources
- Advanced analytics

**Enterprise Plan (Custom):**
- For high-traffic applications
- Dedicated support
- Custom SLA

### Performance Optimization

**Code Splitting:**
```typescript
// Use dynamic imports for heavy components
const RecordingPlayer = dynamic(() => import('@/components/RecordingPlayer'), {
  loading: () => <LoadingSpinner />,
});
```

**Image Optimization:**
```typescript
import Image from 'next/image';

export default function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority
    />
  );
}
```

**Database Optimization:**
- Use connection pooling
- Index frequently queried columns
- Use materialized views for complex queries
- Archive old data

---

## I. Rollback Procedures

### Immediate Rollback (Last Good Version)

1. Go to **Deployments** tab
2. Find last known working deployment
3. Click **Promote to Production**
4. Confirm rollback
5. Verify site is working

### Rollback to Specific Commit

```bash
# From your local machine
git log --oneline  # Find commit hash
git revert COMMIT_HASH
git push origin main
# Vercel automatically redeploys
```

### Emergency Hotfix Process

1. Create branch from main: `git checkout -b hotfix/emergency-fix`
2. Make minimal changes
3. Test thoroughly: `npm run build && npm start`
4. Create pull request for review
5. Merge to main
6. Vercel deploys automatically

---

## Summary Checklist

- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project created in Vercel
- [ ] All environment variables set
- [ ] Production build verified locally
- [ ] Custom domain added
- [ ] SSL certificate issued
- [ ] First deployment successful
- [ ] Core features tested in production
- [ ] Error tracking (Sentry) working
- [ ] Performance monitoring enabled
- [ ] Monitoring alerts configured
- [ ] Database backups verified
- [ ] Team members added (if applicable)
- [ ] Documentation shared with team

---

## Next Steps

1. Complete Supabase setup: See `SUPABASE_PRODUCTION_SETUP.md`
2. Configure monitoring: See `MONITORING_SETUP.md`
3. Verify security: See `SECURITY_HARDENING.md`
4. Set up backups: See `DATABASE_BACKUP_RECOVERY.md`
5. Plan launch: See `PRE_PRODUCTION_CHECKLIST.md`
