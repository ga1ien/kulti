# RLS Fix Deployment Checklist

## Pre-Deployment

### 1. Review Changes
- [ ] Read `RLS_FIX_QUICK_REFERENCE.md` for overview
- [ ] Read `RLS_CIRCULAR_DEPENDENCY_FIX_SUMMARY.md` for details
- [ ] Review migration files in order:
  - [ ] `20251113_complete_rls_fix.sql`
  - [ ] `20251113_fix_invite_functions.sql`
  - [ ] `20251113_extend_admin_helpers.sql`
  - [ ] `20251113_test_rls_fix.sql`

### 2. Backup Database
```bash
# Create backup before applying
supabase db dump -f backup_before_rls_fix.sql

# Or for production
pg_dump $DATABASE_URL > backup_before_rls_fix.sql
```
- [ ] Backup created
- [ ] Backup verified (file size > 0)

### 3. Test in Local Environment
```bash
# Reset local database
supabase db reset

# Verify no errors
supabase db diff

# Test signup flow locally
# (Use app to create account with invite code)
```
- [ ] Local migrations applied successfully
- [ ] Test suite passed
- [ ] Signup flow works
- [ ] Admin operations work

## Deployment

### Method 1: Supabase CLI (Recommended)
```bash
# Push all migrations to remote
supabase db push

# Verify with test suite
supabase db execute -f supabase/migrations/20251113_test_rls_fix.sql
```
- [ ] Migrations pushed
- [ ] Tests passed
- [ ] No errors in Supabase logs

### Method 2: Direct SQL (If CLI unavailable)
```bash
# Apply in order
psql $DATABASE_URL < supabase/migrations/20251113_complete_rls_fix.sql
psql $DATABASE_URL < supabase/migrations/20251113_fix_invite_functions.sql
psql $DATABASE_URL < supabase/migrations/20251113_extend_admin_helpers.sql
psql $DATABASE_URL < supabase/migrations/20251113_test_rls_fix.sql
```
- [ ] Each migration applied successfully
- [ ] Test suite shows "ALL TESTS PASSED"

## Post-Deployment Verification

### 1. Verify Helper Functions Exist
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin',
    'get_user_role',
    'is_session_host',
    'is_session_participant',
    'is_room_member',
    'is_room_moderator'
  );
```
Expected: 6 rows returned
- [ ] All 6 functions exist

### 2. Verify Policies Updated
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'invites', 'invite_uses', 'sessions', 'credit_transactions')
GROUP BY tablename
ORDER BY tablename;
```
Expected:
- profiles: 5 policies
- invites: 5 policies
- invite_uses: 4 policies
- sessions: 2+ policies (may have others)
- credit_transactions: 2+ policies (may have others)

- [ ] Policy counts correct

### 3. Test Critical Flows

#### A. Anonymous Invite Validation
```sql
-- Should return rows (as anonymous user would see them)
SET ROLE anon;
SELECT code FROM invites WHERE is_active = true LIMIT 1;
RESET ROLE;
```
- [ ] Returns active invite codes

#### B. Admin Check Function
```sql
-- Should not cause infinite recursion
SELECT public.is_admin();
```
- [ ] Returns true/false without error

#### C. Profile Query
```sql
-- Should work without recursion
SELECT id, username, role FROM profiles LIMIT 10;
```
- [ ] Returns profiles without error

### 4. Monitor Error Logs
Check Supabase dashboard for:
- [ ] No "infinite recursion" errors
- [ ] No "permission denied" errors during signup
- [ ] No RLS-related timeouts

### 5. Test User Flows

#### A. New User Signup with Invite
1. Go to signup page
2. Enter valid invite code
3. Complete signup
4. Verify profile created
5. Verify invite code marked as used

- [ ] Signup completes successfully
- [ ] No console errors
- [ ] User can access dashboard

#### B. Existing User Login
1. Login with existing account
2. Navigate to dashboard
3. View profile

- [ ] Login works
- [ ] Dashboard loads
- [ ] Profile displays

#### C. Admin Operations (If admin account exists)
1. Login as admin
2. View all users
3. View invite codes
4. View analytics

- [ ] Admin dashboard loads
- [ ] Can view all users
- [ ] Can view all invites
- [ ] No permission errors

## Performance Checks

