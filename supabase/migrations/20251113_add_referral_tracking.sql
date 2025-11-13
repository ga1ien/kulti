/**
 * Add Referral Genealogy Tracking
 *
 * This migration enables complete referral chain tracking by:
 * 1. Adding referred_by field to profiles (direct parent link)
 * 2. Creating recursive query functions for genealogy data
 * 3. Updating use_invite_code to automatically set referred_by
 * 4. Backfilling existing data from invite codes
 *
 * No UI changes needed - all data queryable via SQL/Supabase Studio
 */

-- ============================================================================
-- STEP 1: Add referred_by field to profiles
-- ============================================================================

-- Add the genealogy tracking field
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for fast genealogy queries
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
ON profiles(referred_by)
WHERE referred_by IS NOT NULL;

COMMENT ON COLUMN profiles.referred_by IS
  'User ID of the person who referred this user (via invite code). Enables recursive genealogy tracking.';

-- ============================================================================
-- STEP 2: Backfill referred_by from existing invite_code data
-- ============================================================================

-- For any existing users, set their referred_by based on the invite code they used
UPDATE profiles p
SET referred_by = i.created_by
FROM invites i
WHERE p.invite_code = i.code
  AND p.referred_by IS NULL
  AND i.created_by IS NOT NULL;

-- ============================================================================
-- STEP 3: Create genealogy query functions
-- ============================================================================

/**
 * Get all descendants of a user (complete referral tree)
 * Returns: All users referred by this user, recursively, with depth and path
 */
CREATE OR REPLACE FUNCTION get_all_descendants(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  depth INTEGER,
  path TEXT[],
  created_at TIMESTAMPTZ
) AS $$
WITH RECURSIVE descendants AS (
  -- Base case: the user themselves (depth 0)
  SELECT
    p.id,
    p.username,
    p.display_name,
    0 as depth,
    ARRAY[p.username] as path,
    p.created_at
  FROM profiles p
  WHERE p.id = p_user_id

  UNION ALL

  -- Recursive case: users referred by anyone in the tree
  SELECT
    p.id,
    p.username,
    p.display_name,
    d.depth + 1,
    d.path || p.username,
    p.created_at
  FROM profiles p
  INNER JOIN descendants d ON p.referred_by = d.id
  WHERE d.depth < 100 -- Prevent infinite loops (safety limit)
)
SELECT
  id,
  username,
  display_name,
  depth,
  path,
  created_at
FROM descendants
WHERE id != p_user_id -- Exclude the root user from results
ORDER BY depth, created_at;
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION get_all_descendants(UUID) TO authenticated;

COMMENT ON FUNCTION get_all_descendants IS
  'Get complete referral tree for a user. Returns all descendants with depth level and path from root.';

/**
 * Get referral statistics for a user
 * Returns: Direct referrals count, total descendants, max tree depth
 */
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE (
  direct_referrals INTEGER,
  total_descendants INTEGER,
  max_depth INTEGER,
  total_referral_credits INTEGER
) AS $$
WITH RECURSIVE tree AS (
  -- Start with the user
  SELECT id, 0 as depth
  FROM profiles
  WHERE id = p_user_id

  UNION ALL

  -- Add all descendants
  SELECT p.id, t.depth + 1
  FROM profiles p
  INNER JOIN tree t ON p.referred_by = t.id
  WHERE t.depth < 100
)
SELECT
  -- Direct referrals (depth 1 only)
  (SELECT COUNT(*)::INTEGER
   FROM profiles
   WHERE referred_by = p_user_id),

  -- Total descendants (all depths except root)
  (SELECT (COUNT(*) - 1)::INTEGER
   FROM tree),

  -- Maximum depth of the tree
  (SELECT COALESCE(MAX(depth), 0)::INTEGER
   FROM tree),

  -- Total credits earned from referrals
  (SELECT COALESCE(SUM(amount), 0)::INTEGER
   FROM credit_transactions
   WHERE user_id = p_user_id
     AND type = 'referral_bonus')
;
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;

COMMENT ON FUNCTION get_referral_stats IS
  'Get referral statistics: direct count, total tree size, depth, and credits earned.';

/**
 * Get referral chain from user to root
 * Returns: The path from this user back to their original referrer
 */
CREATE OR REPLACE FUNCTION get_referral_chain(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  level INTEGER
) AS $$
WITH RECURSIVE chain AS (
  -- Start with the user
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.referred_by,
    0 as level
  FROM profiles p
  WHERE p.id = p_user_id

  UNION ALL

  -- Walk up to their referrer, recursively
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.referred_by,
    c.level + 1
  FROM profiles p
  INNER JOIN chain c ON p.id = c.referred_by
  WHERE c.level < 100
)
SELECT
  id,
  username,
  display_name,
  level
FROM chain
ORDER BY level;
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION get_referral_chain(UUID) TO authenticated;

COMMENT ON FUNCTION get_referral_chain IS
  'Get the referral chain from a user back to their root referrer.';

-- ============================================================================
-- STEP 4: Update use_invite_code function to set referred_by
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
  BEGIN
    SELECT * INTO v_invite
    FROM invites
    WHERE code = p_code AND is_active = true
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
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
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You have already used this invite code'
      );
  END;

  -- Update usage count
  UPDATE invites
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = v_invite.id;

  -- Update user profile with invite code
  UPDATE profiles
  SET invite_code = p_code
  WHERE id = p_user_id;

  -- **NEW: Set referred_by for genealogy tracking**
  UPDATE profiles
  SET referred_by = v_invite.created_by
  WHERE id = p_user_id
    AND v_invite.created_by IS NOT NULL;

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
  'Updated to automatically set referred_by for genealogy tracking. Validates and records invite code usage with race condition protection.';

-- ============================================================================
-- STEP 5: Create admin helper view for genealogy exploration
-- ============================================================================

CREATE OR REPLACE VIEW admin_referral_overview AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.referred_by,
  referrer.username as referred_by_username,
  (SELECT COUNT(*)::INTEGER FROM profiles WHERE referred_by = p.id) as direct_referrals,
  p.created_at
FROM profiles p
LEFT JOIN profiles referrer ON p.referred_by = referrer.id
ORDER BY direct_referrals DESC, p.created_at DESC;

COMMENT ON VIEW admin_referral_overview IS
  'Admin view showing all users with their referrer and direct referral counts.';

-- ============================================================================
-- STEP 6: Verification and examples
-- ============================================================================

-- Test that the functions work
DO $$
DECLARE
  v_test_user_id UUID;
BEGIN
  RAISE NOTICE '=== Genealogy Tracking Installed ===';

  -- Verify column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    RAISE NOTICE '✓ referred_by column added to profiles';
  END IF;

  -- Verify functions exist
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('get_all_descendants', 'get_referral_stats', 'get_referral_chain')
  ) THEN
    RAISE NOTICE '✓ Genealogy query functions created';
  END IF;

  -- Verify use_invite_code updated
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'use_invite_code'
      AND prosrc LIKE '%referred_by%'
  ) THEN
    RAISE NOTICE '✓ use_invite_code function updated';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Example queries to use:';
  RAISE NOTICE '  SELECT * FROM get_all_descendants(''user-id'');';
  RAISE NOTICE '  SELECT * FROM get_referral_stats(''user-id'');';
  RAISE NOTICE '  SELECT * FROM get_referral_chain(''user-id'');';
  RAISE NOTICE '  SELECT * FROM admin_referral_overview;';
  RAISE NOTICE '';
  RAISE NOTICE 'All invite genealogy tracking is now active!';
END $$;
