# Kulti Project Structure

Complete file and folder structure for the Kulti MVP.

---

## Root Directory

```
kulti/
├── .env.local                          # Environment variables
├── .gitignore                          
├── next.config.js                      
├── package.json                        
├── tailwind.config.ts                  # Tailwind config
├── tsconfig.json                       
├── middleware.ts                       # Auth middleware
│
├── public/                             # Static assets
│   ├── logo.svg
│   ├── favicon.ico
│   └── assets/
│
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root layout
│   ├── page.tsx                        # Landing page
│   ├── globals.css                     
│   │
│   ├── (auth)/                         # Auth routes
│   │   ├── layout.tsx                  
│   │   ├── login/
│   │   │   └── page.tsx                
│   │   └── signup/
│   │       └── page.tsx                
│   │
│   ├── (dashboard)/                    # Dashboard routes
│   │   ├── layout.tsx                  
│   │   ├── dashboard/
│   │   │   └── page.tsx                
│   │   ├── browse/
│   │   │   └── page.tsx                
│   │   └── profile/
│   │       └── [username]/
│   │           └── page.tsx            
│   │
│   ├── s/                              # Session routes
│   │   └── [roomCode]/
│   │       └── page.tsx                # Session room
│   │
│   └── api/                            # API routes
│       ├── auth/
│       │   ├── signup/route.ts
│       │   ├── login/route.ts
│       │   └── logout/route.ts
│       │
│       ├── waitlist/
│       │   └── join/route.ts
│       │
│       ├── sessions/
│       │   ├── create/route.ts
│       │   ├── [id]/route.ts
│       │   └── live/route.ts
│       │
│       ├── hms/
│       │   ├── create-room/route.ts
│       │   ├── get-token/route.ts
│       │   └── end-room/route.ts
│       │
│       └── ai/
│           └── chat/route.ts
│
├── components/                         # React components
│   ├── ui/                             # Base UI (shadcn)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── avatar.tsx
│   │
│   ├── landing/                        # Landing page
│   │   ├── hero.tsx
│   │   ├── feature-grid.tsx
│   │   ├── waitlist-form.tsx
│   │   └── footer.tsx
│   │
│   ├── auth/                           # Auth components
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   │
│   ├── dashboard/                      # Dashboard components
│   │   ├── nav-bar.tsx
│   │   ├── user-menu.tsx
│   │   ├── session-grid.tsx
│   │   ├── session-card.tsx
│   │   └── create-session-modal.tsx
│   │
│   ├── session/                        # Session room
│   │   ├── session-room.tsx
│   │   ├── video-grid.tsx
│   │   ├── video-tile.tsx
│   │   ├── controls.tsx
│   │   ├── chat-sidebar.tsx
│   │   └── chat-message.tsx
│   │
│   └── shared/                         # Shared components
│       ├── loading-spinner.tsx
│       └── error-message.tsx
│
├── lib/                                # Utilities
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client
│   │   └── queries.ts                  # DB queries
│   │
│   ├── hms/
│   │   ├── client.ts                   # 100ms client
│   │   └── server.ts                   # 100ms server API
│   │
│   ├── anthropic/
│   │   └── client.ts                   # Anthropic API
│   │
│   ├── utils.ts                        # General utilities
│   └── validations.ts                  # Zod schemas
│
├── types/                              # TypeScript types
│   ├── database.ts                     # Supabase types
│   ├── session.ts                      
│   └── user.ts                         
│
└── hooks/                              # Custom hooks
    ├── use-auth.ts
    ├── use-session.ts
    └── use-chat.ts
```

---

## File Count Summary

```
Total files: ~80

Breakdown:
- App routes: ~15
- API routes: ~12
- Components: ~30
- Lib/utils: ~10
- Types: ~3
- Config: ~5
```

---

## Key Files Explained

### Configuration Files

