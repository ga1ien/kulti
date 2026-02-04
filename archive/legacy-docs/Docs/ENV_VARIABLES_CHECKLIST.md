# Environment Variables Checklist

## Overview

This document provides a comprehensive reference for all environment variables used in Kulti. Use this checklist to ensure all required variables are properly configured in each environment (local, staging, production).

---

## Variable Reference Table

### Supabase Configuration

| Variable | Required | Type | Environment | Where to Configure | Source |
|----------|----------|------|-------------|-------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | String | All | Vercel, .env.local | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | String | All | Vercel, .env.local | Supabase Dashboard → Settings → API → Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Secret | Backend Only | Vercel, .env.local (*.local only) | Supabase Dashboard → Settings → API → Service Role Key |
| `SUPABASE_ACCESS_TOKEN` | ❌ No | Secret | Local Dev | .env.local only | Supabase Dashboard → Account → Access Tokens |

**Notes:**
- `NEXT_PUBLIC_*` prefix = safe for frontend, visible in browser
- No prefix = backend only, keep secret
- Anon key is intentionally public (limited by RLS)
- Service role key = must be kept secret (server-only)

---

### 100ms HMS Configuration

| Variable | Required | Type | Environment | Where to Configure | Source |
|----------|----------|------|-------------|-------------------|--------|
| `NEXT_PUBLIC_HMS_APP_ID` | ✅ Yes | String | All | Vercel, .env.local | 100ms Dashboard → App Details → App ID |
| `HMS_APP_ACCESS_KEY` | ✅ Yes | Secret | Backend Only | Vercel, .env.local | 100ms Dashboard → Developer → Access Key |
| `HMS_APP_SECRET` | ✅ Yes | Secret | Backend Only | Vercel, .env.local | 100ms Dashboard → Developer → Secret Key |
| `HMS_TEMPLATE_ID` | ✅ Yes | String | Backend Only | Vercel, .env.local | 100ms Dashboard → Templates → Template ID |
| `HMS_WEBHOOK_SECRET` | ❌ No | Secret | Backend Only | Vercel | 100ms Dashboard → Webhooks → Secret |
| `HLS_THRESHOLD` | ❌ No | Number | All | Vercel, .env.local | Default: 100 participants |

**Notes:**
- `HLS_THRESHOLD`: Number of participants before switching to HLS streaming
- HMS credentials required for video sessions
- Webhook secret used to verify 100ms webhook requests

