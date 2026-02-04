# Recording System Documentation

## Overview

Kulti uses 100ms (HMS) composite recording to record video sessions. This document covers the complete recording workflow, API usage, and management.

---

## Architecture

### Components

1. **Database**: `recordings` table in Supabase
2. **HMS API**: 100ms recording service
3. **Webhooks**: HMS webhook handlers
4. **UI**: Recording controls and management
5. **Storage**: HMS cloud storage (with optional copy to Supabase Storage)

### Recording Flow

```
1. Host clicks "Start Recording"
   ↓
2. Frontend calls POST /api/hms/start-recording
   ↓
3. Backend verifies host permission
   ↓
4. Backend calls HMS API to start recording
   ↓
5. Database record created (status: "recording")
   ↓
6. Recording indicator shown to all participants
   ↓
7. Host clicks "Stop Recording"
   ↓
8. Frontend calls POST /api/hms/stop-recording
   ↓
9. HMS stops recording and begins processing
   ↓
10. Database updated (status: "processing")
   ↓
11. HMS webhook fires when processing complete
   ↓
12. Database updated (status: "completed", recording_url added)
   ↓
13. Recording available for viewing/download
```

---

## Database Schema

### `recordings` Table

```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  hms_recording_id TEXT NOT NULL,
  recording_url TEXT,
  duration INTEGER, -- Duration in seconds
  status TEXT NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indexes

- `idx_recordings_session_id` - Fast lookups by session
- `idx_recordings_status` - Filter by status
- `idx_recordings_created_at` - Chronological ordering

### RLS Policies

**Read Access:**
- Session participants can view recordings
- Session host can view recordings

**Delete Access:**
- Only session host can delete recordings

---

## API Endpoints

### Start Recording

**POST** `/api/hms/start-recording`

Starts recording for a session (host only).

**Request Body:**
```json
{
  "sessionId": "uuid",
  "roomId": "hms_room_id"
}
```

**Response:**
```json
{
  "success": true,
  "recording": {
    "id": "uuid",
    "hmsRecordingId": "hms_id",
    "status": "recording"
  }
}
```

**Errors:**
- 401: Unauthorized (not logged in)
- 403: Forbidden (not session host)
- 404: Session not found
- 400: Recording already in progress

---

### Stop Recording

**POST** `/api/hms/stop-recording`

Stops recording for a session (host only).

**Request Body:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "recording": {
    "id": "uuid",
    "status": "processing"
  }
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden (not session host)
- 404: Session not found
- 400: No active recording

---

### List Recordings

**GET** `/api/recordings/list`

Lists recordings for the authenticated user.

**Query Parameters:**
- `limit`: Number of recordings (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (optional)

**Response:**
```json
{
  "recordings": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "hms_recording_id": "hms_id",
      "recording_url": "https://...",
      "duration": 3600,
      "status": "completed",
      "metadata": {},
      "created_at": "2025-01-16T...",
      "sessions": {
        "id": "uuid",
        "title": "Session Title"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45,
    "hasMore": true
  }
}
```

---

### Get Recording

**GET** `/api/recordings/[recordingId]`

Gets details for a specific recording.

**Response:**
```json
{
  "recording": {
    "id": "uuid",
    "session_id": "uuid",
    "hms_recording_id": "hms_id",
    "recording_url": "https://...",
    "duration": 3600,
    "status": "completed",
    "metadata": {},
    "created_at": "2025-01-16T...",
    "sessions": {
      "id": "uuid",
      "title": "Session Title",
      "host_id": "uuid"
    }
  }
}
```

---

### Delete Recording

**DELETE** `/api/recordings/[recordingId]`

Deletes a recording (host only).

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden (not session host)
- 404: Recording not found

---

## Webhook Handling

### HMS Webhooks

HMS sends webhooks for recording events to `/api/webhooks/hms`.

**Event Types:**

1. `recording.started` - Recording has started
2. `recording.stopped` - Recording has stopped
3. `recording.success` - Recording processing complete
4. `recording.failed` - Recording processing failed

### Webhook Payload

```json
{
  "type": "recording.success",
  "data": {
    "id": "hms_recording_id",
    "room_id": "hms_room_id",
    "recording_url": "https://...",
    "duration": 3600,
    "size": 1073741824,
    "resolution": "1280x720",
    "format": "mp4"
  }
}
```

### Handler Logic

```typescript
// When recording completes
case "recording.success":
  await supabase
    .from("recordings")
    .update({
      status: "completed",
      recording_url: data.recording_url,
      duration: data.duration,
      metadata: {
        size: data.size,
        resolution: data.resolution,
        format: data.format,
      },
    })
    .eq("hms_recording_id", recordingId)
  break
