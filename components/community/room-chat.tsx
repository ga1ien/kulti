"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Reply, Send, Smile } from "lucide-react"
import { MessageWithReactions, MessageThread } from "@/lib/community/types"
import { sendMessage, reactToMessage, getMessageThread } from "@/lib/community"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"
import { logger } from '@/lib/logger'

interface RoomChatProps {
  roomId: string
  messages: MessageWithReactions[]
  currentUserId: string
  onLoadMore?: () => void
  hasMore?: boolean
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀", "💯", "🔥", "👏"]

export function RoomChat({
  roomId,
  messages,
  currentUserId,
  onLoadMore,
  hasMore = false,
}: RoomChatProps) {
  const [messageText, setMessageText] = useState("")
  const [replyingTo, setReplyingTo] = useState<MessageWithReactions | null>(
    null
  )
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus()
    }
  }, [replyingTo])

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return

    setIsSending(true)
    try {
      await sendMessage(
        roomId,
        messageText.trim(),
        replyingTo?.id || undefined
      )
      setMessageText("")
      setReplyingTo(null)
    } catch (error) {
      logger.error("Failed to send message:", { error })
      alert("Failed to send message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Load More Button */}
        {hasMore && (
          <button
            onClick={onLoadMore}
            className="w-full py-2 text-sm text-[#a1a1aa] hover:text-white transition-colors"
          >
            Load earlier messages
          </button>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            roomId={roomId}
            onReply={() => setReplyingTo(message)}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-6 py-3 bg-[#27272a] border-t border-[#3f3f46] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Reply className="w-4 h-4 text-[#71717a]" />
            <span className="text-sm text-[#a1a1aa]">
              Replying to{" "}
              <span className="text-white font-medium">
                {replyingTo.profile?.display_name}
              </span>
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-[#71717a] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-[#27272a]">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="flex-1 bg-[#1a1a1a] border border-[#27272a] rounded-xl px-4 py-3 text-white placeholder-[#71717a] focus:border-lime-400 focus:outline-none resize-none min-h-[60px] max-h-[200px]"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            className="self-end px-6 py-3 bg-lime-400 text-black rounded-xl font-medium hover:bg-lime-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

interface MessageItemProps {
  message: MessageWithReactions
  currentUserId: string
  roomId: string
  onReply: () => void
}

function MessageItem({
  message,
  currentUserId,
  roomId,
  onReply,
}: MessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showThread, setShowThread] = useState(false)
  const [thread, setThread] = useState<MessageThread[]>([])
  const [loadingThread, setLoadingThread] = useState(false)

  const _isOwnMessage = message.user_id === currentUserId
  const hasReactions = Object.keys(message.reactions || {}).length > 0

  const handleReact = async (emoji: string) => {
    try {
      await reactToMessage(roomId, message.id, emoji)
      setShowEmojiPicker(false)
    } catch (error) {
      logger.error("Failed to react:", { error })
    }
  }

  const loadThread = async () => {
    if (thread.length > 0) {
      setShowThread(!showThread)
      return
    }

    setLoadingThread(true)
    try {
      const { thread: loadedThread } = await getMessageThread(
        roomId,
        message.id
      )
      setThread(loadedThread)
      setShowThread(true)
    } catch (error) {
      logger.error("Failed to load thread:", { error })
    } finally {
      setLoadingThread(false)
    }
  }

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {message.profile?.avatar_url ? (
            <Image
              src={message.profile.avatar_url}
              alt={message.profile.display_name}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#27272a] flex items-center justify-center text-white font-medium">
              {message.profile?.display_name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-white">
              {message.profile?.display_name || "Unknown User"}
            </span>
            <span className="text-xs text-[#71717a]">
              @{message.profile?.username || "unknown"}
            </span>
            <span className="text-xs text-[#71717a]">
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true,
              })}
            </span>
            {message.edited_at && (
              <span className="text-xs text-[#71717a] italic">(edited)</span>
            )}
          </div>

          {/* Message Text */}
          <div className="text-[#e4e4e7] whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Reactions */}
          {hasReactions && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, data]) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                    data.user_reacted
                      ? "bg-lime-400/20 border border-lime-400/50"
                      : "bg-[#1a1a1a] border border-[#27272a] hover:border-[#3f3f46]"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs text-[#a1a1aa]">{data.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded-md hover:bg-[#27272a] text-[#71717a] hover:text-white transition-colors"
              title="Add reaction"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={onReply}
              className="p-1.5 rounded-md hover:bg-[#27272a] text-[#71717a] hover:text-white transition-colors"
              title="Reply"
            >
              <Reply className="w-4 h-4" />
            </button>
            {message.reply_count > 0 && (
              <button
                onClick={loadThread}
                disabled={loadingThread}
                className="px-2 py-1 rounded-md text-xs text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors"
              >
                {loadingThread
                  ? "Loading..."
                  : `${message.reply_count} ${message.reply_count === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="mt-2 p-2 bg-[#1a1a1a] border border-[#27272a] rounded-lg flex gap-1">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-xl p-1 hover:bg-[#27272a] rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Thread View */}
          {showThread && thread.length > 0 && (
            <div className="mt-3 pl-4 border-l-2 border-[#27272a] space-y-3">
              {thread.slice(1).map((reply) => (
                <div key={reply.message_id} className="flex gap-2">
                  <div className="flex-shrink-0">
                    {reply.avatar_url ? (
                      <Image
                        src={reply.avatar_url}
                        alt={reply.display_name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-white text-sm">
                        {reply.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">
                        {reply.display_name}
                      </span>
                      <span className="text-xs text-[#71717a]">
                        {formatDistanceToNow(new Date(reply.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-[#e4e4e7] whitespace-pre-wrap">
                      {reply.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