**Getting 100ms Credentials:**
1. Go to [100ms Dashboard](https://dashboard.100ms.live)
2. Select your app
3. Go to **Developer** section
4. Copy Access Key and Secret
5. Go to **App Details** to find App ID
6. Go to **Templates** to find Template ID

---

### Anthropic API Configuration

| Variable | Required | Type | Environment | Where to Configure | Source |
|----------|----------|------|-------------|-------------------|--------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Secret | Backend Only | Vercel, .env.local | Anthropic Console → API Keys |

**Notes:**
- Used for AI chat features
- Must be kept secret (backend only)
- Rate limited based on plan

**Getting Anthropic API Key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys**
4. Click **Create Key**
5. Copy and save securely

---

### Application Configuration

| Variable | Required | Type | Environment | Where to Configure | Source |
|----------|----------|------|-------------|-------------------|--------|
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | String | All | Vercel, .env.local | User domain |
| `NODE_ENV` | ✅ Yes | String | All | Vercel, .env.local | Set to: development, staging, or production |

**Example Values:**

| Environment | NEXT_PUBLIC_APP_URL | NODE_ENV |
|-------------|-------------------|----------|
| Local Dev | `http://localhost:3002` | `development` |
| Staging | `https://staging.kulti.club` | `staging` |
| Production | `https://kulti.club` | `production` |

**Notes:**
- Must use HTTPS in production
- Used for auth redirects and API calls
- Should match domain configured in Supabase

---

### Redis Configuration (Optional but Recommended)

| Variable | Required | Type | Environment | Where to Configure | Source |
|----------|----------|------|-------------|-------------------|--------|
| `UPSTASH_REDIS_REST_URL` | ❌ Recommended | String | Backend | Vercel, .env.local | Upstash Console → Database |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ Recommended | Secret | Backend | Vercel, .env.local | Upstash Console → Database |

**Purpose:** Rate limiting and caching
- Without Redis: Uses in-memory storage (not suitable for production)
- With Redis: Distributed rate limiting across multiple instances

**Getting Upstash Credentials:**
1. Go to [upstash.com](https://upstash.com)
2. Sign up (free tier available)
3. Create database
4. Copy REST URL and token
5. Use in Vercel environment variables

---

### Sentry Configuration (Optional but Recommended)

| Variable | Required | Type | Environment | Where to Configure | Source |
|----------|----------|------|-------------|-------------------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ Recommended | String | All | Vercel, .env.local | Sentry Dashboard → Project Settings |

**Purpose:** Error tracking and performance monitoring
- Captures JavaScript errors
- Tracks performance metrics
- Sends alerts on issues

**Getting Sentry DSN:**
1. Go to [sentry.io](https://sentry.io)
2. Sign up (free tier available)
3. Create Next.js project
4. Copy DSN from project settings
5. Use in environment variables

---

### Twilio Configuration (Optional)

| Variable | Required | Type | Environment | Where to Configure | Source |
|----------|----------|------|-------------|-------------------|--------|
| `TWILIO_ACCOUNT_SID` | ❌ No | Secret | Backend | Vercel, .env.local | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | ❌ No | Secret | Backend | Vercel, .env.local | Twilio Console → Account Info |
| `TWILIO_PHONE_NUMBER` | ❌ No | String | Backend | Vercel, .env.local | Twilio Console → Phone Numbers |

**Purpose:** SMS authentication (if needed)
- Currently using Supabase phone auth
- Twilio integration optional

**Notes:**
- Only needed if using custom SMS provider
- Supabase phone auth is simpler alternative
- Requires paid Twilio account

---

## Environment Setup By Location

### Local Development (.env.local)

**Required:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# 100ms
NEXT_PUBLIC_HMS_APP_ID=your-app-id
HMS_APP_ACCESS_KEY=your-access-key
HMS_APP_SECRET=your-secret
HMS_TEMPLATE_ID=your-template-id

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3002
NODE_ENV=development
```

**Optional (Recommended):**
```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...

# Supabase CLI
SUPABASE_ACCESS_TOKEN=sbp_...
```

**Setup Steps:**
1. Copy from Vercel environment variables
2. Keep `.env.local` in `.gitignore`
3. Never commit secrets
4. Update local variables when Vercel changes

---

### Vercel Production (Environment Variables)

**How to Set in Vercel:**
1. Go to Vercel Dashboard → Project Settings
2. Click "Environment Variables"
3. Add each variable (see table above)
4. Select "Production" environment
5. Click "Save"
6. Redeploy for changes to take effect

**Security Best Practices:**
- Use "Production" environment only for production variables
- Never add secrets to "Development" or "Preview"
- Rotate secrets every 90 days
- Review who has access to environment variables
- Use Vercel's environment groups for multiple environments

---

### Staging Environment (If Used)

Create separate Vercel project or deployment:

**Project Name:** `kulti-staging`

**Variables:** Same as production but with staging values:
```env
NEXT_PUBLIC_APP_URL=https://staging.kulti.club
NODE_ENV=staging
# Other variables same as production
```

---

## Variable Verification Checklist

### Before Local Development

- [ ] `.env.local` created from `.env.example`
- [ ] All REQUIRED variables filled in
- [ ] No quotes around values
- [ ] No spaces around `=` sign
- [ ] `.env.local` added to `.gitignore`
- [ ] App starts: `npm run dev`
- [ ] Auth works: Can sign up/login
- [ ] Video works: Can create/join session

### Before Vercel Deployment

- [ ] All REQUIRED variables set in Vercel
- [ ] Variables set to "Production" environment
- [ ] No secrets in git history: `git log -p | grep -i "secret"`
- [ ] Build successful locally: `npm run build`
- [ ] Build successful in Vercel: Check deployment logs
- [ ] Core features work in preview: Use Vercel preview URL
- [ ] Production domain uses HTTPS

### After Deployment

- [ ] Site loads: Navigate to production URL
- [ ] Auth works: Sign up and login
- [ ] Database connected: No 500 errors
- [ ] API routes working: Check console for errors
- [ ] Error tracking active: Verify Sentry (if configured)
- [ ] Rate limiting active: Test with rapid requests (if Redis configured)
- [ ] No missing variable errors in logs

---

## Sensitive Data Handling

### Do's
- ✅ Store secrets in Vercel environment variables
- ✅ Use `.env.local` for local development only
- ✅ Rotate secrets every 90 days
- ✅ Use unique values for each environment
- ✅ Document where each variable comes from
- ✅ Review access logs regularly
- ✅ Immediately rotate compromised variables

### Don'ts
- ❌ Never commit secrets to git
- ❌ Never share production credentials via email
- ❌ Never hardcode secrets in code
- ❌ Never use same secret for multiple environments
- ❌ Never expose service role key in frontend
- ❌ Never delete old versions without backup
- ❌ Never use placeholder values in production

---

## Troubleshooting Environment Variables

### Issue: "undefined is not a function" Error

**Cause:** Missing environment variable
**Solution:**
1. Check variable name matches exactly (case-sensitive)
2. Verify variable is set in correct environment
3. Check variable value is not empty
4. In Vercel: After adding variable, redeploy

### Issue: Auth Not Working

**Cause:** Supabase URL or Anon Key incorrect
**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` format: `https://xxx.supabase.co`
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is long JWT string
3. Check variables in Supabase dashboard
4. Test: `curl -H "Authorization: Bearer TOKEN" https://url/rest/v1/`

### Issue: Video Session Not Loading

**Cause:** HMS credentials incorrect
**Solution:**
1. Verify `HMS_APP_ID` is correct (not template ID)
2. Verify `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET` are valid
3. Check 100ms dashboard for active credentials
4. Test: Create session and check logs for HMS errors

### Issue: AI Chat Not Working

**Cause:** Missing ANTHROPIC_API_KEY
**Solution:**
1. Get key from anthropic.com console
2. Key format should start with `sk-ant-`
3. Verify set in Vercel environment variables
4. Check API key not expired (if using trial)

### Issue: Rate Limiting Not Working

**Cause:** Redis not configured
**Solution:**
1. Optional for development, required for production
2. Get Upstash Redis from upstash.com
3. Add both `UPSTASH_REDIS_REST_URL` and token
4. Verify format: `https://....upstash.io`
5. Test rate limiting with rapid requests

---

## Variable Rotation Schedule

### Every 90 Days (Quarterly)
- [ ] Rotate Supabase service role key
- [ ] Rotate Anthropic API key (if needed)
- [ ] Rotate Upstash token (if used)
- [ ] Rotate HMS credentials (if needed)
- [ ] Review who has access to Vercel

### After Security Incident
- [ ] Immediately rotate all exposed secrets
- [ ] Rotate Supabase keys
- [ ] Rotate HMS credentials
- [ ] Rotate API keys
- [ ] Review git history for exposed secrets
- [ ] Enable audit logging in Supabase

### During Major Deployments
- [ ] Create backup of current variables
- [ ] Test new variables in staging
- [ ] Verify all systems working before production
- [ ] Have rollback plan ready

---

## Environment Variable Groups (Advanced)

For projects with multiple environments, use Vercel's Environment Variable Groups:

**Example Setup:**

```
Production Group:
├─ All production variables
├─ NEXT_PUBLIC_APP_URL=https://kulti.club
└─ NODE_ENV=production

Staging Group:
├─ Staging variables
├─ NEXT_PUBLIC_APP_URL=https://staging.kulti.club
└─ NODE_ENV=staging

Development Group:
├─ Development variables
├─ NEXT_PUBLIC_APP_URL=http://localhost:3002
└─ NODE_ENV=development
```

**Usage:**
1. Vercel Dashboard → Environment Variables
2. Create new groups for each environment
3. Assign groups to different branches/deployments

---

## Summary Checklist

- [ ] All required variables identified
- [ ] Local `.env.local` created and configured
- [ ] `.env.local` added to `.gitignore`
- [ ] Vercel environment variables set
- [ ] All variables verified working
- [ ] Secrets stored securely
- [ ] Rotation schedule established
- [ ] Documentation shared with team
- [ ] Backup of variables created
- [ ] Access control configured
- [ ] Emergency contact for secret rotation
- [ ] Monitoring enabled for variable changes

---

## Next Steps

1. Configure each service (Supabase, 100ms, Anthropic)
2. Set variables in local development
3. Deploy to Vercel with production variables
4. Verify all features work
5. Set up monitoring and alerts
6. Create runbook for emergency secret rotation

For detailed setup instructions:
- Supabase: See `SUPABASE_PRODUCTION_SETUP.md`
- Vercel: See `VERCEL_PRODUCTION_SETUP.md`
- Monitoring: See `MONITORING_SETUP.md`
