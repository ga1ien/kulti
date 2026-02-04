# Kulti Maintenance Procedures

**Version:** 1.0
**Effective Date:** December 2025
**Last Updated:** November 2025

---

## Executive Summary

This document outlines all scheduled and reactive maintenance procedures for Kulti, including database maintenance, dependency updates, log retention, and planned maintenance windows.

**Key Principles:**
- Schedule maintenance during low-traffic periods
- Always have backups before maintenance
- Communicate maintenance windows to users
- Test all changes in staging first
- Have rollback plans ready
- Monitor carefully during and after maintenance

---

## Part A: Scheduled Maintenance

### Planning and Approval Process

**Monthly Maintenance Window:**

```
Schedule:
- Day: Second Sunday of each month
- Time: 2:00 AM - 4:00 AM UTC
- Duration: 2 hours (target)
- Window: Low traffic period
- Frequency: Monthly
- Advance notice: 72 hours minimum
```

**Approval Process:**

```
4 Weeks Before:
1. [ ] Identify maintenance needed
2. [ ] Assess impact on users
3. [ ] Estimate duration
4. [ ] Plan rollback steps
5. [ ] Schedule with stakeholders

2 Weeks Before:
1. [ ] Document maintenance scope
2. [ ] Create detailed runbook
3. [ ] Test changes in staging
4. [ ] Get approval from VP Engineering
5. [ ] Brief team on procedures

1 Week Before:
1. [ ] Confirm all tools and access ready
2. [ ] Verify backups scheduled
3. [ ] Test backup restoration
4. [ ] Brief support team
5. [ ] Prepare notification templates

72 Hours Before:
1. [ ] Post announcement on status page
2. [ ] Send email to all users
3. [ ] Brief on-call team
4. [ ] Final verification of procedures

24 Hours Before:
1. [ ] Confirm team attendance
2. [ ] Verify tools working
3. [ ] Last-minute testing
4. [ ] Team standby prepared

1 Hour Before:
1. [ ] Status page updated: "Maintenance"
2. [ ] Team assembled and ready
3. [ ] Monitoring dashboard open
4. [ ] Incident commander assigned
```

### Advance Notification

**72-Hour Notice (Email to Users):**

```
Subject: Scheduled Maintenance - Kulti

We have scheduled maintenance for Kulti to improve performance
and reliability.

Date: [Date]
Time: [Time] UTC
Duration: [X hours]
Expected Impact: Brief service unavailability

During this maintenance window:
- You will be unable to create or join sessions
- Active sessions will end gracefully
- All data will be preserved
- The platform will be fully restored after maintenance

If you have questions: support@kulti.club

Thank you for your understanding.
The Kulti Team
```

**24-Hour Reminder:**

```
Subject: Reminder: Kulti Maintenance Tomorrow

Friendly reminder that scheduled maintenance is happening tomorrow.

Date: [Date]
Time: [Time] UTC
Duration: Approximately [X hours]

Please plan accordingly. We'll be back online shortly after [end time].

The Kulti Team
```

### Maintenance Window Procedures

**2 Hours Before (T-120):**
```
1. [ ] Health checks all systems
2. [ ] Verify backups recent and valid
3. [ ] Verify monitoring active
4. [ ] Assemble team
5. [ ] Brief on procedures
6. [ ] Have rollback plan ready
7. [ ] Test incident response procedures
```

**1 Hour Before (T-60):**
```
1. [ ] Final system checks
2. [ ] Confirm no critical issues
3. [ ] Begin graceful session shutdown (if needed)
4. [ ] Notify users: "Maintenance starting in 1 hour"
5. [ ] Monitor active users dropping to near-zero
6. [ ] Final team briefing
```

**At Maintenance Start (T+0):**
```
1. [ ] Stop accepting new requests (optional, depends on scope)
2. [ ] Update status page: "Maintenance in progress"
3. [ ] Document start time
4. [ ] Post initial status update
5. [ ] Begin maintenance tasks
6. [ ] Monitor for issues every 10 minutes
```

**During Maintenance:**
```
Every 15 minutes:
1. [ ] Post status update
2. [ ] Check for issues
3. [ ] Monitor resource usage
4. [ ] Verify no unexpected problems
5. [ ] If issues: Communicate and adjust timeline

If Major Issue Arises:
1. [ ] Stop maintenance immediately
2. [ ] Activate rollback procedures
3. [ ] Notify team and users
4. [ ] Restore to pre-maintenance state
5. [ ] Post incident on status page
```

