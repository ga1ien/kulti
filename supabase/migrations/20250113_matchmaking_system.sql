/**
 * Matchmaking System Migration
 *
 * Adds intelligent session matching based on:
 * - User skills and interests
 * - Experience level
 * - Online presence
 * - Session preferences
 */

-- ============================================================================
-- PART 1: Profile Enhancement for Matchmaking
-- ============================================================================

-- Add matchmaking fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'intermediate'
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS matchmaking_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN profiles.skills IS 'Array of technical skills (e.g., ["React", "Python"])';
COMMENT ON COLUMN profiles.interests IS 'Array of interests/topics (e.g., ["Web Dev", "AI/ML"])';
COMMENT ON COLUMN profiles.experience_level IS 'Overall experience level for matching';
COMMENT ON COLUMN profiles.matchmaking_enabled IS 'Whether user wants automatic session suggestions';
COMMENT ON COLUMN profiles.profile_completed IS 'Whether user finished profile setup';

-- ============================================================================
-- PART 2: Session Enhancement for Matchmaking
-- ============================================================================

-- Add matchmaking fields to sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS session_intent TEXT DEFAULT 'open'
    CHECK (session_intent IN ('learn', 'teach', 'collaborate', 'open')),
  ADD COLUMN IF NOT EXISTS is_matchmaking_session BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT 2
    CHECK (min_participants >= 2 AND min_participants <= max_participants);

COMMENT ON COLUMN sessions.category IS 'Session category (e.g., "Web Development", "Data Science")';
COMMENT ON COLUMN sessions.tags IS 'Skills/topics covered in session';
COMMENT ON COLUMN sessions.session_intent IS 'Purpose: learning, teaching, collaboration, or open';
COMMENT ON COLUMN sessions.is_matchmaking_session IS 'Created via matchmaking system';
COMMENT ON COLUMN sessions.min_participants IS 'Minimum participants before starting';

-- ============================================================================
-- PART 3: User Presence Tracking
-- ============================================================================

-- Track online users for real-time matching
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  current_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  available_for_matching BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE user_presence IS 'Tracks user online status for real-time matchmaking';
COMMENT ON COLUMN user_presence.available_for_matching IS 'User is online and available (not in session)';

-- Index for finding available users
CREATE INDEX IF NOT EXISTS idx_user_presence_available ON user_presence(is_online, available_for_matching)
  WHERE is_online = true AND available_for_matching = true;

-- Function to update presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_id UUID,
  p_is_online BOOLEAN,
  p_session_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, current_session_id, available_for_matching, updated_at)
  VALUES (
    p_user_id,
    p_is_online,
    p_session_id,
    p_is_online AND p_session_id IS NULL,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_online = EXCLUDED.is_online,
    current_session_id = EXCLUDED.current_session_id,
    available_for_matching = EXCLUDED.available_for_matching,
    updated_at = NOW(),
    last_seen = CASE WHEN EXCLUDED.is_online THEN NOW() ELSE user_presence.last_seen END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Matchmaking Suggestions
-- ============================================================================

-- Store AI-generated session suggestions
CREATE TABLE IF NOT EXISTS matchmaking_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  suggested_users UUID[] NOT NULL,
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  match_reasons JSONB DEFAULT '{}',
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'viewed', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes') NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE matchmaking_suggestions IS 'AI-generated session suggestions for users';
COMMENT ON COLUMN matchmaking_suggestions.suggested_users IS 'Array of compatible user IDs to session with';
COMMENT ON COLUMN matchmaking_suggestions.match_reasons IS 'Why these users were matched (shared skills, etc)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matchmaking_suggestions_user ON matchmaking_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_suggestions_expires ON matchmaking_suggestions(expires_at)
  WHERE status = 'pending';

-- ============================================================================
-- PART 5: Matchmaking Algorithm
-- ============================================================================

-- Find compatible online users for matchmaking
CREATE OR REPLACE FUNCTION get_compatible_users(
  p_user_id UUID,
  p_limit INT DEFAULT 10
) RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  skills TEXT[],
  interests TEXT[],
  experience_level TEXT,
  match_score DECIMAL(3,2),
  shared_skills TEXT[],
  shared_interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT p.skills, p.interests, p.experience_level
    FROM profiles p
    WHERE p.id = p_user_id
  ),
  available_users AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.skills,
      p.interests,
      p.experience_level
    FROM profiles p
    JOIN user_presence up ON up.user_id = p.id
    WHERE up.is_online = true
      AND up.available_for_matching = true
      AND p.id != p_user_id
      AND p.matchmaking_enabled = true
  ),
  scored_users AS (
    SELECT
      au.id,
      au.username,
      au.display_name,
      au.avatar_url,
      au.skills,
      au.interests,
      au.experience_level,
      -- Calculate shared skills
      ARRAY(SELECT unnest(au.skills) INTERSECT SELECT unnest(up.skills)) AS shared_skills_array,
      -- Calculate shared interests
      ARRAY(SELECT unnest(au.interests) INTERSECT SELECT unnest(up.interests)) AS shared_interests_array
    FROM available_users au, user_profile up
  )
  SELECT
    su.id,
    su.username,
    su.display_name,
    su.avatar_url,
    su.skills,
    su.interests,
    su.experience_level,
    -- Calculate match score (0.0 to 1.0)
    LEAST(1.0, CAST(
      (
        COALESCE(array_length(su.shared_skills_array, 1), 0) * 0.15 +
        COALESCE(array_length(su.shared_interests_array, 1), 0) * 0.10
      ) AS DECIMAL(3,2)
    )) AS match_score,
    su.shared_skills_array,
    su.shared_interests_array
  FROM scored_users su
  WHERE array_length(su.shared_skills_array, 1) > 0
     OR array_length(su.shared_interests_array, 1) > 0
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create matchmaking suggestion for user
CREATE OR REPLACE FUNCTION create_matchmaking_suggestion(
  p_user_id UUID,
  p_min_matches INT DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  v_suggestion_id UUID;
  v_compatible_users UUID[];
  v_match_score DECIMAL(3,2);
  v_match_reasons JSONB;
BEGIN
  -- Get compatible users
  SELECT
    array_agg(user_id ORDER BY match_score DESC),
    AVG(match_score),
    jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'shared_skills', shared_skills,
      'shared_interests', shared_interests
    ))
  INTO v_compatible_users, v_match_score, v_match_reasons
  FROM get_compatible_users(p_user_id, 5);

  -- Check if we have enough matches
  IF v_compatible_users IS NULL OR array_length(v_compatible_users, 1) < p_min_matches THEN
    RETURN NULL;
  END IF;

  -- Check if recent suggestion already exists
  IF EXISTS(
    SELECT 1 FROM matchmaking_suggestions
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND expires_at > NOW()
  ) THEN
    RETURN NULL;
  END IF;

  -- Create suggestion
  INSERT INTO matchmaking_suggestions (
    user_id,
    suggested_users,
    match_score,
    match_reasons
  ) VALUES (
    p_user_id,
    v_compatible_users,
    v_match_score,
    v_match_reasons
  ) RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- PART 6: Session Matching Functions
