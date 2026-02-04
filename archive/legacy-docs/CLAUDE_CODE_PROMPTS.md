# Claude Code Prompt Templates for Building Kulti

Copy-paste these prompts into Claude Code to build specific features. Use them in order, or jump to what you need.

---

## 🚀 Initial Setup Prompts

### Prompt 1: Project Initialization
```
I'm building Kulti - a vibe coding live streaming platform. 

Tech stack:
- Next.js 14 with App Router and TypeScript
- TailwindCSS with dark theme (background: #0a0a0a, primary: #00ff88)
- Supabase for auth and database
- 100ms for video streaming

Initialize the Next.js project and install all dependencies:
- @supabase/supabase-js, @supabase/ssr, @supabase/auth-helpers-nextjs
- @100mslive/react-sdk, @100mslive/server-sdk
- @anthropic-ai/sdk
- react-hook-form, zod, @hookform/resolvers
- lucide-react, date-fns, uuid, jsonwebtoken

Configure Tailwind with the dark theme colors and set up the project structure.
```

### Prompt 2: Supabase Setup
```
Set up Supabase client utilities for Kulti:

1. Create lib/supabase/client.ts - browser client using @supabase/ssr
2. Create lib/supabase/server.ts - server client with cookies support
3. Create middleware.ts - protect /dashboard routes, redirect authenticated users from auth pages

Environment variables needed:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Use Next.js 14 App Router patterns.
```

---

## 🎨 Landing Page Prompts

### Prompt 3: Landing Page Hero
```
Build the Kulti landing page hero section:

Design requirements:
- Dark background (#0a0a0a)
- Centered layout
- Headline: "Build Together, Live" (font-mono, 6xl, bold, white)
- Subheadline: "No polish. No performance. Just raw building with your crew." (2xl, gray-400)
- Two buttons:
  1. "Join the Waitlist" (primary green #00ff88, links to #waitlist)
  2. "Learn More" (ghost style with border)

Make it minimal, high-impact, code-editor aesthetic.
```

### Prompt 4: Waitlist Form
```
Build a waitlist form for Kulti:

Form fields:
- Email (required, validated)
- Name (required, min 2 chars)
- Twitter handle (optional)
- Reason for joining (required, 10-150 chars)

Features:
- Client-side validation with react-hook-form + zod
- Submit to /api/waitlist/join
- On success, show position number: "You're #234 in line"
- Error handling

API endpoint should:
- Check for duplicate emails
- Insert to Supabase 'waitlist' table
- Return position number

Dark theme, primary green submit button.
```

---

## 🔐 Authentication Prompts

### Prompt 5: Signup Page
```
Build the signup page for Kulti at /signup:

Form fields:
1. Invite code (required, validated against 'invites' table)
2. Email (required)
3. Password (required, min 8 chars)
4. Username (required, alphanumeric + dashes, check availability)
5. Display name (required)

Flow:
1. Validate invite code exists and isn't used
2. Check username availability
3. Create Supabase auth user
4. Create profile in 'profiles' table
5. Mark invite as used
6. Redirect to /dashboard

Dark theme, clean form design, primary green button.
```

### Prompt 6: Login Page
```
Build the login page for Kulti at /login:

Simple form:
- Email
- Password
- Submit button

Flow:
1. Sign in with Supabase auth
2. Redirect to /dashboard on success
3. Show error message on failure

Include link to signup: "Don't have an account? Sign up"
Dark theme, minimal design.
```

---

## 📊 Dashboard Prompts

### Prompt 7: Dashboard Layout
```
Build the dashboard layout for Kulti:

Layout structure:
- Top navigation bar (fixed):
  - Logo (left)
  - Navigation: Browse, Create Session
  - User menu with avatar (right)
- Main content area

Protected route - redirect to /login if not authenticated.

Navbar features:
- Dropdown user menu (profile, settings, logout)
- "Create Session" button (prominent, primary green)

Dark theme (#0a0a0a background, #1a1a1a surface).
```

### Prompt 8: Dashboard Page
```
Build the main dashboard page showing live sessions:

Sections:
1. Header with "Dashboard" title and "Create Session" button
2. "Live Now" section - grid of active sessions

Session cards should display:
- Title
- Host username with avatar
- Participant count
- "Join" button

Fetch data:
- Query 'sessions' table where status = 'live'
- Join with 'profiles' for host info

Empty state: "No live sessions right now. Create one!"

Grid layout: responsive, 2-3 columns on desktop.
```