**At Maintenance Completion:**
```
1. [ ] All tasks completed successfully
2. [ ] Run smoke tests
3. [ ] Verify all services operational
4. [ ] Monitor error rates (should be < 0.5%)
5. [ ] Update status page: "Operational"
6. [ ] Post final update: "Maintenance complete"
7. [ ] Notify users via email
8. [ ] Brief team on any issues encountered
```

**Post-Maintenance (1 Hour After):**
```
1. [ ] Continue monitoring for issues
2. [ ] Have team on standby
3. [ ] Alert if errors increase
4. [ ] Document any issues found
5. [ ] Schedule follow-up if needed
```

### Maintenance Types

**Type 1: Database Maintenance**
- Duration: 30-60 minutes
- Impact: Brief unavailability
- Runbook: See Part B

**Type 2: Dependency Updates**
- Duration: 30-45 minutes
- Impact: Code deployment and testing
- Runbook: See Part C

**Type 3: Infrastructure Updates**
- Duration: 15-30 minutes
- Impact: May require restart
- Runbook: See infrastructure docs

**Type 4: SSL Certificate Renewal**
- Duration: 5-10 minutes
- Impact: Minimal
- Runbook: Automatic with Let's Encrypt

**Type 5: CDN Cache Clear**
- Duration: 1-2 minutes
- Impact: Slight cache miss spike
- Runbook: Via Vercel dashboard

---

## Part B: Database Maintenance

### Backup Verification (Weekly)

**Schedule:** Every Sunday 3:00 AM UTC

**Procedure:**

```sql
-- 1. Check last backup
SELECT * FROM pg_catalog.pg_backups
ORDER BY backup_date DESC
LIMIT 1;

-- Expected: Backup within last 24 hours
-- Expected: Status = "success"
-- Expected: Size > [minimum expected]

-- 2. Verify backup integrity
SELECT
  backup_id,
  backup_date,
  size_mb,
  status,
  database_count
FROM backup_status
ORDER BY backup_date DESC
LIMIT 1;

-- 3. Check backup retention
SELECT COUNT(*) as backup_count
FROM pg_backups
WHERE backup_date > NOW() - INTERVAL '30 days';

-- Expected: At least 4 weekly backups
```

**Supabase-Specific Steps:**

1. Visit https://app.supabase.com/[project]
2. Go to Settings > Backups
3. Verify latest backup:
   - [ ] Backup exists
   - [ ] Backup successful
   - [ ] Backup size reasonable (> 50MB expected)
   - [ ] Backup time within last 24 hours
4. Verify backup frequency:
   - [ ] Daily backups enabled
   - [ ] Point-in-time recovery enabled
   - [ ] Retention period: 30+ days

**Test Backup Restoration (Quarterly):**

```
Quarterly (Every 90 days):
1. [ ] Create staging environment
2. [ ] Restore backup to staging
3. [ ] Verify data integrity
4. [ ] Run spot checks
5. [ ] Delete staging environment

Expected Time: 1-2 hours
```

### Index Optimization (Monthly)

**Schedule:** Second Sunday after backup verification

**Procedure:**

```sql
-- 1. Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scan_count,
  idx_tup_read as read_count,
  idx_tup_fetch as fetch_count
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pk_%'
  AND indexrelname NOT LIKE 'fk_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Expected: Few or no unused indexes
-- Action: Consider dropping unused indexes
```

```sql
-- 2. Analyze missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct as unique_values,
  correlation
FROM pg_stats
WHERE correlation < 0.5
  AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Expected: Identify commonly filtered columns
-- Action: Create indexes if missing
```

```sql
-- 3. Optimize existing indexes
ANALYZE;

-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM sessions WHERE user_id = [user_id];

-- Expected: Index used in plan
-- Action: Adjust if full table scan observed
```

### Query Performance Review (Monthly)

**Schedule:** Monthly on database maintenance day

**Procedure:**

```sql
-- 1. Identify slow queries
SELECT
  query,
  calls,
  mean_time,
  max_time,
  total_time
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries over 100ms
ORDER BY mean_time DESC
LIMIT 10;

-- Expected: Fast queries (< 50ms average)
-- Action: Optimize slow queries
```

