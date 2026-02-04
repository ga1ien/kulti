# Kulti: Full Vision

**A Braintied AI Studio Product**

---

## Executive Summary

**Kulti** is a live collaborative streaming platform purpose-built for the next generation of developers—"vibe coders" who build in public, learn by doing, and thrive on authentic community connection.

Unlike Twitch (gaming-focused) or YouTube Live (polished content), Kulti enables raw, real-time collaborative coding sessions where developers can pass screen control back and forth, get instant AI assistance, and discover compatible builders through intelligent matchmaking.

**Why Braintied built this:** The AI coding revolution (Cursor, Claude Code, GitHub Copilot) is creating millions of new builders who work in fundamentally different ways. They need a platform designed for how they actually build—not adapted from gaming or entertainment.

---

## The Problem

### Developers Build in Isolation

The modern developer experience is paradoxically lonely. Despite being more connected than ever, builders face:

1. **No Platform Fits**
   - Twitch is optimized for gaming entertainment, not collaborative building
   - YouTube Live requires production value and polish—antithetical to raw coding
   - VS Code Live Share only handles code, not video, chat, or community
   - Zoom/Google Meet are private and undiscoverable

2. **Learning by Watching Edited Tutorials Fails**
   - Tutorials become outdated before publication
   - Edited content hides the real debugging process
   - Viewers see the destination, not the journey
   - No way to ask questions or collaborate in real-time

3. **The "Vibe Coding" Revolution Has No Home**
   - AI coding tools created a new generation of builders
   - These developers work differently—iteratively, experimentally, publicly
   - They want to share their process, not just their finished products
   - No platform exists for authentic, collaborative building sessions

4. **High Friction to Go Live**
   - Existing streaming requires OBS, microphones, cameras, complex setups
   - Barrier to entry prevents spontaneous sessions
   - Technical requirements exclude many potential creators

---

## The Solution

**Kulti: Build Together, Live.**

### Core Product

A web-based platform where developers can:

- **Go live instantly** — Click a button, no OBS, no complex setup
- **Share and pass screens** — Turn-based control, not just view-only sharing
- **Collaborate in small groups** — 2-6 presenters per session, unlimited viewers
- **Chat in real-time** — Threaded discussions with upvoting and pinning
- **Get AI assistance** — Built-in Claude integration for coding help during sessions
- **Discover compatible builders** — Smart matchmaking based on skills and interests
- **Scale to large audiences** — Automatic HLS switching for 1000+ concurrent viewers

### Key Differentiators

| Feature | Kulti | Twitch | YouTube Live | VS Code Live Share |
|---------|-------|--------|--------------|-------------------|
| Built for coding | Yes | No | No | Partial |
| Zero setup streaming | Yes | No | No | N/A |
| Turn-based screen control | Yes | No | No | Partial |
| Built-in AI assistant | Yes | No | No | No |
| Smart matchmaking | Yes | No | No | No |
| Public discovery | Yes | Yes | Yes | No |
| Real-time chat | Yes | Yes | Yes | Limited |
| Scales to 1000+ | Yes | Yes | Yes | No |

---

## Market Opportunity

### Total Addressable Market (TAM)

**Global Developer Tools Market: $111-195 billion (2024-2025)**
- Application development software: $138 billion in 2025, projected to reach $621 billion by 2032 (Fortune Business Insights)
- Core software development tools: $6-7 billion in 2024, growing at 14-17% CAGR

**Global Live Streaming Market: $106-135 billion (2024)**
- Projected to reach $600 billion - $1.2 trillion by 2032-2033
- Gaming content alone: 32.5 billion hours watched in 2024

### Serviceable Addressable Market (SAM)

**Developer Population: 28.7 million+ globally**
- Growth of 70% from 2022-2025 (SlashData)
- 76% of developers use or plan to use AI tools in their development process
- Western Europe + North America: ~19 million developers

**Live Streaming Developers:**
- Twitch: 7.23 million active streamers (mostly gaming)
- 15.6 billion hours of gaming content watched on Twitch alone in 2024
- Developer streaming is an underserved, fast-growing niche

### Serviceable Obtainable Market (SOM)

**"Vibe Coders" & Build-in-Public Movement: 5+ million developers**
- AI-native builders using tools like Cursor, Claude Code, Copilot
- Indie developers, solopreneurs, side-project builders
- Educational content creators in the coding space
- Remote teams wanting transparent collaboration

**Year 1 Target: 100,000 active users**

### Why Now

1. **AI Coding Revolution** — Cursor, Claude Code, GitHub Copilot are creating millions of new builders who work in entirely new ways

2. **Remote Work Normalization** — Live collaboration is now expected, not novel

3. **Creator Economy Expansion** — Developer content creators are an emerging segment with no dedicated platform

4. **"Vibe Coding" Term Goes Mainstream** — Coined by Andrej Karpathy, describing the new AI-assisted, experimental coding style

