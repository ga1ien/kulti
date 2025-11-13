/**
 * Message Features Migration
 *
 * Adds support for:
 * - Message upvoting
 * - Message pinning (host only)
 * - Message threading/replies
 */

-- Add message features to messages table
ALTER TABLE messages
  ADD COLUMN is_pinned BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN pinned_at TIMESTAMPTZ,
  ADD COLUMN pinned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Add comments
COMMENT ON COLUMN messages.is_pinned IS 'Whether message is pinned by host';
COMMENT ON COLUMN messages.pinned_at IS 'When message was pinned';
COMMENT ON COLUMN messages.pinned_by IS 'User ID of host who pinned (should always be host)';
COMMENT ON COLUMN messages.parent_message_id IS 'Parent message ID for threaded replies';

-- Message upvotes table
CREATE TABLE message_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- One upvote per user per message
  UNIQUE(message_id, user_id)
);

COMMENT ON TABLE message_upvotes IS 'Tracks user upvotes on messages';

-- Indexes for performance
CREATE INDEX idx_messages_pinned ON messages(session_id, is_pinned, pinned_at DESC);
CREATE INDEX idx_messages_threads ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_message_upvotes_message ON message_upvotes(message_id);
CREATE INDEX idx_message_upvotes_user ON message_upvotes(user_id);

