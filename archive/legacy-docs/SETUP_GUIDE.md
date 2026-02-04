# Kulti Setup Guide

**Complete guide to get Kulti running locally**

---

## ✅ Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed ([download here](https://nodejs.org/))
2. **Supabase account** ([sign up](https://supabase.com))
3. **100ms account** ([sign up](https://www.100ms.live))
4. **(Optional) Anthropic API key** for AI features

---

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- Supabase SDKs
- 100ms SDK
- TailwindCSS
- And more...

---

## 🔐 Environment Setup

### 1. Copy Environment Template

```bash
cp .env.example .env.local
```

### 2. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create one)
3. Go to **Settings** → **API**
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Get Your 100ms Credentials

1. Go to [100ms Dashboard](https://dashboard.100ms.live)
2. Create a new app or select existing
3. Go to **Settings**
4. Copy:
   - App ID → `NEXT_PUBLIC_HMS_APP_ID`
   - Access Key → `HMS_APP_ACCESS_KEY`
   - Secret → `HMS_APP_SECRET`

### 4. Your .env.local Should Look Like:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 100ms
NEXT_PUBLIC_HMS_APP_ID=xxxxx
HMS_APP_ACCESS_KEY=xxxxx
HMS_APP_SECRET=xxxxx

# Optional: Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## 🗄️ Database Setup

Good news! The database schema has already been applied via Supabase MCP.

### Verify Tables Exist

Go to your Supabase project → **Table Editor** and check for:
- ✅ profiles
- ✅ sessions
- ✅ session_participants
- ✅ messages
- ✅ waitlist
- ✅ invites

---

## 🎟️ Create Test Invite Code

Since signup requires an invite code, you need to create one for testing:

### Option 1: Via Supabase Dashboard

1. Go to **Table Editor** → **invites** table
2. Click **Insert** → **Insert row**
3. Fill in:
   ```
   code: VIBE-TEST
   max_uses: 10
   current_uses: 0
   ```
4. Click **Save**

### Option 2: Via SQL

Go to **SQL Editor** and run:

```sql
INSERT INTO invites (code, max_uses, current_uses)
VALUES ('VIBE-TEST', 10, 0);
```

---

## 🚀 Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see the Kulti landing page! 🎉

---

## 🧪 Test the Full Flow

### 1. Landing Page
- Visit `http://localhost:3000`
- Try joining the waitlist (optional)

### 2. Sign Up
- Click "Sign In" → "Sign up"
- Use invite code: `VIBE-TEST`
- Create your account with:
  - Username (e.g., `viber123`)
  - Display name (e.g., `John Doe`)
  - Email
  - Password (min 8 characters)

### 3. Dashboard
- After signup, you'll be redirected to `/dashboard`
- You should see "No live sessions" (empty state)
- Click "Create Session"

### 4. Create Your First Session
- Fill in:
  - Title: "Building something cool"
  - Description: "Testing Kulti"
  - Privacy: Public
  - Max Participants: 4
- Click "Create Session"

### 5. Join Session Room
- You'll be redirected to `/s/YOUR-ROOM-CODE`
- Allow camera/microphone permissions when prompted
- You should see:
  - ✅ Your video tile
  - ✅ Controls at bottom (mic, camera, screen share)
  - ✅ Chat sidebar on the right

### 6. Test Features
- Toggle microphone on/off
- Toggle camera on/off
- Try screen sharing (if host)
- Send a chat message
- Leave session (click "Leave" button)

---

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is taken:
```bash
npm run dev -- -p 3001
```

### "Failed to join session"

**Check:**
1. Are your 100ms credentials correct?
2. Is your network allowing WebRTC connections?
3. Did you allow camera/microphone permissions?

**Debug:**
- Open browser DevTools (F12) → Console
- Look for errors related to HMS or WebRTC

### "Invalid invite code"

**Check:**
1. Did you create the invite code in the database?
2. Is `current_uses < max_uses`?
3. Try running the SQL query again

### Database Connection Issues

**Check:**
1. Is your Supabase URL correct?
2. Are you using the `anon` key (not service_role) in `NEXT_PUBLIC_SUPABASE_ANON_KEY`?
3. Have all migrations been applied?

### Middleware Errors

If you see middleware deprecation warnings, they can be ignored for development. The app will still work correctly.

---

## 📝 Next Steps

### For Development

1. **Explore the code:**
   - Check out `app/` for pages
   - Look at `components/` for React components
   - Review `lib/` for utilities

2. **Make changes:**
   - Hot reload is enabled
   - Changes appear instantly in browser

3. **Add features:**
   - Use the prompts in `CLAUDE_CODE_PROMPTS.md`
   - Reference `KULTI_PRODUCT_SPEC.md` for specs

### For Deployment

See main [README.md](./README.md) for deployment instructions.

---

## 🆘 Need Help?

1. Check the [KULTI_PRODUCT_SPEC.md](./KULTI_PRODUCT_SPEC.md) for technical details
2. Review the [CLAUDE_CODE_PROMPTS.md](./CLAUDE_CODE_PROMPTS.md) for building guidance
3. Look at the browser console for error messages
4. Check Supabase logs for database issues

---

**Happy building! 🚀**
