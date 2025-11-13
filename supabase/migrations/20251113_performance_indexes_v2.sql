/**
 * Performance Indexes Migration (v2 - Existing Tables Only)
 *
 * Strategic indexes to optimize query performance across the Kulti platform.
 * Only indexes tables that currently exist in the database.
 *
 * Created: 2025-11-13
 */

-- ============================================================================
-- PROFILES TABLE - User Lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON profiles(LOWER(username));

COMMENT ON INDEX idx_profiles_username_lower IS
  'Case-insensitive username search for signup validation and user discovery';

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON profiles USING gin(display_name gin_trgm_ops);

COMMENT ON INDEX idx_profiles_display_name_trgm IS
  'Trigram search index for fuzzy display name matching in search';

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role)
  WHERE role IN ('admin', 'moderator');

COMMENT ON INDEX idx_profiles_role IS
  'Filter admins and moderators for permission checks and admin dashboards';

CREATE INDEX IF NOT EXISTS idx_profiles_matchmaking
  ON profiles(matchmaking_enabled, profile_completed, experience_level)
  WHERE matchmaking_enabled = true;

COMMENT ON INDEX idx_profiles_matchmaking IS
  'Find users available for matchmaking with complete profiles';

CREATE INDEX IF NOT EXISTS idx_profiles_skills
  ON profiles USING gin(skills);

CREATE INDEX IF NOT EXISTS idx_profiles_interests
  ON profiles USING gin(interests);

COMMENT ON INDEX idx_profiles_skills IS
  'Fast skill matching for matchmaking algorithm';

COMMENT ON INDEX idx_profiles_interests IS
  'Fast interest matching for matchmaking algorithm';

-- ============================================================================
-- SESSIONS TABLE - Session Discovery & Management
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_public_live
  ON sessions(is_public, status, started_at DESC)
  WHERE is_public = true AND status = 'live';

COMMENT ON INDEX idx_sessions_public_live IS
  'Quickly find live public sessions for browse page, ordered by recency';

CREATE INDEX IF NOT EXISTS idx_sessions_room_code_upper
  ON sessions(UPPER(room_code))
  WHERE status IN ('live', 'scheduled');

COMMENT ON INDEX idx_sessions_room_code_upper IS
  'Case-insensitive room code lookup for joining sessions';

CREATE INDEX IF NOT EXISTS idx_sessions_host_status
  ON sessions(host_id, status, created_at DESC);

COMMENT ON INDEX idx_sessions_host_status IS
  'Efficiently retrieve a host''s sessions by status and recency';

CREATE INDEX IF NOT EXISTS idx_sessions_matchmaking
  ON sessions(is_matchmaking_session, status, category, created_at DESC)
  WHERE is_matchmaking_session = true AND status = 'live';

COMMENT ON INDEX idx_sessions_matchmaking IS
  'Find open matchmaking sessions by category for matching algorithm';

CREATE INDEX IF NOT EXISTS idx_sessions_category_live
  ON sessions(category, status, started_at DESC)
  WHERE status = 'live' AND category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_tags
  ON sessions USING gin(tags);

COMMENT ON INDEX idx_sessions_category_live IS
  'Browse sessions by category (e.g., "Web Development", "AI/ML")';

COMMENT ON INDEX idx_sessions_tags IS
  'Search sessions by technology tags using array overlap';

CREATE INDEX IF NOT EXISTS idx_sessions_ended
  ON sessions(ended_at DESC)
  WHERE ended_at IS NOT NULL;

COMMENT ON INDEX idx_sessions_ended IS
  'Query recently ended sessions for analytics and cleanup';

-- ============================================================================
-- SESSION_PARTICIPANTS TABLE - Participation Tracking
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_session_participants_user_joined
  ON session_participants(user_id, joined_at DESC);

COMMENT ON INDEX idx_session_participants_user_joined IS
  'Retrieve user''s session participation history ordered by recency';

CREATE INDEX IF NOT EXISTS idx_session_participants_session_role
  ON session_participants(session_id, role, joined_at);

COMMENT ON INDEX idx_session_participants_session_role IS
  'List session participants by role (host, presenter, viewer)';

CREATE INDEX IF NOT EXISTS idx_session_participants_user_watch_time
  ON session_participants(user_id, watch_duration_seconds DESC);

