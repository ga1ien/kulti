# Database Backup & Recovery

## Overview

This guide covers database backup strategies, recovery procedures, and disaster recovery planning for the Kulti application using Supabase PostgreSQL.

---

## Backup Strategy

### Automated Backups (Supabase)

Supabase provides automatic daily backups:

**Free Plan:**
- Daily backups retained for 7 days
- Point-in-time recovery: Last 7 days
- Automatic, no configuration needed

**Pro Plan:**
- Daily backups retained for 30 days
- Point-in-time recovery: Last 30 days
- Automatic, no configuration needed

### Manual Backups

Use manual backups for:
- Before major migrations
- Before destructive operations
- For long-term archival
- For cross-environment copies

---

## Backup Scripts

### 1. Create Backup

```bash
npm run db:backup
```

Or directly:
```bash
./scripts/backup-db.sh [output_directory]
```

**What it does:**
1. Connects to Supabase PostgreSQL
2. Exports full database (schema + data)
3. Compresses backup with gzip
4. Creates SHA-256 checksum
5. Cleans up old backups (>7 days)

**Requirements:**
- `SUPABASE_PROJECT_REF` environment variable
- `SUPABASE_DB_PASSWORD` environment variable
- PostgreSQL client tools (pg_dump)

**Output:**
```
./backups/kulti_backup_20250116_143022.sql.gz
./backups/kulti_backup_20250116_143022.sql.gz.sha256
```

### 2. Verify Backup

```bash
npm run db:verify backups/kulti_backup_20250116_143022.sql.gz
```

**What it checks:**
- File exists and is readable
- Checksum validation
- Critical tables present
- RLS policies included
- Indexes included
- Data volume estimation

### 3. Restore Backup

```bash
npm run db:restore backups/kulti_backup_20250116_143022.sql.gz
```

**Warning:** This overwrites all database data!

**What it does:**
1. Verifies checksum
2. Asks for confirmation
3. Decompresses backup
4. Restores to database
5. Cleans up temp files

---

## Environment Variables

### Required for Backup Scripts

Add to your `.env.local`:

```bash
# Supabase Project Reference
SUPABASE_PROJECT_REF=your_project_ref

# Database Password (get from Supabase dashboard)
SUPABASE_DB_PASSWORD=your_database_password
```

### Getting Database Password

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings > Database**
4. Under **Connection string**, click **Show password**
5. Copy the password

---

## Recovery Procedures

### Scenario 1: Accidental Data Deletion

**If within automatic backup window (7-30 days):**

1. **Stop application traffic**
   ```bash
   # In Vercel
   # Deployment > Settings > Disable auto-deploy
   ```

2. **Use Supabase Point-in-Time Recovery**
   - Go to Supabase Dashboard
   - Database > Backups
   - Select restore point
   - Click "Restore"
   - Wait for restoration (10-30 minutes)

3. **Verify data**
   ```sql
   -- Check row counts
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM sessions;
   SELECT COUNT(*) FROM credit_transactions;
   ```

4. **Resume traffic**

**Time to Recovery:** 15-45 minutes
**Data Loss:** Minimal (up to last backup point)

---

### Scenario 2: Database Corruption

**Using manual backup:**

1. **Stop application**
   - Disable deployments
   - Put up maintenance page

2. **Identify latest valid backup**
   ```bash
   ls -lht backups/
   npm run db:verify backups/kulti_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

3. **Restore backup**
   ```bash
   npm run db:restore backups/kulti_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

4. **Verify restoration**
   ```bash
   # Run verification queries
   psql "postgres://postgres:$SUPABASE_DB_PASSWORD@db.$SUPABASE_PROJECT_REF.supabase.co/postgres" \
     -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
   ```

5. **Test critical functions**
   - User authentication
   - Session creation
   - Credit transactions
   - Recording access

6. **Resume application**

**Time to Recovery:** 30-60 minutes
**Data Loss:** Since last backup

---

### Scenario 3: Complete Database Loss

**Using Supabase automated backup:**

1. **Contact Supabase Support**
   - Create ticket immediately
   - Request emergency restoration
   - Provide project reference

