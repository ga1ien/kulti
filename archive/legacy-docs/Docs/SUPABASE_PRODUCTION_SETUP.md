# Supabase Production Setup Guide

## Overview

This guide provides comprehensive instructions for setting up Supabase in production for Kulti. Supabase provides PostgreSQL database, authentication, real-time updates, and storage capabilities.

**Important:** This guide focuses on setup and configuration. You cannot execute these steps without valid Supabase account credentials.

---

## A. Project Creation

### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up with email or GitHub
3. Verify email address
4. Set up organization

### Step 2: Create Production Project

1. In Supabase dashboard, go to **Organizations**
2. Click **New project**
3. Configure project settings:

#### Project Details

| Setting | Value | Notes |
|---------|-------|-------|
| **Project Name** | `kulti-prod` | Descriptive name for production |
| **Database Password** | *[Strong Password]* | Must be 12+ chars, mix of upper/lower/numbers/symbols |
| **Region** | *[User Location]* | Choose region closest to users |
| **Plan** | Pro ($50/mo) | Recommended for production |

#### Region Selection

**Considerations:**
- **Latency:** Choose closest to your users
- **Compliance:** GDPR (EU), CCPA (US)
- **Availability:** All regions offer 99.9% SLA
- **Cost:** Egress charges apply in some regions

**Recommended Regions:**
- **US:** `us-east-1` (N. Virginia)
- **EU:** `eu-west-1` (Ireland)
- **Asia:** `ap-southeast-1` (Singapore)
- **Global Hybrid:** Use read replicas in multiple regions (Enterprise)

### Step 3: Save Connection Details

After project creation, save these credentials securely:

- Project Reference ID (e.g., `abcdefghijklmnopqrst`)
- Database Password
- API URL: `https://[ref].supabase.co`
- Anon Key (public, frontend)
- Service Role Key (secret, server-only)

**Storage:** Use password manager (1Password, LastPass, etc.)

---

## B. Database Setup

### Step 1: Run Migrations to Production

#### Prerequisites
- Local environment set up: `.env.local` configured
- All migrations created and tested locally
- Supabase CLI installed: `npm install -g supabase`

#### Connect to Production

```bash
# From project root
# Link to production Supabase project
npx supabase link --project-ref your-production-ref

# You'll be prompted for:
# - Supabase access token (get from supabase.com/account/tokens)
# - Confirm project reference

# Verify connection
npx supabase status
# Should show: Project status: connected
```

#### Push All Migrations

```bash
# Push migrations to production
npx supabase db push

# Output shows:
# - Migration files to apply
# - Status of each migration
# - Final status confirmation
```

**Important:** This is a one-way operation in production. Rollback is manual.

#### Verify Migrations Applied

1. In Supabase dashboard, go to **SQL Editor**
2. Select production project
3. List tables:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
4. Verify all expected tables exist

### Step 2: Database Structure Verification

Verify table structure matches expectations:

```sql
-- Check users table
\d users

-- Check sessions table
\d sessions

-- Check all indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check constraints
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Step 3: Create Initial Indexes

Create indexes for frequently queried columns:

```sql
-- Performance indexes (if not created in migrations)
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_recordings_session_id ON recordings(session_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);

-- Check index creation
\di
```

---

## C. RLS Policy Verification

### Step 1: Enable RLS on All Tables

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_subscriptions ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Step 2: Verify All Policies

Check that all RLS policies are properly configured:

```sql
-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Step 3: Test RLS with Different Roles

**Create Test Roles:**
```sql
-- Create test user role
CREATE USER test_user_1 WITH PASSWORD 'test_password_1';
CREATE USER test_user_2 WITH PASSWORD 'test_password_2';
```

**Test User 1 Can Only See Own Data:**
```sql
SET ROLE test_user_1;
SELECT * FROM users;  -- Should only see their own row
SELECT * FROM sessions;  -- Should only see sessions they created
RESET ROLE;
```

**Test User 2 Cannot See User 1's Data:**
```sql
SET ROLE test_user_2;
SELECT * FROM users WHERE id = 'user_1_id';  -- Should return 0 rows
RESET ROLE;
```

### Step 4: Policy Checklist

- [ ] All tables have RLS enabled
- [ ] Users can only access their own data
- [ ] Admins have access to all data
- [ ] Public data (if any) is readable by all
- [ ] Sensitive operations require proper authorization
- [ ] Service role key can bypass RLS for admin operations

---

## D. Auth Configuration

### Step 1: Email Configuration

#### Option 1: Supabase Default (Recommended for MVP)

Supabase provides default email service:
- Sends from: `noreply@mail.supabase.io`
- Includes Supabase branding
- No configuration needed

