# 100ms HMS Production Setup Guide

**Last Updated:** November 14, 2025
**Status:** Complete Production Documentation
**Audience:** DevOps, Backend Engineers, System Administrators

---

## Table of Contents

1. [Account and Workspace Setup](#account-and-workspace-setup)
2. [App Configuration](#app-configuration)
3. [Template Configuration](#template-configuration)
4. [Webhook Configuration](#webhook-configuration)
5. [Recording Storage](#recording-storage)
6. [HLS Configuration](#hls-configuration)
7. [Security Settings](#security-settings)
8. [Testing and Verification](#testing-and-verification)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Account and Workspace Setup

### Prerequisites

Before starting, ensure you have:
- Valid email address for HMS account
- Company/project information
- Production domain (e.g., `kulti.club`)
- Estimated monthly usage numbers

### Creating HMS Account

1. **Visit 100ms Dashboard**
   - Go to https://dashboard.100ms.live
   - Click "Sign Up"
   - Fill in organization details:
     - Company name: Your organization
     - Email: your-company@email.com
     - Password: Strong, 12+ characters

2. **Email Verification**
   - Check email for verification link
   - Click link to confirm account
   - You'll be redirected to dashboard

3. **Accept Terms**
   - Accept Terms of Service
   - Accept Data Processing Agreement (GDPR compliance)

### Workspace Naming Conventions

Follow these conventions for organization and workspace names:

```
Organization Name: Kulti
Workspace Name Format: [environment]-[region]
  - production-us-east
  - production-us-west
  - production-eu
  - staging-us-east

App Name Format: [platform]-[environment]
  - kulti-prod
  - kulti-staging
  - kulti-mobile
```

### Billing Plan Selection

**Recommended for Production:**

```
Plan Type: SCALE (Pro)
Monthly Commitment: Optional (recommended)
Metered Services:
  - Video streams (per 1000 participant-minutes)
  - Recordings (per GB stored)
  - Live HLS broadcast (per 1000 minutes)
  - RTMP ingest (per 1000 minutes)

Estimated Usage:
  - 50-100 concurrent sessions/day
  - 5-10 participants per session (average)
  - 2-4 hours recording per session
  - 1-2 live HLS broadcasts/week
```

**Plan Options:**

| Plan | Monthly | Overage | Best For |
|------|---------|---------|----------|
| PAY AS YOU GO | $0 | Higher rates | Testing, low volume |
| SCALE (Prepaid) | $500+ | Discounted rates | Predictable usage |
| ENTERPRISE | Custom | Custom rates | Very high volume |

### Usage Quotas and Limits

**Service Quotas (Per Workspace):**

| Service | Standard Limit | High Volume Limit |
|---------|---|---|
| Concurrent Rooms | 1,000 | Contact sales |
| Participants per Room | 100 | 10,000 (HLS) |
| Recording Quality | 720p | 4K |
| HLS Broadcast Duration | Unlimited | Unlimited |
| Storage (Recordings) | 100GB/month | Custom |
| API Rate Limits | 100 req/sec | 1,000 req/sec |

**Recommended Limits for Kulti:**

```
Max Concurrent Users: 500
Max Participants per Session: 20
Max Recording Duration: 4 hours
Max HLS Broadcast Viewers: 5,000+
```

---

## App Configuration

### Creating Production App

1. **Navigate to Apps**
   - Dashboard → Apps → Create App

2. **App Details**
   ```
   App Name: kulti-prod
   Environment: Production
   Description: Kulti Live Streaming Platform Production
   Region: us-east (or closest to users)
   ```

3. **Select Template**
   - Choose "Blank Template" or create custom
   - We'll configure roles in the next section

4. **Enable Services**
   - Video: ✅ Enabled
   - Audio: ✅ Enabled
   - Screen Share: ✅ Enabled
   - Recording: ✅ Enabled
   - HLS: ✅ Enabled
   - RTMP: ✅ Enabled (if needed)
   - Analytics: ✅ Enabled

5. **Save and Note Credentials**
   Once created, you'll see:
   ```
   App ID (NEXT_PUBLIC_HMS_APP_ID): xxxxxxxxxxxxx
   Access Key (HMS_APP_ACCESS_KEY): xxxxxxx
   Secret (HMS_APP_SECRET): xxxxxxxxxxxxxxxxxxxxxx
   ```

### Managing App Credentials

**Storing Credentials Safely:**

```bash
# In .env.production (Vercel)
NEXT_PUBLIC_HMS_APP_ID=your_app_id
HMS_APP_ACCESS_KEY=your_access_key
HMS_APP_SECRET=your_secret

# Never commit these to git
# Add to .gitignore:
.env.local
.env.production.local
```

**Rotating Credentials:**

If credentials are compromised:

1. Go to Dashboard → Apps → [App Name] → Settings
2. Click "Regenerate Keys"
3. Update environment variables in Vercel
4. Deploy application
5. Monitor for authentication errors

**Access Key Types:**

- **Published Keys**: Used by clients (browser)
- **Unpublished Keys**: Used by backend servers only
- **Management API Token**: For admin operations (rooms, recordings, etc.)

### Generating Management API Token

For backend operations (create rooms, stop recording, etc.):

1. **Navigate to API Section**
   - Dashboard → Developer → API Credentials

2. **Create Management Token**
   ```
   Token Name: kulti-prod-api
   Scope: All (or select specific scopes)
   Expiration: 1 year (set reminder to rotate)
   ```

3. **Copy Token**
   ```
   Format: eyJ...abc...xyz
   Store in: HMS_MANAGEMENT_TOKEN env var
   ```

**Management API Scopes:**

| Scope | Use Case |
|-------|----------|
| rooms:list | List all rooms |
| rooms:create | Create rooms programmatically |
| rooms:manage | Update room settings |
| recordings:list | List recordings |
| recordings:manage | Stop/delete recordings |
| webhooks:manage | Manage webhook subscriptions |
| live-streams:manage | Manage HLS broadcasts |

---

## Template Configuration

### Creating Room Template

1. **Navigate to Templates**
   - Dashboard → Apps → [App Name] → Templates

2. **Create New Template**
   ```
   Template Name: kulti-session
   Description: Live coding session template
   Max Participants: 20
   ```

### Configuring Roles

Create three roles for different session types:

#### Role 1: Host/Presenter

```
Role Name: presenter
Permissions:
  ✅ Can publish video
  ✅ Can publish audio
  ✅ Can publish screen
  ✅ Can mute/unmute others
  ✅ Can remove participants
  ✅ Can end session
  ✅ Can control recording
  ✅ Can start HLS broadcast
  ❌ Can subscribe to others' video (selective)
  ❌ Can be asked to unmute by others

Quality Settings:
  - Video Codec: VP8/H264
  - Video Quality: 720p (1280x720)
  - Audio Quality: AAC 64kbps
  - Screen Share: 1080p 30fps
```

#### Role 2: Participant

```
Role Name: participant
Permissions:
  ✅ Can publish video
  ✅ Can publish audio
  ✅ Can publish screen (limited, 5min max)
  ❌ Can mute/unmute others
  ❌ Can remove participants
  ❌ Can end session
  ❌ Can control recording
  ❌ Can start HLS broadcast

Quality Settings:
  - Video Quality: 480p
  - Audio Quality: AAC 32kbps
  - Screen Share: 720p 15fps (limited)
```

#### Role 3: Viewer

```
Role Name: viewer
Permissions:
  ❌ Can publish video
  ❌ Can publish audio
  ❌ Can publish screen
  ❌ Mute/unmute others
  ✅ Can subscribe to video/audio
  ✅ Can receive chat messages

Quality Settings:
  - Can receive video up to 1080p
  - Can receive audio
  - No publishing capability
```

### Role Permissions Details

**Video Permissions:**

```json
{
  "publishVideo": true,
  "publishAudio": true,
  "publishScreen": true,
  "screenshareAudioOnly": false,
  "recordVideo": true,
  "recordAudio": true,
  "recordScreen": true
}
```

**Participant Control:**

```json
{
  "removeOthers": false,
  "mute": false,
  "unmute": false,
  "askToUnmute": false,
  "changeRole": false,
  "endRoom": false
}
```

**Stream Permissions:**

```json
{
  "startHls": false,
  "stopHls": false,
  "startRtmp": false,
  "startRtmps": false,
  "startVirtualBackground": true,
  "startNoiseCancellation": true,
  "changeLayout": false
}
```

---

## Webhook Configuration

### Webhook URL Setup

**Production Webhook URL:**

```
https://kulti.club/api/webhooks/hms
```

**Staging Webhook URL (for testing):**

```
https://staging.kulti.club/api/webhooks/hms
```

### Registering Webhooks

1. **Navigate to Webhooks**
   - Dashboard → Apps → [App Name] → Webhooks

2. **Create Webhook Endpoint**
   - Webhook URL: `https://kulti.club/api/webhooks/hms`
   - Method: POST
   - Headers: (defaults to application/json)

3. **Subscribe to Events**

Select these events:

```
Recording Events:
  ✅ recording.started
  ✅ recording.stopped
  ✅ recording.success
  ✅ recording.failed

Live Stream Events:
  ✅ live-stream.started
  ✅ live-stream.stopped

RTMP Events (if using):
  ✅ rtmp.started
  ✅ rtmp.stopped

Beam Events (if using):
  ✅ beam.started
  ✅ beam.stopped

Room Events:
  ✅ room.started
  ✅ room.ended

Participant Events:
  ✅ participant.joined
  ✅ participant.left
  ✅ participant-list.updated (optional)
```

### Webhook Event Payload Structure

**Recording Started Event:**

```json
{
  "id": "webhook_id_123",
  "type": "recording.started",
  "timestamp": 1699900000000,
  "roomId": "room_id_123",
  "recordingId": "rec_id_123",
  "recordingPath": "/recordings/rec_id_123",
  "initiator": {
    "userID": "user_id_123",
    "name": "John Doe",
    "clientSpecificUserID": "custom_id"
  }
}
```

**Recording Success Event:**

```json
{
  "id": "webhook_id_456",
  "type": "recording.success",
  "timestamp": 1699904000000,
  "roomId": "room_id_123",
  "recordingId": "rec_id_123",
  "recordingPath": "/recordings/rec_id_123/archive.m3u8",
  "duration": 3600,
  "fileSize": 2147483648,
  "files": [
    {
      "location": "/recordings/rec_id_123/video.h264",
      "type": "video"
    },
    {
      "location": "/recordings/rec_id_123/audio.aac",
      "type": "audio"
    }
  ]
}
```

**Recording Failed Event:**

```json
{
  "id": "webhook_id_789",
  "type": "recording.failed",
  "timestamp": 1699908000000,
  "roomId": "room_id_123",
  "recordingId": "rec_id_123",
  "reason": "STORAGE_ERROR",
  "error": "Failed to write to S3 bucket"
}
```

### Webhook Signature Verification

All HMS webhooks include a signature for verification.

**Verification Process (Node.js):**

```javascript
// File: /lib/webhooks/hms.ts

import crypto from 'crypto'
import { logger } from '@/lib/monitoring/logger'

export function verifyHmsWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    )

    return isValid
  } catch (error) {
    logger.error('Webhook signature verification failed', { error })
    return false
  }
}

// Usage in API route:
export async function POST(request: Request) {
  const signature = request.headers.get('x-100ms-signature') || ''
  const payload = await request.text()

  const isValid = verifyHmsWebhookSignature(
    payload,
    signature,
    process.env.HMS_APP_SECRET!
  )

  if (!isValid) {
    logger.warn('Invalid webhook signature', { signature })
    return new Response('Unauthorized', { status: 401 })
  }

  // Process webhook...
}
```

**Signature Header Format:**

```
Header: x-100ms-signature
Format: sha256=<hex_hash>
```

---

## Recording Storage

### S3 Bucket Configuration (Recommended)

**Create S3 Bucket:**

1. **AWS Console**
   - Go to S3 → Create Bucket
   - Bucket name: `kulti-recordings-prod`
   - Region: us-east-1 (same as HMS app region)
   - Block Public Access: ✅ Enabled
   - Versioning: ✅ Enabled (for recovery)
   - Server-Side Encryption: ✅ AES-256

2. **Create IAM User for HMS**

   Policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::kulti-recordings-prod",
           "arn:aws:s3:::kulti-recordings-prod/*"
         ]
       }
     ]
   }
   ```

3. **Enable CORS** (for playback)

   ```json
   [
     {
       "AllowedOrigins": ["https://kulti.club"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### HMS Cloud Storage (Alternative)

If using HMS managed storage:

1. **Enable in Dashboard**
   - Settings → Storage → HMS Managed Storage

2. **Configuration**
   - Storage Type: HMS Cloud
   - Automatic: Recordings saved automatically
   - Retention: 30 days (or custom)

3. **Download Recordings**
   - Via Dashboard or API
   - Keep local backup for important sessions

### Storage Credentials Configuration

**Environment Variables:**

```bash
# For S3
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=kulti-recordings-prod
AWS_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Or for HMS managed
HMS_RECORDING_STORAGE=managed
```

### Retention Policies

**Recommended Retention Schedule:**

```
Active Sessions (< 7 days): S3 Standard
Archive (7-90 days): S3 Standard-IA
Long-term (> 90 days): S3 Glacier
Deleted (> 365 days): Removed
```

**Lifecycle Configuration (S3):**

```json
{
  "Rules": [
    {
      "ID": "Archive old recordings",
      "Status": "Enabled",
      "Prefix": "recordings/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### Access Permissions

**Recording Access Control:**

```javascript
// Only session creator and participants can access recording

async function canAccessRecording(userId: string, recordingId: string) {
  const recording = await db.query(
    'SELECT * FROM recordings WHERE id = $1',
    [recordingId]
  )

  const session = await db.query(
    'SELECT * FROM sessions WHERE id = $1',
    [recording.session_id]
  )

  // Check if user is creator or participant
  const isCreator = session.created_by === userId
  const isParticipant = session.participants.includes(userId)

  return isCreator || isParticipant
}
```

---

## HLS Configuration

### HLS Streaming Setup

**Enable HLS:**

1. Dashboard → Apps → [App Name] → HLS Settings
2. Toggle: Enable HLS Streaming
3. Quality Variants: Configure below

### HLS Variants (Quality Levels)

Configure multiple quality variants for adaptive bitrate streaming:

```
Variant 1 (Main):
  - Resolution: 1920x1080 (1080p)
  - Bitrate: 5000 kbps
  - Frame Rate: 30 fps
  - Use Case: Desktop viewers with good bandwidth

Variant 2 (Standard):
  - Resolution: 1280x720 (720p)
  - Bitrate: 2500 kbps
  - Frame Rate: 30 fps
  - Use Case: Most viewers

Variant 3 (Mobile):
  - Resolution: 854x480 (480p)
  - Bitrate: 1000 kbps
  - Frame Rate: 24 fps
  - Use Case: Mobile and low-bandwidth viewers

Variant 4 (Audio Only):
  - Audio Only: Yes
  - Bitrate: 128 kbps
  - Use Case: Fallback for very low bandwidth
```

### Adaptive Bitrate Settings

**Configuration:**

```json
{
  "adaptiveBitrate": {
    "enabled": true,
    "minBitrate": 500,
    "maxBitrate": 5000,
    "targetLatency": 10,
    "autoScale": true
  },
  "variants": [
    {
      "bitrate": 5000,
      "width": 1920,
      "height": 1080,
      "frameRate": 30,
      "codec": "h264"
    },
    {
      "bitrate": 2500,
      "width": 1280,
      "height": 720,
      "frameRate": 30,
      "codec": "h264"
    },
    {
      "bitrate": 1000,
      "width": 854,
      "height": 480,
      "frameRate": 24,
      "codec": "h264"
    }
  ]
}
```

### VOD Recording for HLS Streams

**Enable HLS Recording:**

1. Recording Settings → Enable HLS Recording
2. Format: .m3u8 (HLS master playlist)
3. Storage: Same as regular recordings (S3)

**HLS Manifest Structure:**

```
m3u8/
├── master.m3u8 (master playlist)
├── 1080p.m3u8 (1080p variant)
├── 1080p/
│   ├── segment-0.ts
│   ├── segment-1.ts
│   └── ...
├── 720p.m3u8 (720p variant)
├── 720p/
│   ├── segment-0.ts
│   ├── segment-1.ts
│   └── ...
└── ...
```

### CDN Configuration

**Using CloudFront CDN:**

1. **Create CloudFront Distribution**
   - Origin: S3 bucket (kulti-recordings-prod)
   - Origin path: /recordings
   - Compress objects: ✅ Yes

2. **Cache Behavior**
   - Viewer Protocol: HTTPS only
   - Cache TTL: 86400 (1 day) for segments
   - Query strings: Forward all

3. **Custom Domain**
   - CNAME: videos.kulti.club
   - SSL/TLS: ACM certificate

**Environment Variable:**

```bash
NEXT_PUBLIC_CDN_URL=https://videos.kulti.club
```

---

## Security Settings

### Secure Token Generation

**JWT Token for Room Access:**

HMS provides secure tokens that expire after a time period.

```javascript
// File: /lib/hms/token.ts

import jwt from 'jsonwebtoken'

interface HmsTokenPayload {
  access_key: string
  type: 'app'
  version: 2
  iat: number
  nbf: number
  exp: number
}

export function generateHmsToken(
  appId: string,
  accessKey: string,
  secret: string,
  expiresInSeconds: number = 86400 // 24 hours
): string {
  const now = Math.floor(Date.now() / 1000)

  const payload: HmsTokenPayload = {
    access_key: accessKey,
    type: 'app',
    version: 2,
    iat: now,
    nbf: now,
    exp: now + expiresInSeconds
  }

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    noTimestamp: true
  })
}

// Usage
const token = generateHmsToken(
  process.env.NEXT_PUBLIC_HMS_APP_ID!,
  process.env.HMS_APP_ACCESS_KEY!,
  process.env.HMS_APP_SECRET!,
  3600 // 1 hour
)
```

### Domain Restrictions

**Configure Allowed Domains:**

1. Dashboard → Apps → [App Name] → Security
2. Add domains:
   ```
   kulti.club
   www.kulti.club
   staging.kulti.club
   localhost:3000 (development only)
   ```

3. Enable CORS validation: ✅

### CORS Configuration

**HMS CORS Headers:**

```
Access-Control-Allow-Origin: https://kulti.club
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

### API Rate Limits

**Default Limits:**

| Endpoint | Requests/Minute | Notes |
|----------|---|---|
| Get Token | 100 | Per user |
| Create Room | 50 | Per app |
| Get Rooms | 100 | Per app |
| Recording API | 50 | Per app |
| HLS Broadcast | 20 | Per app |

**Request Rate Limiting Strategy:**

```javascript
// File: /lib/rate-limit/hms.ts

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

const hmsTokenLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'hms:token'
})

export async function checkHmsRateLimit(userId: string) {
  const { success, limit, remaining, reset } =
    await hmsTokenLimit.limit(userId)

  if (!success) {
    const waitTime = Math.ceil((reset - Date.now()) / 1000)
    throw new Error(`Rate limit exceeded. Wait ${waitTime}s`)
  }

  return { remaining, reset }
}
```

---

## Testing and Verification

### Test Token Generation

**Create Test Token:**

```bash
# Using curl
curl -X POST https://api.100ms.live/v2/tokens \
  -H "Authorization: Bearer $HMS_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "access_key": "HMS_APP_ACCESS_KEY",
    "secret": "HMS_APP_SECRET",
    "room_id": "test-room-123",
    "user_id": "user-123",
    "role": "presenter",
    "expires_in": 3600
  }'
```

**Verify Token Works:**

```javascript
// Test in browser console
const hmsInstance = new HMSVirtualEventStore({
  userId: 'test-user',
  userName: 'Test User',
  authToken: 'generated_token',
  onLoad: () => console.log('HMS loaded'),
  onError: (error) => console.error('Error:', error)
})
```

### Test Room Creation

**Create Test Room (API):**

```bash
curl -X POST https://api.100ms.live/v2/rooms \
  -H "Authorization: Bearer $HMS_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-session",
    "description": "Test session for verification",
    "template_id": "TEMPLATE_ID",
    "region": "us-east"
  }'
```

**Response:**

```json
{
  "id": "room_id_123",
  "name": "test-session",
  "template_id": "template_id",
  "created_at": "2025-11-14T10:00:00Z"
}
```

### Test HLS Streaming

**Start HLS Broadcast:**

```bash
curl -X POST https://api.100ms.live/v2/rooms/room_id_123/start-hls \
  -H "Authorization: Bearer $HMS_MANAGEMENT_TOKEN" \
  -d '{
    "variants": ["1080p", "720p", "480p"],
    "recording": true
  }'
```

**Verify HLS Stream:**

```javascript
// Test HLS stream playback
const hls = new Hls()
const video = document.getElementById('video')

hls.loadSource('https://your-hls-url.m3u8')
hls.attachMedia(video)

hls.on(Hls.Events.MANIFEST_PARSED, () => {
  console.log('HLS stream loaded successfully')
  video.play()
})
```

### Test Recording Functionality

**Start Recording:**

```bash
curl -X POST https://api.100ms.live/v2/rooms/room_id_123/start-recording \
  -H "Authorization: Bearer $HMS_MANAGEMENT_TOKEN" \
  -d '{
    "preset_name": "default",
    "start_hls": true
  }'
```

**Check Recording Status:**

```bash
curl https://api.100ms.live/v2/recordings/recording_id_123 \
  -H "Authorization: Bearer $HMS_MANAGEMENT_TOKEN"
```

### Test Webhooks

**Using Webhook Testing Service (ngrok):**

```bash
# 1. Start ngrok
ngrok http 3000

# 2. Get public URL
# https://xxxx-xx-xxx-xxx-xx.ngrok.io

# 3. Configure in HMS dashboard
# https://xxxx-xx-xxx-xxx-xx.ngrok.io/api/webhooks/hms

# 4. Trigger test event
# Dashboard → Apps → [App] → Webhooks → Send Test Event
```

**Verify Webhook Delivery:**

```javascript
// In /api/webhooks/hms route
export async function POST(request: Request) {
  const body = await request.json()

  logger.info('Webhook received', {
    event: body.type,
    roomId: body.roomId,
    timestamp: new Date().toISOString()
  })

  // Your webhook processing...

  return new Response(JSON.stringify({ success: true }), {
    status: 200
  })
}
```

---

## Monitoring

### HMS Dashboard Metrics

**Key Metrics to Track:**

1. **Active Rooms**
   - Current sessions in progress
   - Peak concurrent rooms
   - Average session duration

2. **Participants**
   - Total participants per room
   - Active participants (unmuted)
   - Participants joining/leaving rates

3. **Media Quality**
   - Audio: bitrate, codec, quality
   - Video: resolution, frame rate, bitrate
   - Screen share: quality, participants

4. **Recordings**
   - Active recordings count
   - Recording success/failure rates
   - Storage usage
   - Failed recording reasons

5. **HLS Broadcasts**
   - Active broadcasts count
   - Total broadcast time
   - Viewer count
   - Quality variants served

### Usage Tracking

**Monitor Cost:**

```javascript
// File: /lib/monitoring/hms-usage.ts

import { logger } from '@/lib/monitoring/logger'

export async function trackHmsUsage() {
  // Get usage from HMS API
  const response = await fetch(
    'https://api.100ms.live/v2/analytics/rooms',
    {
      headers: {
        'Authorization': `Bearer ${process.env.HMS_MANAGEMENT_TOKEN}`
      }
    }
  )

  const data = await response.json()

  // Calculate estimated cost
  const participantMinutes = data.total_participant_minutes
  const recordingGb = data.total_recording_storage_gb
  const hlsMinutes = data.total_hls_minutes

  const cost = {
    videoStreaming: participantMinutes * 0.002,
    recording: recordingGb * 0.05,
    hlsBroadcast: hlsMinutes * 0.01,
    total: (participantMinutes * 0.002) + (recordingGb * 0.05) + (hlsMinutes * 0.01)
  }

  logger.info('HMS usage tracked', { cost, usage: data })

  // Alert if usage exceeds threshold
  if (cost.total > 100) {
    logger.warn('HMS usage exceeding budget', { cost })
  }
}
```

### Error Monitoring

**Track HMS Errors:**

```javascript
// File: /lib/monitoring/hms-errors.ts

import { captureException } from '@sentry/nextjs'

export function trackHmsError(
  error: Error,
  context: {
    roomId?: string
    userId?: string
    action: string
  }
) {
  logger.error('HMS error occurred', {
    error: error.message,
    ...context
  })

  captureException(error, {
    tags: {
      service: 'hms',
      action: context.action
    },
    contexts: {
      hms: context
    }
  })
}
```

### Performance Metrics

**Track Performance:**

```javascript
// File: /lib/monitoring/hms-performance.ts

export async function measureHmsPerformance(roomId: string) {
  const metrics = {
    tokenGenerationTime: 0,
    roomCreationTime: 0,
    participantJoinTime: 0,
    publishStreamTime: 0
  }

  // Measure token generation
  const tokenStart = performance.now()
  const token = generateHmsToken(...)
  metrics.tokenGenerationTime = performance.now() - tokenStart

  // Track in Sentry
  captureMessage('HMS performance metrics', {
    level: 'info',
    contexts: {
      performance: metrics,
      roomId
    }
  })

  return metrics
}
```

---

## Troubleshooting

### Common Issues

**Issue: "Invalid Access Key" Error**

**Solution:**
1. Verify HMS_APP_ACCESS_KEY is correct in environment
2. Check if credentials were rotated
3. Restart application to pick up new env vars
4. Check token expiration (should be at least 1 hour)

**Issue: Recording Failed to Upload**

**Solution:**
1. Verify S3 bucket exists and is accessible
2. Check AWS IAM permissions
3. Verify S3 bucket region matches app region
4. Check disk space in HMS infrastructure

**Issue: HLS Stream Not Playing**

**Solution:**
1. Verify HLS is enabled in app settings
2. Check if broadcast is still active
3. Test with different video player (VLC, Hls.js)
4. Check CDN/CORS configuration

**Issue: Webhook Not Being Received**

**Solution:**
1. Verify webhook URL is accessible (test with curl)
2. Check firewall/security group rules
3. Verify signature verification is not rejecting events
4. Check application logs for errors

### Debug Mode

**Enable Debug Logging:**

```javascript
// Enable HMS SDK debug logs
HMSDebugManager.enable(['all'])

// In Sentry, enable verbose logging
Sentry.captureMessage('HMS Debug: ', {
  level: 'debug',
  contexts: {
    hms: {
      sdkVersion: HMSROOM?.getSDKVersion?.(),
      state: HMSROOM?.getState?.()
    }
  }
})
```

### Support Resources

- **HMS Documentation:** https://100ms.live/docs
- **HMS Status Page:** https://status.100ms.live
- **Support Email:** support@100ms.live
- **Issue Tracker:** https://github.com/100mslive/web-sdks/issues

---

## Checklist: Production Deployment

- [ ] HMS account created and configured
- [ ] Production app created with correct credentials
- [ ] Room template configured with roles
- [ ] Webhooks registered and verified
- [ ] S3 bucket created and configured
- [ ] HLS variants configured
- [ ] Security settings (domain restrictions, rate limits)
- [ ] Test token generation working
- [ ] Test room creation successful
- [ ] Test HLS streaming works
- [ ] Test recording functionality
- [ ] Webhook signature verification implemented
- [ ] Monitoring and logging configured
- [ ] Error handling implemented
- [ ] Documentation reviewed
- [ ] Team trained on platform

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-14 | Initial comprehensive production setup guide |

---

**Last Updated:** November 14, 2025
**Maintained by:** DevOps Team
**Status:** Production Ready
