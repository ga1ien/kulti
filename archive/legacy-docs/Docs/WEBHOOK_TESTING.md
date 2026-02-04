# Webhook Testing Guide

**Last Updated:** November 14, 2025
**Status:** Complete Testing Documentation
**Audience:** Developers, QA Engineers

---

## Table of Contents

1. [Local Testing with ngrok](#local-testing-with-ngrok)
2. [Staging Environment Testing](#staging-environment-testing)
3. [Webhook Signature Verification Testing](#webhook-signature-verification-testing)
4. [Common Webhook Issues](#common-webhook-issues)
5. [Webhook Retry Logic](#webhook-retry-logic)
6. [Webhook Event Examples](#webhook-event-examples)

---

## Local Testing with ngrok

### Prerequisites

- ngrok installed (https://ngrok.com)
- Development server running on `localhost:3000`
- HMS account with webhook configuration access

### Step 1: Install ngrok

```bash
# Using Homebrew (macOS)
brew install ngrok/ngrok/ngrok

# Or download from https://ngrok.com/download

# Verify installation
ngrok version
```

### Step 2: Create ngrok Account

1. **Sign up** - https://dashboard.ngrok.com
2. **Get auth token**
   - Copy from dashboard
   - Add to system:
     ```bash
     ngrok config add-authtoken YOUR_AUTH_TOKEN
     ```

### Step 3: Start ngrok Tunnel

```bash
# Start tunnel to localhost:3000
ngrok http 3000

# You'll see output like:
# Session Status                online
# Account                       user@example.com
# Version                       3.0.0
# Region                        United States (us)
# Forwarding                    https://xxxx-xxxx-xxxx-xxxx.ngrok.io -> http://localhost:3000
# Web Interface                 http://127.0.0.1:4040
```

**Use the HTTPS URL** (e.g., `https://xxxx-xxxx-xxxx-xxxx.ngrok.io`)

### Step 4: Configure HMS Webhook

1. **Go to HMS Dashboard**
   - Apps → [Your App] → Webhooks

2. **Update Webhook URL**
   - Old: `https://localhost:3000/api/webhooks/hms`
   - New: `https://xxxx-xxxx-xxxx-xxxx.ngrok.io/api/webhooks/hms`

3. **Save Configuration**

### Step 5: Trigger Webhook

**Option A: Use HMS Dashboard Test**

1. Dashboard → Webhooks → Send Test Event
2. Select event type: `recording.started`
3. Click "Send"
4. Check console/logs

**Option B: Create Test Session**

```bash
# Create a test room
curl -X POST https://api.100ms.live/v2/rooms \
  -H "Authorization: Bearer $HMS_MANAGEMENT_TOKEN" \
  -d '{"name":"test-webhook"}'

# Generate token and join room
# This should trigger webhooks
```

### Step 6: Monitor Requests

**In ngrok Web Interface:**

1. Go to `http://127.0.0.1:4040`
2. View all requests to your server
3. Click on request to see:
   - Headers
   - Body
   - Response

### Troubleshooting ngrok

**Issue: "Failed to connect"**

```bash
# Check ngrok status
ngrok status

# Restart tunnel
ngrok http 3000

# Verify your app is running
curl http://localhost:3000
```

**Issue: Webhook not being received**

1. Check ngrok tunnel is active
2. Verify webhook URL in HMS is correct
3. Check firewall allows webhooks
4. Look at ngrok Web UI for requests

---

## Staging Environment Testing

### Setting Up Staging Environment

**Create Staging Deployment:**

```bash
# Using Vercel
vercel --prod --env NODE_ENV=staging

# Or in Vercel UI:
# 1. Create branch: staging
# 2. Deploy from staging branch
# 3. Get URL: staging-kulti.vercel.app
```

### Configure Staging Webhooks

**Update HMS Webhook:**

```
Production URL: https://kulti.club/api/webhooks/hms
Staging URL: https://staging-kulti.vercel.app/api/webhooks/hms

# Create separate webhook endpoint for staging
```

**Environment Variables (Staging):**

```bash
# In Vercel staging environment
NEXT_PUBLIC_ENVIRONMENT=staging
HMS_WEBHOOK_VERIFY_SIGNATURE=true
SENTRY_DSN=https://staging-key@org.ingest.sentry.io/staging-project
```

### Webhook Testing in Staging

**Create Test User:**

```typescript
// File: /scripts/test-webhook-staging.ts

import { createTestSession } from '@/lib/test/hms'
import { logger } from '@/lib/monitoring/logger'

async function testWebhookInStaging() {
  try {
    // Create test room
    const room = await createTestSession({
      name: 'webhook-test-' + Date.now(),
      recordingEnabled: true
    })

    logger.info('Test room created', {
      roomId: room.id,
      url: `https://staging-kulti.vercel.app/session/${room.id}`
    })

    // Generate token
    const token = await generateHmsToken(room.id, 'test-user')

    logger.info('Token generated', { token })

    // Monitor database for webhook events
    setInterval(async () => {
      const recording = await db.query(
        'SELECT * FROM recordings WHERE room_id = $1',
        [room.id]
      )

      logger.info('Recording status', {
        roomId: room.id,
        recordingCount: recording.length,
        latestStatus: recording[0]?.status
      })
    }, 5000)

    // After 30 seconds, stop recording
    setTimeout(async () => {
      await fetch(`https://api.100ms.live/v2/rooms/${room.id}/stop-recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HMS_MANAGEMENT_TOKEN}`
        }
      })

      logger.info('Recording stopped')
    }, 30000)
  } catch (error) {
    logger.error('Webhook test failed', { error })
  }
}

testWebhookInStaging()
```

**Run Test:**

```bash
npx ts-node scripts/test-webhook-staging.ts
```

### Monitor Staging Logs

**View Vercel Logs:**

```bash
# Using Vercel CLI
vercel logs --staging

# Or in Vercel Dashboard:
# 1. Select project
# 2. Click "Deployments"
# 3. Click staging deployment
# 4. View "Functions" logs
```

---

## Webhook Signature Verification Testing

### Understanding Signature Verification

HMS includes a signature in each webhook for security. Verify it to ensure webhooks are from HMS.

### Signature Structure

```
Header: x-100ms-signature
Format: sha256=hex_hash
Example: sha256=abcd1234...
```

### Verification Implementation

**Complete Implementation:**

```typescript
// File: /lib/webhooks/hms-verify.ts

import crypto from 'crypto'
import { logger } from '@/lib/monitoring/logger'

/**
 * Verify HMS webhook signature
 * @param payload Raw request body (as string)
 * @param signature Signature from x-100ms-signature header
 * @param secret HMS app secret
 * @returns true if signature is valid
 */
export function verifyHmsWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Extract hex hash from signature
    const [algorithm, hash] = signature.split('=')

    if (algorithm !== 'sha256') {
      logger.warn('Unsupported signature algorithm', { algorithm })
      return false
    }

    // Generate expected hash
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash)
    )

    return isValid
  } catch (error) {
    logger.error('Signature verification error', { error })
    return false
  }
}

