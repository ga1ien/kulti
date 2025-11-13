/**
 * Auto-Generate Initial Invite Codes for New Users
 *
 * Every new user gets 5 invite codes they can share with friends.
 * Each successful referral earns the user 50 credits.
 */

-- ============================================================================
-- Create function to generate initial invite codes for new users
-- ============================================================================

CREATE OR REPLACE FUNCTION create_initial_user_invite_codes(
  p_user_id UUID
) RETURNS TABLE (
  code TEXT,
  invite_id UUID
) AS $$
DECLARE
  v_existing_count INTEGER;
  v_new_code TEXT;
  v_new_invite_id UUID;
  i INTEGER;
BEGIN
  -- Check if user already has invite codes
  SELECT COUNT(*) INTO v_existing_count
  FROM invites
  WHERE created_by = p_user_id;

  -- Only create codes if user has 0 codes (prevents abuse)
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'User already has invite codes';
  END IF;

  -- Generate 5 invite codes
  FOR i IN 1..5 LOOP
    -- Generate unique code using the same logic as existing system
    v_new_code := generate_invite_code();

    -- Ensure uniqueness (very unlikely to collide, but check anyway)
    WHILE EXISTS (SELECT 1 FROM invites WHERE code = v_new_code) LOOP
      v_new_code := generate_invite_code();
    END LOOP;

    -- Insert the invite code
    INSERT INTO invites (
      code,
      created_by,
      max_uses,
      current_uses,
      is_active,
      metadata
    ) VALUES (
      v_new_code,
      p_user_id,
      1, -- Single use per code
      0,
      true,
      jsonb_build_object('auto_generated', true, 'initial_codes', true)
    )
    RETURNING id INTO v_new_invite_id;

    -- Return the code
    code := v_new_code;
    invite_id := v_new_invite_id;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_initial_user_invite_codes(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION create_initial_user_invite_codes IS
'Generates 5 initial invite codes for a new user. Can only be called once per user (when they have 0 codes).';

-- ============================================================================
-- Add index for better performance when checking user codes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invites_created_by
ON invites(created_by);