**`tailwind.config.ts`**
```typescript
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

**`middleware.ts`**
- Protects /dashboard routes
- Redirects authenticated users
- Handles Supabase auth cookies

**`.env.local`**
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_HMS_APP_ID=
HMS_APP_ACCESS_KEY=
HMS_APP_SECRET=
ANTHROPIC_API_KEY=
```

### Core Routes

**`app/page.tsx`** - Landing page  
**`app/(auth)/signup/page.tsx`** - Signup  
**`app/(auth)/login/page.tsx`** - Login  
**`app/(dashboard)/dashboard/page.tsx`** - Main dashboard  
**`app/s/[roomCode]/page.tsx`** - Session room  

### Important Components

**`components/landing/waitlist-form.tsx`**
- Waitlist signup form
- Validates and submits to API
- Shows position number

**`components/session/session-room.tsx`**
- Main session experience
- Integrates 100ms
- Manages video/chat/controls

**`components/session/video-grid.tsx`**
- Video tile layout
- Screen share display
- Participant management

### Critical API Routes

**`api/sessions/create/route.ts`**
- Creates session in database
- Generates room code
- Creates HMS room

**`api/hms/get-token/route.ts`**
- Generates HMS auth token
- Required for joining sessions
- Role-based permissions

### Utilities

**`lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**`lib/hms/client.ts`**
```typescript
import { HMSReactiveStore } from '@100mslive/react-sdk'
export const hmsStore = new HMSReactiveStore()
export const hmsActions = hmsStore.getActions()
```

---

## Routes Map

```
Public Routes:
/                           Landing page
/login                      Login page
/signup                     Signup page

Protected Routes:
/dashboard                  Main dashboard
/browse                     Browse sessions
/s/[roomCode]              Session room
/profile/[username]        User profile

API Routes:
POST /api/auth/signup
POST /api/auth/login
POST /api/waitlist/join
POST /api/sessions/create
GET  /api/sessions/live
POST /api/hms/create-room
POST /api/hms/get-token
POST /api/ai/chat
```

---

## Development Workflow

### Starting Development
```bash
npm run dev
# Open http://localhost:3000
```

### Building for Production
```bash
npm run build
npm start
```

### Project Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

---

## Database Tables

Located in Supabase, not in project files:

1. **profiles** - User data
2. **waitlist** - Waitlist entries
3. **sessions** - Streaming sessions
4. **session_participants** - Session membership
5. **messages** - Chat messages
6. **invites** - Invite codes

See KULTI_PRODUCT_SPEC.md for complete schema.

---

## Dependencies

### Core
- next@14.x
- react@18.x
- typescript@5.x

### Supabase
- @supabase/supabase-js
- @supabase/ssr
- @supabase/auth-helpers-nextjs

### 100ms
- @100mslive/react-sdk
- @100mslive/server-sdk

### Forms & Validation
- react-hook-form
- zod
- @hookform/resolvers

### UI & Utilities
- tailwindcss
- lucide-react
- date-fns
- uuid
- jsonwebtoken

---

## Build Order

1. **Setup** (Day 1)
   - Initialize Next.js
   - Install dependencies
   - Configure Tailwind
   - Set up Supabase clients

2. **Landing** (Days 2-3)
   - Hero section
   - Waitlist form
   - API endpoint

3. **Auth** (Days 4-5)
   - Signup page
   - Login page
   - Middleware
   - Profile creation

4. **Dashboard** (Days 6-7)
   - Layout with nav
   - Session grid
   - Create session modal

5. **Video** (Days 8-10)
   - 100ms integration
   - HMS API routes
   - Session room page

6. **Session UI** (Days 11-12)
   - Video grid
   - Controls
   - Chat sidebar

7. **Polish** (Days 13-14)
   - Error handling
   - Loading states
   - Testing
   - Deploy

---

## Deployment Structure

```
Vercel (kulti.club)
├── Next.js App
└── API Routes

Supabase (database.supabase.co)
├── PostgreSQL Database
├── Auth
└── Realtime

100ms (live.100ms.live)
└── Video Rooms
```

---

*Use this structure as a guide when building with Claude Code*