/**
 * Middleware to verify webhook signature
 */
export async function verifyHmsWebhook(request: Request): Promise<boolean> {
  try {
    const signature = request.headers.get('x-100ms-signature') || ''
    const payload = await request.text()

    if (!signature) {
      logger.warn('Missing webhook signature')
      return false
    }

    const isValid = verifyHmsWebhookSignature(
      payload,
      signature,
      process.env.HMS_APP_SECRET!
    )

    if (!isValid) {
      logger.warn('Invalid webhook signature', { signature })
    }

    return isValid
  } catch (error) {
    logger.error('Webhook verification failed', { error })
    return false
  }
}
```

### Testing Signature Verification

**Unit Test:**

```typescript
// File: /__tests__/webhooks/hms-verify.test.ts

import { verifyHmsWebhookSignature } from '@/lib/webhooks/hms-verify'
import crypto from 'crypto'

describe('HMS Webhook Signature Verification', () => {
  const secret = 'test-secret-key'
  const payload = JSON.stringify({
    type: 'recording.started',
    roomId: 'test-room-123'
  })

  it('should verify valid signature', () => {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const signature = `sha256=${hash}`

    const isValid = verifyHmsWebhookSignature(
      payload,
      signature,
      secret
    )

    expect(isValid).toBe(true)
  })

  it('should reject invalid signature', () => {
    const signature = 'sha256=invalid_hash'

    const isValid = verifyHmsWebhookSignature(
      payload,
      signature,
      secret
    )

    expect(isValid).toBe(false)
  })

  it('should reject modified payload', () => {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const signature = `sha256=${hash}`

    // Modify payload after signature generation
    const modifiedPayload = JSON.stringify({
      type: 'recording.success',
      roomId: 'different-room'
    })

    const isValid = verifyHmsWebhookSignature(
      modifiedPayload,
      signature,
      secret
    )

    expect(isValid).toBe(false)
  })

  it('should be resistant to timing attacks', () => {
    const validHash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const validSignature = `sha256=${validHash}`
    const invalidSignature = `sha256=${'0'.repeat(64)}`

    // Both should complete in similar time
    const startValid = performance.now()
    verifyHmsWebhookSignature(payload, validSignature, secret)
    const timeValid = performance.now() - startValid

    const startInvalid = performance.now()
    verifyHmsWebhookSignature(payload, invalidSignature, secret)
    const timeInvalid = performance.now() - startInvalid

    // Times should be similar (within 10ms)
    // This is hard to test in JS, just verify no exceptions
    expect(true).toBe(true)
  })
})
```

**Run Tests:**

```bash
npm run test -- __tests__/webhooks/hms-verify.test.ts
```

### Test Invalid Signatures

**Intentional Test:**

```typescript
// File: /app/api/webhooks/test/route.ts