-- ============================================================================

-- Find existing matchmaking sessions user can join
CREATE OR REPLACE FUNCTION find_joinable_matchmaking_sessions(
  p_user_id UUID,
  p_limit INT DEFAULT 5
) RETURNS TABLE (
  session_id UUID,
  room_code TEXT,
  title TEXT,
  description TEXT,
  host_id UUID,
  host_name TEXT,
  participant_count BIGINT,
  max_participants INTEGER,
  tags TEXT[],
  match_score DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT skills, interests FROM profiles WHERE id = p_user_id
  ),
  open_sessions AS (
    SELECT
      s.id,
      s.room_code,
      s.title,
      s.description,
      s.host_id,
      s.max_participants,
      s.tags,
      h.display_name AS host_name,
      COUNT(sp.id) AS participant_count
    FROM sessions s
    JOIN profiles h ON h.id = s.host_id
    LEFT JOIN session_participants sp ON sp.session_id = s.id
    WHERE s.status = 'live'
      AND s.is_public = true
      AND s.is_matchmaking_session = true
      AND COUNT(sp.id) < s.max_participants
    GROUP BY s.id, s.room_code, s.title, s.description, s.host_id, s.max_participants, s.tags, h.display_name
  )
  SELECT
    os.id,
    os.room_code,
    os.title,
    os.description,
    os.host_id,
    os.host_name,
    os.participant_count,
    os.max_participants,
    os.tags,
    -- Match score based on shared tags
    LEAST(1.0, CAST(
      COALESCE(
        array_length(ARRAY(SELECT unnest(os.tags) INTERSECT SELECT unnest(up.skills)), 1),
        0
      ) * 0.2 AS DECIMAL(3,2)
    )) AS match_score
  FROM open_sessions os, user_profile up
  ORDER BY match_score DESC, os.participant_count ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- PART 7: Cleanup & Maintenance
-- ============================================================================

-- Function to expire old suggestions
CREATE OR REPLACE FUNCTION expire_matchmaking_suggestions()
RETURNS INT AS $$
DECLARE
  v_expired_count INT;
BEGIN
  UPDATE matchmaking_suggestions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up stale presence data
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS INT AS $$
DECLARE
  v_cleaned_count INT;
BEGIN
  UPDATE user_presence
  SET
    is_online = false,
    available_for_matching = false
  WHERE is_online = true
    AND updated_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can view online users (for matchmaking)
DROP POLICY IF EXISTS "Users can view presence" ON user_presence;
CREATE POLICY "Users can view presence"
  ON user_presence FOR SELECT
  USING (true);

-- Users can update their own presence
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
CREATE POLICY "Users can update own presence"
  ON user_presence FOR ALL
  USING (auth.uid() = user_id);

-- Users can view their own suggestions
DROP POLICY IF EXISTS "Users can view own suggestions" ON matchmaking_suggestions;
CREATE POLICY "Users can view own suggestions"
  ON matchmaking_suggestions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own suggestion status
DROP POLICY IF EXISTS "Users can update own suggestions" ON matchmaking_suggestions;
CREATE POLICY "Users can update own suggestions"
  ON matchmaking_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 9: App Configuration
-- ============================================================================

-- Create app config table for feature flags
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert matchmaking configuration
INSERT INTO app_config (key, value, description) VALUES
  ('matchmaking_enabled', 'true', 'Enable/disable matchmaking system'),
  ('matchmaking_credits_enabled', 'false', 'Charge credits for matchmaking features'),
  ('matchmaking_costs', '{
    "instant_match": 50,
    "priority_match": 100,
    "filter_search": 20,
    "create_matched_session": 0,
    "join_matched_session": 0
  }', 'Credit costs for matchmaking features')
ON CONFLICT (key) DO NOTHING;