-- Migration: AI Module Permissions and Controls
-- Created: 2025-01-12
-- Adds host-controlled AI module with granular access permissions

-- ============================================================================
-- ADD AI MODULE CONTROL COLUMNS TO SESSIONS
-- ============================================================================

ALTER TABLE sessions
  ADD COLUMN ai_module_enabled BOOLEAN DEFAULT true,
  ADD COLUMN ai_access_mode TEXT DEFAULT 'presenters'
    CHECK (ai_access_mode IN ('host_only', 'presenters', 'manual')),
  ADD COLUMN ai_allowed_users UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN ai_module_updated_by UUID REFERENCES profiles(id),
  ADD COLUMN ai_module_updated_at TIMESTAMPTZ;

-- Create index for ai_allowed_users array queries
CREATE INDEX idx_sessions_ai_allowed ON sessions USING GIN (ai_allowed_users);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user can chat with AI in a session
CREATE OR REPLACE FUNCTION can_user_chat_with_ai(
  p_session_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_session RECORD;
  v_participant RECORD;
BEGIN
  -- Get session AI settings
  SELECT
    ai_module_enabled,
    ai_access_mode,
    ai_allowed_users,
    host_id
  INTO v_session
  FROM sessions
  WHERE id = p_session_id;

  -- If AI module is disabled, nobody can chat
  IF NOT v_session.ai_module_enabled THEN
    RETURN FALSE;
  END IF;

  -- Host always has access if module is enabled
  IF v_session.host_id = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Get participant role
  SELECT role INTO v_participant
  FROM session_participants
  WHERE session_id = p_session_id
    AND user_id = p_user_id;

  -- If not a participant, no access
  IF v_participant IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Viewers never have chat access
  IF v_participant.role = 'viewer' THEN
    RETURN FALSE;
  END IF;

  -- Check based on access mode
  CASE v_session.ai_access_mode
    WHEN 'host_only' THEN
      RETURN FALSE; -- Already checked host above

    WHEN 'presenters' THEN
      -- Presenters (and host already returned true) have access
      RETURN v_participant.role = 'presenter';

    WHEN 'manual' THEN
      -- Check if user is in allowed list
      RETURN p_user_id = ANY(v_session.ai_allowed_users);

    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update AI module settings (host only)
CREATE OR REPLACE FUNCTION update_ai_module_settings(
  p_session_id UUID,
  p_user_id UUID,
  p_enabled BOOLEAN,
  p_access_mode TEXT DEFAULT NULL,
  p_allowed_users UUID[] DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Get session and verify user is host
  SELECT host_id INTO v_session
  FROM sessions
  WHERE id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  IF v_session.host_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only the host can update AI module settings'
    );
  END IF;

  -- Update settings
  UPDATE sessions
  SET
    ai_module_enabled = p_enabled,
    ai_access_mode = COALESCE(p_access_mode, ai_access_mode),
    ai_allowed_users = COALESCE(p_allowed_users, ai_allowed_users),
    ai_module_updated_by = p_user_id,
    ai_module_updated_at = NOW()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'ai_module_enabled', p_enabled,
    'ai_access_mode', COALESCE(p_access_mode, (SELECT ai_access_mode FROM sessions WHERE id = p_session_id)),
    'updated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN sessions.ai_module_enabled IS 'Whether AI chat module is enabled for this session';
COMMENT ON COLUMN sessions.ai_access_mode IS 'Who can chat with AI: host_only, presenters, or manual';
COMMENT ON COLUMN sessions.ai_allowed_users IS 'Array of user IDs allowed to chat (when access_mode is manual)';
COMMENT ON FUNCTION can_user_chat_with_ai IS 'Check if user has permission to chat with AI in session';
COMMENT ON FUNCTION update_ai_module_settings IS 'Update AI module settings (host only)';