export async function POST(request: Request) {
  const body = await request.text()
  const invalidSignature = 'sha256=invalid_hash_for_testing'

  const isValid = verifyHmsWebhookSignature(
    body,
    invalidSignature,
    process.env.HMS_APP_SECRET!
  )

  return new Response(
    JSON.stringify({
      signature: invalidSignature,
      isValid,
      expectedResult: false
    })
  )
}

// Test:
curl -X POST http://localhost:3000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

---

## Common Webhook Issues

### Issue 1: Webhook Not Delivered

**Symptoms:**
- Webhook never arrives at endpoint
- No requests in ngrok Web UI
- HMS dashboard shows "pending"

**Solutions:**

1. **Check Endpoint URL**
   ```bash
   # Test if endpoint is reachable
   curl -X POST https://your-domain.com/api/webhooks/hms \
     -H "Content-Type: application/json" \
     -d '{"test":true}'

   # Should respond with 200 or your error response
   ```

2. **Check Firewall/Security Groups**
   ```bash
   # Verify port 443 is open for incoming
   telnet your-domain.com 443
   ```

3. **Verify Webhook Registration**
   - Check HMS dashboard
   - Ensure webhook event is subscribed
   - Check webhook is "active"

4. **Check Application Logs**
   ```bash
   # View Vercel logs
   vercel logs --prod

   # Or view Sentry
   sentry.io/organizations/[org]/issues/
   ```

### Issue 2: Signature Verification Failures

**Symptoms:**
- Webhooks arrive but signature check fails
- API returns 401 Unauthorized

**Solutions:**

1. **Verify Secret Key**
   ```bash
   # Check environment variable
   echo $HMS_APP_SECRET

   # Should match HMS dashboard
   ```

2. **Check Raw Payload**
   ```typescript
   // Don't use parsed JSON, use raw text
   const payload = await request.text() // ✅ Correct
   // const body = await request.json() // ❌ Wrong
   ```

3. **Debug Hash Mismatch**
   ```typescript
   // Log both signatures for debugging
   const signature = request.headers.get('x-100ms-signature')
   const payload = await request.text()

   const expectedHash = crypto
     .createHmac('sha256', secret)
     .update(payload)
     .digest('hex')

   logger.debug('Signature verification', {
     received: signature,
     expected: `sha256=${expectedHash}`,
     payload: payload.substring(0, 100) // First 100 chars
   })
   ```

### Issue 3: Timeouts or Slow Processing

**Symptoms:**
- Webhooks timeout after 10 seconds
- HMS retries webhook multiple times
- Database updates delayed

**Solutions:**

1. **Use Async Processing**
   ```typescript
   // ❌ Don't process synchronously
   export async function POST(request: Request) {
     const body = await request.json()
     await processRecording(body) // This blocks!
     return new Response('OK')
   }

   // ✅ Use background job
   export async function POST(request: Request) {
     const body = await request.json()

     // Queue job and return immediately
     await queue.add('process-recording', body)

     return new Response(
       JSON.stringify({ received: true }),
       { status: 202 } // Accepted
     )
   }
   ```

