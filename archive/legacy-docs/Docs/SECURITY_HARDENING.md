# Security Hardening Guide

## Overview

This document outlines all security measures implemented in Kulti and best practices for maintaining security in production.

---

## Security Headers

### Implemented Headers

All security headers are configured in `/next.config.js`:

1. **X-DNS-Prefetch-Control: on**
   - Allows browser to prefetch DNS for external resources
   - Improves performance without security risk

2. **Strict-Transport-Security: max-age=63072000; includeSubDomains; preload**
   - Forces HTTPS connections for 2 years
   - Applies to all subdomains
   - Enables HSTS preload list inclusion

3. **X-Frame-Options: SAMEORIGIN**
   - Prevents clickjacking attacks
   - Only allows framing from same origin

4. **X-Content-Type-Options: nosniff**
   - Prevents MIME type sniffing
   - Blocks execution of incorrectly served files

5. **X-XSS-Protection: 1; mode=block**
   - Enables browser XSS filter
   - Blocks page if XSS detected

6. **Referrer-Policy: origin-when-cross-origin**
   - Sends full referrer for same-origin requests
   - Sends only origin for cross-origin requests

7. **Permissions-Policy**
   - `camera=*` - Required for video calls
   - `microphone=*` - Required for audio calls
   - `display-capture=*` - Required for screen sharing
   - `geolocation=()` - Disabled (not needed)
   - `interest-cohort=()` - Disabled (privacy protection)

### Verifying Headers

Test headers in production:
```bash
curl -I https://kulti.app
```

---

## Environment Variable Security

### Validation System

All environment variables are validated on startup in `/lib/env/validate.ts`.

**Required Variables:**
- Supabase credentials
- HMS credentials
- Anthropic API key
- App URL
- Node environment

**Optional Variables:**
- Upstash Redis (rate limiting)
- Sentry DSN (error tracking)
- Supabase Access Token (admin operations)

### Best Practices

1. **Never commit secrets to git**
   ```bash
   # .gitignore already includes:
   .env
   .env.local
   .env.production
   ```

2. **Use different secrets for each environment**
   - Development: `.env.local`
   - Staging: `.env.staging`
   - Production: `.env.production`

3. **Rotate secrets regularly**
   - Quarterly rotation recommended
   - Immediately after any suspected breach

4. **Restrict access**
   - Only developers who need them
   - Use secret management tools (Vercel env vars, AWS Secrets Manager)

### Vercel Deployment

Set environment variables in Vercel dashboard:
1. Go to Project Settings > Environment Variables
2. Add each variable separately
3. Select appropriate environment (Production/Preview/Development)
4. Never expose service role keys to client

---

## Input Validation & Sanitization

### Validation Library

All user inputs are validated using Zod schemas in `/lib/security/input-validation.ts`.

### Protected Inputs

1. **Session Titles**
   - Max 100 characters
   - HTML stripped
   - XSS prevented

2. **Usernames**
   - 3-30 characters
   - Alphanumeric, underscore, hyphen only
   - No special characters

3. **Display Names**
   - Max 50 characters
   - HTML stripped

4. **Phone Numbers**
   - US format: +1XXXXXXXXXX
   - Regex validated

5. **Email Addresses**
   - RFC 5322 compliant
   - Max 255 characters
   - Lowercase normalized

6. **Chat Messages**
   - Max 2000 characters
   - HTML stripped
   - XSS prevented

7. **Bio/Description**
   - Max 500 characters
   - HTML stripped

8. **Credit Amounts**
   - Integer only
   - 1-10,000 range
   - No decimals

### Usage Example

```typescript
import { sessionTitleSchema } from "@/lib/security/input-validation"

// Validate and sanitize user input
const result = sessionTitleSchema.safeParse(userInput)

if (!result.success) {
  // Handle validation error
  return { error: result.error.errors[0].message }
}

// Use sanitized value
const safeTitle = result.data
```

### XSS Prevention

**HTML Sanitization:**
```typescript
import { sanitizeHtml, escapeHtml } from "@/lib/security/input-validation"

// Strip all HTML tags
const plainText = sanitizeHtml(userInput)

// Escape HTML for display
const safeHtml = escapeHtml(userInput)
```

**Prototype Pollution Prevention:**
```typescript
import { sanitizeObjectKeys } from "@/lib/security/input-validation"

// Remove dangerous keys
const safeObject = sanitizeObjectKeys(untrustedData)
```

---

## Rate Limiting

### Current Implementation

Rate limiting is implemented using Upstash Redis in `/lib/ratelimit.ts`.

**Protected Endpoints:**
- `/api/auth/*` - Authentication (5 req/min)
- `/api/sessions/create` - Session creation (10 req/min)
- `/api/credits/*` - Credit transactions (20 req/min)
- `/api/ai/*` - AI requests (10 req/min)

### Production Configuration

