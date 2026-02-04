# Kulti App Routes Reference

Complete listing of all pages, routes, and API endpoints in the Kulti application, organized by section.

---

## Public Pages

### Landing & Authentication
- `/` - **Home / Landing Page** - Main entry point with hero and features
- `/app/(auth)/login` - **Login Page** - User login with email/phone
- `/app/(auth)/signup` - **Sign Up Page** - User registration
- `/help` - **Help Center** - FAQ, troubleshooting, and support info

### Presenter Join
- `/presenter-join/[token]` - **Presenter Join Page** - Join session as presenter via token

### Short Link
- `/s/[roomCode]` - **Short Room Link** - Join session via short code

---

## Dashboard Pages (Authenticated)

### Core Dashboard
- `/app/(dashboard)/dashboard` - **Main Dashboard** - Overview, quick actions, and recommendations
- `/app/(dashboard)/browse` - **Browse Sessions** - Discover and join live sessions

### User Features
- `/app/(dashboard)/credits` - **Credits Overview** - Credit balance, transactions, and tipping
- `/app/(dashboard)/search` - **Search** - Search sessions, users, and content
- `/app/(dashboard)/community` - **Community Hub** - Community rooms and discussion topics
- `/app/(dashboard)/community/[slug]` - **Community Room** - Specific community room page
- `/app/(dashboard)/profile/[username]` - **User Profile** - User profile and stats

### Settings
- `/app/(dashboard)/settings` - **Settings Main** - Settings overview and account management
- `/app/(dashboard)/settings/notifications` - **Notification Settings** - Configure notification preferences
- `/app/(dashboard)/settings/privacy` - **Privacy Settings** - Privacy and data settings

### Recordings
- `/app/(dashboard)/recordings` - **My Recordings** - View and manage recorded sessions

---

## Admin Pages (Admin Only)

All admin pages are under `/app/(dashboard)/admin` and are role-protected.

### Admin Dashboard
- `/app/(dashboard)/admin` - **Admin Dashboard** - Overview and key metrics
- `/app/(dashboard)/admin/analytics` - **Analytics** - Platform analytics and insights

### Management
- `/app/(dashboard)/admin/users` - **User Management** - View and manage users
- `/app/(dashboard)/admin/sessions` - **Session Management** - View and manage sessions
- `/app/(dashboard)/admin/rooms` - **Room Management** - Manage community rooms
- `/app/(dashboard)/admin/invites` - **Invite Management** - View and manage invite codes
- `/app/(dashboard)/admin/invites/[id]` - **Invite Details** - Specific invite code details

---

## API Routes

### Authentication
- `POST /api/auth/complete-phone-signup` - Complete phone authentication signup
- `GET /api/auth/permissions` - Get user permissions and roles

### Session Management
- `POST /api/sessions/create` - Create a new session
- `POST /api/sessions/end` - End an active session
- `POST /api/sessions/[sessionId]/join` - Join a session
- `POST /api/sessions/join-as-presenter` - Join as presenter
- `GET /api/sessions/[sessionId]/participants` - Get session participants
- `POST /api/sessions/[sessionId]/boost` - Boost session visibility
- `GET /api/sessions/[sessionId]/viewer-count` - Get real-time viewer count
- `GET /api/sessions/[sessionId]/summary` - Get session summary

### Video Infrastructure (100ms)
- `POST /api/hms/get-token` - Get 100ms auth token
- `POST /api/hms/refresh-token` - Refresh 100ms token
- `POST /api/hms/start-recording` - Start session recording
- `POST /api/hms/stop-recording` - Stop session recording
- `POST /api/hms/stream-key/create` - Create HLS stream key
- `GET /api/hms/stream-key/[sessionId]` - Get stream key for session
- `POST /api/webhooks/hms` - HMS webhook handler for events

### Presenter Invites
- `POST /api/sessions/[sessionId]/presenter-invite` - Send presenter invite

### AI Features
- `POST /api/sessions/[sessionId]/ai-module` - Enable/disable AI module
- `GET /api/sessions/[sessionId]/ai-permissions` - Get AI permissions
- `POST /api/ai/chat` - Send message to AI
- `POST /api/ai/conversation` - Manage AI conversation

### Credits & Tipping
- `GET /api/credits/balance` - Get user credit balance
- `GET /api/credits/transactions` - Get transaction history
- `POST /api/credits/tip` - Send tip credits
- `GET /api/credits/leaderboard` - Get credit leaderboard
- `GET /api/credits/milestones` - Get milestone info

### Community
- `GET /api/community/rooms` - List community rooms
- `POST /api/community/rooms` - Create community room
- `GET /api/community/rooms/[roomId]` - Get room details
- `PATCH /api/community/rooms/[roomId]` - Update room
- `POST /api/community/rooms/[roomId]/join` - Join community room
- `POST /api/community/rooms/[roomId]/messages` - Post message in room
- `GET /api/community/rooms/[roomId]/messages` - Get room messages
- `POST /api/community/rooms/[roomId]/topics` - Create discussion topic
- `GET /api/community/rooms/[roomId]/topics` - Get room topics
- `POST /api/community/topics/[topicId]/vote` - Vote on topic
- `POST /api/community/topics/[topicId]/comments` - Comment on topic
- `GET /api/community/topics/[topicId]/stream` - Get topic update stream
- `POST /api/community/rooms/[roomId]/messages/[messageId]/reactions` - Add reaction
- `POST /api/community/rooms/[roomId]/messages/[messageId]/thread` - Reply in thread

### Messaging
- `POST /api/messages/[messageId]/upvote` - Upvote message
- `POST /api/messages/[messageId]/pin` - Pin message
- `POST /api/messages/[messageId]/replies` - Get message replies