```sql
-- 2. Find N+1 query patterns
SELECT
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
WHERE calls > 1000  -- Frequently repeated
  AND mean_time < 10  -- But individually fast
ORDER BY calls DESC
LIMIT 20;

-- Expected: Few frequently repeated queries
-- Action: Batch queries if pattern detected
```

```sql
-- 3. Check connection patterns
SELECT
  datname,
  usename,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE state = 'active'
GROUP BY datname, usename
ORDER BY connection_count DESC;

-- Expected: < 50 connections
-- Alert: > 80 connections (approaching limit)
```

### Storage Cleanup (Monthly)

**Schedule:** Monthly on database maintenance day

**Procedure:**

```sql
-- 1. Check database size
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'kulti';

-- Expected: Reasonable size (< 10GB)
-- Action: Archive or clean if > 50GB
```

```sql
-- 2. Find large tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Expected: Reasonable sizes
-- Action: Archive or delete if too large
```

```sql
-- 3. Clean up deleted records (soft delete pattern)
-- If using soft deletes, periodically hard delete
DELETE FROM records WHERE deleted_at < NOW() - INTERVAL '90 days';

-- Expected: Remove old records
-- Note: Always backup before deletion
```

```sql
-- 4. Clean up logs and temporary data
DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM session_temp_data WHERE created_at < NOW() - INTERVAL '7 days';

-- Expected: Reduce table size
```

### Migration Procedures

**For Database Schema Changes:**

```
Pre-Deployment (Staging):
1. [ ] Create migration in Supabase
2. [ ] Test migration on staging
3. [ ] Verify data integrity
4. [ ] Test rollback procedure
5. [ ] Validate application works with new schema

Testing:
1. [ ] Run full test suite
2. [ ] Test with production-like data
3. [ ] Verify no performance regressions
4. [ ] Check replication still working

Deployment (Production):
1. [ ] Backup database before running
2. [ ] Run migration during maintenance window
3. [ ] Verify migration completed
4. [ ] Run smoke tests
5. [ ] Monitor application for errors
6. [ ] Monitor query performance

If Issues:
1. [ ] Run rollback migration
2. [ ] Restore from backup if needed
3. [ ] Investigate root cause
4. [ ] Fix and retry during next window
```

---

## Part C: Dependency Updates

### Security Patch Process

**Frequency:** As needed (within 24-48 hours of release)

**Process:**

```
1. Monitoring:
   - GitHub security alerts monitored daily
   - npm/yarn audit run weekly
   - Dependabot alerts checked

2. Assessment:
   - What is the vulnerability?
   - How critical is it?
   - Are we affected?
   - Does it require immediate action?

3. Testing:
   - Update dependency locally
   - Run full test suite
   - Test in staging
   - Performance test

4. Deployment:
   - If critical: Deploy same day
   - If high: Deploy within 2-3 days
   - If medium: Include in next release
   - If low: Include in next planned update

5. Verification:
   - Confirm patch deployed
   - Re-run vulnerability scan
   - Monitor for issues
```

**Example - Critical Security Patch:**

```bash
# 1. Identify patch
npm audit
# Found critical vulnerability in 'dependency-x' v1.2.3

# 2. Update
npm update dependency-x --save

# 3. Test
npm test
npm run build
npm run type-check

# 4. Staging
git checkout -b security/fix-dependency-x
git commit -m "Security: Fix critical vulnerability in dependency-x"
git push

# 5. Deploy after testing
vercel --prod

# 6. Verify
npm audit
# Vulnerability fixed - no warnings
```

### Minor Version Updates (Quarterly)

**Schedule:** Once per quarter during maintenance window

**Process:**

```
1. Audit current versions:
npm outdated

2. Create update branch:
git checkout -b deps/minor-updates

3. Update minor versions:
npm update  # Updates minor and patch versions
npm update --save  # Update package.json

4. Test thoroughly:
npm test
npm run type-check
npm run lint
npm run build

5. Manual testing:
- Test key features in dev
- Check performance
- Look for deprecation warnings

6. Document changes:
Create CHANGELOG entry for significant changes

7. Staging deployment:
Deploy to staging environment
Run e2e tests
Monitor for issues

8. Production deployment:
Deploy during low-traffic period
Monitor error rates
Have rollback ready
```

### Major Version Updates (Annually or Planned)

**Schedule:** Planned and scheduled in advance

**Process:**

