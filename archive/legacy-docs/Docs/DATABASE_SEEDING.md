# Database Seeding Guide

## Overview

This guide provides SQL scripts and procedures for seeding initial data in the production Supabase database. Seeding establishes baseline data needed for the application to function properly.

---

## A. Initial Admin User Creation

### Step 1: Create Admin User via UI

**Recommended: Use the application's signup flow**

1. Start local development: `npm run dev`
2. Navigate to signup page
3. Create account with admin email (e.g., `admin@kulti.club`)
4. Verify phone number
5. Note the user_id from URL or logs

### Step 2: Promote User to Admin (SQL)

Once user is created via signup:

```sql
-- In Supabase SQL Editor, run:
UPDATE users
SET role = 'admin'
WHERE email = 'admin@kulti.club';

-- Verify
SELECT id, email, role FROM users WHERE email = 'admin@kulti.club';
```

### Step 3: Create Multiple Admin Users

For team members:

```sql
-- Run signup flow in UI for each team member
-- Then promote to admin:

UPDATE users
SET role = 'admin'
WHERE email IN (
  'admin1@kulti.club',
  'admin2@kulti.club',
  'team@kulti.club'
);
```

---

## B. Seed Invite Codes

### Purpose
- Control early access
- Track signups
- Manage beta testing

### Step 1: Create Single Invite Code

```sql
-- Create single invite code
INSERT INTO invites (
  code,
  created_by,
  max_uses,
  uses,
  created_at,
  expires_at
)
VALUES (
  'BETA2025',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  100,  -- max uses
  0,    -- current uses
  NOW(),
  NOW() + INTERVAL '90 days'  -- expires in 90 days
)
RETURNING id, code;
```

### Step 2: Create Multiple Invite Codes

```sql
-- Create batch of invite codes with different purposes

-- For early supporters
INSERT INTO invites (code, created_by, max_uses, created_at, expires_at)
SELECT
  'SUPPORTER' || LPAD(i::TEXT, 3, '0') AS code,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  5,  -- limited uses for testing
  NOW(),
  NOW() + INTERVAL '60 days'
FROM generate_series(1, 10) AS i;

-- For team testing
INSERT INTO invites (code, created_by, max_uses, created_at, expires_at)
SELECT
  'TEAM' || LPAD(i::TEXT, 2, '0') AS code,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  20,  -- more uses for team
  NOW(),
  NOW() + INTERVAL '90 days'
FROM generate_series(1, 5) AS i;

-- For public beta (single code, unlimited)
INSERT INTO invites (code, created_by, max_uses, created_at, expires_at)
VALUES (
  'PUBLIC2025',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  1000,
  NOW(),
  NOW() + INTERVAL '180 days'
);

-- View created codes
SELECT code, max_uses, expires_at FROM invites ORDER BY created_at DESC LIMIT 20;
```

### Step 3: Track Invite Usage

```sql
-- See which invites are being used most
SELECT
  i.code,
  i.max_uses,
  COUNT(u.id) as uses,
  i.max_uses - COUNT(u.id) as remaining,
  i.expires_at
FROM invites i
LEFT JOIN users u ON u.invite_code = i.code
GROUP BY i.id, i.code, i.max_uses, i.expires_at
ORDER BY uses DESC;
```

---

## C. Credit System Setup

### Step 1: Initial Credit Milestones

```sql
-- Define credit tiers/milestones
INSERT INTO credit_milestones (
  name,
  description,
  credit_amount,
  is_active
)
VALUES
  ('Welcome Bonus', 'Given to new users on signup', 100, true),
  ('Referral Bonus', 'Earned for each friend who signs up', 50, true),
  ('First Session', 'Bonus for attending first session', 25, true),
  ('Monthly Active', 'Monthly reward for active users', 200, true);

-- View created milestones
SELECT id, name, credit_amount FROM credit_milestones WHERE is_active = true;
```

### Step 2: Give Admin Users Starting Credits

```sql
-- Seed admin users with credits for testing
UPDATE users
SET credits = 1000
WHERE role = 'admin';

-- Verify
SELECT email, role, credits FROM users WHERE role = 'admin';
```

### Step 3: Setup Credit Tipping Tiers

```sql
-- Define tipping amounts available to users
INSERT INTO tip_tiers (
  amount,
  emoji,
  message,
  is_active
)
VALUES
  (10, '⭐', 'Great stream!', true),
  (25, '✨', 'Amazing content!', true),
  (50, '🔥', 'Incredible work!', true),
  (100, '🚀', 'Mind-blowing session!', true),
  (250, '👑', 'Legend status!', true);

-- View tipping tiers
SELECT amount, emoji, message FROM tip_tiers WHERE is_active = true ORDER BY amount;
```

---

## D. Default Data Setup

### Step 1: Create Sample Topics