### Matchmaking
- `GET /api/matchmaking/available-users` - Get available users for matching
- `POST /api/matchmaking/find-session` - Find matching session
- `GET /api/matchmaking/suggestions` - Get session suggestions
- `GET /api/matchmaking/suggestions/[id]` - Get specific suggestion

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/[id]/read` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all as read

### Presence
- `POST /api/presence/update` - Update user presence status

### Invites
- `GET /api/invites` - Get user invites
- `POST /api/invites` - Create invite code
- `GET /api/invites/[id]` - Get invite details
- `DELETE /api/invites/[id]` - Delete invite
- `GET /api/invites/my-codes` - Get my invite codes
- `POST /api/invites/validate` - Validate invite code
- `GET /api/invites/stats` - Get invite stats

### Search
- `GET /api/search` - Search sessions, users, content

### Recordings
- `GET /api/recordings/[recordingId]` - Get recording details
- `DELETE /api/recordings/[recordingId]` - Delete recording

### Settings
- `PATCH /api/settings/profile` - Update user profile
- `PATCH /api/settings/account` - Update account
- `PATCH /api/settings/email` - Update email
- `PATCH /api/settings/password` - Change password
- `PATCH /api/settings/notifications` - Update notification settings
- `PATCH /api/settings/privacy` - Update privacy settings
- `GET /api/settings/export` - Export user data

### Profile
- `GET /api/profile/matchmaking` - Get matchmaking preferences

### Admin APIs
- `GET /api/admin/users` - List users (admin)
- `GET /api/admin/users/[id]` - Get user details (admin)
- `PATCH /api/admin/users/[id]` - Update user (admin)
- `DELETE /api/admin/users/[id]` - Delete user (admin)
- `GET /api/admin/sessions` - List sessions (admin)
- `GET /api/admin/sessions/[id]` - Get session details (admin)
- `PATCH /api/admin/sessions/[id]` - Update session (admin)
- `DELETE /api/admin/sessions/[id]` - Delete session (admin)
- `GET /api/admin/rooms` - List rooms (admin)
- `PATCH /api/admin/rooms/[id]` - Update room (admin)
- `DELETE /api/admin/rooms/[id]` - Delete room (admin)
- `GET /api/admin/stats` - Get platform statistics
- `GET /api/admin/activity` - Get admin activity log

### Analytics
- `POST /api/analytics/heartbeat` - Send analytics heartbeat

### Waitlist
- `GET /api/waitlist` - Get waitlist info
- `POST /api/waitlist/join` - Join waitlist

---

## Layout Structure

### Route Groups (Using Next.js Route Groups)

#### Auth Group - `(auth)`
- Shared auth layout
- Login and signup pages
- Public routes without dashboard layout

#### Dashboard Group - `(dashboard)`
- Shared dashboard layout with navigation
- Protected routes requiring authentication
- Admin routes within this group

---

## Special Routes

### Dynamic Routes
- `[sessionId]` - Session-specific routes (join, AI settings, etc.)
- `[userId]`, `[username]` - User-specific routes
- `[roomId]` - Community room-specific routes
- `[topicId]` - Discussion topic-specific routes
- `[token]` - Presenter join token
- `[roomCode]` - Short room code

### Catch-All Routes
- Custom error pages for 404, 500, etc.

---

## Page Organization

```
app/
├── page.tsx                           # Landing page
├── layout.tsx                         # Root layout
├── (auth)/                            # Auth route group
│   ├── layout.tsx                     # Auth layout
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/                       # Dashboard route group
│   ├── layout.tsx                     # Dashboard layout with nav
│   ├── dashboard/page.tsx
│   ├── browse/page.tsx
│   ├── credits/page.tsx
│   ├── help/page.tsx
│   ├── search/page.tsx
│   ├── recordings/page.tsx
│   ├── community/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── profile/
│   │   └── [username]/page.tsx
│   ├── settings/
│   │   ├── page.tsx
│   │   ├── notifications/page.tsx
│   │   └── privacy/page.tsx
│   └── admin/                         # Admin routes (role-protected)
│       ├── page.tsx
│       ├── analytics/page.tsx
│       ├── users/page.tsx
│       ├── sessions/page.tsx
│       ├── rooms/page.tsx
│       └── invites/[id]/page.tsx
├── presenter-join/
│   └── [token]/page.tsx
├── s/
│   └── [roomCode]/page.tsx
└── api/                               # API routes
    ├── auth/
    ├── sessions/
    ├── hms/
    ├── credits/
    ├── community/
    ├── messaging/
    ├── matchmaking/
    ├── notifications/
    ├── settings/
    ├── admin/
    └── ...
```

---

## Key Features by Route

### Session Management
- Create session: `/api/sessions/create`
- Join session: `/app/(dashboard)/dashboard` → select session or `/api/sessions/[sessionId]/join`
- View session: Embedded in room view
- End session: `/api/sessions/end`

### User Interaction
- View profile: `/app/(dashboard)/profile/[username]`
- Browse sessions: `/app/(dashboard)/browse`
- Search content: `/app/(dashboard)/search`
- Access settings: `/app/(dashboard)/settings`

### Community
- Join community: `/app/(dashboard)/community`
- View room: `/app/(dashboard)/community/[slug]`
- Post messages: API `/api/community/rooms/[roomId]/messages`

### Admin Functions
- Manage users: `/app/(dashboard)/admin/users`
- Manage sessions: `/app/(dashboard)/admin/sessions`
- View analytics: `/app/(dashboard)/admin/analytics`
- Manage invites: `/app/(dashboard)/admin/invites`

---

## Notes

- All dashboard routes require authentication
- Admin routes require admin role
- API routes handle data operations (CRUD)
- Video sessions integrate with 100ms SDK
- Database queries go through Supabase
- Real-time updates use Supabase Realtime
