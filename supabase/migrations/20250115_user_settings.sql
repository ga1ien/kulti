/**
 * User Settings
 *
 * Adds privacy settings and notification preferences to user profiles
 */

-- Add privacy settings columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS session_visibility TEXT DEFAULT 'public' CHECK (session_visibility IN ('public', 'invite', 'private')),
  ADD COLUMN IF NOT EXISTS show_credit_balance BOOLEAN DEFAULT true;

-- Add notification preferences (JSONB for flexibility)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "tips_received": true,
    "badges_earned": true,
    "match_found": true,
    "topic_streamed": true,
    "session_invites": true,
    "message_replies": true,
    "system_announcements": true
  }'::jsonb;

-- Create index for notification preferences queries
CREATE INDEX IF NOT EXISTS idx_profiles_notification_prefs
  ON profiles USING gin(notification_preferences);

-- Add comments for documentation
COMMENT ON COLUMN profiles.profile_visibility IS 'Controls who can view user profile: public, friends, or private';
COMMENT ON COLUMN profiles.show_online_status IS 'Whether to show online status to other users';
COMMENT ON COLUMN profiles.session_visibility IS 'Default visibility for created sessions: public, invite, or private';
COMMENT ON COLUMN profiles.show_credit_balance IS 'Whether to display credit balance on public profile';
COMMENT ON COLUMN profiles.notification_preferences IS 'JSON object containing notification preferences for different event types';
