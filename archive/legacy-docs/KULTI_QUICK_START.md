# Kulti Quick Start Guide
**Build Kulti with Claude Code in 2 Weeks**

## TL;DR
Building a vibe coding live streaming platform with:
- **Next.js 14** + TypeScript + Tailwind
- **Supabase** for auth/database
- **100ms** for video/screen sharing
- **Claude AI** for in-chat assistance
- **Domain:** kulti.club

---

## Prerequisites Setup (Do This First)

### 1. Get Your API Keys

**Supabase** (free tier)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy: `Project URL`, `anon public key`, `service_role key`

**100ms** (free tier - 10,000 minutes/month)
1. Go to [100ms.live](https://www.100ms.live)
2. Create account
3. Create new app
4. Create template with roles: `host`, `presenter`, `viewer`
5. Enable screen share permissions for host/presenter
6. Copy: `App ID`, `Access Key`, `App Secret`, `Template ID`

**Anthropic** (for AI features)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key
3. Copy key

---

## Project Setup (5 Minutes)

```bash
# Create Next.js project
npx create-next-app@latest kulti --typescript --tailwind --app --use-npm
cd kulti

# Install all dependencies at once
npm install @supabase/supabase-js @supabase/ssr @supabase/auth-helpers-nextjs \
  @100mslive/react-sdk @100mslive/server-sdk \
  @anthropic-ai/sdk \
  react-hook-form zod @hookform/resolvers \
  class-variance-authority clsx tailwind-merge \
  lucide-react date-fns uuid jsonwebtoken \
  @types/uuid @types/jsonwebtoken

# Create environment file
touch .env.local
```

Add to `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 100ms
NEXT_PUBLIC_HMS_APP_ID=your_app_id
HMS_APP_ACCESS_KEY=your_access_key
HMS_APP_SECRET=your_app_secret
HMS_TEMPLATE_ID=your_template_id

# Anthropic
ANTHROPIC_API_KEY=your_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Setup (10 Minutes)

Run these SQL commands in Supabase SQL Editor:

```sql
-- 1. Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_approved BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Waitlist table
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  twitter_handle TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID REFERENCES profiles(id) NOT NULL,
  hms_room_id TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  is_public BOOLEAN DEFAULT true,
  max_participants INTEGER DEFAULT 4,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Session participants table
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- 5. Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Invites table
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  used_by UUID REFERENCES profiles(id),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public sessions are viewable" ON sessions FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Messages viewable by participants" ON messages FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM session_participants 
    WHERE session_id = messages.session_id AND user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_host_id ON sessions(host_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
```

---

## Step-by-Step Build Order

### Week 1: Foundation

**Day 1-2: Core Setup**
```bash
# Tell Claude Code:
"Set up the Next.js project structure with Tailwind dark theme configuration. 
Use colors: background #0a0a0a, primary #00ff88. 
Create Supabase client utilities for both client and server components.
Set up authentication middleware to protect /dashboard routes."
```

**Day 3-4: Landing Page + Waitlist**
```bash
# Tell Claude Code:
"Build the landing page with:
1. Hero section with headline 'Build Together, Live'
2. Waitlist form (email, name, twitter, reason)
3. API endpoint to save waitlist entries to Supabase
4. Show position number after submission
Dark theme, code-editor aesthetic, minimal design."
```

**Day 5-7: Auth + Dashboard**
```bash
# Tell Claude Code:
"Build authentication system:
1. Signup page with invite code validation
2. Login page
3. Create profile on signup
4. Dashboard with nav bar and 'Create Session' button
5. Session creation modal (title, description, public/private, max participants)
6. API endpoint to create session + generate room code (format: WORD-XXXX)"
```

### Week 2: Video Streaming

**Day 1-3: 100ms Integration**
```bash
# Tell Claude Code:
"Integrate 100ms for video streaming:
1. Create API endpoint to generate HMS room on session creation
2. Create API endpoint to generate HMS auth token with user role
3. Build session room page at /s/[roomCode]
4. Join HMS room when page loads
5. Display video grid with participant tiles
6. Show screen share in main area when active"
```

**Day 4-5: Session Controls**
```bash
# Tell Claude Code:
"Build session room controls:
1. Microphone toggle
2. Camera toggle
3. Screen share button (only for host/presenter)
4. Leave session button
5. Host controls to change participant roles
6. Real-time participant list in sidebar"
```

**Day 6-7: Chat + Polish**
```bash
# Tell Claude Code:
"Add chat functionality:
1. Real-time chat using Supabase Realtime
2. Show messages with username and timestamp
3. System messages for join/leave events
4. Polish UI, add loading states, error handling
5. Test complete user flow from signup to session
6. Deploy to Vercel"
```

---

## Critical Code Snippets

### Tailwind Config
```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      background: '#0a0a0a',
      surface: '#1a1a1a',
      primary: '#00ff88',
    },
  },
}
```

### Supabase Client
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Generate Room Code
```typescript
const words = ['VIBE', 'CODE', 'BUILD', 'SHIP', 'HACK', 'FLOW']
const randomWord = words[Math.floor(Math.random() * words.length)]
const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase()
const roomCode = `${randomWord}-${randomChars}`
```

---

## Testing Checklist

### Day 7 (End of Week 1)
- [ ] Landing page loads with dark theme
- [ ] Waitlist form submits successfully
- [ ] Can sign up with invite code
- [ ] Dashboard shows after login
- [ ] Can create session (shows in database)

### Day 14 (End of Week 2)
- [ ] Can join session room via /s/ROOM-CODE
- [ ] Video/audio connects via 100ms
- [ ] Screen sharing works
- [ ] Chat messages send in real-time
- [ ] Can leave session
- [ ] Multiple users can join same session

---

## Deploy to Production

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main

# Deploy to Vercel
# 1. Import GitHub repo in Vercel
# 2. Add all environment variables
# 3. Deploy
# 4. Add kulti.club domain in settings
# 5. Update DNS records to point to Vercel
```

---

## Week 3+ Features (Future)

- [ ] Claude AI chat assistant
- [ ] Session recordings
- [ ] Browse/discovery page
- [ ] User profiles
- [ ] Invite system
- [ ] Mobile responsiveness

---

**Let's build this! 🚀**

*Last updated: November 10, 2025*
