/**
 * Invite Code System
 *
 * Platform-wide invite code system with:
 * - Invite code generation and management
 * - Individual usage tracking
 * - Referral rewards
 * - Analytics support
 */

-- ============================================================================
-- 1. Update invites table (table may already exist from previous work)
-- ============================================================================

-- Drop the old used_by column if it exists
ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_used_by_fkey;
ALTER TABLE invites DROP COLUMN IF EXISTS used_by;

-- Add new columns if they don't exist
ALTER TABLE invites
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update constraints
ALTER TABLE invites
DROP CONSTRAINT IF EXISTS invites_max_uses_check,
DROP CONSTRAINT IF EXISTS invites_current_uses_check,
DROP CONSTRAINT IF EXISTS valid_usage;

ALTER TABLE invites
ADD CONSTRAINT invites_max_uses_check CHECK (max_uses > 0),
ADD CONSTRAINT invites_current_uses_check CHECK (current_uses >= 0),
ADD CONSTRAINT valid_usage CHECK (current_uses <= max_uses);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON invites(created_by);
CREATE INDEX IF NOT EXISTS idx_invites_active ON invites(is_active, expires_at);

-- ============================================================================
-- 2. Create invite_uses table (individual tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invite_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID REFERENCES invites(id) ON DELETE CASCADE NOT NULL,
  used_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_invite_uses_invite_id ON invite_uses(invite_id);
CREATE INDEX idx_invite_uses_used_by ON invite_uses(used_by);
CREATE INDEX idx_invite_uses_used_at ON invite_uses(used_at DESC);

-- ============================================================================
-- 3. Update profiles table
-- ============================================================================

-- Add invite_code column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Add index for querying who used which code
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code)
  WHERE invite_code IS NOT NULL;

-- ============================================================================
-- 4. Function to generate unique invite code
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code: K + 4 random alphanumeric chars (e.g., KA1B2, K3X9Y)
    v_code := 'K' || upper(substring(md5(random()::text) from 1 for 4));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM invites WHERE code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Function to create invite code (with permissions check)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_invite_code(
  p_max_uses INTEGER DEFAULT 1,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_code TEXT;
  v_invite_id UUID;
BEGIN
  -- Get caller
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check if user is admin or moderator
  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;

  IF v_user_role NOT IN ('admin', 'moderator') THEN
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

-- ============================================================================
-- 6. Function to validate and use invite code
-- ============================================================================

CREATE OR REPLACE FUNCTION use_invite_code(
  p_code TEXT,
  p_user_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_use_id UUID;
BEGIN
  -- Get invite details
  SELECT * INTO v_invite
  FROM invites
  WHERE code = p_code AND is_active = true
  FOR UPDATE; -- Lock row during validation

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

  -- Record the use
  INSERT INTO invite_uses (invite_id, used_by, metadata)
  VALUES (v_invite.id, p_user_id, p_metadata)
  RETURNING id INTO v_use_id;

  -- Update usage count
  UPDATE invites
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = v_invite.id;

  -- Update user profile with invite code
  UPDATE profiles
  SET invite_code = p_code
  WHERE id = p_user_id;

  -- Award referral credits to code creator if applicable
  IF v_invite.created_by IS NOT NULL THEN
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
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite.id,
    'use_id', v_use_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Function to get invite analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_invite_analytics(p_invite_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_uses JSONB;
BEGIN
  -- Get invite details
  SELECT * INTO v_invite FROM invites WHERE id = p_invite_id;

  IF v_invite IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get usage details
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', iu.used_by,
      'username', p.username,
      'display_name', p.display_name,
      'used_at', iu.used_at
    ) ORDER BY iu.used_at DESC
  ) INTO v_uses
  FROM invite_uses iu
  JOIN profiles p ON p.id = iu.used_by
  WHERE iu.invite_id = p_invite_id;

  RETURN jsonb_build_object(
    'invite_id', v_invite.id,
    'code', v_invite.code,
    'created_by', v_invite.created_by,
    'max_uses', v_invite.max_uses,
    'current_uses', v_invite.current_uses,
    'is_active', v_invite.is_active,
    'expires_at', v_invite.expires_at,
    'created_at', v_invite.created_at,
    'uses', COALESCE(v_uses, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- 8. RLS Policies
-- ============================================================================

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_uses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view active invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can view all invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can insert invites" ON invites;
DROP POLICY IF EXISTS "Admins and moderators can update invites" ON invites;
DROP POLICY IF EXISTS "Users can view their own invite uses" ON invite_uses;
DROP POLICY IF EXISTS "Admins can view all invite uses" ON invite_uses;
DROP POLICY IF EXISTS "System can insert invite uses" ON invite_uses;

-- Users can view active invites (for validation during signup)
CREATE POLICY "Users can view active invites"
  ON invites FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins and moderators can view all invites
CREATE POLICY "Admins and moderators can view all invites"
  ON invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Admins and moderators can insert invites (via function)
CREATE POLICY "Admins and moderators can insert invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Admins and moderators can update invites
CREATE POLICY "Admins and moderators can update invites"
  ON invites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Users can view their own invite uses
CREATE POLICY "Users can view their own invite uses"
  ON invite_uses FOR SELECT
  TO authenticated
  USING (used_by = auth.uid());

-- Admins can view all invite uses
CREATE POLICY "Admins can view all invite uses"
  ON invite_uses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- System can insert invite uses (via function)
CREATE POLICY "System can insert invite uses"
  ON invite_uses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 9. Add referral_bonus to credit transaction types
-- ============================================================================

-- Update the credit_transactions type constraint to include referral_bonus
ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_type_check CHECK (type IN (
    'earned_watching',
    'earned_hosting',
    'earned_chatting',
    'earned_helping',
    'bonus_milestone',
    'bonus_completion',
    'bonus_first_session',
    'spent_feature',
    'spent_tipping',
    'spent_priority_join',
    'spent_recording',
    'admin_adjustment',
    'referral_bonus',
    'received_tip'
  ));

-- ============================================================================
-- 10. Create view for invite statistics
-- ============================================================================

CREATE OR REPLACE VIEW invite_stats AS
SELECT
  i.id as invite_id,
  i.code,
  i.created_by,
  cp.username as creator_username,
  cp.display_name as creator_display_name,
  i.max_uses,
  i.current_uses,
  i.is_active,
  i.expires_at,
  i.created_at,
  COUNT(iu.id) as total_uses,
  jsonb_agg(
    CASE
      WHEN iu.id IS NOT NULL THEN
        jsonb_build_object(
          'user_id', iu.used_by,
          'username', up.username,
          'display_name', up.display_name,
          'used_at', iu.used_at
        )
      ELSE NULL
    END
    ORDER BY iu.used_at DESC
  ) FILTER (WHERE iu.id IS NOT NULL) as uses
FROM invites i
LEFT JOIN profiles cp ON cp.id = i.created_by
LEFT JOIN invite_uses iu ON iu.invite_id = i.id
LEFT JOIN profiles up ON up.id = iu.used_by
GROUP BY i.id, i.code, i.created_by, cp.username, cp.display_name,
         i.max_uses, i.current_uses, i.is_active, i.expires_at, i.created_at;

-- ============================================================================
-- 11. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE invites IS 'Platform invite codes with usage limits and expiration';
COMMENT ON TABLE invite_uses IS 'Individual tracking of each invite code usage';
COMMENT ON FUNCTION create_invite_code IS 'Creates new invite code (admin/moderator only)';
COMMENT ON FUNCTION use_invite_code IS 'Validates and records invite code usage';
COMMENT ON VIEW invite_stats IS 'Analytics view for invite code performance';