```
1. Assessment (1 month before):
   - What changed in major version?
   - What breaks in our code?
   - What needs migration?
   - Estimate effort

2. Planning:
   - Create project/epic for upgrade
   - Assign team members
   - Create detailed runbook
   - Plan testing strategy

3. Development (2-4 weeks):
   - Update dependency
   - Fix breaking changes
   - Update integration code
   - Create migration guide if needed

4. Testing (1 week):
   - Full regression testing
   - Performance testing
   - Browser compatibility testing
   - E2E testing
   - Load testing

5. Staging (1 week):
   - Deploy to staging
   - Full user acceptance testing
   - Monitor for issues
   - Document any gotchas

6. Production (scheduled):
   - Deploy during maintenance window
   - Careful monitoring
   - Quick rollback if needed
   - Have previous version ready

7. Post-deployment (2 weeks):
   - Close monitoring window
   - Document lessons learned
   - Update documentation
   - Brief team
```

### Dependency Audit

**Weekly:**
```bash
npm audit
# Review all vulnerabilities
# Fix critical and high immediately
# Plan medium and low updates
```

**Monthly:**
```bash
npm outdated
# Review what's outdated
# Plan updates for next quarter
# Check changelog for major changes
```

**Quarterly:**
```
Full dependency review:
1. npm audit
2. npm outdated
3. Check for deprecated packages
4. Check for unmaintained packages
5. Plan major upgrades if needed
```

---

## Part D: Log Retention

### Application Logs (30 Days)

**Source:** Vercel Function logs

**Retention:** 30 days (automatic)

**Accessed via:**
```bash
vercel logs [project]
```

**Contents:**
- Request logs
- Error logs
- Performance logs
- Application traces

**Archival:**
```
Weekly download:
1. Export logs for archival
2. Upload to cold storage (AWS S3)
3. Delete from production logs
4. Keep warm index for < 7 days

Retrieval:
If logs needed beyond 30 days:
1. Request from archive
2. Download from cold storage
3. Search and analyze locally
```

### Database Logs (90 Days)

**Source:** Supabase PostgreSQL logs

**Retention:** 90 days

**Access:**
```
1. Visit app.supabase.com
2. Select project
3. Go to Logs > PostgreSQL
4. Filter by date and query type
```

**Archive:**
```
Monthly:
1. Export query logs
2. Export error logs
3. Upload to S3
4. Delete from production

Retrieve: If needed beyond 90 days
```

**Important Logs to Keep:**
```
- Authentication failures
- Authorization failures
- Data modifications (DML)
- Schema changes (DDL)
- Errors and warnings
- Performance metrics
```

### Audit Logs (1 Year)

**Source:** Supabase Auth logs

**Retention:** 1 year minimum

**Contents:**
- User signups
- User logins
- Password resets
- Account changes
- Role changes
- Permissions changes

**Access:**
```
Supabase Dashboard:
1. Go to Authentication > Users
2. View user activity
3. Review login history
4. Check MFA status changes
```

**Compliance:**
```
Retention: 1 year (or longer if required)
Reasons for retention:
- Compliance audits
- Security investigations
- User dispute resolution
- Fraud detection
```

### Sentry Error Logs (Automatic)

**Retention:** Per plan (typically 90 days for free, longer for paid)

**Access:**
```
https://sentry.io/[org]/[project]/
```

**Archive Strategy:**
```
Monthly:
1. Export high-priority errors
2. Save important stack traces
3. Document patterns
4. Upload to internal storage

Automatic Cleanup:
- Sentry auto-deletes after retention period
- No action needed
- Can extend retention with paid plan
```

### Backup Rotation

**Backup Schedule:**

```
Daily Backups:
- Automated by Supabase
- Kept for 7 days
- Accessible for point-in-time recovery

Weekly Backups:
- Manual export every Sunday
- Stored in S3
- Kept for 12 weeks (3 months)

Monthly Backups:
- Manual export first Sunday of month
- Stored in S3
- Kept for 5 years

Retention Policy:
- Keep daily for 7 days
- Keep weekly for 3 months
- Keep monthly for 5 years
```

**Backup Storage:**

```
Location: AWS S3
Bucket: kulti-database-backups
Encryption: Yes (AES-256)
Access: Limited to ops team
MFA required: Yes
Backup size: ~100-500MB per backup
```

**Backup Restoration Testing:**

