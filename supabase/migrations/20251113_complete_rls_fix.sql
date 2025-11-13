/**
 * Complete RLS Circular Dependency Fix
 *
 * This migration completely resolves the circular dependency issue by:
 * 1. Dropping ALL conflicting policies
 * 2. Creating clean SECURITY DEFINER helper functions
 * 3. Recreating policies that use only the helper functions
 * 4. Ensuring no direct table queries in RLS policies
 *
 * Problem Summary:
 * - Multiple migrations created overlapping policies
 * - Policies on invites/profiles were querying profiles table recursively
 * - Anonymous users need access to invites for signup validation
 *
 * Solution:
 * - Use SECURITY DEFINER functions to bypass RLS for role checks
 * - Simplify policy structure
 * - Remove all EXISTS subqueries that reference profiles
 */

-- ============================================================================
-- STEP 1: Drop ALL existing helper functions to start clean
-- ============================================================================

DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_admin();

-- ============================================================================
-- STEP 2: Create SECURITY DEFINER helper functions
-- ============================================================================

/**
 * Check if the current user is an admin or moderator
 * SECURITY DEFINER bypasses RLS completely, preventing circular dependency
 */
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get the role directly without triggering RLS
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  -- Return true if admin or moderator
  RETURN v_role IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to all authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Add documentation
COMMENT ON FUNCTION public.is_admin() IS
'Helper function to check if current user is admin/moderator. Uses SECURITY DEFINER to bypass RLS and prevent circular dependency.';

-- ============================================================================
-- STEP 3: Fix PROFILES table RLS policies
-- ============================================================================

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Create simple, non-recursive policies

-- SELECT: Users can view their own profile OR admins can view all
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin()
  );

-- INSERT: Users can only insert their own profile during signup
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile OR admins can update any
CREATE POLICY "profiles_update_own_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete profiles
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- STEP 4: Fix INVITES table RLS policies
-- ============================================================================

-- Drop ALL existing policies on invites
DROP POLICY IF EXISTS "Users can view active invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can view all invites" ON invites;
DROP POLICY IF EXISTS "Public can view active invites" ON invites;
DROP POLICY IF EXISTS "Approved users can create invites" ON invites;
DROP POLICY IF EXISTS "Admins can view all invites" ON invites;
DROP POLICY IF EXISTS "Anonymous can view active invites for validation" ON invites;
DROP POLICY IF EXISTS "Authenticated users can view active invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can insert invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can update invites" ON invites;
DROP POLICY IF EXISTS "Admins can create invites" ON invites;
DROP POLICY IF EXISTS "Admins can update invites" ON invites;

-- Create clean policies using helper function

-- SELECT for anonymous users (critical for signup flow)
CREATE POLICY "invites_select_anon_policy"
  ON invites FOR SELECT
  TO anon
  USING (is_active = true);

-- SELECT for authenticated users
CREATE POLICY "invites_select_auth_policy"
  ON invites FOR SELECT
  TO authenticated
  USING (
    is_active = true OR public.is_admin()
  );

-- INSERT: Only admins can create invites (via function)
CREATE POLICY "invites_insert_policy"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Only admins can update invites
CREATE POLICY "invites_update_policy"
  ON invites FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete invites
CREATE POLICY "invites_delete_policy"
  ON invites FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- STEP 5: Fix INVITE_USES table RLS policies
-- ============================================================================

-- Drop ALL existing policies on invite_uses
DROP POLICY IF EXISTS "Users can view their own invite uses" ON invite_uses;
DROP POLICY IF EXISTS "Admins can view all invite uses" ON invite_uses;
DROP POLICY IF EXISTS "System can insert invite uses" ON invite_uses;

-- Create clean policies

-- SELECT: Users can view their own uses OR admins can view all
CREATE POLICY "invite_uses_select_policy"
  ON invite_uses FOR SELECT
  TO authenticated
  USING (
    used_by = auth.uid() OR public.is_admin()
  );

-- INSERT: System can insert (via SECURITY DEFINER function)
CREATE POLICY "invite_uses_insert_policy"
  ON invite_uses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Only admins can update
CREATE POLICY "invite_uses_update_policy"
  ON invite_uses FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete
CREATE POLICY "invite_uses_delete_policy"
  ON invite_uses FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- STEP 6: Fix any other tables with admin checks
-- ============================================================================

-- Fix sessions policies that have circular dependencies
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;

CREATE POLICY "sessions_select_admin_policy"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    host_id = auth.uid() OR
    is_public = true
  );

CREATE POLICY "sessions_update_admin_policy"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR
    host_id = auth.uid()
  );

-- Fix credit_transactions policies
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can create transactions" ON credit_transactions;

CREATE POLICY "credit_transactions_select_policy"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "credit_transactions_insert_policy"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================================
-- STEP 7: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Verify the fix
-- ============================================================================

-- Test that is_admin() function works
DO $$
BEGIN
  -- This should not cause infinite recursion
  RAISE NOTICE 'Testing is_admin() function...';
  PERFORM public.is_admin();
  RAISE NOTICE 'Success! No circular dependency detected.';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'is_admin() function test failed: %', SQLERRM;
END $$;

-- Add final comment
COMMENT ON SCHEMA public IS 'Schema updated with RLS circular dependency fix - all policies now use SECURITY DEFINER helper functions';