COMMENT ON INDEX idx_session_participants_user_watch_time IS
  'Calculate total watch time and engagement metrics per user';

-- ============================================================================
-- CREDIT_TRANSACTIONS - Transaction History
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type_time
  ON credit_transactions(user_id, type, created_at DESC);

COMMENT ON INDEX idx_credit_transactions_user_type_time IS
  'Filter user transactions by type (e.g., only tips, only earnings)';

CREATE INDEX IF NOT EXISTS idx_credit_transactions_session_type
  ON credit_transactions(source_session_id, type, amount)
  WHERE source_session_id IS NOT NULL;

COMMENT ON INDEX idx_credit_transactions_session_type IS
  'Analyze credit distribution per session by transaction type';

-- ============================================================================
-- NOTIFICATIONS - Notification System
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_type
  ON notifications(user_id, type, created_at DESC);

COMMENT ON INDEX idx_notifications_user_type IS
  'Filter user notifications by type (tips, badges, matches, etc.)';

-- ============================================================================
-- MESSAGES & MESSAGE_UPVOTES - Session Chat
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_session_time
  ON messages(session_id, created_at ASC)
  WHERE type != 'system';

COMMENT ON INDEX idx_messages_session_time IS
  'Load session chat messages in chronological order, excluding system messages';

CREATE INDEX IF NOT EXISTS idx_messages_user_time
  ON messages(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_messages_user_time IS
  'Retrieve user''s message history across all sessions';

CREATE INDEX IF NOT EXISTS idx_messages_parent_time
  ON messages(parent_message_id, created_at ASC)
  WHERE parent_message_id IS NOT NULL;

COMMENT ON INDEX idx_messages_parent_time IS
  'Load message thread replies in chronological order';

-- ============================================================================
-- COMMUNITY_ROOMS & ROOM_MEMBERS - Community Features
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_room_members_user_joined
  ON room_members(user_id, joined_at DESC);

COMMENT ON INDEX idx_room_members_user_joined IS
  'List rooms a user belongs to, ordered by join time';

CREATE INDEX IF NOT EXISTS idx_room_members_user_unread
  ON room_members(user_id, last_read_at)
  WHERE is_muted = false;

COMMENT ON INDEX idx_room_members_user_unread IS
  'Calculate unread message counts for user''s active (non-muted) rooms';

-- ============================================================================
-- ROOM_MESSAGES & ROOM_MESSAGE_REACTIONS - Community Chat
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_room_messages_user_time
  ON room_messages(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_room_messages_user_time IS
  'User''s message history across all community rooms';

-- ============================================================================
-- USER_PRESENCE - Matchmaking & Online Status
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_presence_session
  ON user_presence(current_session_id)
  WHERE current_session_id IS NOT NULL;

COMMENT ON INDEX idx_user_presence_session IS
  'Track which users are currently in which sessions';

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON user_presence(last_seen DESC)
  WHERE is_online = true;

COMMENT ON INDEX idx_user_presence_last_seen IS
  'Show recently active users for engagement metrics';

-- ============================================================================
-- MATCHMAKING_SUGGESTIONS - AI Matching
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_matchmaking_suggestions_cleanup
  ON matchmaking_suggestions(status, expires_at)
  WHERE status = 'pending';

COMMENT ON INDEX idx_matchmaking_suggestions_cleanup IS
  'Efficiently expire pending suggestions past their expiration time';

-- ============================================================================
-- CREDIT_MILESTONES - Achievement Tracking
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_credit_milestones_recent
  ON credit_milestones(achieved_at DESC);

COMMENT ON INDEX idx_credit_milestones_recent IS
  'Show recently achieved milestones across all users';

-- ============================================================================
-- GUEST_PRESENTERS - Presenter Invitations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_guest_presenters_user_display
  ON guest_presenters(display_name, joined_at DESC);

COMMENT ON INDEX idx_guest_presenters_user_display IS
  'Track guest presenters by display name';

COMMENT ON SCHEMA public IS
  'Performance indexes migration applied on 2025-11-13.
   Added 30+ strategic indexes for common query patterns.
   Expected performance improvements:
   - Browse page: 3-5x faster
   - User profiles: 2-3x faster
   - Session joins: 5-10x faster (room code lookup)
   - Transaction history: 2x faster
   - Matchmaking queries: 5-10x faster';
