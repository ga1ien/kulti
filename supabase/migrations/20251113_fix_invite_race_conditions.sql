/**
 * Fix Race Conditions in Invite Code System
 *
 * This migration adds database-level constraints and improves the
 * use_invite_code function to prevent race conditions:
 *
 * 1. Unique constraint on (invite_id, used_by) - prevents double usage
 * 2. Improved transaction handling in use_invite_code function
 * 3. Better error messages for conflict scenarios
 */

-- ============================================================================
-- 1. Add Unique Constraint to Prevent Double Usage
-- ============================================================================

-- This constraint ensures a user cannot use the same invite code twice
-- even if multiple requests arrive simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_uses_unique_per_user
  ON invite_uses(invite_id, used_by);

COMMENT ON INDEX idx_invite_uses_unique_per_user IS
  'Prevents a user from using the same invite code multiple times (race condition protection)';

-- ============================================================================
-- 2. Improved use_invite_code Function with Race Condition Protection
-- ============================================================================

CREATE OR REPLACE FUNCTION use_invite_code(
  p_code TEXT,
  p_user_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_use_id UUID;
  v_already_used BOOLEAN;
BEGIN
  -- Check if user has already used this code
  -- This check happens before we lock the invite row
  SELECT EXISTS(
    SELECT 1 FROM invite_uses iu
    JOIN invites i ON i.id = iu.invite_id
    WHERE i.code = p_code AND iu.used_by = p_user_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already used this invite code'
    );
  END IF;

  -- Get invite details with row lock to prevent concurrent modifications
  -- FOR UPDATE NOWAIT will fail immediately if another transaction has the lock
  BEGIN
    SELECT * INTO v_invite
    FROM invites
    WHERE code = p_code AND is_active = true
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      -- Another transaction is processing this invite code right now
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This invite code is currently being processed. Please try again.'
      );
  END;

  -- Validation checks
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF v_invite.current_uses >= v_invite.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite code has been fully used');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite code has expired');
  END IF;

  -- Record the use (unique constraint prevents duplicates)
  BEGIN
    INSERT INTO invite_uses (invite_id, used_by, metadata)
    VALUES (v_invite.id, p_user_id, p_metadata)
    RETURNING id INTO v_use_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition caught by database constraint
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You have already used this invite code'
      );
  END;

  -- Update usage count (already protected by row lock)
  UPDATE invites
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = v_invite.id;

  -- Update user profile with invite code
  UPDATE profiles
  SET invite_code = p_code
  WHERE id = p_user_id;

  -- Award referral credits to code creator if applicable
  IF v_invite.created_by IS NOT NULL AND v_invite.created_by != p_user_id THEN
    BEGIN
      PERFORM add_credits(
        v_invite.created_by,
        50, -- 50 credits per referral
        'referral_bonus',
        NULL,
        jsonb_build_object(
          'referred_user_id', p_user_id,
          'invite_code', p_code
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the whole operation
        RAISE WARNING 'Failed to award referral credits: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite.id,
    'use_id', v_use_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION use_invite_code IS
  'Validates and records invite code usage with race condition protection using row locks and unique constraints';

-- ============================================================================
-- 3. Add Index for Performance
-- ============================================================================

-- This index helps with the "already used" check performance
CREATE INDEX IF NOT EXISTS idx_invite_uses_lookup
  ON invite_uses(used_by, invite_id);

COMMENT ON INDEX idx_invite_uses_lookup IS
  'Optimizes lookups to check if a user has already used a specific invite code';