To verify:
1. Go to **Authentication → Email**
2. Should show "Default Supabase email service"

#### Option 2: Custom SMTP (Production)

For custom domain emails:

1. Go to **Authentication → Email**
2. Click **Use custom SMTP**
3. Enter SMTP details:

| Setting | Value | Source |
|---------|-------|--------|
| **Sender Name** | Kulti | User choice |
| **Sender Email** | noreply@kulti.club | Your domain |
| **SMTP Host** | smtp.sendgrid.net | Your email provider |
| **SMTP Port** | 587 | Standard TLS port |
| **SMTP Username** | apikey | SendGrid default |
| **SMTP Password** | SG.xxxxxx... | SendGrid API key |

**Recommended Providers:**
- SendGrid (most reliable, $10/mo)
- AWS SES (pay per email)
- Mailgun (developer-friendly)

### Step 2: Phone/SMS Authentication

#### Option 1: Supabase Twilio Integration

1. Go to **Authentication → Phone**
2. Toggle **Phone provider** to Enabled
3. Select **Twilio** as provider
4. Enter Twilio credentials:

| Setting | Value | Source |
|---------|-------|--------|
| **Account SID** | ACxxxxxxxx... | Twilio Console |
| **Auth Token** | xxxxxx... | Twilio Console |
| **Phone Number** | +1xxxxxxxxxx | Twilio phone number |