### Prompt 9: Create Session Modal
```
Build a "Create Session" modal/dialog:

Form fields:
1. Title (required, max 60 chars)
2. Description (optional, max 280 chars)
3. Public/Private toggle (default: public)
4. Max participants (dropdown: 2-6, default: 4)

Actions:
- Cancel button
- Create button (primary green)

API endpoint /api/sessions/create:
1. Generate unique room code (format: WORD-XXXX, e.g., "VIBE-2K4F")
2. Create HMS room via 100ms API
3. Insert into 'sessions' table
4. Return room code
5. Redirect to /s/[roomCode]

Include loading states, validation, error handling.
```

---

## 🎥 100ms Video Integration Prompts

### Prompt 10: HMS Room Creation API
```
Create an API endpoint /api/hms/create-room for Kulti:

Purpose: Create a 100ms video room when a session is created

Requirements:
- POST endpoint
- Accepts: sessionId, title
- Authenticates user via Supabase
- Calls 100ms API to create room

100ms API:
- Endpoint: POST https://api.100ms.live/v2/rooms
- Headers: Authorization: Bearer ACCESS_KEY:SECRET
- Body: { name, description, template_id }

Return: { roomId }

Include error handling.
```

### Prompt 11: HMS Token Generation API
```
Create an API endpoint /api/hms/get-token for Kulti:

Purpose: Generate HMS auth token for users joining a session

Requirements:
- POST endpoint
- Accepts: roomId, role ('host', 'presenter', or 'viewer')
- Gets user profile (username, display_name)
- Generates JWT token using jsonwebtoken

JWT payload:
{
  access_key: HMS_APP_ACCESS_KEY,
  room_id: roomId,
  user_id: userId,
  role: role,
  type: 'app',
  version: 2
}

Sign with: HMS_APP_SECRET, HS256 algorithm, 24h expiry

Return: { token, userName }
```

### Prompt 12: Session Room Page
```
Build the session room page at /s/[roomCode] for Kulti:

Requirements:
- Server component that fetches session from database
- Redirects to /login if not authenticated
- Passes session data and userId to client component

Create SessionRoom client component that:
1. Gets HMS auth token via /api/hms/get-token
2. Joins HMS room on mount
3. Leaves room on unmount
4. Shows loading state while connecting

Layout:
- Header with title, host name, leave button
- Main video grid
- Chat sidebar
- Controls at bottom
```

---

## 🎬 Session Room Components

### Prompt 13: Video Grid Component
```
Build the video grid component for Kulti session rooms:

Using @100mslive/react-sdk:
- useHMSStore to get peers
- Display video tiles for all participants
- Main area: Active screen share (if any)
- Participant strip: Small video tiles

Layout:
- If screen sharing: 70% width for screen, 30% for participants
- If no screen share: Equal tiles in grid

Features:
- Show username on each tile
- Show mic/camera status icons
- Host badge

Handle camera off state (show avatar/placeholder)
```

### Prompt 14: Session Controls
```
Build the session controls component for Kulti:

Control bar at bottom with buttons:
1. Microphone toggle (useAudio hook from 100ms)
2. Camera toggle (useVideo hook from 100ms)
3. Screen share button (only if user is host/presenter)
4. Leave session button (calls hmsActions.leave)

Styling:
- Dark background
- Icons from lucide-react
- Green highlight when active
- Tooltips on hover

Track muted/unmuted state, camera on/off state, screen sharing state.
```

### Prompt 15: Chat Sidebar
```
Build the chat sidebar component for Kulti sessions:

Features:
1. Message list (scrollable, auto-scroll to bottom)
2. Message input (textarea with send button)
3. Participant list (collapsible)

Using Supabase Realtime:
- Subscribe to 'messages' table for this session
- Insert new messages
- Real-time updates

Message display:
- User avatar + username
- Message content (support markdown for code blocks)
- Timestamp
- System messages (user joined/left) in different style

Styling: 300px width, dark theme, border left
```

---

## 🆘 Debugging Prompts

### When Something Breaks
```
I'm getting this error in Kulti:

Error: [PASTE ERROR MESSAGE]

File: [FILE PATH]
Code:
[PASTE RELEVANT CODE]

Context: [What were you trying to do?]

Help me debug this. Explain what's wrong and how to fix it.
```

### When Styling Looks Wrong
```
The [COMPONENT NAME] doesn't match Kulti's design system.

Current styling: [DESCRIBE ISSUE]
Expected: Dark theme (#0a0a0a background), primary green (#00ff88), minimal design

Here's the component:
[PASTE CODE]

Fix the styling to match Kulti's design system.
```

---

**Happy building! 🚀**

*These prompts work best with Claude Code, Cursor with Claude, or Claude.ai*
