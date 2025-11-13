/**
 * Community & Topics Database Functions
 *
 * Helper functions for room management, messaging, and topic voting
 */

-- ============================================================================
-- PART 1: Room Management Functions
-- ============================================================================

/**
 * Join a community room
 * Creates membership and updates member count
 */
CREATE OR REPLACE FUNCTION join_community_room(
  p_room_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Insert membership (no-op if already exists)
  INSERT INTO room_members (room_id, user_id)
  VALUES (p_room_id, p_user_id)
  ON CONFLICT (room_id, user_id) DO NOTHING;

  -- Update member count
  UPDATE community_rooms
  SET member_count = (
    SELECT COUNT(*) FROM room_members WHERE room_id = p_room_id
  )
  WHERE id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Leave a community room
 * Removes membership and updates count
 */
CREATE OR REPLACE FUNCTION leave_community_room(
  p_room_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  DELETE FROM room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;

  -- Update member count
  UPDATE community_rooms
  SET member_count = (
    SELECT COUNT(*) FROM room_members WHERE room_id = p_room_id
  )
  WHERE id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Get rooms for user with membership status
 */
CREATE OR REPLACE FUNCTION get_user_rooms(
  p_user_id UUID
) RETURNS TABLE (
  room_id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  icon_emoji TEXT,
  member_count INTEGER,
  message_count INTEGER,
  is_member BOOLEAN,
  last_read_at TIMESTAMPTZ,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.slug,
    cr.name,
    cr.description,
    cr.category,
    cr.icon_emoji,
    cr.member_count,
    cr.message_count,
    EXISTS(
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = cr.id AND rm.user_id = p_user_id
    ) AS is_member,
    rm.last_read_at,
    COALESCE((
      SELECT COUNT(*)
      FROM room_messages rmsg
      WHERE rmsg.room_id = cr.id
        AND rmsg.deleted_at IS NULL
        AND (rm.last_read_at IS NULL OR rmsg.created_at > rm.last_read_at)
    ), 0) AS unread_count
  FROM community_rooms cr
  LEFT JOIN room_members rm ON rm.room_id = cr.id AND rm.user_id = p_user_id
  WHERE cr.is_public = true
    AND cr.archived_at IS NULL
  ORDER BY cr.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- PART 2: Messaging Functions
-- ============================================================================

/**
 * Get messages with reactions
 */
CREATE OR REPLACE FUNCTION get_room_messages(
  p_room_id UUID,
  p_limit INT DEFAULT 50,
  p_before_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
  message_id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  content TEXT,
  type TEXT,
  parent_message_id UUID,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  reactions JSONB,
  reply_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rm.id,
    rm.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    rm.content,
    rm.type,
    rm.parent_message_id,
    rm.edited_at,
    rm.created_at,
    -- Aggregate reactions
    COALESCE(
      jsonb_object_agg(
        rmr.emoji,
        jsonb_build_object(
          'count', rmr.count,
          'user_reacted', rmr.user_reacted
        )
      ) FILTER (WHERE rmr.emoji IS NOT NULL),
      '{}'::jsonb
    ) AS reactions,
    -- Count replies
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM room_messages replies
      WHERE replies.parent_message_id = rm.id
        AND replies.deleted_at IS NULL
    ), 0) AS reply_count
  FROM room_messages rm
  LEFT JOIN profiles p ON p.id = rm.user_id
  LEFT JOIN LATERAL (
    SELECT
      rmr.emoji,
      COUNT(*)::INTEGER AS count,
      bool_or(rmr.user_id = auth.uid()) AS user_reacted
    FROM room_message_reactions rmr
    WHERE rmr.message_id = rm.id
    GROUP BY rmr.emoji
  ) rmr ON true
  WHERE rm.room_id = p_room_id
    AND rm.deleted_at IS NULL
    AND rm.parent_message_id IS NULL  -- Only top-level messages
    AND (p_before_time IS NULL OR rm.created_at < p_before_time)
  GROUP BY rm.id, p.id
  ORDER BY rm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

/**
 * Get thread (parent + replies)
 */
CREATE OR REPLACE FUNCTION get_message_thread(
  p_parent_message_id UUID
) RETURNS TABLE (
  message_id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  content TEXT,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_parent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  -- Parent message
  SELECT
    rm.id,
    rm.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    rm.content,
    rm.edited_at,
    rm.created_at,
    true AS is_parent
  FROM room_messages rm
  LEFT JOIN profiles p ON p.id = rm.user_id
  WHERE rm.id = p_parent_message_id
    AND rm.deleted_at IS NULL

  UNION ALL

  -- Replies
  SELECT
    rm.id,
    rm.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    rm.content,
    rm.edited_at,
    rm.created_at,
    false AS is_parent
  FROM room_messages rm
  LEFT JOIN profiles p ON p.id = rm.user_id
  WHERE rm.parent_message_id = p_parent_message_id
    AND rm.deleted_at IS NULL
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

/**
 * Update room message count when message created
 */
CREATE OR REPLACE FUNCTION increment_room_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_rooms
  SET message_count = message_count + 1
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_message_count ON room_messages;
CREATE TRIGGER trigger_increment_message_count
  AFTER INSERT ON room_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_room_message_count();

-- ============================================================================
-- PART 3: Topic Voting Functions
-- ============================================================================

/**
 * Toggle vote on topic (add if not exists, remove if exists)
 */
CREATE OR REPLACE FUNCTION toggle_topic_vote(
  p_topic_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  upvoted BOOLEAN,
  new_count INTEGER
) AS $$
DECLARE
  v_exists BOOLEAN;
  v_count INTEGER;
BEGIN
  -- Check if vote exists
  SELECT EXISTS(
    SELECT 1 FROM topic_votes
    WHERE topic_id = p_topic_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove vote
    DELETE FROM topic_votes
    WHERE topic_id = p_topic_id AND user_id = p_user_id;
  ELSE
    -- Add vote
    INSERT INTO topic_votes (topic_id, user_id)
    VALUES (p_topic_id, p_user_id);
  END IF;

  -- Calculate new count
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM topic_votes
  WHERE topic_id = p_topic_id;

  -- Update topic
  UPDATE discussion_topics
  SET
    upvote_count = v_count,
    updated_at = NOW()
  WHERE id = p_topic_id;

  RETURN QUERY SELECT NOT v_exists, v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Get popular topics for a room
 */
CREATE OR REPLACE FUNCTION get_popular_topics(
  p_room_id UUID,
  p_status TEXT DEFAULT 'proposed',
  p_limit INT DEFAULT 20
) RETURNS TABLE (
  topic_id UUID,
  title TEXT,
  description TEXT,
  tags TEXT[],
  upvote_count INTEGER,
  comment_count INTEGER,
  status TEXT,
  created_by UUID,
  creator_name TEXT,
  creator_avatar TEXT,
  user_voted BOOLEAN,
  covered_in_session_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.tags,
    t.upvote_count,
    t.comment_count,
    t.status,
    t.created_by,
    p.display_name,
    p.avatar_url,
    EXISTS(
      SELECT 1 FROM topic_votes tv
      WHERE tv.topic_id = t.id AND tv.user_id = auth.uid()
    ) AS user_voted,
    t.covered_in_session_id,
    t.created_at
  FROM discussion_topics t
  LEFT JOIN profiles p ON p.id = t.created_by
  WHERE t.room_id = p_room_id
    AND (p_status IS NULL OR t.status = p_status)
  ORDER BY
    t.priority DESC,
    t.upvote_count DESC,
    t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

/**
 * Get topics with engagement (users who voted/commented)
 * Used for notifications when topic becomes a stream
 */
CREATE OR REPLACE FUNCTION get_topic_engaged_users(
  p_topic_id UUID
) RETURNS TABLE (
  user_id UUID,
  engagement_type TEXT  -- 'creator', 'voter', 'commenter'
) AS $$
BEGIN
  RETURN QUERY
  -- Topic creator
  SELECT
    dt.created_by,
    'creator'::TEXT
  FROM discussion_topics dt
  WHERE dt.id = p_topic_id

  UNION

  -- Voters
  SELECT
    tv.user_id,
    'voter'::TEXT
  FROM topic_votes tv
  WHERE tv.topic_id = p_topic_id

  UNION

  -- Commenters
  SELECT
    tc.user_id,
    'commenter'::TEXT
  FROM topic_comments tc
  WHERE tc.topic_id = p_topic_id
    AND tc.user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

/**
 * Mark topic as covered in a stream
 */
CREATE OR REPLACE FUNCTION mark_topic_covered(
  p_topic_id UUID,
  p_session_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE discussion_topics
  SET
    status = 'completed',
    covered_in_session_id = p_session_id,
    covered_at = NOW(),
    updated_at = NOW()
  WHERE id = p_topic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Update comment count when comment added
 */
CREATE OR REPLACE FUNCTION increment_topic_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussion_topics
  SET comment_count = comment_count + 1
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_comment_count ON topic_comments;
CREATE TRIGGER trigger_increment_comment_count
  AFTER INSERT ON topic_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_topic_comment_count();
