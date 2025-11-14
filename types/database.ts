export type UserRole = 'user' | 'moderator' | 'admin'

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  is_approved: boolean
  invite_code: string | null
  created_at: string
  role?: UserRole
  credits_balance?: number
  total_credits_earned?: number
  total_credits_spent?: number
  credits_updated_at?: string
  badges?: any[]
  current_streak?: number
  longest_streak?: number
  last_active_date?: string
  profile_visibility?: 'public' | 'friends' | 'private'
  show_online_status?: boolean
  session_visibility?: 'public' | 'invite' | 'private'
  show_credit_balance?: boolean
  notification_preferences?: {
    tips_received?: boolean
    badges_earned?: boolean
    match_found?: boolean
    topic_streamed?: boolean
    session_invites?: boolean
    message_replies?: boolean
    system_announcements?: boolean
  }
}

export type Notification = {
  id: string
  user_id: string
  type: 'tip_received' | 'badge_earned' | 'match_found' | 'topic_streamed' | 'session_started' | 'presenter_invited' | 'message_reply'
  title: string
  message: string
  link: string | null
  read: boolean
  metadata: Record<string, any>
  created_at: string
}

export type Session = {
  id: string
  room_code: string
  title: string
  description: string | null
  host_id: string
  hms_room_id: string | null
  status: 'scheduled' | 'live' | 'ended'
  is_public: boolean
  max_presenters: number
  current_participants?: number
  started_at: string | null
  ended_at: string | null
  created_at: string
  boosted_until: string | null
  featured_rank: number
  total_credits_distributed?: number
  credits_calculated?: boolean
  avg_concurrent_viewers?: number
  engagement_score?: number
  total_chat_messages?: number
}

export type SessionParticipant = {
  id: string
  session_id: string
  user_id: string
  role: 'host' | 'presenter' | 'viewer'
  joined_at: string
}

/**
 * AI conversation context containing session and participant metadata
 */
export interface AIConversationContext {
  sessionId?: string
  participants?: string[]
  topic?: string
  [key: string]: unknown
}

/**
 * AI message metadata containing model performance metrics
 */
export interface AIMessageMetadata {
  model?: string
  tokens?: number
  latency?: number
  temperature?: number
  maxTokens?: number
  [key: string]: unknown
}

export type AIConversation = {
  id: string
  session_id: string
  claude_conversation_id: string | null
  context: AIConversationContext
  total_messages: number
  total_tokens_used: number
  total_cost_credits: number
  created_at: string
  last_message_at: string | null
}

export type AIMessage = {
  id: string
  conversation_id: string
  user_id: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: AIMessageMetadata
  tokens_used: number
  cost_credits: number
  created_at: string
}

export type Message = {
  id: string
  session_id: string
  user_id: string | null
  content: string
  type: 'text' | 'system' | 'ai'
  created_at: string
}

export type WaitlistEntry = {
  id: string
  email: string
  name: string
  twitter_handle: string | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  position: number | null
  created_at: string
}

export type Invite = {
  id: string
  code: string
  created_by: string | null
  max_uses: number
  current_uses: number
  expires_at: string | null
  is_active: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export type InviteUse = {
  id: string
  invite_id: string
  used_by: string
  used_at: string
  metadata: Record<string, any>
}

export type InviteStats = {
  invite_id: string
  code: string
  created_by: string | null
  creator_username: string | null
  creator_display_name: string | null
  max_uses: number
  current_uses: number
  is_active: boolean
  expires_at: string | null
  created_at: string
  total_uses: number
  uses: Array<{
    user_id: string
    username?: string
    display_name?: string
    used_at: string
  }>
}

/**
 * Recording metadata containing file information and technical details
 */
export interface RecordingMetadata {
  recording_type?: string
  duration?: number
  size?: number
  resolution?: string
  format?: string
  codec?: string
  bitrate?: number
  error?: string
  [key: string]: unknown
}

export type Recording = {
  id: string
  session_id: string
  hms_recording_id: string
  recording_url: string | null
  duration: number | null
  status: 'recording' | 'processing' | 'completed' | 'failed'
  metadata: RecordingMetadata
  created_at: string
  updated_at: string
}

/**
 * User profile statistics for achievements and activity
 */
export interface UserProfileStats {
  sessions_attended: number
  sessions_hosted: number
  total_watch_hours: number
  milestones_achieved: number
  total_messages_sent?: number
  average_session_rating?: number
}

/**
 * Match reason details explaining why users were matched
 */
export interface MatchReason {
  user_id: string
  shared_skills: string[]
  shared_interests: string[]
  experience_match?: boolean
  availability_match?: boolean
  [key: string]: unknown
}

/**
 * Extended session participant with join details and credits
 */
export interface SessionParticipantWithDetails {
  session_id: string
  user_id: string
  role: 'host' | 'presenter' | 'viewer'
  joined_at: string
  left_at?: string | null
  watch_duration_seconds?: number
  credits_earned: number
  sessions: {
    id: string
    title: string
    description: string | null
    host_id: string
    started_at: string | null
    ended_at: string | null
    status: 'scheduled' | 'live' | 'ended'
    host?: Profile
  }
}

/**
 * Extended session with host profile and participant count
 */
export interface SessionWithDetails extends Session {
  host: Profile
  participants?: Array<{ count: number }>
}
