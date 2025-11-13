-- Migration: Badge Awarding and Streak Tracking Logic
-- Created: 2025-01-12

-- ============================================================================
-- BADGE AWARDING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_badge_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_badges JSONB;
  v_badge_exists BOOLEAN;
BEGIN
  -- Get current badges
  SELECT badges INTO v_badges
  FROM profiles
  WHERE id = p_user_id;

  -- Initialize if null
  IF v_badges IS NULL THEN
    v_badges := '[]'::jsonb;
  END IF;

  -- Check if badge already exists
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_badges) AS badge
    WHERE badge->>'badge_id' = p_badge_id
  ) INTO v_badge_exists;

  -- Only add if doesn't exist
  IF NOT v_badge_exists THEN
    v_badges := v_badges || jsonb_build_object(
      'badge_id', p_badge_id,
      'awarded_at', NOW()
    );

    -- Update profile
    UPDATE profiles
    SET badges = v_badges
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'badge_id', p_badge_id,
      'newly_awarded', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'badge_id', p_badge_id,
      'newly_awarded', false,
      'message', 'Badge already awarded'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHECK AND AWARD BADGES BASED ON STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_award_badges(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_stats RECORD;
  v_badges_awarded TEXT[] := ARRAY[]::TEXT[];
  v_result JSONB;
BEGIN
  -- Get profile stats
  SELECT
    p.total_credits_earned,
    COALESCE(s.sessions_attended, 0) as sessions_attended,
    COALESCE(s.sessions_hosted, 0) as sessions_hosted,
    COALESCE(s.total_hours_watched, 0) as total_hours_watched
  INTO v_stats
  FROM profiles p
  LEFT JOIN user_credit_stats s ON s.user_id = p.id
  WHERE p.id = p_user_id;

  -- Check for first session badge
  IF v_stats.sessions_attended >= 1 THEN
    SELECT award_badge(p_user_id, 'first_session') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'first_session');
    END IF;
  END IF;

  -- Check for session count badges
  IF v_stats.sessions_attended >= 10 THEN
    SELECT award_badge(p_user_id, 'sessions_10') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'sessions_10');
    END IF;
  END IF;

  IF v_stats.sessions_attended >= 50 THEN
    SELECT award_badge(p_user_id, 'sessions_50') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'sessions_50');
    END IF;
  END IF;

  IF v_stats.sessions_attended >= 100 THEN
    SELECT award_badge(p_user_id, 'sessions_100') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'sessions_100');
    END IF;
  END IF;

  -- Check for hosting badges
  IF v_stats.sessions_hosted >= 1 THEN
    SELECT award_badge(p_user_id, 'first_stream') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'first_stream');
    END IF;
  END IF;

  IF v_stats.sessions_hosted >= 10 THEN
    SELECT award_badge(p_user_id, 'hosted_10') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'hosted_10');
    END IF;
  END IF;

  IF v_stats.sessions_hosted >= 50 THEN
    SELECT award_badge(p_user_id, 'hosted_50') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'hosted_50');
    END IF;
  END IF;

  -- Check for watch time badges
  IF v_stats.total_hours_watched >= 100 THEN
    SELECT award_badge(p_user_id, 'hours_watched_100') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'hours_watched_100');
    END IF;
  END IF;

  -- Check for credits earned badges
  IF v_stats.total_credits_earned >= 10000 THEN
    SELECT award_badge(p_user_id, 'credits_earned_10k') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'credits_earned_10k');
    END IF;
  END IF;

  IF v_stats.total_credits_earned >= 100000 THEN
    SELECT award_badge(p_user_id, 'credits_earned_100k') INTO v_result;
    IF (v_result->>'newly_awarded')::boolean THEN
      v_badges_awarded := array_append(v_badges_awarded, 'credits_earned_100k');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'badges_awarded', v_badges_awarded,
    'count', array_length(v_badges_awarded, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STREAK TRACKING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_streak(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_last_active DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_new_streak INTEGER;
  v_streak_broken BOOLEAN := false;
  v_milestone_awarded BOOLEAN := false;
BEGIN
  -- Get current profile data
  SELECT
    last_active_date,
    current_streak,
    longest_streak
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  v_last_active := v_profile.last_active_date;
  v_current_streak := COALESCE(v_profile.current_streak, 0);
  v_longest_streak := COALESCE(v_profile.longest_streak, 0);

  -- Check streak status
  IF v_last_active IS NULL THEN
    -- First time active
    v_new_streak := 1;
  ELSIF v_last_active = CURRENT_DATE THEN
    -- Already active today, no change
    RETURN jsonb_build_object(
      'success', true,
      'current_streak', v_current_streak,
      'streak_continued', false,
      'message', 'Already active today'
    );
  ELSIF v_last_active = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Active yesterday, continue streak
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Streak broken
    v_new_streak := 1;
    v_streak_broken := true;
  END IF;

  -- Update longest streak if needed
  IF v_new_streak > v_longest_streak THEN
    v_longest_streak := v_new_streak;
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    last_active_date = CURRENT_DATE,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak
  WHERE id = p_user_id;

  -- Award streak milestones
  IF v_new_streak = 7 AND NOT v_streak_broken THEN
    -- 7 day streak milestone
    INSERT INTO credit_milestones (user_id, milestone_type, credits_awarded)
    VALUES (p_user_id, 'streak_7_days', 100)
    ON CONFLICT (user_id, milestone_type) DO NOTHING;

    PERFORM add_credits(
      p_user_id,
      100,
      'bonus_milestone',
      NULL,
      jsonb_build_object('milestone', 'streak_7_days', 'streak', v_new_streak)
    );
    v_milestone_awarded := true;
  ELSIF v_new_streak = 30 AND NOT v_streak_broken THEN
    -- 30 day streak milestone
    INSERT INTO credit_milestones (user_id, milestone_type, credits_awarded)
    VALUES (p_user_id, 'streak_30_days', 500)
    ON CONFLICT (user_id, milestone_type) DO NOTHING;

    PERFORM add_credits(
      p_user_id,
      500,
      'bonus_milestone',
      NULL,
      jsonb_build_object('milestone', 'streak_30_days', 'streak', v_new_streak)
    );
    v_milestone_awarded := true;
  ELSIF v_new_streak = 100 AND NOT v_streak_broken THEN
    -- 100 day streak milestone
    INSERT INTO credit_milestones (user_id, milestone_type, credits_awarded)
    VALUES (p_user_id, 'streak_100_days', 2000)
    ON CONFLICT (user_id, milestone_type) DO NOTHING;

    PERFORM add_credits(
      p_user_id,
      2000,
      'bonus_milestone',
      NULL,
      jsonb_build_object('milestone', 'streak_100_days', 'streak', v_new_streak)
    );
    v_milestone_awarded := true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'current_streak', v_new_streak,
    'longest_streak', v_longest_streak,
    'streak_broken', v_streak_broken,
    'streak_continued', NOT v_streak_broken AND v_new_streak > 1,
    'milestone_awarded', v_milestone_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMBINED SESSION START FUNCTION
-- ============================================================================
-- This function should be called when a user joins a session
-- It updates streak and awards badges in one transaction

CREATE OR REPLACE FUNCTION on_session_join(
  p_user_id UUID,
  p_session_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_streak_result JSONB;
  v_badge_result JSONB;
BEGIN
  -- Update streak
  SELECT update_streak(p_user_id) INTO v_streak_result;

  -- Check and award badges
  SELECT check_and_award_badges(p_user_id) INTO v_badge_result;

  RETURN jsonb_build_object(
    'success', true,
    'streak', v_streak_result,
    'badges', v_badge_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_badge IS 'Awards a specific badge to a user if not already awarded';
COMMENT ON FUNCTION check_and_award_badges IS 'Checks user stats and awards all applicable badges';
COMMENT ON FUNCTION update_streak IS 'Updates user daily streak and awards streak milestones';
COMMENT ON FUNCTION on_session_join IS 'Called when user joins a session - updates streak and badges';
