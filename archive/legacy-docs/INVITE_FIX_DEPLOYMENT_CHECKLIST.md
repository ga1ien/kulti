# Invite Race Condition Fix - Deployment Checklist

## Pre-Deployment

- [ ] Review migration: `supabase/migrations/20251113_fix_invite_race_conditions.sql`
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify no existing duplicate usage records:
  ```sql
  SELECT invite_id, used_by, COUNT(*)
  FROM invite_uses
  GROUP BY invite_id, used_by
  HAVING COUNT(*) > 1;
  ```
- [ ] If duplicates exist, clean them up first:
  ```sql
  -- Keep only the earliest usage per user per invite
  DELETE FROM invite_uses
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM invite_uses
    GROUP BY invite_id, used_by
  );
  ```

## Deployment Steps

### 1. Deploy Database Migration
```bash
# Run the migration
supabase db push

# Or apply manually
psql -h your-host -d your-db -f supabase/migrations/20251113_fix_invite_race_conditions.sql
```

### 2. Verify Database Changes
```sql
-- Verify unique constraint exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'invite_uses'
AND indexname = 'idx_invite_uses_unique_per_user';

-- Verify function updated
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'use_invite_code';
```

### 3. Deploy Application Code
```bash
# Build and deploy updated application
npm run build
npm run deploy  # or your deployment command
```

### 4. Smoke Tests

**Test 1: Normal Invite Usage**
```bash
curl -X POST https://your-app.com/api/invites/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"KTEST1"}'
# Expected: {"isValid":true,"invite":{...}}

curl -X POST https://your-app.com/api/auth/complete-phone-signup \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "userId":"user-123",
    "email":"test@example.com",
    "password":"SecurePass123!",
    "username":"testuser",
    "displayName":"Test User",
    "inviteCode":"KTEST1",
    "phone":"+15555551234"
  }'
# Expected: {"success":true}
```

**Test 2: Duplicate Usage Prevention**
```bash
# Try to use the same code again with the same user
curl -X POST https://your-app.com/api/auth/complete-phone-signup \
  # ... same request as above
# Expected: {"error":"You have already used this invite code"}
```

**Test 3: Concurrent Request Handling**
```bash
# Simulate concurrent requests (requires multiple terminal windows)
for i in {1..3}; do
  curl -X POST https://your-app.com/api/auth/complete-phone-signup \
    -H "Content-Type: application/json" \
    # ... signup data with different users
  & done
wait
# Expected: All 3 succeed with different users, or some fail gracefully
```

## Post-Deployment Monitoring

### 1. Database Metrics
```sql
-- Monitor invite code usage patterns
SELECT
  DATE_TRUNC('hour', used_at) as hour,
  COUNT(*) as usage_count,
  COUNT(DISTINCT used_by) as unique_users
FROM invite_uses
WHERE used_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Check for lock conflicts (should be rare)
SELECT * FROM pg_stat_database
WHERE datname = 'your_database_name';
```

### 2. Application Logs

Monitor for these patterns:
- `"lock_not_available"` - Indicates concurrent usage (normal, should retry)
- `"unique_violation"` - Indicates duplicate attempt (normal for retries)
- `"already used"` - Idempotent retry (normal)
- Excessive occurrences may indicate issues

### 3. Error Tracking

Set up alerts for:
- Spike in `409 Conflict` responses (lock contention)
- Increase in invite code validation failures
- Unusual patterns in invite usage

### 4. Performance Metrics

Track:
- Average response time for `/api/invites/validate`
- Average response time for `/api/auth/complete-phone-signup`
- Database query latency for `use_invite_code` function
- Rate of successful vs failed invite usages

## Rollback Procedure

If critical issues occur:

### 1. Database Rollback
```sql
-- Remove unique constraint
DROP INDEX IF EXISTS idx_invite_uses_unique_per_user;
DROP INDEX IF EXISTS idx_invite_uses_lookup;

-- Restore previous function (from backup or previous migration)
-- Keep a copy of the old function definition
```

### 2. Application Rollback
```bash
# Revert to previous deployment
git revert <commit-hash>
npm run build
npm run deploy
```

### 3. Verify Rollback
```sql
-- Check constraint removed
SELECT indexname FROM pg_indexes
WHERE tablename = 'invite_uses'
AND indexname = 'idx_invite_uses_unique_per_user';
-- Should return 0 rows

-- Test invite usage works without constraint
-- Use test environment first
```

## Success Criteria

- [ ] No increase in failed signups
- [ ] Invite codes cannot be used multiple times by same user
- [ ] Concurrent requests handled gracefully
- [ ] Retry scenarios work correctly (idempotency)
- [ ] Performance remains within acceptable range (<500ms p95)
- [ ] No unexpected errors in logs
- [ ] All monitoring dashboards show normal patterns

## Support Runbook

### Issue: User reports "Invite code is being processed"
**Cause**: Concurrent requests or lock contention
**Resolution**: Ask user to try again after a few seconds
**Prevention**: Consider increasing timeout or adding client-side retry

### Issue: User reports "You have already used this invite code"
**Cause**: Legitimate duplicate attempt or retry scenario
**Resolution**:
1. Check if user already has profile created
2. If yes: They can proceed without code
3. If no: Check `invite_uses` table for their entry
**Query**:
```sql
SELECT * FROM invite_uses WHERE used_by = 'user-id';
```

### Issue: High rate of lock conflicts
**Cause**: Popular invite code being used simultaneously
**Resolution**: This is expected behavior, monitor if rate is excessive
**Mitigation**: Consider implementing client-side queueing

### Issue: Invite code stuck at max usage but should have more
**Cause**: Possible inconsistency between `current_uses` and actual usage
**Investigation**:
```sql
SELECT
  i.code,
  i.current_uses,
  i.max_uses,
  COUNT(iu.id) as actual_uses
FROM invites i
LEFT JOIN invite_uses iu ON iu.invite_id = i.id
WHERE i.code = 'PROBLEMATIC_CODE'
GROUP BY i.id;
```
**Resolution**: If mismatch found, manually correct:
```sql
UPDATE invites
SET current_uses = (
  SELECT COUNT(*) FROM invite_uses WHERE invite_id = 'invite-id'
)
WHERE id = 'invite-id';
```

## Additional Resources

- Full documentation: `/INVITE_RACE_CONDITION_FIX.md`
- Database migration: `/supabase/migrations/20251113_fix_invite_race_conditions.sql`
- Service layer: `/lib/invites/service.ts`
- API route: `/app/api/auth/complete-phone-signup/route.ts`
- PostgreSQL locking docs: https://www.postgresql.org/docs/current/explicit-locking.html
