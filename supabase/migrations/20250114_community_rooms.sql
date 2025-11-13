/**
 * Community Rooms & Chat System
 *
 * Creates infrastructure for persistent community chat rooms
 * with threaded discussions, reactions, and topic voting
 */

-- ============================================================================
-- PART 1: Community Rooms
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Organization
  category TEXT NOT NULL CHECK (category IN (
    'general',
    'web-dev',
    'mobile-dev',
    'backend',
    'devops',
    'ai-ml',
    'data-science',
    'design',
    'game-dev',
    'blockchain',
    'security',
    'help',
    'announcements'
  )),

  -- Creator (admin only)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Visibility
  is_public BOOLEAN DEFAULT true NOT NULL,

  -- Stats
  member_count INTEGER DEFAULT 0 NOT NULL,
  message_count INTEGER DEFAULT 0 NOT NULL,

  -- Display
  icon_emoji TEXT DEFAULT '💬',
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMPTZ,

  -- Archive check
  CHECK (archived_at IS NULL OR archived_at > created_at)
);

-- Indexes
CREATE INDEX idx_community_rooms_category ON community_rooms(category);
CREATE INDEX idx_community_rooms_public ON community_rooms(is_public) WHERE is_public = true;
CREATE INDEX idx_community_rooms_archived ON community_rooms(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_community_rooms_tags ON community_rooms USING GIN(tags);

-- Comments
COMMENT ON TABLE community_rooms IS 'Admin-created persistent chat rooms organized by category';
COMMENT ON COLUMN community_rooms.slug IS 'URL-friendly identifier (e.g., "web-development")';
COMMENT ON COLUMN community_rooms.member_count IS 'Cached count of active members';
COMMENT ON COLUMN community_rooms.message_count IS 'Cached total message count';

-- ============================================================================
-- PART 2: Room Membership
-- ============================================================================

CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  room_id UUID REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Role
  role TEXT DEFAULT 'member' NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),

  -- Activity tracking
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_read_at TIMESTAMPTZ,

  -- Preferences
  is_muted BOOLEAN DEFAULT false NOT NULL,

  -- One membership per user per room
  UNIQUE(room_id, user_id)
);

-- Indexes
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_room_members_room ON room_members(room_id);
CREATE INDEX idx_room_members_role ON room_members(role) WHERE role IN ('admin', 'moderator');

COMMENT ON TABLE room_members IS 'User memberships in community rooms';
COMMENT ON COLUMN room_members.last_read_at IS 'Last time user read messages in this room';

-- ============================================================================
-- PART 3: Room Messages (Permanent, Threaded)
-- ============================================================================

CREATE TABLE IF NOT EXISTS room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  room_id UUID REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 5000),
  type TEXT DEFAULT 'text' NOT NULL CHECK (type IN ('text', 'system', 'announcement')),

  -- Threading
  parent_message_id UUID REFERENCES room_messages(id) ON DELETE CASCADE,

  -- Edit history
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_room_messages_room_time ON room_messages(room_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_room_messages_user ON room_messages(user_id);
CREATE INDEX idx_room_messages_parent ON room_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

COMMENT ON TABLE room_messages IS 'Permanent chat messages with threading support';
COMMENT ON COLUMN room_messages.parent_message_id IS 'If set, this is a threaded reply';
COMMENT ON COLUMN room_messages.deleted_at IS 'Soft delete - message hidden but not removed';

-- ============================================================================
-- PART 4: Message Reactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS room_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID REFERENCES room_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Reaction
  emoji TEXT NOT NULL CHECK (LENGTH(emoji) <= 10),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One emoji per user per message
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_room_message_reactions_message ON room_message_reactions(message_id);
CREATE INDEX idx_room_message_reactions_user ON room_message_reactions(user_id);

COMMENT ON TABLE room_message_reactions IS 'Emoji reactions on room messages';

-- ============================================================================
-- PART 5: Enable RLS
-- ============================================================================

ALTER TABLE community_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_message_reactions ENABLE ROW LEVEL SECURITY;

-- Community Rooms Policies
DROP POLICY IF EXISTS "Anyone can view public rooms" ON community_rooms;
CREATE POLICY "Anyone can view public rooms"
  ON community_rooms FOR SELECT
  USING (is_public = true AND archived_at IS NULL);

-- Room Members Policies
DROP POLICY IF EXISTS "Users can view room memberships" ON room_members;
CREATE POLICY "Users can view room memberships"
  ON room_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join rooms" ON room_members;
CREATE POLICY "Users can join rooms"
  ON room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave rooms" ON room_members;
CREATE POLICY "Users can leave rooms"
  ON room_members FOR DELETE
  USING (auth.uid() = user_id);

-- Room Messages Policies
DROP POLICY IF EXISTS "Members can view room messages" ON room_messages;
CREATE POLICY "Members can view room messages"
  ON room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_messages.room_id
        AND room_members.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Members can send messages" ON room_messages;
CREATE POLICY "Members can send messages"
  ON room_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_messages.room_id
        AND room_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can edit own messages" ON room_messages;
CREATE POLICY "Users can edit own messages"
  ON room_messages FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Message Reactions Policies
DROP POLICY IF EXISTS "Members can view reactions" ON room_message_reactions;
CREATE POLICY "Members can view reactions"
  ON room_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_messages rm
      JOIN room_members rmem ON rmem.room_id = rm.room_id
      WHERE rm.id = room_message_reactions.message_id
        AND rmem.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON room_message_reactions;
CREATE POLICY "Users can add reactions"
  ON room_message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own reactions" ON room_message_reactions;
CREATE POLICY "Users can remove own reactions"
  ON room_message_reactions FOR DELETE
  USING (auth.uid() = user_id);