```

---

## Frontend Integration

### Recording Controls

Add to session controls (host only):

```typescript
import { useState } from "react"

function RecordingControls({ sessionId, roomId, isHost }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const startRecording = async () => {
    const response = await fetch("/api/hms/start-recording", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, roomId }),
    })

    if (response.ok) {
      setIsRecording(true)
    }
  }

  const stopRecording = async () => {
    const response = await fetch("/api/hms/stop-recording", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })

    if (response.ok) {
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  if (!isHost) return null

  return (
    <div>
      {!isRecording && !isProcessing && (
        <button onClick={startRecording}>
          Start Recording
        </button>
      )}
      {isRecording && (
        <button onClick={stopRecording}>
          Stop Recording
        </button>
      )}
      {isProcessing && (
        <div>Processing recording...</div>
      )}
    </div>
  )
}
```

### Recording Indicator

Show to all participants when recording:

```typescript
function RecordingIndicator({ isRecording }) {
  if (!isRecording) return null

  return (
    <div className="recording-indicator">
      <div className="recording-dot" />
      <span>Recording</span>
    </div>
  )
}
```

---

## HMS Configuration

### Recording Settings

Configure in HMS dashboard or via API:

```typescript
{
  recording_config: {
    enable_transcription: false, // Optional transcription
    max_recording_duration: 7200, // 2 hours max
    resolution: {
      width: 1280,
      height: 720,
    },
  }
}
```

### Webhook Setup

1. Go to [HMS Dashboard](https://dashboard.100ms.live/)
2. Navigate to Webhooks
3. Add webhook URL: `https://kulti.app/api/webhooks/hms`
4. Select events:
   - recording.started
   - recording.stopped
   - recording.success
   - recording.failed
5. Save configuration

---

## Storage Options

### Option 1: HMS Storage (Default)

- Recordings stored in HMS cloud
- Automatic CDN delivery
- Pay per GB stored
- Retention: Configurable (default 30 days)

**Pros:**
- No additional setup
- Fast delivery via CDN
- Automatic management

**Cons:**
- Ongoing storage costs
- Dependent on HMS

### Option 2: Copy to Supabase Storage

After recording completes, copy to Supabase:

```typescript
// In webhook handler
case "recording.success":
  // Download from HMS
  const response = await fetch(data.recording_url)
  const blob = await response.blob()

  // Upload to Supabase Storage
  const { data: uploadData, error } = await supabase.storage
    .from("recordings")
    .upload(`${sessionId}/${recordingId}.mp4`, blob, {
      contentType: "video/mp4",
      cacheControl: "3600",
    })

  if (!error) {
    // Update database with Supabase URL
    await supabase
      .from("recordings")
      .update({
        recording_url: uploadData.path,
        metadata: {
          storage: "supabase",
          hms_url: data.recording_url, // Keep backup
        },
      })
      .eq("hms_recording_id", recordingId)
  }
  break
```

**Pros:**
- Full control over storage
- Integrated with Supabase
- Potential cost savings

**Cons:**
- Requires additional implementation
- Transfer time and bandwidth
- Need to manage cleanup

---

## Cost Estimation

### HMS Recording Costs

**Recording:**
- $0.004 per participant-minute
- Example: 2-person call for 1 hour = $0.48

