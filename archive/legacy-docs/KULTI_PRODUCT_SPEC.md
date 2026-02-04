# Kulti Product Specification
**Version 1.0 | November 10, 2025**

---

## Executive Summary

**Kulti** is a live streaming platform for vibe coders and creative builders. Unlike traditional streaming, Kulti enables multi-person collaborative sessions with turn-based screen sharing - like Google Meet meets Twitch, built for the AI coding generation.

**Core Differentiator:** Multi-person screen sharing where participants pass control back and forth, creating collaborative working sessions rather than broadcast performances.

---

## Product Vision

### The Problem
- Vibe coders work in isolation, missing real-time community feedback
- Twitch is for gaming, YouTube Live is for polished content
- No platform for raw, collaborative building sessions
- Educational content outdated by publication
- Current tools require complex technical setup

### The Solution
**"Build Together, Live. No polish. No performance. Just raw building."**

A platform where you can:
- Drop into working sessions with other builders
- Pass screen control seamlessly
- Get instant feedback while building
- Learn by watching real-time workflows
- Build community around projects

---

## Technical Architecture

### Tech Stack
```
Frontend:
- Next.js 14 (App Router, TypeScript)
- React 18
- TailwindCSS (dark mode first)
- Shadcn/ui components
- 100ms React SDK

Backend:
- Next.js API Routes
- Supabase (PostgreSQL, Auth, Realtime)
- 100ms Server SDK
- Anthropic Claude API

Hosting:
- Vercel (frontend + API)
- Supabase (database + auth)
- 100ms (video infrastructure)
```

### System Architecture
```
User Browser
     ↓
Next.js App (Vercel)
     ↓
     ├─→ Supabase (Auth, Database, Realtime)
     ├─→ 100ms (Video/Audio Streaming)
     └─→ Anthropic (AI Features)
```

---

## Database Schema

### Core Tables

**profiles**
```sql
id UUID (references auth.users)
username TEXT UNIQUE
display_name TEXT
avatar_url TEXT
bio TEXT
is_approved BOOLEAN
invite_code TEXT
created_at TIMESTAMPTZ
```

**sessions**
```sql
id UUID
room_code TEXT UNIQUE (e.g., "VIBE-2K4F")
title TEXT
description TEXT
host_id UUID (references profiles)
hms_room_id TEXT
status TEXT (scheduled/live/ended)
is_public BOOLEAN
max_participants INTEGER (2-6)
started_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

**session_participants**
```sql
id UUID
session_id UUID (references sessions)
user_id UUID (references profiles)
role TEXT (host/presenter/viewer)
joined_at TIMESTAMPTZ
```

**messages**
```sql
id UUID
session_id UUID (references sessions)
user_id UUID (references profiles)
content TEXT
type TEXT (text/system/ai)
created_at TIMESTAMPTZ
```

**waitlist**
```sql
id UUID
email TEXT UNIQUE
name TEXT
twitter_handle TEXT
reason TEXT
status TEXT (pending/approved/rejected)
created_at TIMESTAMPTZ
```

**invites**
```sql
id UUID
code TEXT UNIQUE
created_by UUID (references profiles)
used_by UUID (references profiles)
max_uses INTEGER
current_uses INTEGER
created_at TIMESTAMPTZ
```

---

## MVP Features (2 Weeks)

### Week 1: Foundation

**Landing Page**
- Hero section with brand messaging
- Waitlist form (email, name, twitter, reason)
- Feature highlights
- Footer with social links

**Authentication**
- Signup with invite code
- Email/password login
- Profile creation (username, display name, bio)
- Protected routes

**Dashboard**
- Top navigation bar
- Grid of live sessions
- "Create Session" button
- Empty states

**Session Creation**
- Title, description
- Public/private toggle
- Max participants (2-6)
- Generate unique room code
- Create 100ms room

### Week 2: Video Streaming

**100ms Integration**
- Room creation API
- Token generation API
- Join/leave session
- Video/audio streaming
- Screen sharing (turn-based)

**Session Room**
- Header (title, host, leave button)
- Video grid (main screen share + participant tiles)
- Control bar (mic, camera, screen share, leave)
- Participant list with roles

**Real-time Chat**
- Message list (auto-scroll)
- Send messages
- User attribution
- System messages (joined/left)
- Supabase Realtime

---

## User Flows

### 1. Waitlist → Signup
```
Landing Page → Join Waitlist → Email Confirmation
→ Admin Approves → Receive Invite Code
→ Signup Page → Create Profile → Dashboard
```

### 2. Create Session
```
Dashboard → Create Session Button → Modal Form
→ Fill Details → Submit → Generate Room Code
→ Create HMS Room → Redirect to Session Room
→ Wait for Participants → Start Building
```

### 3. Join Session
```
Browse Page → Find Session → Click Join
→ (If not logged in) → Login → Continue
→ Session Room → Request to Join
→ Host Approves → Enter as Viewer
→ Host Promotes to Presenter → Can Share Screen
```

### 4. In Session
```
Session Room
├─ View Screen Share (main area)
├─ See Participants (video tiles)
├─ Chat with Others (sidebar)
├─ Toggle Mic/Camera (controls)
└─ Leave Session (header button)

