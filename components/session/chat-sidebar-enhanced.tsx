"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ThumbsUp, Pin, MessageSquare, Filter } from "lucide-react"
import { formatTime } from "@/lib/utils"

interface ChatSidebarProps {
  sessionId: string
  userId: string
  isHost: boolean
}

interface MessageWithVotes {
  id: string
  session_id: string
  user_id: string
  content: string
  type: string
  created_at: string
  is_pinned: boolean
  pinned_at: string | null
  parent_message_id: string | null
  upvote_count: number
  user_upvoted: boolean
  reply_count: number
  username: string
  display_name: string
}

type FilterMode = 'all' | 'pinned' | 'top'

export function ChatSidebar({ sessionId, userId, isHost }: ChatSidebarProps) {
  const [messages, setMessages] = useState<MessageWithVotes[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Fetch messages with votes
  useEffect(() => {
    fetchMessages()
  }, [sessionId, userId, filter])

  // Subscribe to message changes
  useEffect(() => {
    const messageChannel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Refresh messages on any change
          fetchMessages()
        }
      )
      .subscribe()

    const upvoteChannel = supabase
      .channel(`upvotes:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_upvotes',
        },
        () => {
          // Refresh messages when upvotes change
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(upvoteChannel)
    }
  }, [sessionId, userId, filter])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data, error } = await supabase.rpc('get_messages_with_votes', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_filter: filter,
      p_limit: 100,
    })

    if (!error && data) {
      setMessages(data as MessageWithVotes[])
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    try {
      setIsSending(true)
      const { error } = await supabase.from('messages').insert({
        session_id: sessionId,
        user_id: userId,
        content: newMessage.trim(),
        type: 'text',
      })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Send message error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleUpvote = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/upvote`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to upvote message')
      }
      // Refresh will happen via subscription
    } catch (error) {
      console.error('Upvote error:', error)
      toast.error('Failed to upvote message. Please try again.')
    }
  }

  const handlePin = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to pin message')
      }
      // Refresh will happen via subscription
    } catch (error) {
      console.error('Pin error:', error)
      toast.error('Failed to pin message. Please try again.')
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      {/* Header with Filters */}
      <div className="border-b border-[#27272a] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold font-mono">Chat</h3>
          <Filter className="w-4 h-4 text-[#71717a]" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-lime-400 text-black'
                : 'bg-[#2a2a2a] text-[#a1a1aa] hover:bg-[#333333]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pinned')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
              filter === 'pinned'
                ? 'bg-lime-400 text-black'
                : 'bg-[#2a2a2a] text-[#a1a1aa] hover:bg-[#333333]'
            }`}
          >
            <Pin className="w-3 h-3" />
            Pinned
          </button>
          <button
            onClick={() => setFilter('top')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
              filter === 'top'
                ? 'bg-lime-400 text-black'
                : 'bg-[#2a2a2a] text-[#a1a1aa] hover:bg-[#333333]'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            Top
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#71717a] text-sm">
              {filter === 'all' ? 'No messages yet' : `No ${filter} messages`}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`space-y-2 p-3 rounded-lg ${
              message.is_pinned ? 'bg-lime-400/5 border border-lime-400/20' : 'bg-[#2a2a2a]/50'
            }`}
          >
            {message.type === 'system' ? (
              <div className="text-center">
                <p className="text-xs text-[#71717a]">{message.content}</p>
              </div>
            ) : (
              <>
                {/* Message Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center text-black text-xs font-bold">
                      {message.display_name[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{message.display_name}</span>
                    <span className="text-xs text-[#71717a]">
                      {formatTime(message.created_at)}
                    </span>
                    {message.is_pinned && (
                      <div className="flex items-center gap-1 text-xs text-lime-400">
                        <Pin className="w-3 h-3 fill-current" />
                        <span>Pinned</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <p className="text-sm text-[#e5e5e5] pl-8">{message.content}</p>

                {/* Message Actions */}
                <div className="flex items-center gap-3 pl-8">
                  {/* Upvote */}
                  <button
                    onClick={() => handleUpvote(message.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      message.user_upvoted
                        ? 'text-lime-400'
                        : 'text-[#71717a] hover:text-lime-400'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${message.user_upvoted ? 'fill-current' : ''}`} />
                    {message.upvote_count > 0 && (
                      <span className="font-medium">{message.upvote_count}</span>
                    )}
                  </button>

                  {/* Reply */}
                  <button
                    onClick={() => setSelectedThread(message.id)}
                    className="flex items-center gap-1 text-xs text-[#71717a] hover:text-lime-400 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {message.reply_count > 0 && (
                      <span>{message.reply_count}</span>
                    )}
                    <span>Reply</span>
                  </button>

                  {/* Pin (host only) */}
                  {isHost && (
                    <button
                      onClick={() => handlePin(message.id)}
                      className="flex items-center gap-1 text-xs text-[#71717a] hover:text-lime-400 transition-colors"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      {message.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-[#27272a] p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 bg-[#2a2a2a] border-[#27272a] text-white"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isSending || !newMessage.trim()}
            className="bg-lime-400 hover:bg-lime-500 text-black"
          >
            <Send size={16} />
          </Button>
        </div>
      </form>
    </div>
  )
}
