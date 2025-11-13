/**
 * Community Features TypeScript Types
 *
 * Types for community rooms, messages, topics, and voting
 */

// ============================================================================
// Community Rooms
// ============================================================================

export type RoomCategory =
  | "general"
  | "web-dev"
  | "mobile-dev"
  | "backend"
  | "devops"
  | "ai-ml"
  | "data-science"
  | "design"
  | "game-dev"
  | "blockchain"
  | "security"
  | "help"
  | "announcements"

export type MemberRole = "admin" | "moderator" | "member"

export interface CommunityRoom {
  id: string
  slug: string
  name: string
  description: string | null
  category: RoomCategory
  created_by: string | null
  is_public: boolean
  member_count: number
  message_count: number
  icon_emoji: string
  tags: string[]
  created_at: string
  archived_at: string | null
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  role: MemberRole
  joined_at: string
  last_read_at: string | null
  is_muted: boolean
}

export interface RoomWithMembership extends CommunityRoom {
  is_member: boolean
  unread_count: number
  last_read_at: string | null
}

// ============================================================================
// Room Messages
// ============================================================================

export type MessageType = "text" | "system" | "announcement"

export interface RoomMessage {
  id: string
  room_id: string
  user_id: string | null
  content: string
  type: MessageType
  parent_message_id: string | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
}

export interface RoomMessageWithProfile extends RoomMessage {
  profile: {
    username: string
    display_name: string
    avatar_url: string | null
  } | null
}

export interface RoomMessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface MessageReactionSummary {
  emoji: string
  count: number
  user_reacted: boolean
}

export interface MessageWithReactions extends RoomMessageWithProfile {
  reactions: Record<string, MessageReactionSummary>
  reply_count: number
}

export interface MessageThread {
  message_id: string
  user_id: string | null
  username: string
  display_name: string
  avatar_url: string | null
  content: string
  edited_at: string | null
  created_at: string
  is_parent: boolean
}

// ============================================================================
// Discussion Topics
// ============================================================================

export type TopicStatus =
  | "proposed"
  | "planned"
  | "in-progress"
  | "completed"
  | "archived"

export interface DiscussionTopic {
  id: string
  room_id: string
  created_by: string
  title: string
  description: string | null
  tags: string[]
  upvote_count: number
  comment_count: number
  status: TopicStatus
  priority: number
  covered_in_session_id: string | null
  covered_at: string | null
  created_at: string
  updated_at: string
}

export interface TopicWithCreator extends DiscussionTopic {
  creator_name: string
  creator_avatar: string | null
  user_voted: boolean
}

export interface TopicVote {
  id: string
  topic_id: string
  user_id: string
  vote_weight: number
  created_at: string
}

export interface TopicComment {
  id: string
  topic_id: string
  user_id: string | null
  content: string
  parent_comment_id: string | null
  edited_at: string | null
  created_at: string
}

export interface TopicCommentWithProfile extends TopicComment {
  commenter: {
    username: string
    display_name: string
    avatar_url: string | null
  } | null
}

export type EngagementType = "creator" | "voter" | "commenter"

export interface EngagedUser {
  user_id: string
  engagement_type: EngagementType
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GetRoomsResponse {
  rooms: RoomWithMembership[]
}

export interface GetRoomResponse {
  room: RoomWithMembership & {
    membership: {
      role: MemberRole
      last_read_at: string | null
      is_muted: boolean
    } | null
  }
}

export interface GetMessagesResponse {
  messages: MessageWithReactions[]
}

export interface SendMessageResponse {
  message: RoomMessageWithProfile
}

export interface GetThreadResponse {
  thread: MessageThread[]
}

export interface ReactToMessageResponse {
  success: boolean
  action: "added" | "removed"
}

export interface GetTopicsResponse {
  topics: TopicWithCreator[]
}

export interface CreateTopicResponse {
  topic: DiscussionTopic
}

export interface ToggleVoteResponse {
  success: boolean
  upvoted: boolean
  newCount: number
}

export interface StreamTopicResponse {
  success: boolean
  session: {
    id: string
    room_code: string
    title: string
    description: string | null
    host_id: string
    hms_room_id: string
    status: string
    is_public: boolean
    started_at: string
  }
  roomCode: string
  engagedUsers: EngagedUser[]
}

export interface GetCommentsResponse {
  comments: TopicCommentWithProfile[]
}

export interface CreateCommentResponse {
  comment: TopicCommentWithProfile
}

// ============================================================================
// Client State Types
// ============================================================================

export interface RoomState {
  currentRoom: CommunityRoom | null
  rooms: RoomWithMembership[]
  messages: MessageWithReactions[]
  isLoading: boolean
  error: string | null
}

export interface TopicState {
  topics: TopicWithCreator[]
  currentTopic: DiscussionTopic | null
  comments: TopicCommentWithProfile[]
  isLoading: boolean
  error: string | null
}