Host Actions:
├─ Give Presenter Role (pass screen control)
├─ Take Back Presenter Role
├─ Mute Participant
├─ Kick User
└─ End Session
```

---

## Design System

### Brand Identity

**Voice & Tone:**
- Raw, authentic, unpolished
- Technical but not pretentious
- Community-first, anti-corporate
- Energetic, optimistic

**Visual Style:**
- Dark mode first (code editor aesthetic)
- Monospace fonts for headers
- Minimal, utilitarian UI
- High contrast, accessibility-focused

### Color Palette
```
Background: #0a0a0a (near black)
Surface: #1a1a1a
Surface Elevated: #2a2a2a

Primary: #00ff88 (electric green)
Secondary: #8b5cf6 (purple)

Text Primary: #ffffff
Text Secondary: #a1a1aa
Text Muted: #71717a

Borders: #27272a
```

### Typography
```
Headers (JetBrains Mono):
H1: 48px/56px/700
H2: 36px/44px/700
H3: 24px/32px/600

Body (Inter):
Base: 16px/24px/400
Small: 14px/20px/400
```

### Components

**Buttons:**
- Primary: bg-[#00ff88] text-black hover:bg-[#00cc6f]
- Secondary: bg-gray-800 text-white hover:bg-gray-700
- Ghost: bg-transparent hover:bg-gray-800

**Inputs:**
- bg-gray-900 border-gray-800
- focus:border-[#00ff88] focus:ring-1

**Cards:**
- bg-gray-900 border-gray-800
- hover:border-gray-700 rounded-lg

---

## API Routes

```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout

POST /api/waitlist/join
GET  /api/waitlist/position

POST /api/sessions/create
GET  /api/sessions/:id
GET  /api/sessions/live
POST /api/sessions/:id/join
POST /api/sessions/:id/leave

POST /api/hms/create-room
POST /api/hms/get-token
POST /api/hms/end-room

POST /api/ai/chat

POST /api/invites/generate
POST /api/invites/validate
```

---

## Success Metrics

### Phase 1 (First Month)
- 500+ waitlist signups
- 50+ approved users
- 100+ sessions created
- 20+ daily active sessions
- 5+ minutes average session duration

### North Star Metrics
- **Sessions per week** (growth indicator)
- **Average participants per session** (engagement)
- **Returning hosts** (retention)
- **Invite acceptance rate** (virality)

---

## Go-to-Market Strategy

### Pre-Launch (Weeks 1-2)
- Build in public on Twitter
- Share progress updates
- Gather waitlist (target: 500+)

### Launch Week
**Channels:**
1. Twitter/X - Launch thread with demo
2. Product Hunt - Thursday launch
3. Reddit - r/webdev, r/ChatGPT (follow rules)
4. HackerNews - "Show HN" post
5. Discord - AI/coding communities
6. Personal networks - Direct outreach

**Content:**
- Launch video (2 min demo)
- Blog post: "Why we built Kulti"
- Twitter thread with screenshots
- Live demo session

### Post-Launch (Weeks 3-4)
- Daily sessions with founders
- User testimonials
- Feature highlights
- Community feedback
- Iterate based on data

---

## Development Timeline

### Week 1: Foundation (Days 1-7)
- Days 1-2: Setup (Next.js, Supabase, Tailwind)
- Days 3-4: Landing + Waitlist
- Days 5-7: Auth + Dashboard + Session Creation

### Week 2: Video (Days 8-14)
- Days 1-3: 100ms Integration
- Days 4-5: Session Controls
- Days 6-7: Chat + Polish + Deploy

### Week 3: Beta (Days 15-21)
- User testing
- Bug fixes
- Performance optimization
- Prepare launch content

### Week 4: Launch (Days 22-28)
- Public launch
- Monitor metrics
- Gather feedback
- Plan Phase 2 features

---

## Phase 2 Features (Month 2)

- AI chat assistant (Claude integration)
- Browse/discovery page
- User profiles
- Invite system
- Session scheduling
- Email notifications

---

## Phase 3 Features (Month 3+)

- Session recordings
- Clip generation
- Claude Code integration
- Mobile apps (React Native)
- Monetization (tips, subscriptions)
- Analytics for hosts

---

## Risk Mitigation

### Technical Risks
- **100ms costs:** Monitor usage, set alerts, optimize settings
- **Database scaling:** Use connection pooling, implement caching
- **Video quality:** Adaptive bitrate, network diagnostics

### Product Risks
- **Low adoption:** Focus on vibe coder community first
- **Empty sessions:** Seed with beta users, scheduled events
- **Moderation:** Clear guidelines, report/block features

### Business Risks
- **Funding:** Keep costs minimal (free tiers)
- **Competition:** Move fast, focus on niche
- **Legal:** Terms of Service, Privacy Policy ready

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 100ms
NEXT_PUBLIC_HMS_APP_ID=
HMS_APP_ACCESS_KEY=
HMS_APP_SECRET=
HMS_TEMPLATE_ID=

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://kulti.club
NEXT_PUBLIC_APP_ENV=production
```

---

## Deployment Checklist

Pre-Deployment:
- [ ] Environment variables set in Vercel
- [ ] Database migrations run
- [ ] 100ms template configured
- [ ] RLS policies enabled
- [ ] Error monitoring setup

Post-Deployment:
- [ ] Test complete signup flow
- [ ] Test session creation
- [ ] Test video/audio quality
- [ ] Monitor error logs
- [ ] Set up uptime monitoring

---

## Team & Contact

**Founders:**
- Galen Oakes - Technical Lead
- Ryan Rosenthal - Creative Director

**Domain:** kulti.club  
**Status:** Pre-Launch MVP  
**Target Launch:** December 2025

---

**Built with ❤️ and Claude Code**
