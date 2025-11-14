"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  MessageSquare,
  Hash,
  UserPlus,
  UserMinus,
  Loader2,
} from "lucide-react"
import { RoomChat } from "@/components/community/room-chat"
import { TopicFeed } from "@/components/community/topic-feed"
import {
  getRoom,
  getRooms,
  joinRoom,
  leaveRoom,
  getMessages,
  getTopics,
} from "@/lib/community"
import { logger } from '@/lib/logger'
import type {
  RoomWithMembership,
  MessageWithReactions,
  TopicWithCreator,
} from "@/lib/community/types"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function RoomPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [room, setRoom] = useState<RoomWithMembership | null>(null)
  const [messages, setMessages] = useState<MessageWithReactions[]>([])
  const [topics, setTopics] = useState<TopicWithCreator[]>([])
  const [activeTab, setActiveTab] = useState<"chat" | "topics">("chat")
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")

  // Load room data
  useEffect(() => {
    loadRoomData()
  }, [resolvedParams.slug])

  const loadRoomData = async () => {
    setIsLoading(true)
    try {
      // Get all rooms to find the one with this slug
      const { rooms } = await getRooms()
      const foundRoom = rooms.find((r) => r.slug === resolvedParams.slug)

      if (!foundRoom) {
        router.push("/community")
        return
      }

      setRoom(foundRoom)

      // If user is a member, load chat and topics
      if (foundRoom.is_member) {
        const [messagesData, topicsData] = await Promise.all([
          getMessages(foundRoom.id),
          getTopics(foundRoom.id),
        ])
        setMessages(messagesData.messages)
        setTopics(topicsData.topics)
      }
    } catch (error) {
      logger.error("Failed to load room:", { error })
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!room) return

    setIsJoining(true)
    try {
      await joinRoom(room.id)
      await loadRoomData()
    } catch (error) {
      logger.error("Failed to join room:", { error })
      alert("Failed to join room. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!room) return

    if (!confirm("Are you sure you want to leave this room?")) return

    setIsJoining(true)
    try {
      await leaveRoom(room.id)
      router.push("/community")
    } catch (error) {
      logger.error("Failed to leave room:", { error })
      alert("Failed to leave room. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-lime-400 animate-spin mx-auto mb-4" />
          <p className="text-[#a1a1aa]">Loading room...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return null
  }

  // Not a member - show join prompt
  if (!room.is_member) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">{room.icon_emoji}</div>
          <h1 className="text-2xl font-bold text-white mb-2">{room.name}</h1>
          {room.description && (
            <p className="text-[#a1a1aa] mb-6">{room.description}</p>
          )}

          <div className="flex items-center justify-center gap-6 mb-6 text-sm text-[#71717a]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{room.member_count.toLocaleString()} members</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>{room.message_count.toLocaleString()} messages</span>
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full px-6 py-3 bg-lime-400 text-black rounded-xl font-medium hover:bg-lime-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Join Room
              </>
            )}
          </button>

          <button
            onClick={() => router.push("/community")}
            className="w-full mt-3 px-6 py-3 text-[#a1a1aa] hover:text-white transition-colors"
          >
            Back to Community
          </button>
        </div>
      </div>
    )
  }

  // Member view - show chat and topics
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#27272a] bg-[#0a0a0a] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{room.icon_emoji}</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{room.name}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-[#71717a]">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{room.member_count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{room.message_count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    <span>{room.category}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLeave}
              disabled={isJoining}
              className="px-4 py-2 text-[#a1a1aa] hover:text-white border border-[#27272a] hover:border-[#3f3f46] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <UserMinus className="w-4 h-4" />
              Leave Room
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === "chat"
                  ? "text-white border-lime-400"
                  : "text-[#a1a1aa] border-transparent hover:text-white"
              }`}
            >
              Chat
              {room.unread_count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {room.unread_count}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("topics")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === "topics"
                  ? "text-white border-lime-400"
                  : "text-[#a1a1aa] border-transparent hover:text-white"
              }`}
            >
              Topics
              <span className="ml-2 px-2 py-0.5 bg-[#27272a] text-[#a1a1aa] text-xs rounded-full">
                {topics.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "chat" ? (
          <div className="h-[calc(100vh-200px)]">
            <RoomChat
              roomId={room.id}
              messages={messages}
              currentUserId={currentUserId}
            />
          </div>
        ) : (
          <div className="p-6">
            <TopicFeed
              roomId={room.id}
              topics={topics}
              currentUserId={currentUserId}
              onTopicCreated={loadRoomData}
            />
          </div>
        )}
      </div>
    </div>
  )
}
