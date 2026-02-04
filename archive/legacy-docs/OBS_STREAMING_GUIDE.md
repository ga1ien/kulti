# OBS Streaming Integration for Kulti

## Overview

Kulti now supports **RTMP Ingestion** from OBS Studio, allowing professional streamers to join sessions with custom overlays, scenes, and production quality alongside regular browser participants.

## How It Works

### For Users

1. **Browser Participants**: Join sessions directly from their web browser (one-click join)
2. **OBS Participants**: Stream into sessions from OBS Studio with full production capabilities
3. **Mixed Sessions**: Both types of participants can be in the same session simultaneously

### Technical Implementation

We're using 100ms's RTMP Ingestion feature which:
- Creates a unique RTMP stream key for each session
- Accepts RTMP streams from OBS (or any RTMP broadcaster)
- Presents the OBS stream as a regular participant in the 100ms room
- Works alongside browser-based WebRTC participants seamlessly

## Features Implemented

### 1. Database Schema (✅ Completed)
Added to `sessions` table:
- `rtmp_enabled` (boolean) - Whether OBS streaming is enabled for this session
- `rtmp_stream_key_id` (text) - The 100ms stream key ID

### 2. Backend Functions (✅ Completed)
File: `lib/hms/server.ts`
- `createStreamKey(roomId)` - Generate RTMP stream key for a room
- `getStreamKey(roomId)` - Fetch existing stream key
- `disableStreamKey(streamKeyId)` - Disable a stream key

### 3. API Endpoints (✅ Completed)

#### Create Stream Key
`POST /api/hms/stream-key/create`
```json
{
  "sessionId": "session-uuid"
}
```

Response:
```json
{
  "streamKeyId": "...",
  "streamKey": "...",
  "rtmpUrl": "rtmp://ingest.100ms.live/live"
}
```

#### Get Stream Key
`GET /api/hms/stream-key/[sessionId]`

Returns stream key info if enabled, or `enabled: false` if not.

### 4. UI Components (✅ Completed)

#### OBS Panel Component
File: `components/session/obs-panel.tsx`

Features:
- Shows RTMP URL and stream key (with copy-to-clipboard)
- Password-protected stream key display
- Setup instructions for OBS
- Enable/disable OBS streaming (host only)
- Visual status indicator when active

#### Session Creation Modal
File: `components/dashboard/create-session-modal.tsx`

Added:
- "Enable OBS Streaming" checkbox
- Automatically creates stream key when session is created with OBS enabled

### 5. Session Room Integration (✅ Completed)
File: `components/session/session-room.tsx`

The OBS panel is displayed in the right sidebar below the chat, showing:
- Stream key info for all participants (to share with collaborators)
- Setup instructions
- Active status when OBS is streaming

### 6. Webhook Support (✅ Completed)
File: `app/api/webhooks/hms/route.ts`

Handles 100ms webhook events:
- `rtmp.started` - OBS stream connected
- `rtmp.stopped` - OBS stream disconnected
- `rtmp.failed` - OBS stream error

## Usage Guide

### For Session Hosts

1. **Create a Session with OBS**:
   - Click "Create Session" in dashboard
   - Fill in session details
   - Check "Enable OBS Streaming"
   - Click "Create Session"

2. **Get Stream Credentials**:
   - Join your session
   - Scroll to OBS panel in right sidebar
   - Copy the RTMP URL and Stream Key

3. **Configure OBS**:
   - Open OBS Studio
   - Go to Settings → Stream
   - Service: Select "Custom"
   - Server: Paste the RTMP URL
   - Stream Key: Paste the Stream Key
   - Click "OK"

4. **Start Streaming**:
   - In OBS, click "Start Streaming"
   - Your OBS output will appear as a participant in the session

### For Participants

- Browser participants join normally via room code
- OBS participants appear as video feeds in the session
- All participants can see and interact with each other

## Technical Details

### 100ms RTMP Ingestion

The RTMP stream from OBS is:
1. Received by 100ms's RTMP ingest endpoint
2. Transcoded into WebRTC
3. Distributed to all session participants
4. Appears as a regular peer in the session

### Stream Key Security

- Stream keys are stored in Supabase
- Only session participants can view stream keys
- Keys can be disabled by the host
- Keys are unique per session

### Webhook Configuration (Optional)

To receive real-time notifications when OBS streams start/stop:

1. Log into your 100ms dashboard
2. Go to Webhooks settings
3. Add webhook URL: `https://your-domain.com/api/webhooks/hms`
4. Enable RTMP events

## Future Enhancements

Potential improvements:
- [ ] Real-time status indicator when OBS is actively streaming
- [ ] Ability to regenerate stream keys
- [ ] Stream quality/bitrate monitoring
- [ ] Multiple OBS sources per session
- [ ] Recording OBS streams separately

## Troubleshooting

### OBS Not Connecting

1. **Check Stream Key**: Ensure you copied the full stream key (including any trailing characters)
2. **Verify RTMP URL**: Make sure you're using the exact URL from the panel
3. **Check OBS Settings**:
   - Service must be set to "Custom"
   - Use TCP instead of UDP
4. **Firewall**: Ensure port 1935 (RTMP) is not blocked

### Stream Quality Issues

- **Recommended OBS Settings**:
  - Output: Streaming
  - Video Bitrate: 2500 Kbps (for 720p) or 4500 Kbps (for 1080p)
  - Encoder: x264 or hardware encoder (NVENC, QuickSync, etc.)
  - Keyframe Interval: 2 seconds
  - Resolution: 1280x720 or 1920x1080

### Stream Appears Delayed

- RTMP ingestion adds ~2-5 seconds of latency
- This is normal for RTMP → WebRTC transcoding
- Browser participants have ~1 second latency

## Cost Considerations

- RTMP ingestion is included in 100ms pricing
- No additional cost per stream
- Bandwidth usage is similar to regular video participants
- Recommended to limit concurrent OBS streams for cost control

## Resources

- [100ms RTMP Ingestion Docs](https://www.100ms.live/docs/server-side/v2/how-to-guides/live-streaming-rtmp-ingestion)
- [OBS Studio Download](https://obsproject.com/)
- [OBS Streaming Settings Guide](https://obsproject.com/wiki/Streaming)

---

**Built for Kulti - Live Streaming Platform for Vibe Coders**
**Powered by 100ms | Generated with Claude Code**
