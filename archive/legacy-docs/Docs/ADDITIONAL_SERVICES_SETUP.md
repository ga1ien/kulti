# Additional Services Production Setup Guide

**Last Updated:** November 14, 2025
**Status:** Complete Production Documentation
**Audience:** DevOps, Backend Engineers

---

## Table of Contents

1. [Upstash Redis (Rate Limiting)](#upstash-redis-rate-limiting)
2. [Anthropic AI](#anthropic-ai)
3. [Twilio (Optional - SMS OTP)](#twilio-optional-sms-otp)
4. [Monitoring Services](#monitoring-services)
5. [Email Service (SendGrid/AWS SES)](#email-service)
6. [Storage Services](#storage-services)

---

## Upstash Redis (Rate Limiting)

### Creating Production Database

**Prerequisites:**
- Upstash account (https://upstash.com)
- Valid credit card for billing

### Step 1: Create Redis Database

1. **Log in to Upstash Console**
   - Go to https://console.upstash.com

2. **Create Database**
   - Click "Create Database"
   - Database Name: `kulti-prod-redis`
   - Region: `us-east-1` (closest to Vercel)
   - Type: `Redis`

3. **Select Plan**
   ```
   Plan: Pay as you go

   Free tier includes:
   - 10,000 commands/day free
   - Suitable for rate limiting

   Pricing:
   - $0.20 per 100,000 commands
   - Read replicas for HA
   ```

4. **Configure**
   - Eviction Policy: `allkeys-lru` (evict old data when full)
   - TLS: ✅ Enabled (secure connection)
   - Data Import: None (new database)

### Step 2: Get Connection Details

After creation, you'll see:

```
Database Name: kulti-prod-redis
Endpoint: xxxxx-xxxxx.upstash.io
Password: xxxxxxxxxxxxx
REST API URL: https://xxxxx-xxxxx.upstash.io
REST API Token: xxxxxxxxxxxxxxxxxxxx

# Copy to environment variables:
UPSTASH_REDIS_REST_URL=https://xxxxx-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxxxxxxxxx
```

### Region Selection

**Recommended Regions:**

| Region | Latency from US | Use Case |
|--------|---|---|
| us-east-1 | Lowest | Primary (Vercel us-east-1) |
| us-west-1 | Medium | Secondary |
| eu-west-1 | Medium | EU users |

**Multi-Region Setup:**

```bash
# Primary (US)
UPSTASH_REDIS_REST_URL=https://primary.upstash.io
UPSTASH_REDIS_REST_TOKEN=primary-token

# Backup (EU)
UPSTASH_REDIS_BACKUP_URL=https://backup.upstash.io
UPSTASH_REDIS_BACKUP_TOKEN=backup-token
```

### Rate Limit Configuration

**Rate Limiting Library:**

```typescript
// File: /lib/rate-limit/upstash.ts

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

// Different rate limits for different operations
export const rateLimits = {
  // HMS token generation: 100 per minute per user
  hmsToken: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:hms:token'
  }),

  // API calls: 1000 per minute per IP
  api: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(1000, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api'
  }),

  // Session creation: 10 per hour per user
  sessionCreate: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: 'ratelimit:session:create'
  }),

  // Recording API: 50 per minute per user
  recording: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    analytics: true,
    prefix: 'ratelimit:recording'
  }),

  // Search: 30 per minute per user
  search: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'ratelimit:search'
  })
}
```

**Usage in API Route:**

```typescript
// File: /app/api/hms/token/route.ts

import { rateLimits } from '@/lib/rate-limit/upstash'
import { logger } from '@/lib/monitoring/logger'

export async function POST(request: Request) {
  try {
    // Get user ID from auth
    const userId = request.headers.get('x-user-id')!

    // Check rate limit
    const { success, limit, remaining, reset } =
      await rateLimits.hmsToken.limit(userId)

    if (!success) {
      const waitTime = Math.ceil((reset - Date.now()) / 1000)

      logger.warn('Rate limit exceeded', {
        endpoint: 'hms/token',
        userId,
        waitSeconds: waitTime
      })

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: waitTime
        }),
        {
          status: 429,
          headers: {
            'Retry-After': waitTime.toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0'
          }
        }
      )
    }

    // Generate token
    const token = generateHmsToken(...)

    return new Response(JSON.stringify({ token }), {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString()
      }
    })
  } catch (error) {
    logger.error('Token generation failed', { error })
    return new Response('Internal server error', { status: 500 })
  }
}
```

### Testing Rate Limiting

**Test Script:**

```bash
#!/bin/bash
# File: scripts/test-rate-limit.sh

API_URL="https://your-domain.com/api/hms/token"
USER_ID="test-user-123"

for i in {1..110}; do
  echo "Request $i..."
  curl -X POST "$API_URL" \
    -H "x-user-id: $USER_ID" \
    -H "Content-Type: application/json" \
    -w "\nStatus: %{http_code}\n\n"

  sleep 0.5
done

# Expected: First 100 succeed (200), rest return 429
```

### Monitoring

**Track Rate Limit Usage:**

```typescript
// File: /lib/monitoring/rate-limit-monitor.ts

import { redis } from '@/lib/rate-limit/upstash'
import { logger } from '@/lib/monitoring/logger'

export async function monitorRateLimitUsage() {
  try {
    // Get analytics from Upstash
    const stats = await redis.info()

    logger.info('Rate limit stats', {
      keysCount: stats.db0.keys,
      memoryUsed: stats.memory.used_memory,
      connectedClients: stats.clients.connected_clients
    })

    // Alert if usage is high
    if (stats.memory.used_memory > 100_000_000) {
      logger.warn('Redis memory usage high', {
        memory: stats.memory.used_memory
      })
    }
  } catch (error) {
    logger.error('Failed to monitor rate limit', { error })
  }
}

// Run daily
setInterval(monitorRateLimitUsage, 24 * 60 * 60 * 1000)
```

---

## Anthropic AI

### Production API Key Generation

**Get API Key:**

1. **Visit Anthropic Console**
   - Go to https://console.anthropic.com

2. **Create Account or Sign In**
   - Email: your-company@email.com
   - Password: Strong password

3. **Generate API Key**
   - Navigate to API Keys section
   - Click "Create Key"
   - Name: `kulti-prod`
   - Copy key

4. **Store Securely**
   ```bash
   # In Vercel environment variables (not git!)
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
   ```

**Never commit to git:**
```bash
# In .gitignore
.env.local
.env.production.local
```

### Usage Limits and Quotas

**Free Tier:**
- $5 free credits/month
- Rate limit: 600 tokens/minute
- Not suitable for production

**Paid Tier:**
- Pay per token used
- Claude 3 Opus: $15/1M input, $75/1M output
- Claude 3 Sonnet: $3/1M input, $15/1M output
- Claude 3 Haiku: $0.25/1M input, $1.25/1M output

**Recommended Model:**
- Use: `claude-3-5-sonnet` (best value/performance)
- For advanced: `claude-3-opus` (best quality)
- For simple: `claude-3-haiku` (cheapest)

**Cost Estimation for Kulti:**

```
Assumptions:
- 100 daily active users
- 2 AI interactions per user per day
- Average 500 input tokens, 200 output tokens

Daily costs:
- Input: 200 requests × 500 tokens = 100K tokens
  Cost: 100K × $3/1M = $0.30
- Output: 200 requests × 200 tokens = 40K tokens
  Cost: 40K × $15/1M = $0.60
- Daily: ~$0.90

Monthly: ~$27
Quarterly: ~$81
Yearly: ~$329
```

### Best Practices for API Calls

**Production-Ready Implementation:**

```typescript
// File: /lib/ai/client.ts

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/monitoring/logger'
import * as Sentry from '@sentry/nextjs'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30_000, // 30 second timeout
  maxRetries: 2 // Automatic retry on failures
})

interface MessageOptions {
  model?: 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229' | 'claude-3-haiku-20240307'
  maxTokens?: number
  temperature?: number
  userId?: string
  sessionId?: string
}

export async function generateMessage(
  prompt: string,
  options: MessageOptions = {}
): Promise<string> {
  const {
    model = 'claude-3-5-sonnet-20241022',
    maxTokens = 1024,
    temperature = 0.7,
    userId,
    sessionId
  } = options

  const startTime = performance.now()

  try {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const duration = performance.now() - startTime

    logger.info('AI message generated', {
      model,
      duration,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      userId,
      sessionId
    })

    // Track in Sentry for performance
    Sentry.captureMessage('AI message generated', {
      level: 'info',
      contexts: {
        ai: {
          model,
          duration,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens
        }
      }
    })

    // Extract text content
    const content = message.content[0]
    if (content.type === 'text') {
      return content.text
    }

    throw new Error('Unexpected response type from Claude')
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('AI message generation failed', {
      error: error instanceof Error ? error.message : String(error),
      duration,
      userId,
      sessionId
    })

    Sentry.captureException(error, {
      tags: {
        service: 'anthropic',
        action: 'generateMessage'
      }
    })

    throw error
  }
}

/**
 * Stream response for real-time output
 */
export async function streamMessage(
  prompt: string,
  onChunk: (chunk: string) => void,
  options: MessageOptions = {}
): Promise<void> {
  const {
    model = 'claude-3-5-sonnet-20241022',
    maxTokens = 1024,
    temperature = 0.7
  } = options

  try {
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta') {
        onChunk(chunk.delta.text)
      }
    }

    logger.info('AI stream completed')
  } catch (error) {
    logger.error('AI stream failed', { error })
    throw error
  }
}
```

### Error Handling

**Handle API Errors:**

```typescript
// File: /lib/ai/error-handler.ts

import Anthropic from '@anthropic-ai/sdk'

export function handleAnthropicError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 400:
        return 'Invalid request format'
      case 401:
        return 'Authentication failed - check API key'
      case 429:
        return 'Rate limit exceeded - please try again later'
      case 500:
        return 'Anthropic service error - please try again'
      case 503:
        return 'Anthropic service unavailable'
      default:
        return `API error: ${error.message}`
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return 'Request timeout - please try again'
    }
    return error.message
  }

  return 'Unknown error occurred'
}
```

### Rate Limiting Considerations

**API Rate Limits:**

```
Free tier: 600 tokens/minute
Paid tier: Per-account limits (contact sales)
```

**Implement Rate Limiting:**

```typescript
import { rateLimits } from '@/lib/rate-limit/upstash'

export async function generateMessageWithLimit(
  userId: string,
  prompt: string
): Promise<string> {
  // Check user's AI usage limit (20 per hour)
  const { success, remaining } = await rateLimits.ai.limit(userId)

  if (!success) {
    throw new Error('AI usage limit exceeded for this hour')
  }

  return generateMessage(prompt, { userId })
}
```

---

## Twilio (Optional - SMS OTP)

### Account Creation

**Prerequisites:**
- Phone number (for SMS testing)
- Payment method

### Step 1: Create Account

1. **Visit Twilio** - https://www.twilio.com/console

2. **Sign Up**
   - Email: your@company.com
   - Password: Strong password
   - Phone: +1-xxx-xxx-xxxx

3. **Verify Phone**
   - Twilio sends code to phone
   - Enter code to verify

### Step 2: Get Credentials

After signup, you'll see:

```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: your_auth_token_here
API Key: APxxxxxxxxxxxxxxxxxxxxxxxxxx

# Store in environment:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=APxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Phone Number Provisioning

**Buy Twilio Phone Number:**

1. **Console → Phone Numbers → Buy a Number**
2. **Select Features:**
   - SMS: ✅ Enabled
   - Voice: Optional
3. **Choose Number**
   - Country: United States
   - Area code: Your choice (or random)
   - Price: $1-5/month typically
4. **Verify SMS Works**
   - Send test SMS from console

**Store Phone Number:**

```bash
TWILIO_PHONE_NUMBER=+1-555-123-4567
```

### SMS Service Configuration

**Implementation:**

```typescript
// File: /lib/sms/twilio.ts

import twilio from 'twilio'
import { logger } from '@/lib/monitoring/logger'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

interface SendSmsOptions {
  to: string
  message: string
  userId?: string
}

export async function sendSms({
  to,
  message,
  userId
}: SendSmsOptions): Promise<{
  success: boolean
  sid?: string
  error?: string
}> {
  try {
    // Validate phone number format
    if (!to.startsWith('+')) {
      return {
        success: false,
        error: 'Phone number must start with +'
      }
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: to
    })

    logger.info('SMS sent', {
      to,
      sid: result.sid,
      userId,
      status: result.status
    })

    return {
      success: true,
      sid: result.sid
    }
  } catch (error) {
    logger.error('SMS send failed', {
      to,
      error: error instanceof Error ? error.message : String(error),
      userId
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send OTP code
 */
export async function sendOtp(
  phoneNumber: string,
  code: string,
  userId?: string
): Promise<boolean> {
  const message = `Your Kulti verification code is: ${code}`

  const result = await sendSms({
    to: phoneNumber,
    message,
    userId
  })

  return result.success
}
```

### Credentials Setup

**Production Setup:**

```bash
# In Vercel environment variables
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1-555-123-4567

# Test credentials (for development)
TWILIO_TEST_MODE=false
```

### Testing SMS Delivery

**Test Script:**

```typescript
// File: /scripts/test-sms.ts

import { sendOtp } from '@/lib/sms/twilio'

async function testSms() {
  const phoneNumber = '+1-555-123-4567' // Your test number
  const code = '123456'

  const success = await sendOtp(phoneNumber, code)

  if (success) {
    console.log('✅ SMS sent successfully')
  } else {
    console.log('❌ SMS failed')
  }
}

testSms().catch(console.error)

// Run: npx ts-node scripts/test-sms.ts
```

---

## Monitoring Services

### UptimeRobot Setup

**Create Uptime Monitor:**

1. **Visit UptimeRobot** - https://uptimerobot.com

2. **Sign Up**
   - Email: your@company.com
   - Password: Strong password

3. **Create Monitor**
   - URL: `https://kulti.club`
   - Monitor type: HTTPS
   - Check interval: 5 minutes
   - Alert contacts: your-email@company.com

4. **Add Monitors**
   ```
   Monitor 1: https://kulti.club (Homepage)
   Monitor 2: https://kulti.club/api/health (Health check)
   Monitor 3: https://kulti.club/api/hms/token (Critical API)
   ```

### Endpoint Monitoring

**Health Check Endpoint:**

```typescript
// File: /app/api/health/route.ts

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Check database connection
    await db.query('SELECT 1')

    // Check Redis connection
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    })
    await redis.ping()

    // Check Sentry
    Sentry.captureMessage('Health check passed', {
      level: 'info'
    })

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        redis: 'ok',
        sentry: 'ok'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 503 }
    )
  }
}
```

### Status Page Integration

**Using Statuspage.io:**

1. **Create Account** - https://www.statuspage.io

2. **Add Components**
   - Frontend
   - API
   - Database
   - Video Infrastructure (HMS)

3. **Setup Monitors**
   - Point to health check endpoints
   - Auto-update component status

4. **Notification**
   - Email subscribers on incidents
   - Post incident report

### Alert Configuration

**Configure Uptime Alerts:**

```
Alert for:
- Page Down: Email + SMS
- Degradation (slow): Email
- Recovery: Email

Escalation:
- First 5 min: Email
- After 15 min: SMS
- After 30 min: Call (optional)
```

---

## Email Service

### SendGrid Setup

**Create Account:**

1. **Visit SendGrid** - https://sendgrid.com

2. **Sign Up**
   - Email: your@company.com
   - Company: Your company
   - Use case: Application emails

3. **Verify Sender**
   - Add sender email: noreply@kulti.club
   - SendGrid sends verification email
   - Click link to verify

4. **Get API Key**
   - Settings → API Keys
   - Create key: `kulti-prod`
   - Copy and store: `SENDGRID_API_KEY`

**Implementation:**

```typescript
// File: /lib/email/sendgrid.ts

import sgMail from '@sendgrid/mail'
import { logger } from '@/lib/monitoring/logger'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from: string = 'noreply@kulti.club'
): Promise<boolean> {
  try {
    await sgMail.send({
      to,
      from,
      subject,
      html,
      replyTo: 'support@kulti.club'
    })

    logger.info('Email sent', { to, subject })
    return true
  } catch (error) {
    logger.error('Email send failed', {
      to,
      subject,
      error
    })
    return false
  }
}
```

---

## Storage Services

### AWS S3 Configuration

**Create S3 Bucket:**

```
Bucket name: kulti-recordings-prod
Region: us-east-1
Versioning: Enabled
Encryption: AES-256
Public access: Blocked
```

**Get Credentials:**

1. **Create IAM User**
   - Name: kulti-s3-user
   - Permissions: AmazonS3FullAccess (on specific bucket)

2. **Generate Access Keys**
   - Store:
     - AWS_ACCESS_KEY_ID
     - AWS_SECRET_ACCESS_KEY

**Environment Variables:**

```bash
AWS_REGION=us-east-1
AWS_S3_BUCKET=kulti-recordings-prod
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

---

## Checklist: Additional Services

- [ ] Upstash Redis database created
- [ ] Redis credentials stored in environment
- [ ] Rate limiting configured and tested
- [ ] Anthropic API key generated
- [ ] Claude model selected (Sonnet recommended)
- [ ] Cost estimated and approved
- [ ] Anthropic error handling implemented
- [ ] Twilio account created (optional)
- [ ] SMS testing completed (optional)
- [ ] UptimeRobot monitors configured
- [ ] Health check endpoint created
- [ ] Statuspage.io status page created
- [ ] SendGrid account created and verified
- [ ] Email templates configured
- [ ] AWS S3 bucket created
- [ ] IAM user with S3 permissions created
- [ ] All credentials stored securely

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-14 | Initial comprehensive setup guide |

---

**Last Updated:** November 14, 2025
**Maintained by:** DevOps Team
**Status:** Production Ready