1. **Sign up for Upstash Redis**
   - Go to [upstash.com](https://upstash.com)
   - Create Redis database
   - Get REST URL and token

2. **Set environment variables**
   ```bash
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```

3. **Verify rate limiting**
   - Test by making rapid requests
   - Should receive 429 Too Many Requests

### In-Memory Fallback

Without Redis, app uses in-memory rate limiting:
- Works for single-server deployments
- Not suitable for production with multiple instances
- Resets on server restart

---

## Authentication Security

### Phone Authentication

Supabase phone auth is used for authentication:

1. **OTP Security**
   - 6-digit codes
   - 10-minute expiration
   - Single use only
   - Rate limited (5 attempts/hour per phone)

2. **Token Management**
   - JWT tokens
   - Auto-refresh before expiration
   - HttpOnly cookies (secure)
   - 1-hour access token lifetime
   - 30-day refresh token lifetime

3. **Session Security**
   - Server-side session validation
   - Automatic token refresh
   - Secure cookie settings

### Best Practices

1. **Never expose tokens to client**
   ```typescript
   // ❌ Bad - exposes token
   const token = response.headers.get('authorization')
   localStorage.setItem('token', token)

   // ✅ Good - server-side only
   const { data: { session } } = await supabase.auth.getSession()
   ```

2. **Validate on every request**
   ```typescript
   // Middleware validates session
   export async function middleware(request: NextRequest) {
     const session = await getSession(request)
     if (!session) {
       return NextResponse.redirect('/login')
     }
   }
   ```

3. **Log out securely**
   ```typescript
   await supabase.auth.signOut()
   ```

---

## Database Security

### Row Level Security (RLS)

All Supabase tables have RLS enabled:

1. **Users Table**
   - Users can read own profile
   - Users can update own profile
   - No one can delete profiles

2. **Sessions Table**
   - Anyone can read public sessions
   - Only creator can update/delete
   - Participants can read session they're in

3. **Credits Table**
   - Users can read own transactions
   - Only system can create transactions
   - No one can update/delete

4. **Recordings Table**
   - Session creator can read/delete
   - Participants can read
   - System can create

### SQL Injection Prevention

**Use Supabase query builder:**
```typescript
// ✅ Good - parameterized
const { data } = await supabase
  .from('sessions')
  .select('*')
  .eq('id', sessionId)

// ❌ Bad - vulnerable to SQL injection
const { data } = await supabase.rpc('raw_sql', {
  query: `SELECT * FROM sessions WHERE id = '${sessionId}'`
})
```

**If raw SQL is needed:**
```typescript
import { escapeSql } from "@/lib/security/input-validation"

const safeId = escapeSql(sessionId)
```

---

## API Security

### Webhook Validation

HMS webhooks are validated in `/app/api/webhooks/hms/route.ts`:

1. **Verify webhook signature** (if HMS provides)
2. **Validate payload structure**
3. **Check event types**
4. **Idempotency handling**

```typescript
import { webhookPayloadSchema } from "@/lib/security/input-validation"

const result = webhookPayloadSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
}
```

### API Authentication

All protected API routes validate session:

```typescript
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Continue with authenticated request
}
```

---

## CORS Configuration

### Current Settings

CORS is handled by Next.js automatically for API routes.

**Allowed Origins:**
- Same origin (always allowed)
- Configured via `NEXT_PUBLIC_APP_URL`

**Allowed Methods:**
- GET, POST, PUT, DELETE, PATCH

**Credentials:**
- Included (cookies sent with requests)

### Custom CORS (if needed)

```typescript
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}
```

---

## File Upload Security

### Validation

All file uploads validated in `/lib/security/input-validation.ts`:

```typescript
import { fileUploadSchema } from "@/lib/security/input-validation"

const result = fileUploadSchema.safeParse({
  name: file.name,
  size: file.size,
  type: file.type,
})
```

### Allowed Types

- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, WebM
- Max size: 10MB

### Storage Security

Supabase Storage is used:
1. Files stored in secure buckets
2. RLS policies applied
3. Automatic virus scanning (on paid plans)
4. CDN delivery

---

## Production Checklist

### Pre-Deployment

- [ ] All security headers configured
- [ ] Environment variables validated
- [ ] Rate limiting configured (Upstash Redis)
- [ ] Sentry error tracking configured
- [ ] HTTPS enforced (no HTTP)
- [ ] RLS policies enabled on all tables
- [ ] Input validation on all user inputs
- [ ] XSS prevention implemented
- [ ] CORS configured correctly
- [ ] Webhook validation implemented

### Post-Deployment

- [ ] Test security headers with curl
- [ ] Verify HTTPS redirection
- [ ] Test rate limiting
- [ ] Verify authentication flows
- [ ] Test file uploads
- [ ] Check error tracking
- [ ] Review Sentry for security issues
- [ ] Monitor failed login attempts
- [ ] Check for unusual API usage

### Quarterly Security Review

- [ ] Rotate all API keys and secrets
- [ ] Review and update dependencies
- [ ] Run security audit (npm audit)
- [ ] Review Sentry for new attack patterns
- [ ] Update rate limits if needed
- [ ] Review and update RLS policies
- [ ] Test disaster recovery procedures
- [ ] Review access logs

---

## Incident Response

### Security Breach Procedure

1. **Immediate Actions**
   - Rotate all API keys and secrets
   - Force logout all users
   - Disable affected features
   - Enable additional logging

2. **Investigation**
   - Review Sentry errors
   - Check access logs
   - Identify attack vector
   - Assess data exposure

3. **Remediation**
   - Fix vulnerability
   - Deploy hotfix
   - Verify fix works
   - Re-enable features

4. **Communication**
   - Notify affected users
   - Disclose breach (if required)
   - Update security documentation
   - Post-mortem analysis

### Reporting Security Issues

Email security issues to: security@kulti.app

Include:
- Detailed description
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/security)
- [Supabase Security Guide](https://supabase.com/docs/guides/platform/security)
- [HMS Security Docs](https://www.100ms.live/docs/security)

---

Last Updated: 2025-01-16