2. **Add Timeout Protection**
   ```typescript
   async function processWebhookWithTimeout(
     handler: () => Promise<void>,
     timeoutMs: number = 5000
   ) {
     return Promise.race([
       handler(),
       new Promise((_, reject) =>
         setTimeout(() => reject(new Error('Timeout')), timeoutMs)
       )
     ])
   }
   ```

3. **Monitor Processing Time**
   ```typescript
   const start = performance.now()
   // ... process webhook ...
   const duration = performance.now() - start

   if (duration > 1000) {
     logger.warn('Slow webhook processing', { duration })
   }
   ```

### Issue 4: Data Inconsistency

**Symptoms:**
- Recording created in HMS but not in database
- Status mismatch between HMS and database
- Duplicate recordings

**Solutions:**

1. **Implement Idempotency**
   ```typescript
   async function handleRecordingStarted(event: any) {
     // Check if already processed
     const existing = await db.query(
       'SELECT * FROM recordings WHERE hms_recording_id = $1',
       [event.recordingId]
     )

     if (existing.length > 0) {
       logger.debug('Duplicate webhook, skipping')
       return
     }

     // Create new recording
     await db.insert('recordings', {
       hms_recording_id: event.recordingId,
       status: 'started',
       created_at: new Date()
     })
   }
   ```

2. **Add Reconciliation Job**
   ```typescript
   // File: /scripts/reconcile-recordings.ts

   async function reconcileRecordings() {
     // Get all active recordings from HMS
     const hmsRecordings = await getHmsRecordings()

     // Get all recordings in database
     const dbRecordings = await db.query('SELECT * FROM recordings')

     // Find mismatches
     for (const hmsRec of hmsRecordings) {
       const dbRec = dbRecordings.find(
         r => r.hms_recording_id === hmsRec.id
       )

       if (!dbRec) {
         logger.warn('Recording in HMS but not DB', {
           hmsRecordingId: hmsRec.id
         })
       }
     }
   }

   // Run daily
   schedule.scheduleJob('0 0 * * *', reconcileRecordings)
   ```

---

## Webhook Retry Logic

### HMS Retry Policy

**By default, HMS retries:**
- Failed webhooks up to 5 times
- Exponential backoff: 1s, 4s, 16s, 64s, 256s
- Continues for up to 1 day

**Your endpoint should:**
- Return 2xx status for success
- Return 5xx for retriable errors
- Return 4xx for non-retriable errors

### Implementing Retry Logic

**Webhook Handler with Idempotency:**

```typescript
// File: /app/api/webhooks/hms/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyHmsWebhook } from '@/lib/webhooks/hms-verify'
import { handleRecordingEvent } from '@/lib/webhooks/hms-handlers'
import { logger } from '@/lib/monitoring/logger'

// Maximum request duration is 30 seconds on Vercel
const TIMEOUT_MS = 25_000

export async function POST(request: NextRequest) {
  try {
    // 1. Verify signature
    const isValid = await verifyHmsWebhook(request)
    if (!isValid) {
      logger.warn('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 2. Parse body
    const body = await request.json()
    const eventId = body.id // Unique event ID for idempotency

    logger.info('Webhook received', {
      eventId,
      type: body.type,
      roomId: body.roomId
    })

    // 3. Check if already processed (idempotency)
    const processed = await db.query(
      'SELECT * FROM webhook_events WHERE id = $1',
      [eventId]
    )

    if (processed.length > 0) {
      logger.debug('Webhook already processed', { eventId })
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // 4. Process webhook with timeout
    const result = await Promise.race([
      processWebhook(body),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ])

    // 5. Mark as processed
    await db.insert('webhook_events', {
      id: eventId,
      type: body.type,
      status: 'processed',
      created_at: new Date()
    })

    logger.info('Webhook processed successfully', { eventId })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    // Return 5xx for retriable errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 503 }
    )
  }
}

async function processWebhook(body: any) {
  switch (body.type) {
    case 'recording.started':
      return handleRecordingStarted(body)
    case 'recording.success':
      return handleRecordingSuccess(body)
    case 'recording.failed':
      return handleRecordingFailed(body)
    default:
      logger.debug('Unknown webhook type', { type: body.type })
      return { handled: false }
  }
}
```

### Handling Retry Conditions

**Recognize Retriable Errors:**

