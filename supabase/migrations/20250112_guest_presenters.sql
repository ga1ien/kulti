/**
 * Guest Presenters Migration
 *
 * Adds support for guest presenters who can join sessions without accounts.
 * - Presenter invite tokens per session
 * - Guest presenter tracking
 * - Token revocation support
 */

-- Add presenter invite token to sessions
ALTER TABLE sessions
  ADD COLUMN presenter_invite_token TEXT UNIQUE,
  ADD COLUMN presenter_invite_revoked BOOLEAN DEFAULT false;

-- Track guest presenters (temporary users without accounts)
CREATE TABLE guest_presenters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  hms_peer_id TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  left_at TIMESTAMPTZ,
  -- Ensure unique display names per session
  UNIQUE(session_id, display_name)
);

-- Add helpful comment
COMMENT ON TABLE guest_presenters IS 'Tracks guest presenters who join without authentication';
COMMENT ON COLUMN guest_presenters.display_name IS 'User-provided name when joining as guest';
COMMENT ON COLUMN guest_presenters.is_active IS 'Whether guest is currently in session';

-- Indexes for performance
CREATE INDEX idx_guest_presenters_session ON guest_presenters(session_id);
CREATE INDEX idx_guest_presenters_active ON guest_presenters(session_id, is_active);
CREATE INDEX idx_sessions_presenter_token ON sessions(presenter_invite_token)
  WHERE presenter_invite_token IS NOT NULL AND presenter_invite_revoked = false;

-- Function to generate presenter invite token
CREATE OR REPLACE FUNCTION generate_presenter_invite_token(
  p_session_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_host_id UUID;
  v_caller_id UUID;
BEGIN
  -- Get session host and verify caller is authenticated
  SELECT host_id INTO v_host_id
  FROM sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Get current user ID from auth context
  v_caller_id := auth.uid();

  -- Verify caller is the host
  IF v_host_id != v_caller_id THEN
    RAISE EXCEPTION 'Only host can generate presenter invite';
  END IF;

  -- Generate unique token (URL-safe)
  v_token := encode(gen_random_bytes(24), 'base64');
  v_token := replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');

  -- Update session with new token and mark as not revoked
  UPDATE sessions
  SET
    presenter_invite_token = v_token,
    presenter_invite_revoked = false
  WHERE id = p_session_id;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke presenter invite token
CREATE OR REPLACE FUNCTION revoke_presenter_invite_token(
  p_session_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_host_id UUID;
  v_caller_id UUID;
BEGIN
  -- Get session host
  SELECT host_id INTO v_host_id
  FROM sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Get current user ID
  v_caller_id := auth.uid();

  -- Verify caller is the host
  IF v_host_id != v_caller_id THEN
    RAISE EXCEPTION 'Only host can revoke presenter invite';
  END IF;

  -- Mark token as revoked
  UPDATE sessions
  SET presenter_invite_revoked = true
  WHERE id = p_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and get session from presenter token
CREATE OR REPLACE FUNCTION get_session_by_presenter_token(
  p_token TEXT
) RETURNS TABLE (
  session_id UUID,
  room_code TEXT,
  title TEXT,
  host_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS session_id,
    s.room_code,
    s.title,
    s.host_id
  FROM sessions s
  WHERE s.presenter_invite_token = p_token
    AND s.presenter_invite_revoked = false
    AND s.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to add guest presenter
CREATE OR REPLACE FUNCTION add_guest_presenter(
  p_session_id UUID,
  p_display_name TEXT,
  p_hms_peer_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  -- Validate display name
  IF p_display_name IS NULL OR trim(p_display_name) = '' THEN
    RAISE EXCEPTION 'Display name is required';
  END IF;

  -- Check if display name already in use for this session
  IF EXISTS(
    SELECT 1 FROM guest_presenters
    WHERE session_id = p_session_id
      AND display_name = p_display_name
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Display name already in use';
  END IF;

  -- Insert guest presenter
  INSERT INTO guest_presenters (
    session_id,
    display_name,
    hms_peer_id,
    is_active
  ) VALUES (
    p_session_id,
    trim(p_display_name),
    p_hms_peer_id,
    true
  ) RETURNING id INTO v_guest_id;

  RETURN v_guest_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to mark guest presenter as left
CREATE OR REPLACE FUNCTION mark_guest_presenter_left(
  p_guest_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE guest_presenters
  SET
    is_active = false,
    left_at = NOW()
  WHERE id = p_guest_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to get active guest presenters for a session
CREATE OR REPLACE FUNCTION get_active_guest_presenters(
  p_session_id UUID
) RETURNS TABLE (
  id UUID,
  display_name TEXT,
  joined_at TIMESTAMPTZ,
  hms_peer_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id,
    gp.display_name,
    gp.joined_at,
    gp.hms_peer_id
  FROM guest_presenters gp
  WHERE gp.session_id = p_session_id
    AND gp.is_active = true
  ORDER BY gp.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
