/**
 * Update Matchmaking Logic for Presenter-Only Limits
 *
 * Updates the matchmaking system to:
 * - Count only presenters (not all participants) against limits
 * - Update constraint check to use max_presenters
 * - Update find_joinable_matchmaking_sessions function
 */

-- Update the check constraint to use max_presenters instead of max_participants
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_min_participants_check;

ALTER TABLE sessions
ADD CONSTRAINT sessions_min_participants_check
CHECK (min_participants >= 2 AND min_participants <= max_presenters);

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS find_joinable_matchmaking_sessions(UUID, INTEGER);

-- Update the find_joinable_matchmaking_sessions function to count only presenters
CREATE OR REPLACE FUNCTION find_joinable_matchmaking_sessions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  session_id UUID,
  room_code TEXT,
  title TEXT,
  description TEXT,
  host_id UUID,
  host_name TEXT,
  participant_count BIGINT,
  max_presenters INTEGER,
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
      s.max_presenters,
      s.tags,
      h.display_name AS host_name,
      -- Count only presenters and hosts (not viewers)
      COUNT(sp.id) FILTER (WHERE sp.role IN ('host', 'presenter')) AS presenter_count
    FROM sessions s
    JOIN profiles h ON h.id = s.host_id
    LEFT JOIN session_participants sp ON sp.session_id = s.id
    WHERE s.status = 'live'
      AND s.is_public = true
      AND s.is_matchmaking_session = true
    GROUP BY s.id, s.room_code, s.title, s.description, s.host_id, s.max_presenters, s.tags, h.display_name
    -- Only include sessions that have room for more presenters
    HAVING COUNT(sp.id) FILTER (WHERE sp.role IN ('host', 'presenter')) < s.max_presenters
  )
  SELECT
    os.id,
    os.room_code,
    os.title,
    os.description,
    os.host_id,
    os.host_name,
    os.presenter_count,
    os.max_presenters,
    os.tags,
    -- Match score based on shared tags
    LEAST(1.0, CAST(
      COALESCE(
        array_length(
          ARRAY(
            SELECT UNNEST(os.tags)
            INTERSECT
            SELECT UNNEST(up.skills || up.interests)
          ),
          1
        ) * 0.2,
        0
      ) AS DECIMAL(3,2)
    )) AS match_score
  FROM open_sessions os, user_profile up
  WHERE os.host_id != p_user_id
  ORDER BY match_score DESC, os.presenter_count ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_joinable_matchmaking_sessions IS
'Find joinable matchmaking sessions based on user skills/interests. Only counts presenters against max_presenters limit, viewers are unlimited.';
