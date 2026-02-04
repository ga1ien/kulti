# RLS Circular Dependency Fix - Quick Reference

## 🚨 The Problem
```
Error: 'infinite recursion detected in policy for relation "profiles"'
```
Happened during invite code validation and profile operations.

## ✅ The Solution
Created `is_admin()` SECURITY DEFINER function that bypasses RLS to prevent circular dependencies.

## 🚀 Quick Apply

```bash
# Apply all fixes
supabase db reset

# Or push to remote
supabase db push
```

## 🧪 Quick Test

```sql
-- Should complete without error
SELECT public.is_admin();

-- Should return active invites (even as anonymous)
SELECT * FROM invites WHERE is_active = true;

-- Or run full test suite
\i supabase/migrations/20251113_test_rls_fix.sql
```

## 📝 What Changed

### New Files
1. `20251113_complete_rls_fix.sql` - Main fix (drops old policies, creates new ones)
2. `20251113_fix_invite_functions.sql` - Updates functions to use helper
3. `20251113_test_rls_fix.sql` - Test suite

### Key Changes
- ✅ All admin checks now use `is_admin()` helper function
- ✅ No direct `SELECT FROM profiles` in any RLS policy
- ✅ Anonymous users can view active invites (critical for signup)
- ✅ Clean separation of policies (one per operation)

## 🔍 How to Verify It Works

### Method 1: Check the function exists
```sql
\df public.is_admin
```
Should show: `public | is_admin | boolean | | func`

### Method 2: Test invite validation (as it would happen during signup)
```sql
-- Create test invite
INSERT INTO invites (code, max_uses, is_active)
VALUES ('TEST1', 1, true);

-- Try to query it (should work)
SELECT * FROM invites WHERE code = 'TEST1' AND is_active = true;

-- Cleanup
DELETE FROM invites WHERE code = 'TEST1';
```

### Method 3: Run the test suite
```bash
psql $DATABASE_URL < supabase/migrations/20251113_test_rls_fix.sql
```
Should see: `ALL TESTS PASSED!`

## ⚠️ If Something Goes Wrong

### Still seeing infinite recursion?
```sql
-- Drop all policies and reapply fix
\i supabase/migrations/20251113_complete_rls_fix.sql
```

### Can't find is_admin() function?
```sql
-- Create it manually
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
```

### Anonymous users can't see invites?
```sql
-- Add anon policy
CREATE POLICY "invites_select_anon_policy"
  ON invites FOR SELECT
  TO anon
  USING (is_active = true);
```

## 📊 Expected Behavior

### Before Fix
- ❌ Signup fails with "infinite recursion"
- ❌ Invite validation times out
- ❌ Profile upsert fails

### After Fix
- ✅ Signup completes in ~200ms
- ✅ Invite validation works instantly
- ✅ Profile operations work normally
- ✅ No error logs about recursion

## 🎯 Key Takeaway

**Never query the same table from within its own RLS policy.**

Instead:
1. Create a SECURITY DEFINER helper function
2. Use that function in policies
3. Helper bypasses RLS, preventing recursion

## 📚 Related Docs
- Full summary: `RLS_CIRCULAR_DEPENDENCY_FIX_SUMMARY.md`
- PostgreSQL SECURITY DEFINER: https://www.postgresql.org/docs/current/sql-createfunction.html
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

---

**Need Help?** Check the full summary document or run the test suite for detailed diagnostics.
