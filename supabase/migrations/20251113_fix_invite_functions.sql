/**
 * Fix Invite Code Functions to Avoid RLS Issues
 *
 * Updates create_invite_code function to use the is_admin() helper
 * instead of directly querying profiles table.
 */

-- ============================================================================
-- Update create_invite_code to use is_admin() helper
-- ============================================================================

CREATE OR REPLACE FUNCTION create_invite_code(
  p_max_uses INTEGER DEFAULT 1,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_code TEXT;
  v_invite_id UUID;
BEGIN
  -- Get caller
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check if user is admin or moderator using helper function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins and moderators can create invite codes';
  END IF;

  -- Generate unique code
  v_code := generate_invite_code();

  -- Create invite
  INSERT INTO invites (code, created_by, max_uses, expires_at, metadata)
  VALUES (v_code, v_user_id, p_max_uses, p_expires_at, p_metadata)
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite_id,
    'code', v_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_invite_code IS 'Creates new invite code (admin/moderator only). Uses is_admin() helper to avoid RLS circular dependency.';

-- ============================================================================
-- Verify all invite-related functions have SECURITY DEFINER
-- ============================================================================

-- These functions already have SECURITY DEFINER, just adding comments for clarity
COMMENT ON FUNCTION use_invite_code IS 'Validates and records invite code usage. Uses SECURITY DEFINER to bypass RLS for invite operations.';
COMMENT ON FUNCTION create_initial_user_invite_codes IS 'Generates 5 initial invite codes for new users. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION generate_invite_code IS 'Generates a unique invite code with format K + 4 alphanumeric characters.';