```sql
-- Create community topics
INSERT INTO topics (
  name,
  description,
  slug,
  created_by,
  is_public
)
VALUES
  ('Web Development', 'Discussions about web development, frameworks, and best practices', 'web-dev',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true),
  ('AI & Machine Learning', 'Talks about AI, ML models, and applications', 'ai-ml',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true),
  ('DevOps & Infrastructure', 'Cloud, deployment, monitoring, and infrastructure', 'devops',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true),
  ('Mobile Development', 'Native and cross-platform mobile app development', 'mobile',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true),
  ('Database & Backend', 'Database design, APIs, backend services', 'database',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true),
  ('Design & UX', 'UI/UX design, accessibility, design systems', 'design',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true);

-- View created topics
SELECT id, name, slug FROM topics ORDER BY created_at;
```

### Step 2: Create Sample Rooms (Communities)

```sql
-- Create community rooms
INSERT INTO rooms (
  name,
  description,
  created_by,
  is_public,
  topic_id
)
SELECT
  'General ' || topics.name,
  'General discussion for ' || topics.name,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  true,
  topics.id
FROM topics
WHERE name IN ('Web Development', 'AI & Machine Learning');

-- View created rooms
SELECT id, name, is_public FROM rooms ORDER BY created_at;
```

### Step 3: Create Example Sessions (Optional)

```sql
-- Create sample sessions for demonstration
INSERT INTO sessions (
  title,
  description,
  created_by,
  status,
  created_at,
  scheduled_at
)
VALUES
  (
    'Building a Next.js App from Scratch',
    'Live coding session building a full-stack web app with Next.js and Supabase',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'draft',
    NOW(),
    NOW() + INTERVAL '7 days'
  ),
  (
    'AI Integration Workshop',
    'Learn how to integrate Claude AI into your applications',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'draft',
    NOW(),
    NOW() + INTERVAL '14 days'
  ),
  (
    'React Performance Optimization',
    'Deep dive into React performance patterns and optimization techniques',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'draft',
    NOW(),
    NOW() + INTERVAL '21 days'
  );

-- View created sessions
SELECT id, title, status, scheduled_at FROM sessions WHERE created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1);
```

---

## E. Default Settings & Configuration

### Step 1: System Settings

```sql
-- Create system configuration table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed system settings
INSERT INTO system_settings (key, value, description)
VALUES
  ('welcome_message', 'Welcome to Kulti! A platform for live collaborative building.', 'Message shown on landing page'),
  ('max_session_duration_minutes', '480', 'Maximum session duration (in minutes)'),
  ('min_participants_for_recording', '2', 'Minimum participants to start recording'),
  ('default_hls_threshold', '100', 'Number of participants before switching to HLS'),
  ('enable_recordings', 'true', 'Enable session recordings'),
  ('enable_chat', 'true', 'Enable chat in sessions'),
  ('enable_ai_features', 'true', 'Enable AI integration features'),
  ('enable_tipping', 'true', 'Enable credit tipping system')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- View settings
SELECT key, value, description FROM system_settings;
```

### Step 2: Feature Flags

```sql
-- Create feature flags table for gradual rollout
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,  -- 0-100 for gradual rollout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed feature flags
INSERT INTO feature_flags (name, description, enabled, rollout_percentage)
VALUES
  ('new_ui_design', 'New dashboard design (gradual rollout)', true, 50),
  ('advanced_analytics', 'Advanced session analytics', true, 100),
  ('team_invites', 'Invite team members to sessions', true, 100),
  ('marketplace_beta', 'Creator marketplace (beta)', false, 0),
  ('nft_integration', 'NFT verification (experimental)', false, 0)
ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled;

-- View feature flags
SELECT name, enabled, rollout_percentage FROM feature_flags;
```

---

## F. Testing Data (Optional)

### Create Test Users

```sql
-- WARNING: Only for development/testing environments
-- Do NOT run in production without careful consideration

-- Create test users
INSERT INTO users (
  email,
  phone,
  username,
  bio,
  verified,
  credits,
  created_at
)
VALUES
  ('test1@example.com', '+1234567890', 'testuser1', 'Test user 1', true, 500, NOW()),
  ('test2@example.com', '+1234567891', 'testuser2', 'Test user 2', true, 500, NOW()),
  ('test3@example.com', '+1234567892', 'testuser3', 'Test user 3', true, 500, NOW());

-- View test users
SELECT id, email, username, credits FROM users WHERE email LIKE 'test%';
```

---

## G. Seeding Script Template

Create a file: `scripts/seed-production.sql`

```sql
-- Kulti Production Database Seeding Script
-- WARNING: Run only in production with extreme care
-- Date: 2025-11-14

-- ============================================================================
-- STEP 1: Create Admin Users
-- ============================================================================
-- Manually via signup flow, then run:
-- UPDATE users SET role = 'admin' WHERE email = 'admin@kulti.club';

-- ============================================================================
-- STEP 2: Create Invite Codes
-- ============================================================================
INSERT INTO invites (code, created_by, max_uses, created_at, expires_at)
VALUES (
  'BETA2025',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  100,
  NOW(),
  NOW() + INTERVAL '90 days'
);

-- ============================================================================
-- STEP 3: Seed Credits
-- ============================================================================
UPDATE users
SET credits = 1000
WHERE role = 'admin';

-- ============================================================================
-- STEP 4: Create Topics
-- ============================================================================
INSERT INTO topics (name, description, slug, created_by, is_public)
VALUES
  ('Web Development', 'Web dev discussions', 'web-dev',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true),
  ('AI & Machine Learning', 'AI/ML talks', 'ai-ml',
   (SELECT id FROM users WHERE role = 'admin' LIMIT 1), true);

-- ============================================================================
-- STEP 5: Verify Data
-- ============================================================================
SELECT
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM invites) as invite_count,
  (SELECT COUNT(*) FROM topics) as topic_count;
```

