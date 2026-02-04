# HMS Recording Implementation Summary

## Overview
Full implementation of 100ms (HMS) recording capabilities with recordings management page, allowing session hosts to record sessions and manage recordings.

## Implementation Details

### 1. HMS Server Configuration
**File:** `/Users/galenoakes/Development/kulti/lib/hms/server.ts`

Added recording management functions:
- `startRecording(roomId)` - Starts a composite recording in 1920x1080 resolution
- `stopRecording(roomId)` - Stops an active recording
- `getRecordingStatus(roomId)` - Retrieves recording status and URL

Recording is already enabled in room creation with the `recording_info.enabled: true` setting.

### 2. Recording Control API Routes
**Files:**
- `/Users/galenoakes/Development/kulti/app/api/hms/start-recording/route.ts`
- `/Users/galenoakes/Development/kulti/app/api/hms/stop-recording/route.ts`

These endpoints:
- Verify user is the session host
- Start/stop recording via HMS API
- Create/update recording records in database
- Return recording status

### 3. Database Schema
**File:** `/Users/galenoakes/Development/kulti/supabase/migrations/20251111183934_recordings.sql`

Created `recordings` table with:
- `id` (UUID, primary key)
- `session_id` (UUID, references sessions)
- `hms_recording_id` (TEXT, HMS recording identifier)
- `recording_url` (TEXT, nullable - populated by webhook)
- `duration` (INTEGER, in seconds)
- `status` (TEXT, enum: recording | processing | completed | failed)
- `metadata` (JSONB, for additional info)
- `created_at` and `updated_at` timestamps

RLS Policies:
- Users can view recordings from sessions they participated in or hosted
- Only session hosts can delete recordings

**Type Definition:** Added `Recording` type to `/Users/galenoakes/Development/kulti/types/database.ts`

### 4. Webhook Handler Updates
**File:** `/Users/galenoakes/Development/kulti/app/api/webhooks/hms/route.ts`

Enhanced to handle recording events from HMS:
- `recording.started` - Updates status to "recording"
- `recording.stopped` - Updates status to "processing"
- `recording.success` - Updates with final URL, duration, and metadata; sets status to "completed"
- `recording.failed` - Updates with error information; sets status to "failed"

### 5. Session Controls Component
**File:** `/Users/galenoakes/Development/kulti/components/session/controls.tsx`

Added recording controls for hosts:
- Recording button (Circle icon) - red when active
- Recording indicator badge with pulsing red dot
- Toast notifications for recording start/stop
- Disabled state during loading

### 6. Recordings Management Page
**Files:**
- `/Users/galenoakes/Development/kulti/app/(dashboard)/recordings/page.tsx`
- `/Users/galenoakes/Development/kulti/components/recordings/recordings-content.tsx`

Features:
- Lists all recordings from user's hosted sessions
- Shows recording status with colored badges
- Displays session title, description, creation date, and duration
- Inline video player for completed recordings
- Download button for completed recordings
- Delete functionality (with confirmation dialog)
- Status-specific messages:
  - Processing: Shows spinner and "Processing..." message
  - Failed: Shows error message from metadata
  - Recording: Shows "Recording" badge
  - Completed: Shows Watch and Download buttons

### 7. Recording Deletion API
**File:** `/Users/galenoakes/Development/kulti/app/api/recordings/[recordingId]/route.ts`

DELETE endpoint that:
- Verifies user is the session host
- Deletes recording from database
- Returns success/error response

### 8. UI Components
Created missing Shadcn/UI components:
- `/Users/galenoakes/Development/kulti/components/ui/badge.tsx` - For status badges
- `/Users/galenoakes/Development/kulti/components/ui/alert-dialog.tsx` - For delete confirmation

## Recording Workflow

### For Hosts:

1. **Start Recording:**
   - Click recording button (Circle icon) in session controls
   - API call to `/api/hms/start-recording`
   - Creates recording record in database with status "recording"
   - HMS starts recording the session
   - Recording indicator appears (red dot badge)

2. **During Recording:**
   - Recording indicator visible to all participants
   - Session continues normally
   - All audio/video is captured

3. **Stop Recording:**
   - Click recording button again
   - API call to `/api/hms/stop-recording`
   - Recording status changes to "processing"
   - HMS stops recording and begins processing

4. **Processing:**
   - HMS processes the recording (can take several minutes)
   - Webhook receives `recording.success` event
   - Database updated with recording URL and duration
   - Status changes to "completed"

5. **Access Recordings:**
   - Navigate to `/recordings` page
   - View all recordings from hosted sessions
   - Watch recordings inline with video player
   - Download recordings for offline use
   - Delete old recordings

### For Participants:

- See recording indicator when host starts recording
- No access to recording controls
- Can view recordings if they participated in the session

## Technical Notes

### HMS Recording Configuration:
- **Type:** Composite (SFU server-side recording)
- **Resolution:** 1920x1080 (Full HD)
- **Format:** MP4 with H.264 video codec
- **Storage:** HMS managed S3 storage
- **VOD:** Automatic conversion to video-on-demand format

### Webhook Events:
Make sure to configure HMS webhook URL in the 100ms dashboard:
- URL: `https://your-domain.com/api/webhooks/hms`
- Events to enable:
  - `recording.started`
  - `recording.stopped`
  - `recording.success`
  - `recording.failed`

### Security:
- Only session hosts can start/stop recordings
- RLS policies ensure users can only see recordings from their sessions
- Recording URLs are secured through HMS CDN
- Delete operations verify host ownership

## Next Steps

1. **Apply Database Migration:**
   ```bash
   # Run this in your Supabase project
   npx supabase db push
   # Or apply the migration manually in Supabase dashboard
   ```

2. **Configure HMS Webhooks:**
   - Go to 100ms dashboard
   - Navigate to Webhooks section
   - Add webhook URL: `https://your-domain.com/api/webhooks/hms`
   - Enable recording events

3. **Test Recording Flow:**
   - Create a test session
   - Start recording as host
   - Record some content
   - Stop recording
   - Wait for processing
   - Check recordings page

4. **Optional Enhancements:**
   - Add recording duration limits
   - Implement storage quota management
   - Add email notifications when recordings complete
   - Enable recording transcription
   - Add recording analytics

## User Access

Users access their recordings via:
- **Direct URL:** `https://your-domain.com/recordings`
- **Navigation:** Should be added to the main navigation menu

The recordings page shows:
- All recordings from sessions they hosted
- Recording status (recording, processing, completed, failed)
- Session details (title, description, date)
- Duration and file size (when available)
- Video player for immediate playback
- Download links for offline access
- Delete option for managing storage

## Files Modified/Created

### Created:
1. `/app/api/hms/start-recording/route.ts`
2. `/app/api/hms/stop-recording/route.ts`
3. `/app/api/recordings/[recordingId]/route.ts`
4. `/app/(dashboard)/recordings/page.tsx`
5. `/components/recordings/recordings-content.tsx`
6. `/components/ui/badge.tsx`
7. `/components/ui/alert-dialog.tsx`
8. `/supabase/migrations/20251111183934_recordings.sql`

### Modified:
1. `/lib/hms/server.ts` - Added recording functions
2. `/app/api/webhooks/hms/route.ts` - Added recording event handlers
3. `/components/session/controls.tsx` - Added recording controls
4. `/types/database.ts` - Added Recording type

## Dependencies Added:
- `class-variance-authority` - For badge variants
- `@radix-ui/react-alert-dialog` - For delete confirmation dialog
- `date-fns` - Already installed, used for date formatting