2. **Meanwhile, prepare manual restore**
   ```bash
   # Get latest backup
   LATEST_BACKUP=$(ls -t backups/*.sql.gz | head -1)

   # Restore to new project if needed
   export SUPABASE_PROJECT_REF=new_project_ref
   npm run db:restore $LATEST_BACKUP
   ```

3. **Update environment variables**
   ```bash
   # In Vercel
   NEXT_PUBLIC_SUPABASE_URL=new_url
   SUPABASE_SERVICE_ROLE_KEY=new_key
   ```

4. **Verify and test thoroughly**

5. **Update DNS if needed**

**Time to Recovery:** 1-4 hours
**Data Loss:** Depends on backup age

---

## Disaster Recovery Objectives

### RTO (Recovery Time Objective)

**Target:** 1 hour

- Time to detect issue: 5-10 minutes
- Time to assess situation: 10-15 minutes
- Time to restore: 30-45 minutes

### RPO (Recovery Point Objective)

**Target:** 24 hours

- Automated daily backups
- Manual backups before major changes
- Acceptable data loss: Last 24 hours

---

## Backup Schedule

### Automated (Supabase)
- **Frequency:** Daily at 3:00 AM UTC
- **Retention:** 7 days (Free) / 30 days (Pro)
- **Cost:** Included in plan

### Manual Backups

**Weekly:**
- Every Sunday at 2:00 AM
- Retained for 30 days
- Stored in secure location

**Before Major Changes:**
- Database migrations
- Schema changes
- Bulk data operations
- App version upgrades

**Monthly:**
- First day of month
- Long-term archival
- Retained for 1 year

---

## Storage Recommendations

### Local Development
```bash
./backups/
```
- Quick access
- Testing restores
- Not for production!

### Production Storage

**Option 1: AWS S3 (Recommended)**
```bash
# Upload to S3
aws s3 cp backups/kulti_backup_*.sql.gz \
  s3://kulti-backups/production/ \
  --sse AES256
```

**Option 2: Supabase Storage**
```typescript
// Upload backup to Supabase Storage
const { data, error } = await supabase.storage
  .from('backups')
  .upload(`production/backup_${timestamp}.sql.gz`, file)
```

**Option 3: Vercel Blob Storage**
```typescript
import { put } from '@vercel/blob';

await put(`backups/backup_${timestamp}.sql.gz`, file, {
  access: 'private',
});
```

---

## Testing Backup/Restore

### Quarterly Backup Drill

**Test procedure:**

1. **Create test Supabase project**
   - Name: kulti-backup-test
   - Free tier is fine

2. **Take production backup**
   ```bash
   npm run db:backup
   ```

3. **Restore to test project**
   ```bash
   export SUPABASE_PROJECT_REF=test_project_ref
   export SUPABASE_DB_PASSWORD=test_password
   npm run db:restore backups/latest.sql.gz
   ```

4. **Verify data integrity**
   ```sql
   -- Check critical tables
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM sessions;
   SELECT COUNT(*) FROM credit_transactions;

   -- Verify relationships
   SELECT COUNT(*) FROM session_participants sp
   JOIN sessions s ON sp.session_id = s.id;

   -- Check RLS policies
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

5. **Test application against test DB**
   - Update local .env to point to test project
   - Run application
   - Test user login
   - Test session creation
   - Test credit operations

6. **Document results**
   - Time taken
   - Issues encountered
   - Data integrity check results

7. **Delete test project**

**Schedule:** Every 3 months

---

## Critical Data Exports

### User Data Export

```sql
-- Export user profiles
COPY (
  SELECT id, username, email, display_name, created_at
  FROM users
  ORDER BY created_at
) TO '/tmp/users_export.csv' CSV HEADER;
```

### Credit Transactions Export

```sql
-- Export all credit transactions
COPY (
  SELECT
    ct.*,
    u.username as user_name
  FROM credit_transactions ct
  JOIN users u ON ct.user_id = u.id
  ORDER BY ct.created_at DESC
) TO '/tmp/credit_transactions_export.csv' CSV HEADER;
```

### Session History Export

```sql
-- Export session history
COPY (
  SELECT
    s.id,
    s.title,
    s.created_at,
    s.status,
    u.username as host_name,
    COUNT(sp.user_id) as participant_count
  FROM sessions s
  JOIN users u ON s.host_id = u.id
  LEFT JOIN session_participants sp ON s.id = sp.session_id
  GROUP BY s.id, s.title, s.created_at, s.status, u.username
  ORDER BY s.created_at DESC
) TO '/tmp/sessions_export.csv' CSV HEADER;
```

**Store separately from database backups!**

---

## Monitoring Backup Health

### Daily Checks

- [ ] Automated backup completed
- [ ] Backup file size reasonable
- [ ] No backup errors in Supabase logs

### Weekly Checks

- [ ] Manual backup created
- [ ] Backup verification passed
- [ ] Old backups cleaned up
- [ ] Storage space sufficient

### Monthly Checks

- [ ] Archive backup created
- [ ] Test restore performed
- [ ] Recovery time documented
- [ ] Backup strategy reviewed

---

## Backup Security

### Access Control

**Production backups:**
- Restrict access to DevOps team only
- Use encrypted storage (S3 with SSE)
- Enable audit logging
- Require MFA for access

**Backup files contain:**
- User personal information
- Authentication data
- Credit transaction history
- Session recordings metadata

### Encryption

**At Rest:**
```bash
# Encrypt backup before storage
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Decrypt for restore
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