```
Quarterly:
1. [ ] Select random backup
2. [ ] Restore to staging
3. [ ] Verify data integrity
4. [ ] Run spot checks
5. [ ] Delete staging database
6. [ ] Document results
```

---

## Part E: Alerting and Monitoring During Maintenance

### Maintenance Mode Setup

**Before Starting Maintenance:**

```typescript
// api/maintenance.ts
export const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

// Middleware
if (isMaintenanceMode && req.path !== '/health') {
  return res.status(503).json({
    error: 'Service under maintenance',
    message: 'Kulti is under scheduled maintenance. Check https://status.kulti.club for updates.',
    estimatedDowntime: '[time]',
    statusPageUrl: 'https://status.kulti.club'
  });
}
```

**Enable Maintenance Mode:**

```bash
# Set environment variable
vercel env add MAINTENANCE_MODE true

# Redeploy
vercel --prod
```

**Disable After Maintenance:**

```bash
# Remove environment variable
vercel env remove MAINTENANCE_MODE

# Redeploy
vercel --prod
```

### Monitoring During Maintenance

**Real-Time Metrics to Watch:**

```
Every 5 minutes during maintenance:
1. [ ] Error rate (should be 0 or expected)
2. [ ] Response times
3. [ ] Database connections
4. [ ] CPU and memory usage
5. [ ] Disk space
6. [ ] Network I/O
7. [ ] Any unexpected activity
```

**Dashboards to Monitor:**

```
- Vercel Analytics
- Sentry (should show no errors if maintenance mode on)
- Database dashboard (if doing DB maintenance)
- Custom monitoring dashboard
- System resource monitors
```

### Post-Maintenance Monitoring

**First Hour After Maintenance:**

```
Every 5 minutes:
- [ ] Error rate < 0.5%
- [ ] Response times normal
- [ ] All services responding
- [ ] No user complaints
- [ ] Database healthy
- [ ] Backups completed if needed

Every 15 minutes (hours 1-4):
- [ ] Trends stable
- [ ] No memory leaks
- [ ] No cascading failures
- [ ] Performance normal

Every hour (rest of day):
- [ ] Continued stability
- [ ] User reports normal
- [ ] Metrics trending well
```

**Issue Response During Post-Maintenance:**

```
If error rate > 5%:
1. Investigate cause
2. If maintenance-related:
   a. Assess: Can fix quickly?
   b. If yes: Fix and deploy
   c. If no: Rollback
3. If not related:
   a. Handle per normal incident procedures

If performance degradation:
1. Check database
2. Check cache
3. Check external services
4. Clear caches if needed
5. Optimize if configuration issue

If data issues:
1. Restore from backup
2. Investigate what happened
3. Run data validation checks
4. File incident report
```

---

## Part F: Maintenance Runbook Template

**Use this template for each maintenance window:**

```markdown
# Maintenance Runbook - [Date]

## Overview
**Purpose:** [What are we maintaining]
**Duration:** [Expected time]
**Impact:** [What users will experience]
**Rollback Plan:** [How to undo]

## Pre-Maintenance Checklist
- [ ] Backups verified
- [ ] Team assembled
- [ ] Monitoring ready
- [ ] Communication prepared
- [ ] Staging tested

## Maintenance Steps
1. [First step with expected output]
2. [Second step with expected output]
3. [Etc.]

## Verification Steps
- [ ] Service health check
- [ ] Smoke test [specific test]
- [ ] Performance baseline check
- [ ] Error rate normal

## Rollback Steps (if needed)
1. [First rollback step]
2. [Second rollback step]

## Post-Maintenance
- [ ] Monitor for 1 hour
- [ ] Brief team on results
- [ ] Document any issues
```

---

## Appendix: Maintenance Calendar Template

```
QUARTERLY MAINTENANCE CALENDAR
==============================

MONTH 1:
- Week 1: Security audits
- Week 2: Dependency updates
- Week 3: Database optimization
- Week 4: Infrastructure review

MONTH 2:
- Week 1: Database backups verify
- Week 2: Log archival
- Week 3: Performance tuning
- Week 4: Cost optimization review

MONTH 3:
- Week 1: Major dependency updates (if any)
- Week 2: System capacity review
- Week 3: Security audit and patching
- Week 4: Planning for next quarter
```

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Maintained By:** Operations Team
**Review Frequency:** Quarterly