**Get Twilio Credentials:**
1. Go to [twilio.com](https://www.twilio.com)
2. Sign up or log in
3. Console → Account Info
4. Copy Account SID and Auth Token
5. Buy phone number → Phone Numbers → Buy Number

#### Option 2: Disable Phone Auth (Email-Only)

1. Go to **Authentication → Phone**
2. Toggle **Phone provider** to Disabled

### Step 3: Auth Redirect URLs

Configure allowed URLs for redirects:

1. Go to **Authentication → URL Configuration**
2. Set **Redirect URLs:**

```
http://localhost:3002
http://localhost:3001
https://your-domain.com
https://your-domain.com/auth/callback
https://your-domain.com/sessions
https://www.your-domain.com
```

3. Set **Site URL:** (your production domain)
```
https://kulti.club
```

### Step 4: JWT Settings

Configure JWT token expiration and refresh:

1. Go to **Authentication → JWT**
2. Review default settings:

| Setting | Default | Recommendation |
|---------|---------|-----------------|
| **JWT Expiration** | 3600 (1 hour) | Keep default for security |
| **Refresh Token Rotation** | Enabled | Keep enabled |
| **Refresh Token Reuse Interval** | 10 seconds | Keep default |

### Step 5: Rate Limiting

Configure auth endpoint rate limits:

1. Go to **Authentication → Rate Limiting**
2. Default limits (usually sufficient):

| Endpoint | Limit |
|----------|-------|
| **Sign up** | 5/60 seconds per IP |
| **Sign in** | 5/60 seconds per IP |
| **Password reset** | 5/60 seconds per IP |
| **Token refresh** | 50/60 seconds per IP |

Adjust if needed for your user base.

---

## E. Storage Configuration

### If Using Supabase Storage for Recordings

#### Step 1: Create Storage Bucket

```sql
-- Via Supabase dashboard: Storage → New bucket
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'recordings',
  'recordings',
  false,  -- Private bucket, require auth
  5368709120  -- 5GB max file size
);
```

#### Step 2: Configure Bucket Policies

```sql
-- Allow users to upload their own recordings
CREATE POLICY "Users can upload recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid() IS NOT NULL
  );

-- Allow users to read their own recordings
CREATE POLICY "Users can read own recordings"
  ON storage.objects FOR SELECT
  WITH CHECK (
    bucket_id = 'recordings'
    AND owner = auth.uid()
  );

-- Allow service role to delete old recordings
CREATE POLICY "Service role can manage recordings"
  ON storage.objects
  USING (bucket_id = 'recordings')
  WITH CHECK (
    -- Service role bypass
    auth.role() = 'service_role'
  );
```

#### Step 3: Configure CORS

1. Go to **Storage → Settings**
2. Add CORS origin:
   ```
   https://your-domain.com
   https://www.your-domain.com
   ```

---

## F. Database Backups

### Step 1: Enable Automated Backups

1. Go to **Project Settings → Backups**
2. **Backup frequency:** Daily (default, included with Pro plan)
3. **Backup retention:** 7 days (configurable)

### Step 2: Configure Backup Settings

| Setting | Value | Notes |
|---------|-------|-------|
| **Automated backups** | Enabled | Automatic daily backups |
| **Retention period** | 7 days | Enterprise: up to 30 days |
| **Backup window** | 6:00 AM UTC | Off-peak time |

### Step 3: Manual Backups

For major deployments or migrations:

1. Go to **Project Settings → Backups**
2. Click **Create manual backup**
3. Name: `before-[description]`
4. Confirm creation

### Step 4: Backup Testing

**Monthly backup restoration test:**

1. Create test project: `kulti-test`
2. Restore from backup:
   - **Project Settings → Backups**
   - Click **Restore** next to backup
   - Confirm
3. Verify data integrity:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM sessions;
   SELECT COUNT(*) FROM recordings;
   ```
4. Delete test project

### Step 5: Point-in-Time Recovery

Supabase maintains transaction logs for recovery:

1. Availability: Last 30 days (Pro plan)
2. To recover to specific time:
   - Contact Supabase support
   - Provide specific timestamp
   - They perform recovery
3. Cost: May vary, discuss with support

---

## G. Connection Pooling

### Step 1: Determine if You Need Pooling

**Use Connection Pooling if:**
- High request volume (>100 req/s)
- Many concurrent connections
- Lambda/serverless functions (Vercel)
- Multiple API instances

**Don't need if:**
- Single Next.js server
- < 50 concurrent connections
- Development environment

### Step 2: Enable Connection Pooling

1. Go to **Project Settings → Database**
2. Scroll to **Connection pooling**
3. Toggle **Enable** connection pooling
4. Configure:

| Setting | Value | Notes |
|---------|-------|-------|
| **Pool Mode** | `transaction` | Best for serverless |
| **Max pool size** | `20` | Adjust based on connections |
| **Idle timeout** | `60` seconds | Connection reuse |

### Step 3: Get Pooled Connection String

1. **Project Settings → Database**
2. Copy **Connection string (Pooling)**
3. Format:
   ```
   postgresql://user:password@pool.host:6543/postgres
   ```

### Step 4: Update Application

Use pooled connection string for API routes:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    // Optional: Use pooled connection for better performance
    // pooling: {
    //   connectionPooled: true,
    // }
  }
);
```

---

## H. API Keys and Security

### Step 1: Understand Key Types

#### Anon Key (Public)
- **Purpose:** Frontend/client-side operations
- **Permissions:** Limited by RLS policies
- **Safe to expose:** Yes, in code and frontend
- **Example:** Used in browser JavaScript
- **Rotation:** Can rotate, update frontend code

#### Service Role Key (Secret)
- **Purpose:** Server-side admin operations
- **Permissions:** Bypasses RLS (full access)
- **Safe to expose:** NO, keep secret always
- **Example:** API routes, server code only
- **Rotation:** Change immediately if compromised

### Step 2: Get Your Keys

1. Go to **Project Settings → API**
2. Find section: "Project API keys"
3. Note:
   - `anon` (public key)
   - `service_role` (secret key)

### Step 3: Key Rotation Procedure

**Every 90 days, rotate keys:**

1. Go to **Project Settings → API**
2. Click **Regenerate** next to key
3. **Update frontend:**
   - New Anon key → `.env.local`, Vercel
   - Redeploy frontend
4. **Update backend:**
   - New Service role key → `.env.local`, Vercel
   - Redeploy API routes
5. **Verify:** Test authentication flows

### Step 4: Security Checklist

- [ ] Service role key stored securely (never in git)
- [ ] Anon key appropriate for frontend exposure
- [ ] RLS policies enforce data access rules
- [ ] Keys rotated every 90 days
- [ ] Compromised key rotated immediately
- [ ] Access logs reviewed regularly
- [ ] Unused keys disabled

---

## I. Database Permissions & Roles

### Step 1: Database Roles

Supabase provides default roles:

| Role | Purpose | Use Case |
|------|---------|----------|
| `postgres` | Admin superuser | Migrations, schema changes |
| `authenticated` | Authenticated users | App users (RLS applies) |
| `anon` | Anonymous users | Public data only |
| `service_role` | Server-side admin | API routes, admin operations |

### Step 2: Custom Roles (Advanced)

Create application-specific roles:

```sql
-- Create admin role
CREATE ROLE admin_user WITH LOGIN PASSWORD 'secure_password';
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_user;

-- Create moderator role
CREATE ROLE moderator WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, UPDATE ON sessions TO moderator;
GRANT SELECT, DELETE ON messages TO moderator;

-- Create read-only role
CREATE ROLE analytics WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics;
```

### Step 3: Verify Role Permissions

```sql
-- Check role permissions
SELECT * FROM pg_roles WHERE rolname = 'authenticated';

-- List table permissions
SELECT * FROM information_schema.role_table_grants
WHERE grantee = 'authenticated';
```

---

## J. Monitoring & Maintenance

### Step 1: Database Monitoring

**In Supabase Dashboard:**
1. Go to **Monitoring**
2. View metrics:
   - Database size
   - Query performance
   - Connection count
   - Replication lag

### Step 2: Database Performance

**Optimize slow queries:**

```sql
-- Check slow query log
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT * FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Step 3: Storage Monitoring

**Track database size:**

```sql
-- Total database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Step 4: Security Monitoring

**Weekly security checks:**
1. Review authentication logs
2. Check for suspicious queries
3. Verify RLS policies are active
4. Review API key rotation schedule

---

## K. Disaster Recovery Plan

### Step 1: Backup Restoration

**If database becomes corrupted:**

1. Go to **Project Settings → Backups**
2. Select backup point
3. Click **Restore**
4. Confirm (production will be offline during restore)
5. Estimated time: 5-30 minutes depending on size
6. Verify data after restore

### Step 2: Point-in-Time Recovery

**If specific data was deleted:**

1. Contact Supabase support
2. Provide timestamp when data existed
3. Supabase restores to that point
4. Data is recovered to separate project
5. Export needed data and reimport to production

### Step 3: Data Export

**Regular data exports for backup:**

```bash
# Export using pg_dump
pg_dump postgresql://user:password@host/database > backup.sql

# Export specific tables
pg_dump -t users -t sessions postgresql://user:password@host/database > backup.sql

# Compressed backup
pg_dump postgresql://user:password@host/database | gzip > backup.sql.gz
```

---

## L. Compliance & Regulatory

### Step 1: GDPR Compliance

**For EU users:**
1. Go to **Project Settings → Compliance**
2. Enable GDPR compliance mode
3. Ensure data processing agreement in place
4. Implement right to deletion

**Implement user data deletion:**
```sql
-- Safe user deletion (CASCADE depends on constraints)
DELETE FROM users WHERE id = user_id;
-- This cascades to delete user's sessions, messages, etc.
```

### Step 2: Data Residency

**Ensure data stays in required region:**
1. Choose appropriate region during project creation
2. EU data → EU region
3. US data → US region
4. Document compliance in security policy

### Step 3: Audit Logging

**Enable audit logs:**
```sql
-- Create audit table
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB
);

-- Grant audit access to service role
GRANT INSERT ON audit_logs TO service_role;
```

---

## M. Production Checklist

- [ ] Project created in Supabase
- [ ] Database password stored securely
- [ ] All migrations applied to production
- [ ] Database tables verified
- [ ] RLS policies enabled on all tables
- [ ] RLS policies tested with different user roles
- [ ] Email provider configured
- [ ] Phone auth provider configured (if needed)
- [ ] Auth redirect URLs configured
- [ ] JWT settings reviewed
- [ ] Rate limiting configured
- [ ] Storage bucket created (if using)
- [ ] Automated backups enabled
- [ ] Manual backup tested
- [ ] Connection pooling configured (if needed)
- [ ] Anon key distributed to frontend
- [ ] Service role key stored securely
- [ ] Initial data seeded
- [ ] Database monitoring enabled
- [ ] Security monitoring enabled
- [ ] Disaster recovery plan documented

---

## N. Common Issues & Solutions

### Issue: RLS Policies Blocking Access

**Symptoms:**
- 403 Forbidden errors
- No data returned from queries
- Login fails

**Solutions:**
1. Verify RLS is enabled on table
2. Check policy conditions
3. Test with service role to bypass RLS
4. Review auth token/user_id

### Issue: Connection Pool Exhausted

**Symptoms:**
- 503 Service Unavailable
- Too many connections error
- Timeouts on queries

**Solutions:**
1. Increase pool size in settings
2. Optimize database queries
3. Check for connection leaks
4. Enable connection pooling mode

### Issue: Slow Queries

**Symptoms:**
- Timeouts on large queries
- High database CPU usage
- Slow page loads

**Solutions:**
1. Add appropriate indexes
2. Optimize query structure
3. Use pagination for large result sets
4. Enable query caching

### Issue: Storage Bucket Access Denied

**Symptoms:**
- 403 Forbidden on file upload
- Cannot read stored files
- RLS errors

**Solutions:**
1. Verify bucket RLS policies
2. Check CORS configuration
3. Verify user authentication
4. Review storage policy permissions

---

## Next Steps

1. Create initial seed data: See `DATABASE_SEEDING.md`
2. Configure monitoring: See `MONITORING_SETUP.md`
3. Verify Vercel integration: See `VERCEL_PRODUCTION_SETUP.md`
4. Review security: See `SECURITY_HARDENING.md`
5. Plan launch: See `PRE_PRODUCTION_CHECKLIST.md`
