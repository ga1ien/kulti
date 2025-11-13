/**
 * Discussion Topics & Voting System
 *
 * Allows users to propose topics for streams
 * with upvoting and "Stream This Topic" functionality
 */

-- ============================================================================
-- PART 1: Discussion Topics
-- ============================================================================

CREATE TABLE IF NOT EXISTS discussion_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  room_id UUID REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,

  -- Content
  title TEXT NOT NULL CHECK (LENGTH(title) >= 5 AND LENGTH(title) <= 200),
  description TEXT CHECK (description IS NULL OR LENGTH(description) <= 2000),
  tags TEXT[] DEFAULT '{}',

  -- Stats
  upvote_count INTEGER DEFAULT 0 NOT NULL,
  comment_count INTEGER DEFAULT 0 NOT NULL,

  -- Status workflow
  status TEXT DEFAULT 'proposed' NOT NULL CHECK (status IN (
    'proposed',   -- User proposed, waiting for votes
    'planned',    -- Host marked as planned for future stream
    'in-progress',-- Host is currently streaming this topic
    'completed',  -- Topic was covered in a stream
    'archived'    -- Topic archived/no longer relevant
  )),

  -- Priority (for host sorting)
  priority INTEGER DEFAULT 0 NOT NULL,

  -- Session linkage
  covered_in_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  covered_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_discussion_topics_room_votes ON discussion_topics(room_id, upvote_count DESC);
CREATE INDEX idx_discussion_topics_status ON discussion_topics(status);
CREATE INDEX idx_discussion_topics_session ON discussion_topics(covered_in_session_id);
CREATE INDEX idx_discussion_topics_creator ON discussion_topics(created_by);
CREATE INDEX idx_discussion_topics_tags ON discussion_topics USING GIN(tags);

COMMENT ON TABLE discussion_topics IS 'User-proposed topics for streams with voting';
COMMENT ON COLUMN discussion_topics.priority IS 'Higher number = more important (set by moderators)';
COMMENT ON COLUMN discussion_topics.covered_in_session_id IS 'Session where topic was streamed';

-- ============================================================================
-- PART 2: Topic Votes
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  topic_id UUID REFERENCES discussion_topics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Could add weight based on user reputation in future
  vote_weight INTEGER DEFAULT 1 NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One vote per user per topic
  UNIQUE(topic_id, user_id)
);

CREATE INDEX idx_topic_votes_topic ON topic_votes(topic_id);
CREATE INDEX idx_topic_votes_user ON topic_votes(user_id);

COMMENT ON TABLE topic_votes IS 'User votes on discussion topics';

-- ============================================================================
-- PART 3: Topic Comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  topic_id UUID REFERENCES discussion_topics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),

  -- Threading
  parent_comment_id UUID REFERENCES topic_comments(id) ON DELETE CASCADE,

  -- Edit tracking
  edited_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_topic_comments_topic_time ON topic_comments(topic_id, created_at ASC);
CREATE INDEX idx_topic_comments_parent ON topic_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

COMMENT ON TABLE topic_comments IS 'Comments on discussion topics with threading';

-- ============================================================================
-- PART 4: RLS Policies
-- ============================================================================

ALTER TABLE discussion_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_comments ENABLE ROW LEVEL SECURITY;

-- Topics Policies
DROP POLICY IF EXISTS "Members can view room topics" ON discussion_topics;
CREATE POLICY "Members can view room topics"
  ON discussion_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = discussion_topics.room_id
        AND room_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create topics" ON discussion_topics;
CREATE POLICY "Members can create topics"
  ON discussion_topics FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = discussion_topics.room_id
        AND room_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can edit own topics" ON discussion_topics;
CREATE POLICY "Users can edit own topics"
  ON discussion_topics FOR UPDATE
  USING (auth.uid() = created_by);

-- Votes Policies
DROP POLICY IF EXISTS "Users can view votes" ON topic_votes;
CREATE POLICY "Users can view votes"
  ON topic_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can vote" ON topic_votes;
CREATE POLICY "Users can vote"
  ON topic_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own votes" ON topic_votes;
CREATE POLICY "Users can remove own votes"
  ON topic_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Comments Policies
DROP POLICY IF EXISTS "Members can view comments" ON topic_comments;
CREATE POLICY "Members can view comments"
  ON topic_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM discussion_topics dt
      JOIN room_members rm ON rm.room_id = dt.room_id
      WHERE dt.id = topic_comments.topic_id
        AND rm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can comment" ON topic_comments;
CREATE POLICY "Members can comment"
  ON topic_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM discussion_topics dt
      JOIN room_members rm ON rm.room_id = dt.room_id
      WHERE dt.id = topic_comments.topic_id
        AND rm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can edit own comments" ON topic_comments;
CREATE POLICY "Users can edit own comments"
  ON topic_comments FOR UPDATE
  USING (auth.uid() = user_id);