### 1. Response Time
Test signup endpoint:
```bash
curl -X POST https://your-api.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"inviteCode": "TEST1", "username": "test", ...}' \
  -w "\nTime: %{time_total}s\n"
```
Expected: < 1 second
- [ ] Signup response time acceptable

### 2. Database Query Performance
```sql
EXPLAIN ANALYZE SELECT * FROM invites WHERE is_active = true;
EXPLAIN ANALYZE SELECT * FROM profiles WHERE id = auth.uid();
```
Expected: < 5ms execution time
- [ ] Query performance acceptable

## Rollback Plan (If Issues Occur)

### Emergency: Disable RLS Temporarily
```sql
-- Only if critical issues
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE invite_uses DISABLE ROW LEVEL SECURITY;
```
- [ ] Understand when to use (EMERGENCY ONLY)
- [ ] Know how to re-enable (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)

### Proper Rollback: Restore Backup
```bash
# Restore from backup
psql $DATABASE_URL < backup_before_rls_fix.sql

# Or via Supabase CLI
supabase db reset --db-url $DATABASE_URL
```
- [ ] Backup file accessible
- [ ] Restore procedure tested

## Monitoring (First 24 Hours)

### Check Every Hour
- [ ] Error logs for RLS issues
- [ ] Signup success rate
- [ ] Response times
- [ ] User reports

### Metrics to Monitor
```sql
-- Signup attempts in last hour
SELECT COUNT(*) FROM profiles
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Failed signups (check app logs)
-- Invite code usage
SELECT COUNT(*) FROM invite_uses
WHERE used_at > NOW() - INTERVAL '1 hour';
```

## Success Criteria

### Must Have (Critical)
- [ ] No infinite recursion errors
- [ ] Signup with invite code works
- [ ] Profile operations work
- [ ] Admin operations work
- [ ] All tests pass

### Should Have (Important)
- [ ] Response times < 1s
- [ ] No user complaints
- [ ] Clean error logs
- [ ] Performance metrics stable

### Nice to Have (Bonus)
- [ ] Improved response times vs before
- [ ] Reduced database load
- [ ] Better monitoring visibility

## Sign-Off

### Developer
- [ ] Code reviewed
- [ ] Tests written and passing
- [ ] Documentation complete
- [ ] Deployment tested locally

**Developer**: _________________ Date: _______

### DevOps/DBA
- [ ] Database backup created
- [ ] Migrations reviewed
- [ ] Rollback plan understood
- [ ] Monitoring configured

**DevOps**: _________________ Date: _______

### Product/QA
- [ ] User flows tested
- [ ] Admin flows tested
- [ ] Performance acceptable
- [ ] Ready for production

**QA**: _________________ Date: _______

## Post-Deployment Actions

### Immediate (Within 1 hour)
- [ ] Run test suite in production
- [ ] Test signup flow manually
- [ ] Check error logs
- [ ] Verify monitoring alerts working

### First Day
- [ ] Monitor error rates
- [ ] Check user feedback
- [ ] Verify all flows working
- [ ] Document any issues

### First Week
- [ ] Analyze performance metrics
- [ ] Review monitoring data
- [ ] Update documentation if needed
- [ ] Plan for any additional improvements

## Notes

### Common Issues and Quick Fixes

**Issue**: is_admin() function not found
**Fix**: Rerun `20251113_complete_rls_fix.sql`

**Issue**: Anonymous users can't validate invites
**Fix**: Check `invites_select_anon_policy` exists

**Issue**: Users can't insert profiles
**Fix**: Check `profiles_insert_policy` exists

**Issue**: Still seeing recursion
**Fix**: Check for old policies with `pg_policies` view, drop manually

### Contact Information

**Database Issues**: [Your DBA Email]
**Application Issues**: [Your Dev Email]
**Urgent Issues**: [Your On-Call]

### Related Documentation

- Full Technical Docs: `RLS_CIRCULAR_DEPENDENCY_FIX_SUMMARY.md`
- Quick Reference: `RLS_FIX_QUICK_REFERENCE.md`
- Change Summary: `RLS_FIX_CHANGES_SUMMARY.md`
- This Checklist: `RLS_FIX_DEPLOYMENT_CHECKLIST.md`

---

**Date**: 2025-11-13
**Version**: 1.0
**Status**: Ready for Deployment
