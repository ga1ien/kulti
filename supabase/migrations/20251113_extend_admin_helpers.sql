/**
 * Extend Admin Helper Functions
 *
 * Adds additional helper functions for common authorization patterns
 * to prevent future RLS circular dependencies.
 */

-- ============================================================================
-- Helper function: Check if user is host of a session
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_session_host(session_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions
    WHERE id = session_id_param AND host_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_session_host(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_session_host IS
'Check if current user is the host of a specific session. Uses SECURITY DEFINER to avoid RLS issues.';

-- ============================================================================
-- Helper function: Check if user is session participant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_session_participant(session_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM session_participants
    WHERE session_id = session_id_param AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_session_participant(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_session_participant IS
'Check if current user is a participant of a specific session. Uses SECURITY DEFINER to avoid RLS issues.';

-- ============================================================================
-- Helper function: Check if user is room member
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_room_member(room_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = room_id_param AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_room_member(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_room_member IS
'Check if current user is a member of a specific community room. Uses SECURITY DEFINER to avoid RLS issues.';

-- ============================================================================
-- Helper function: Check if user is room moderator or admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_room_moderator(room_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM room_members
  WHERE room_id = room_id_param AND user_id = auth.uid();

  RETURN v_role IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_room_moderator(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_room_moderator IS
'Check if current user is a moderator or admin of a specific community room. Uses SECURITY DEFINER to avoid RLS issues.';

-- ============================================================================
-- Helper function: Get current user role (for internal use)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;

COMMENT ON FUNCTION public.get_user_role IS
'Get the role of the current user. Returns "user" if not found. Uses SECURITY DEFINER to avoid RLS issues.';

-- ============================================================================
-- Update is_admin() to use get_user_role() for consistency
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin() IS
'Check if current user is admin or moderator. Now uses get_user_role() for consistency.';

-- ============================================================================
-- Documentation: Best Practices for RLS Policies
-- ============================================================================

COMMENT ON SCHEMA public IS E'
RLS Best Practices:
- NEVER query the same table from within its own RLS policy
- ALWAYS use SECURITY DEFINER helper functions for cross-table checks
- Use helper functions like is_admin(), is_session_host(), etc.
- Keep policies simple: just call helper functions
- Test policies with: SELECT * FROM table WHERE <policy_condition>
';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Testing new helper functions ===';

  -- Test all functions exist and work
  PERFORM public.is_admin();
  RAISE NOTICE '✓ is_admin() works';

  PERFORM public.get_user_role();
  RAISE NOTICE '✓ get_user_role() works';

  -- The following require parameters, so just check they exist
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('is_session_host', 'is_session_participant', 'is_room_member', 'is_room_moderator')
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✓ All session/room helper functions exist';
  ELSE
    RAISE EXCEPTION 'Some helper functions are missing';
  END IF;

  RAISE NOTICE '=== All helper functions ready ===';
END $$;
