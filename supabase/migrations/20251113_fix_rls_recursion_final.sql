/**
 * Fix RLS Infinite Recursion - Final Solution
 *
 * Problem:
 * The is_admin() function queries the profiles table, which has an RLS policy
 * that calls is_admin(), creating infinite recursion.
 *
 * Solution:
 * Separate the profiles SELECT policy into TWO policies:
 * 1. Users can view their OWN profile (no admin check)
 * 2. Admins can view ALL profiles (separate policy)
 *
 * This way, when is_admin() queries profiles for auth.uid(), it only triggers
 * the first policy (no admin check), breaking the circular dependency.
 */

-- ============================================================================
-- STEP 1: Drop the circular policy
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- ============================================================================
-- STEP 2: Create TWO separate SELECT policies
-- ============================================================================

-- Policy 1: Users can view their own profile (no is_admin check)
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Admins can view all profiles (uses is_admin)
-- This policy won't cause recursion because when is_admin() runs,
-- it will match the first policy (profiles_select_own) since it's
-- querying WHERE id = auth.uid()
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin() = true);

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== RLS Recursion Fix Applied ===';
  RAISE NOTICE 'Created separate policies:';
  RAISE NOTICE '  - profiles_select_own: Users can view their own profile';
  RAISE NOTICE '  - profiles_select_admin: Admins can view all profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'This breaks the circular dependency by ensuring is_admin()';
  RAISE NOTICE 'only triggers the "own profile" policy, not the admin policy.';
END $$;
