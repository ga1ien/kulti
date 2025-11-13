/**
 * Community API Client
 *
 * Client-side functions for interacting with community endpoints
 */

import type {
  GetRoomsResponse,
  GetRoomResponse,
  GetMessagesResponse,
  SendMessageResponse,
  GetThreadResponse,
  ReactToMessageResponse,
  GetTopicsResponse,
  CreateTopicResponse,
  ToggleVoteResponse,
  StreamTopicResponse,
  GetCommentsResponse,
  CreateCommentResponse,
} from "./types"

// ============================================================================
// Room APIs
// ============================================================================

export async function getRooms(): Promise<GetRoomsResponse> {
  const response = await fetch("/api/community/rooms")
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch rooms")
  }
  return response.json()
}

export async function getRoom(roomId: string): Promise<GetRoomResponse> {
  const response = await fetch(`/api/community/rooms/${roomId}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch room")
  }
  return response.json()
}

export async function joinRoom(roomId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/community/rooms/${roomId}/join`, {
    method: "POST",
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to join room")
  }
  return response.json()
}

export async function leaveRoom(
  roomId: string
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/community/rooms/${roomId}/join`, {
    method: "DELETE",
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to leave room")
  }
  return response.json()
}

// ============================================================================
// Message APIs
// ============================================================================

export async function getMessages(
  roomId: string,
  options?: { limit?: number; before?: string }
): Promise<GetMessagesResponse> {
  const params = new URLSearchParams()
  if (options?.limit) params.set("limit", options.limit.toString())
  if (options?.before) params.set("before", options.before)

  const url = `/api/community/rooms/${roomId}/messages${
    params.toString() ? `?${params.toString()}` : ""
  }`

  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch messages")
  }
  return response.json()
}

export async function sendMessage(
  roomId: string,
  content: string,
  parentMessageId?: string
): Promise<SendMessageResponse> {
  const response = await fetch(`/api/community/rooms/${roomId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      parentMessageId,
    }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to send message")
  }
  return response.json()
}

export async function getMessageThread(
  roomId: string,
  messageId: string
): Promise<GetThreadResponse> {
  const response = await fetch(
    `/api/community/rooms/${roomId}/messages/${messageId}/thread`
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch thread")
  }
  return response.json()
}

export async function reactToMessage(
  roomId: string,
  messageId: string,
  emoji: string
): Promise<ReactToMessageResponse> {
  const response = await fetch(
    `/api/community/rooms/${roomId}/messages/${messageId}/reactions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to react to message")
  }
  return response.json()
}

// ============================================================================
// Topic APIs
// ============================================================================

export async function getTopics(
  roomId: string,
  options?: { status?: string; limit?: number }
): Promise<GetTopicsResponse> {
  const params = new URLSearchParams()
  if (options?.status) params.set("status", options.status)
  if (options?.limit) params.set("limit", options.limit.toString())

  const url = `/api/community/rooms/${roomId}/topics${
    params.toString() ? `?${params.toString()}` : ""
  }`

  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch topics")
  }
  return response.json()
}

export async function createTopic(
  roomId: string,
  data: {
    title: string
    description?: string
    tags?: string[]
  }
): Promise<CreateTopicResponse> {
  const response = await fetch(`/api/community/rooms/${roomId}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to create topic")
  }
  return response.json()
}

export async function toggleTopicVote(
  topicId: string
): Promise<ToggleVoteResponse> {
  const response = await fetch(`/api/community/topics/${topicId}/vote`, {
    method: "POST",
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to toggle vote")
  }
  return response.json()
}

export async function streamTopic(
  topicId: string
): Promise<StreamTopicResponse> {
  const response = await fetch(`/api/community/topics/${topicId}/stream`, {
    method: "POST",
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to create stream")
  }
  return response.json()
}

// ============================================================================
// Comment APIs
// ============================================================================

export async function getTopicComments(
  topicId: string
): Promise<GetCommentsResponse> {
  const response = await fetch(`/api/community/topics/${topicId}/comments`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch comments")
  }
  return response.json()
}

export async function createTopicComment(
  topicId: string,
  content: string,
  parentCommentId?: string
): Promise<CreateCommentResponse> {
  const response = await fetch(`/api/community/topics/${topicId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      parentCommentId,
    }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to create comment")
  }
  return response.json()
}