---

## H. Running Seeds in Production

### Safe Seeding Procedure

1. **Backup first:**
   ```bash
   # In Supabase dashboard: Settings → Backups → Create Manual Backup
   # Name: "before-seeding-[date]"
   ```

2. **Test in staging:**
   ```bash
   # Run seed script in staging environment first
   # Verify all data correct
   # Then proceed to production
   ```

3. **Run seeds:**
   ```bash
   # Connect to production
   npx supabase link --project-ref your-production-ref

   # Option A: Run SQL file
   cat scripts/seed-production.sql | npx supabase db push

   # Option B: Copy/paste SQL into Supabase SQL Editor
   # 1. Go to Supabase Dashboard
   # 2. SQL Editor → New Query
   # 3. Paste SQL
   # 4. Run Query
   ```

4. **Verify results:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM invites;
   SELECT COUNT(*) FROM topics;
   ```

5. **Test application:**
   - Verify signup with invite code works
   - Verify admin access works
   - Verify topics visible in UI

---

## I. Removing Seed Data

### If You Need to Remove Test Data

```sql
-- WARNING: Be careful with DELETE operations!
-- Always backup first

-- Delete test users
DELETE FROM users
WHERE email LIKE 'test%';

-- Delete test sessions
DELETE FROM sessions
WHERE title LIKE 'Test%';

-- Delete test invites
DELETE FROM invites
WHERE code LIKE 'TEST%';

-- Verify deletions
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM invites;
```

---

## J. Seed Data Checklist

### Before Going Live

- [ ] Admin user(s) created
- [ ] Admin users verified working
- [ ] Invite codes created
- [ ] Initial credits distributed to admins
- [ ] Topics/communities created
- [ ] Sample rooms created
- [ ] Feature flags configured
- [ ] System settings configured
- [ ] Test users created (staging only)
- [ ] Backup taken before seeding
- [ ] All seed data verified
- [ ] Application tested with seed data
- [ ] Documentation updated

---

## K. Common Seeding Issues

### Issue: Foreign Key Constraint Error

**Problem:** Trying to seed data with invalid references

**Solution:**
```sql
-- Check what admin users exist
SELECT id, email, role FROM users WHERE role = 'admin';

-- Update seeding script with actual admin ID
-- Or create admin user first via signup
```

### Issue: Duplicate Data

**Problem:** Running seed script twice creates duplicates

**Solution:**
```sql
-- Use INSERT ... ON CONFLICT for idempotent seeds
INSERT INTO topics (name, slug, created_by, is_public)
VALUES ('Web Dev', 'web-dev', admin_id, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
```

### Issue: RLS Policies Block Seed Data

**Problem:** Cannot insert data due to RLS

**Solution:**
```sql
-- Use service role to bypass RLS when seeding
-- In Supabase SQL Editor, RLS is automatically bypassed
-- If using direct connection, use service role key
```

---

## L. Advanced Seeding

### Seed with Real-Looking Data

```sql
-- Create varied initial data
INSERT INTO users (email, username, bio, credits, verified)
VALUES
  ('alice@example.com', 'alice', 'React developer', 500, true),
  ('bob@example.com', 'bob', 'Backend engineer', 300, true),
  ('charlie@example.com', 'charlie', 'AI enthusiast', 800, true);

-- Create sessions for each user
INSERT INTO sessions (title, created_by, status)
SELECT
  'Session with ' || users.username,
  users.id,
  'draft'
FROM users
WHERE email LIKE '%@example.com';
```

### Seed with Timestamps

```sql
-- Create sessions with varied creation dates
INSERT INTO sessions (title, created_by, created_at, scheduled_at)
VALUES
  ('Past session', admin_id, NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
  ('Current session', admin_id, NOW(), NOW() + INTERVAL '1 day'),
  ('Future session', admin_id, NOW(), NOW() + INTERVAL '7 days');
```

---

## Next Steps

1. Create admin user via signup flow
2. Run admin promotion SQL
3. Generate invite codes
4. Seed topics and default data
5. Test application thoroughly
6. Verify all features working
7. Document any custom seed data needed
8. Create runbook for re-seeding if needed

---

## Related Documentation

- Database Setup: See `SUPABASE_PRODUCTION_SETUP.md`
- Production Deployment: See `VERCEL_PRODUCTION_SETUP.md`
- Environment Variables: See `ENV_VARIABLES_CHECKLIST.md`
- Database Backups: See `DATABASE_BACKUP_RECOVERY.md`