**Storage:**
- $0.025 per GB per month
- Example: 100 recordings @ 500MB each = $1.25/month

**Bandwidth:**
- $0.08 per GB transferred
- Included CDN delivery

### Optimization Tips

1. **Limit recording duration**
   - Set max duration in HMS config
   - Warn hosts before limit

2. **Auto-cleanup old recordings**
   - Delete recordings > 90 days old
   - Send notification before deletion

3. **Compress recordings**
   - Use lower resolution for non-critical content
   - Enable HMS compression

4. **On-demand recording only**
   - Don't auto-record all sessions
   - Let hosts choose

---

## Security Considerations

### Access Control

1. **Only hosts can start/stop recording**
   - Verified at API level
   - RLS policies enforce

2. **Recording URLs are private**
   - Require authentication to view
   - Short-lived signed URLs if needed

3. **Webhook validation**
   - Verify webhook signature (if HMS provides)
   - Validate payload structure

### Privacy

1. **Recording notification**
   - All participants notified when recording starts
   - Recording indicator always visible

2. **Consent**
   - Terms of Service should cover recording
   - Consider explicit consent flow

3. **Data retention**
   - Define retention policy
   - Auto-delete after period
   - Allow users to request deletion

---

## Monitoring

### Key Metrics

- Recording success rate
- Processing time
- Failed recordings
- Storage usage
- Bandwidth usage

### Alerts

Set up alerts for:
- Failed recordings (> 5% failure rate)
- Processing delays (> 10 minutes)
- Storage nearing limits
- Webhook failures

### Debugging

Check these when issues occur:

1. **Sentry errors** - API/webhook failures
2. **HMS dashboard** - Recording status
3. **Database logs** - Recording records
4. **Webhook logs** - Event delivery

---

## Testing

### Manual Testing

1. Create test session
2. Start recording
3. Speak for 30 seconds
4. Stop recording
5. Wait for processing (2-5 minutes)
6. Verify recording URL populated
7. Test playback
8. Test deletion

### Automated Testing

```typescript
describe("Recording API", () => {
  it("should start recording for host", async () => {
    const response = await fetch("/api/hms/start-recording", {
      method: "POST",
      body: JSON.stringify({ sessionId, roomId }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.recording.status).toBe("recording")
  })

  it("should deny recording for non-host", async () => {
    const response = await fetch("/api/hms/start-recording", {
      method: "POST",
      body: JSON.stringify({ sessionId, roomId }),
    })

    expect(response.status).toBe(403)
  })
})
```

---

## Troubleshooting

### Recording Won't Start

1. **Check HMS credentials** - Verify API keys
2. **Check room exists** - Verify HMS room ID
3. **Check permissions** - Verify user is host
4. **Check HMS dashboard** - Look for errors

### Recording Stuck in "Processing"

1. **Wait longer** - Can take 5-10 minutes
2. **Check HMS webhook logs** - Verify delivery
3. **Check database** - Verify record exists
4. **Contact HMS support** - If persistent

### No Recording URL After Processing

1. **Check webhook received** - Look in logs
2. **Check HMS dashboard** - Verify recording exists
3. **Manually update** - Use HMS API to get URL
4. **Re-trigger webhook** - If possible

### Playback Issues

1. **Check URL accessibility** - Test in browser
2. **Check browser support** - MP4 format required
3. **Check CDN** - Verify content delivery
4. **Check RLS** - Verify user has access

---

## Roadmap

### Phase 1 (Current)
- ✅ Basic start/stop recording
- ✅ Webhook handling
- ✅ Database storage
- ✅ API endpoints

### Phase 2 (Future)
- ⏳ Recordings UI page
- ⏳ Video player component
- ⏳ Download functionality
- ⏳ Sharing controls

### Phase 3 (Future)
- ⏳ Transcription support
- ⏳ Highlights/clips
- ⏳ Auto-cleanup system
- ⏳ Analytics dashboard

---

Last Updated: 2025-01-16