**In Transit:**
- Always use HTTPS/TLS
- Use signed URLs for S3
- VPN for direct transfers

---

## Troubleshooting

### Backup Fails

**Error: "Connection refused"**
- Check `SUPABASE_PROJECT_REF`
- Verify database password
- Check network connectivity
- Verify Supabase project is active

**Error: "Permission denied"**
- Check database user permissions
- Verify service role key
- Check RLS policies not blocking

**Backup file too large**
- Increase disk space
- Clean up old recordings
- Archive old sessions
- Use incremental backups

### Restore Fails

**Error: "Relation already exists"**
- Add `--clean` flag to pg_dump
- Drop existing tables first
- Use fresh database

**Error: "Invalid backup file"**
- Verify checksum
- Re-download backup
- Try older backup

**Data inconsistency after restore**
- Check foreign key constraints
- Verify RLS policies active
- Reindex if needed:
  ```sql
  REINDEX DATABASE postgres;
  ```

---

## Compliance & Retention

### GDPR Considerations

**Right to be forgotten:**
- Document where user data exists in backups
- Procedure to remove from future backups
- Retention limits on backups containing deleted users

**Data portability:**
- Provide CSV exports
- Include all user data
- Machine-readable format

### Retention Policy

**Automated backups:** 7-30 days (Supabase)
**Weekly manual:** 30 days
**Monthly archive:** 12 months
**Legal hold:** As required by law

---

## Automation Scripts

### Scheduled Backup (Cron)

```bash
# Add to crontab
# Backup every Sunday at 2 AM
0 2 * * 0 cd /path/to/kulti && npm run db:backup >> /var/log/kulti-backup.log 2>&1

# Upload to S3 after backup
5 2 * * 0 aws s3 sync /path/to/kulti/backups/ s3://kulti-backups/weekly/
```

### Backup Monitoring

```bash
#!/bin/bash
# Check if backup exists from last 24 hours

BACKUP_DIR="./backups"
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime -1 | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backup found in last 24 hours!"
  # Send alert (email, Slack, PagerDuty, etc.)
  exit 1
else
  echo "OK: Recent backup found: $LATEST_BACKUP"
  exit 0
fi
```

---

## Emergency Contacts

**Supabase Support:**
- Email: support@supabase.io
- Dashboard: app.supabase.com/support

**Internal Escalation:**
- Primary: [DevOps Lead]
- Secondary: [CTO]
- Emergency: [CEO]

**Service Status:**
- Supabase: status.supabase.com
- Vercel: status.vercel.com

---

## Checklist: Before Major Changes

- [ ] Create manual backup
- [ ] Verify backup integrity
- [ ] Test restore in staging
- [ ] Document rollback procedure
- [ ] Notify team of maintenance window
- [ ] Prepare rollback backup
- [ ] Test critical functionality after change
- [ ] Keep backup for 30 days minimum

---

Last Updated: 2025-01-16