5. **Platform Gaps Persist** — No major player has addressed collaborative coding streaming; Twitch and YouTube remain focused on entertainment

---

## Product Deep Dive

### User Experience

**Going Live:**
1. Click "Create Session"
2. Enter title and description
3. Choose public or private
4. Click "Go Live" — done in under 30 seconds

**Watching a Session:**
1. Browse live sessions on dashboard
2. Click to join
3. View video, participate in chat
4. For large sessions (100+), automatic HLS streaming kicks in

**Matchmaking:**
1. Set your skills and interests in profile
2. Dashboard shows compatible online builders
3. One-click to join their session or invite to yours

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         KULTI PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14 + React 18 + TailwindCSS)                │
│  ├── Server-Side Rendering for SEO                             │
│  ├── Real-time UI updates via Supabase subscriptions           │
│  └── 100ms React SDK for video                                 │
├─────────────────────────────────────────────────────────────────┤
│  API Layer (Next.js API Routes - 72 endpoints)                 │
│  ├── Authentication (Phone OTP via Supabase Auth)              │
│  ├── Session management                                        │
│  ├── Credit system                                             │
│  ├── AI integration (Claude API)                               │
│  └── Analytics & tracking                                      │
├─────────────────────────────────────────────────────────────────┤
│  Real-Time Infrastructure                                       │
│  ├── 100ms HMS: Video streaming + recording                    │
│  │   ├── WebRTC for <100 participants (low latency)            │
│  │   └── HLS for 100+ participants (scalable)                  │
│  ├── Supabase Realtime: Chat, notifications, presence          │
│  └── HMS Session Store: Ephemeral session data                 │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer (Supabase PostgreSQL)                              │
│  ├── Row-Level Security on all tables                          │
│  ├── Full-text search                                          │
│  └── Real-time subscriptions                                   │
├─────────────────────────────────────────────────────────────────┤
│  External Services                                              │
│  ├── Anthropic Claude API (AI assistant)                       │
│  ├── Upstash Redis (rate limiting)                             │
│  └── Sentry (error tracking & monitoring)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Scalability

**Small Sessions (2-100 participants):**
- WebRTC peer-to-peer optimized for low latency
- Sub-100ms video delay
- All participants can be presenters

**Large Sessions (100-1000+ participants):**
- Automatic switch to HLS streaming
- Hosts/presenters stay on WebRTC (interactive)
- Viewers receive HLS stream (CDN-delivered, scalable)
- 2-5 second latency, adaptive bitrate (1080p/720p/480p)
- Chat remains real-time via WebRTC uplink

**OBS Support:**
- RTMP stream keys for advanced broadcasters
- Professional streaming setups supported

### Credit Economy

**Earning Credits:**
| Activity | Rate |
|----------|------|
| Hosting/streaming | 5 credits/minute |
| Watching sessions | 1 credit/minute |
| Per concurrent viewer | 2 credits/minute |
| Active chatting multiplier | 1.5x |
| Helping others multiplier | 2.0x |
| First session bonus | 100 credits |
| First stream bonus | 200 credits |

**Spending Credits:**
| Feature | Cost |
|---------|------|
| AI assistant message | 5+ credits |
| Featured session (24h) | 500 credits |
| Session recording | 1,000 credits |
| Invite code generation | 50 credits |

### Community Features

- **Community Rooms** — Persistent discussion spaces by topic
- **Topic Proposals** — Users suggest what should be streamed
- **Threaded Messages** — Deep conversations in chat
- **Reactions & Upvoting** — Surface the best content
- **User Profiles** — Skills, interests, badges, streaks

---

## Business Model

### Current State: Free Platform

- Free to use during beta
- Invitation-only access (waitlist)
- Credit economy active (earn and spend within platform)

### Revenue Streams (Planned)

1. **Premium Subscriptions**
   - Advanced analytics for creators
   - Custom profile badges and branding
   - Priority matchmaking
   - Extended recording storage

2. **Credit Purchases**
   - Buy credits with real money
   - Power users can accelerate feature access
   - Estimated: $0.01-0.05 per credit

3. **Creator Monetization**
   - Revenue share on tips
   - Sponsored sessions
   - Premium content gating

4. **Enterprise/Team Plans**
   - Private rooms for organizations
   - SSO integration
   - Admin controls and analytics
   - Compliance features

### Network Effects

1. **Matchmaking** — More users = better matches = more engagement
2. **Content Discovery** — More sessions = more reasons to visit
3. **Referral System** — Users earn credits for invites, creating viral loops
4. **Community Rooms** — Persistent spaces create habit and retention

---

## Competitive Landscape

### Direct Competitors

**None identified** — Collaborative coding streaming is an underserved niche

### Adjacent Competitors