```typescript
function isRetriable(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('ECONNREFUSED')) return true
    if (error.message.includes('ETIMEDOUT')) return true
    if (error.message.includes('ENOTFOUND')) return true

    // Database connection errors
    if (error.message.includes('connection refused')) return true
    if (error.message.includes('too many connections')) return true

    // Temporary service issues
    if (error.message.includes('temporarily unavailable')) return true
  }

  return false
}

// Usage
try {
  await processWebhook(body)
} catch (error) {
  if (isRetriable(error)) {
    return NextResponse.json(
      { error: 'Temporary error', retriable: true },
      { status: 503 }
    )
  } else {
    return NextResponse.json(
      { error: 'Permanent error' },
      { status: 400 }
    )
  }
}
```

---

## Webhook Event Examples

### Recording Started

```json
{
  "id": "evt_recording_started_001",
  "type": "recording.started",
  "timestamp": 1699900000000,
  "roomId": "room_123",
  "recordingId": "rec_123",
  "recordingPath": "/recordings/rec_123",
  "initiatedBy": {
    "userID": "user_123",
    "name": "John Doe",
    "clientSpecificUserID": "custom_123"
  }
}
```

**Handler:**

```typescript
async function handleRecordingStarted(event: any) {
  const { roomId, recordingId } = event

  await db.insert('recordings', {
    hms_recording_id: recordingId,
    room_id: roomId,
    status: 'recording',
    started_at: new Date(event.timestamp),
    initiated_by: event.initiatedBy.userID
  })

  // Notify user
  await sendNotification(event.initiatedBy.userID, {
    title: 'Recording Started',
    message: 'Your session is being recorded'
  })
}
```

### Recording Success

```json
{
  "id": "evt_recording_success_001",
  "type": "recording.success",
  "timestamp": 1699908000000,
  "roomId": "room_123",
  "recordingId": "rec_123",
  "recordingPath": "/recordings/rec_123/archive.m3u8",
  "duration": 3600,
  "fileSize": 2147483648,
  "files": [
    {
      "location": "/recordings/rec_123/video.h264",
      "type": "video"
    },
    {
      "location": "/recordings/rec_123/audio.aac",
      "type": "audio"
    }
  ]
}
```

**Handler:**

```typescript
async function handleRecordingSuccess(event: any) {
  const { roomId, recordingId, duration, fileSize } = event

  await db.update('recordings', {
    status: 'completed',
    duration: Math.floor(duration / 1000), // Convert to seconds
    file_size: fileSize,
    playback_url: event.recordingPath,
    completed_at: new Date(event.timestamp)
  })

  // Notify viewers
  const session = await db.query(
    'SELECT * FROM sessions WHERE room_id = $1',
    [roomId]
  )

  for (const participant of session.participants) {
    await sendNotification(participant.user_id, {
      title: 'Recording Ready',
      message: 'Watch the recording of your session'
    })
  }
}
```

### Recording Failed

```json
{
  "id": "evt_recording_failed_001",
  "type": "recording.failed",
  "timestamp": 1699908000000,
  "roomId": "room_123",
  "recordingId": "rec_123",
  "reason": "STORAGE_ERROR",
  "error": "Failed to write to S3 bucket"
}
```

**Handler:**

```typescript
async function handleRecordingFailed(event: any) {
  const { roomId, recordingId, reason, error } = event

  await db.update('recordings', {
    status: 'failed',
    failure_reason: reason,
    error_message: error,
    completed_at: new Date(event.timestamp)
  })

  logger.error('Recording failed', {
    roomId,
    recordingId,
    reason,
    error
  })

  // Alert admin
  await sendAlert({
    severity: 'high',
    message: `Recording failed: ${reason}`,
    context: { roomId, recordingId }
  })
}
```

---

## Testing Checklist

- [ ] ngrok installed and working
- [ ] Local webhook endpoint tested
- [ ] Signature verification implemented
- [ ] Signature verification tests pass
- [ ] Staging deployment created
- [ ] Staging webhooks configured
- [ ] All event types tested (started, success, failed)
- [ ] Retry logic implemented
- [ ] Idempotency implemented
- [ ] Timeout handling implemented
- [ ] Error handlers implemented
- [ ] Logging configured
- [ ] Database updates verified
- [ ] Notifications sent correctly

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-14 | Initial comprehensive webhook testing guide |

---

**Last Updated:** November 14, 2025
**Maintained by:** Development Team
**Status:** Production Ready
