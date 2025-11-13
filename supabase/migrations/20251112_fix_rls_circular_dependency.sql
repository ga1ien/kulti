/**
 * Fix RLS Circular Dependency for Production
 *
 * Problem: RLS policies on profiles and invites tables were querying the profiles
 * table to check admin roles, creating infinite recursion when the profiles policy
 * itself needed to check admin status.
 *
 * Solution: Use SECURITY DEFINER helper functions to bypass RLS when checking roles.
 * These functions execute with elevated privileges and don't trigger RLS policies.
 */

-- ============================================================================
-- STEP 1: Create Helper Functions with SECURITY DEFINER
-- ============================================================================

/**
 * Check if a user is an admin or moderator
 * SECURITY DEFINER bypasses RLS, preventing circular dependency
 */
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;

-- ============================================================================
-- STEP 2: Fix Profiles Table RLS Policies
-- ============================================================================

-- Drop all existing problematic policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Allow users to view their own profile OR admins to view all profiles
-- Uses helper function to avoid circular dependency
CREATE POLICY "Users can view own profile and admins can view all"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR is_admin()
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow admins to update any profile
-- Uses helper function to avoid circular dependency
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow new users to insert their profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 3: Fix Invites Table RLS Policies
-- ============================================================================

-- Drop all existing policies on invites
DROP POLICY IF EXISTS "Users can view active invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can view all invites" ON invites;
DROP POLICY IF EXISTS "Public can view active invites" ON invites;
DROP POLICY IF EXISTS "Approved users can create invites" ON invites;
DROP POLICY IF EXISTS "Admins can view all invites" ON invites;
DROP POLICY IF EXISTS "Anonymous can view active invites for validation" ON invites;
DROP POLICY IF EXISTS "Authenticated users can view active invites" ON invites;

-- Allow ANONYMOUS users to view active invites for validation during signup
-- This is critical for signup flow - anonymous users need to validate invite codes
CREATE POLICY "Anonymous users can view active invites"
  ON invites FOR SELECT
  TO anon
  USING (is_active = true);

-- Allow authenticated users to view active invites
CREATE POLICY "Authenticated users can view active invites"
  ON invites FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins and moderators can view ALL invites (including inactive)
-- Uses helper function to avoid circular dependency
CREATE POLICY "Admins can view all invites"
  ON invites FOR SELECT
  TO authenticated
  USING (is_admin());

-- Only admins and moderators can create invite codes
-- Uses helper function to avoid circular dependency
CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only admins and moderators can update invites
CREATE POLICY "Admins can update invites"
  ON invites FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- STEP 4: Re-enable RLS on Both Tables
-- ============================================================================

-- Re-enable RLS (it was disabled as temporary workaround)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Verify Setup
-- ============================================================================

-- Add comment documenting the fix
COMMENT ON FUNCTION is_admin(UUID) IS 'Helper function to check admin/moderator role. Uses SECURITY DEFINER to bypass RLS and prevent circular dependency.';