| Platform | Focus | Limitation for Coders |
|----------|-------|-----------------------|
| **Twitch** | Gaming | Not built for code; cluttered with gaming culture |
| **YouTube Live** | Polished content | Requires production value; no collaboration |
| **VS Code Live Share** | Code collaboration | No video, no public discovery, limited to code |
| **Zoom/Meet** | Private meetings | Not public, no discovery, no community |
| **Discord** | Community chat | No native streaming; voice-focused |
| **Repl.it Multiplayer** | Collaborative coding | Code-only, no video streaming |

### Competitive Moat

1. **First-mover in niche** — No direct competitor for vibe coder streaming
2. **Network effects** — Matchmaking and community create switching costs
3. **Credit economy** — Engagement loop creates retention
4. **AI integration** — Built-in Claude assistant is unique value-add
5. **Technical architecture** — Hybrid WebRTC/HLS scaling is non-trivial to replicate

---

## Technical Differentiation

### Unique Capabilities

1. **Turn-Based Screen Control**
   - Not just screen sharing—actual control handoff
   - Multiple presenters can take turns driving
   - Seamless handoff without interruption

2. **Hybrid Streaming Architecture**
   - WebRTC for small, interactive sessions
   - Automatic HLS fallback for large audiences
   - No manual switching required

3. **Integrated AI Assistant**
   - Claude available in every session
   - Context-aware (knows session topic, participants)
   - Credit-gated for monetization

4. **Smart Matchmaking**
   - Skills and interests-based pairing
   - Finds compatible sessions automatically
   - Reduces cold-start problem for new users

### Production Readiness

**Overall Score: 92/100**

| Category | Status |
|----------|--------|
| TypeScript build | 0 errors |
| Unit tests | 204/204 passing (100%) |
| API routes | 72 production endpoints |
| Security | RLS, rate limiting, input validation |
| Monitoring | Sentry configured |
| Documentation | 21+ comprehensive guides |

---

## Traction & Status

### Platform Status

- **Build:** Complete and production-ready
- **Testing:** 204 unit tests passing
- **Security:** Hardened against OWASP top 10
- **Monitoring:** Full Sentry integration

### Launch Plan

- **December 2025:** Public beta launch
- **Q1 2026:** Monetization features
- **Q2 2026:** Mobile apps
- **2026+:** Enterprise features, API platform

### Waitlist

- System active and collecting signups
- Position tracking and invite code distribution ready
- Referral tracking for viral growth

---

## Roadmap

### Q4 2025 — Public Launch
- Open waitlist to public
- Onboard initial user cohort
- Iterate based on user feedback
- Build content creator partnerships

### Q1 2026 — Monetization
- Launch premium subscription tier
- Enable credit purchases
- Creator analytics dashboard
- Session scheduling feature

### Q2 2026 — Mobile & Growth
- iOS and Android apps
- Push notifications
- Enhanced matchmaking algorithms
- Content recommendation system

### Q3-Q4 2026 — Platform Expansion
- API for third-party integrations
- GitHub/GitLab integration
- Enterprise team features
- Clips and highlights system

### 2027+ — Ecosystem
- Integration marketplace
- AI-powered session recommendations
- Real-time code analysis features
- International expansion

---

## Team

### Founders

**Galen Oakes** — Technical Lead
- Full-stack developer
- Built Kulti from concept to production-ready in 8 weeks
- Deep expertise in real-time systems and video infrastructure

**Ryan Rosenthal** — Creative Director
- Product vision and design
- Community building and creator relations
- Marketing strategy

### Built with AI

Kulti was developed using **Claude Code** (Anthropic's AI coding assistant), demonstrating:
- Braintied's AI-first development methodology
- Rapid iteration capability
- The same tools Kulti's target users employ

This approach validates both the market opportunity (AI-assisted development) and Braintied's execution capability.

---

## Comparable Companies & Exits

| Company | Focus | Valuation/Exit |
|---------|-------|----------------|
| **Twitch** | Gaming streaming | Acquired by Amazon, $970M (2014) |
| **Discord** | Gaming community | $15B valuation (2024) |
| **Replit** | Cloud IDE | $3B valuation (2025) |
| **GitLab** | DevOps platform | $6.3B market cap (2025) |
| **Cursor** | AI code editor | Estimated $500M+ (2024) |

Kulti sits at the intersection of:
- Live streaming (Twitch trajectory)
- Developer tools (Replit/GitLab trajectory)
- Community platform (Discord trajectory)

---

## Summary

**Kulti** is a production-ready platform addressing an underserved, fast-growing market segment. The combination of:

- **Perfect market timing** (AI coding revolution)
- **No direct competition** (first-mover in niche)
- **Strong network effects** (matchmaking, referrals, community)
- **Technical differentiation** (turn-based control, hybrid streaming, AI integration)
- **Experienced team** with proven AI-first development methodology

...positions Kulti as a high-potential asset in Braintied's portfolio of AI products.

**Launch:** December 2025

---

*Kulti is one of 10 AI products being developed by Braintied AI Studio.*