-- Function to get messages with vote counts and user's upvote status
CREATE OR REPLACE FUNCTION get_messages_with_votes(
  p_session_id UUID,
  p_user_id UUID,
  p_filter TEXT DEFAULT 'all', -- 'all', 'pinned', 'top'
  p_limit INT DEFAULT 100
) RETURNS TABLE (
  id UUID,
  session_id UUID,
  user_id UUID,
  content TEXT,
  type TEXT,
  created_at TIMESTAMPTZ,
  is_pinned BOOLEAN,
  pinned_at TIMESTAMPTZ,
  parent_message_id UUID,
  upvote_count BIGINT,
  user_upvoted BOOLEAN,
  reply_count BIGINT,
  username TEXT,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH message_stats AS (
    SELECT
      m.id,
      m.session_id,
      m.user_id,
      m.content,
      m.type,
      m.created_at,
      m.is_pinned,
      m.pinned_at,
      m.parent_message_id,
      COUNT(DISTINCT mu.id) AS upvote_count,
      EXISTS(
        SELECT 1 FROM message_upvotes
        WHERE message_id = m.id AND user_id = p_user_id
      ) AS user_upvoted,
      COUNT(DISTINCT r.id) AS reply_count,
      p.username,
      p.display_name
    FROM messages m
    LEFT JOIN message_upvotes mu ON mu.message_id = m.id
    LEFT JOIN messages r ON r.parent_message_id = m.id
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.session_id = p_session_id
      AND m.parent_message_id IS NULL -- Only top-level messages
      AND m.type != 'system' -- Exclude system messages from filtering
    GROUP BY m.id, p.username, p.display_name
  )
  SELECT
    ms.id,
    ms.session_id,
    ms.user_id,
    ms.content,
    ms.type,
    ms.created_at,
    ms.is_pinned,
    ms.pinned_at,
    ms.parent_message_id,
    ms.upvote_count,
    ms.user_upvoted,
    ms.reply_count,
    ms.username,
    ms.display_name
  FROM message_stats ms
  WHERE
    (p_filter = 'all') OR
    (p_filter = 'pinned' AND ms.is_pinned = true) OR
    (p_filter = 'top' AND ms.upvote_count > 0)
  ORDER BY
    -- Pinned messages first if showing all
    CASE WHEN p_filter = 'all' AND ms.is_pinned THEN 0 ELSE 1 END,
    -- Then sort by filter type
    CASE
      WHEN p_filter = 'pinned' THEN ms.pinned_at
      WHEN p_filter = 'top' THEN NULL
      ELSE ms.created_at
    END DESC NULLS LAST,
    CASE WHEN p_filter = 'top' THEN ms.upvote_count ELSE 0 END DESC,
    ms.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to toggle message upvote
CREATE OR REPLACE FUNCTION toggle_message_upvote(
  p_message_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  upvoted BOOLEAN,
  new_count BIGINT
) AS $$
DECLARE
  v_exists BOOLEAN;
  v_count BIGINT;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM message_upvotes
    WHERE message_id = p_message_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove upvote
    DELETE FROM message_upvotes
    WHERE message_id = p_message_id AND user_id = p_user_id;
  ELSE
    -- Add upvote (will fail if message doesn't exist due to FK)
    INSERT INTO message_upvotes (message_id, user_id)
    VALUES (p_message_id, p_user_id);
  END IF;

  -- Get new count
  SELECT COUNT(*) INTO v_count
  FROM message_upvotes
  WHERE message_id = p_message_id;

  RETURN QUERY SELECT NOT v_exists AS upvoted, v_count AS new_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to pin/unpin message (host only)
CREATE OR REPLACE FUNCTION toggle_message_pin(
  p_message_id UUID,
  p_session_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  pinned BOOLEAN,
  pinned_at TIMESTAMPTZ
) AS $$
DECLARE
  v_host_id UUID;
  v_is_pinned BOOLEAN;
  v_pinned_at TIMESTAMPTZ;
BEGIN
  -- Get session host
  SELECT host_id INTO v_host_id
  FROM sessions
  WHERE id = p_session_id;

  -- Verify caller is the host
  IF v_host_id != p_user_id THEN
    RAISE EXCEPTION 'Only host can pin messages';
  END IF;

  -- Get current pin status
  SELECT is_pinned INTO v_is_pinned
  FROM messages
  WHERE id = p_message_id AND session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Toggle pin status
  IF v_is_pinned THEN
    -- Unpin
    UPDATE messages
    SET
      is_pinned = false,
      pinned_at = NULL,
      pinned_by = NULL
    WHERE id = p_message_id;

    RETURN QUERY SELECT false AS pinned, NULL::TIMESTAMPTZ AS pinned_at;
  ELSE
    -- Pin
    v_pinned_at := NOW();
    UPDATE messages
    SET
      is_pinned = true,
      pinned_at = v_pinned_at,
      pinned_by = p_user_id
    WHERE id = p_message_id;

    RETURN QUERY SELECT true AS pinned, v_pinned_at AS pinned_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message thread (parent + replies)
CREATE OR REPLACE FUNCTION get_message_thread(
  p_message_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  session_id UUID,
  user_id UUID,
  content TEXT,
  type TEXT,
  created_at TIMESTAMPTZ,
  parent_message_id UUID,
  upvote_count BIGINT,
  user_upvoted BOOLEAN,
  username TEXT,
  display_name TEXT,
  is_parent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH thread_messages AS (
    -- Get parent message
    SELECT m.id AS msg_id, true AS is_parent_msg
    FROM messages m
    WHERE m.id = p_message_id

    UNION ALL

    -- Get all replies
    SELECT m.id AS msg_id, false AS is_parent_msg
    FROM messages m
    WHERE m.parent_message_id = p_message_id
  )
  SELECT
    m.id,
    m.session_id,
    m.user_id,
    m.content,
    m.type,
    m.created_at,
    m.parent_message_id,
    COUNT(DISTINCT mu.id) AS upvote_count,
    EXISTS(
      SELECT 1 FROM message_upvotes
      WHERE message_id = m.id AND user_id = p_user_id
    ) AS user_upvoted,
    p.username,
    p.display_name,
    tm.is_parent_msg AS is_parent
  FROM thread_messages tm
  JOIN messages m ON m.id = tm.msg_id
  LEFT JOIN message_upvotes mu ON mu.message_id = m.id
  LEFT JOIN profiles p ON p.id = m.user_id
  GROUP BY m.id, p.username, p.display_name, tm.is_parent_msg
  ORDER BY tm.is_parent_msg DESC, m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to create reply to message
CREATE OR REPLACE FUNCTION create_message_reply(
  p_parent_message_id UUID,
  p_session_id UUID,
  p_user_id UUID,
  p_content TEXT
) RETURNS UUID AS $$
DECLARE
  v_reply_id UUID;
  v_parent_session UUID;
BEGIN
  -- Validate parent message exists and is in the same session
  SELECT session_id INTO v_parent_session
  FROM messages
  WHERE id = p_parent_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent message not found';
  END IF;

  IF v_parent_session != p_session_id THEN
    RAISE EXCEPTION 'Parent message not in this session';
  END IF;

  -- Create reply
  INSERT INTO messages (
    session_id,
    user_id,
    content,
    type,
    parent_message_id
  ) VALUES (
    p_session_id,
    p_user_id,
    p_content,
    'text',
    p_parent_message_id
  ) RETURNING id INTO v_reply_id;

  RETURN v_reply_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Add RLS policies for message_upvotes
ALTER TABLE message_upvotes ENABLE ROW LEVEL SECURITY;

-- Users can view all upvotes
CREATE POLICY "Users can view upvotes"
  ON message_upvotes FOR SELECT
  USING (true);

-- Users can insert their own upvotes
CREATE POLICY "Users can add own upvotes"
  ON message_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own upvotes
CREATE POLICY "Users can remove own upvotes"
  ON message_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policy for guest_presenters (from previous migration)
ALTER TABLE guest_presenters ENABLE ROW LEVEL SECURITY;

-- Anyone can view guest presenters
CREATE POLICY "Anyone can view guest presenters"
  ON guest_presenters FOR SELECT
  USING (true);
