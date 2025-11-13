/**
 * Fix Invite Code Validation RLS
 *
 * Problem: Users trying to validate invite codes during signup are anonymous
 * (not authenticated), but the RLS policies only allow authenticated users.
 * This causes validation to fail and creates circular dependency errors.
 *
 * Solution: Allow anonymous (public) users to SELECT active invites for validation.
 */

-- Drop the existing policies that cause issues
DROP POLICY IF EXISTS "Users can view active invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can view all invites" ON invites;
DROP POLICY IF EXISTS "Public can view active invites" ON invites;

-- Allow ANONYMOUS users to view active invites for validation during signup
-- This is safe because we only expose active invites and no sensitive data
CREATE POLICY "Anonymous can view active invites for validation"
  ON invites FOR SELECT
  TO anon
  USING (is_active = true);

-- Allow authenticated users to view active invites
CREATE POLICY "Authenticated users can view active invites"
  ON invites FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins and moderators can view ALL invites (including inactive)
-- Use a simpler check to avoid circular dependency with profiles table
CREATE POLICY "Admins can view all invites"
  ON invites FOR SELECT
  TO authenticated
  USING (
    -- Direct role check without EXISTS to avoid circular dependency
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'moderator')
  );
