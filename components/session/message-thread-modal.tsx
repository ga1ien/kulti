"use client"

import { useEffect, useState, useRef } from "react"
import { X, Send, ThumbsUp, Loader2 } from "lucide-react"
import { formatTime } from "@/lib/utils"

interface MessageThreadModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: string
  sessionId: string
  userId: string
}

interface ThreadMessage {
  id: string
  session_id: string
  user_id: string
  content: string
  type: string
  created_at: string
  parent_message_id: string | null
  upvote_count: number
  user_upvoted: boolean
  username: string
  display_name: string
  is_parent: boolean
}

export function MessageThreadModal({
  isOpen,
  onClose,
  messageId,
  sessionId,
  userId,
}: MessageThreadModalProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const parentMessage = messages.find((m) => m.is_parent)
  const replies = messages.filter((m) => !m.is_parent)

  useEffect(() => {
    if (isOpen) {
      fetchThread()
    }
  }, [isOpen, messageId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchThread = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/messages/${messageId}/replies`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        setError('Failed to load thread')
      }
    } catch (error) {
      console.error('Fetch thread error:', error)
      setError('Failed to load thread')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || sending) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/messages/${messageId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: replyContent.trim(),
        }),
      })

      if (response.ok) {
        setReplyContent('')
        fetchThread() // Refresh thread
      } else {
        setError('Failed to send reply')
      }
    } catch (error) {
      console.error('Send reply error:', error)
      setError('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleUpvote = async (msgId: string) => {
    try {
      await fetch(`/api/messages/${msgId}/upvote`, {
        method: 'POST',
      })
      fetchThread() // Refresh to show updated counts
    } catch (error) {
      console.error('Upvote error:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 max-h-[80vh] bg-[#1a1a1a] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-lime-400/10 to-green-500/10 border-b border-[#27272a] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-mono text-2xl font-bold">Thread</h2>
          <p className="text-sm text-[#a1a1aa]">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
        </div>

        {/* Thread Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : (
            <>
              {/* Parent Message */}
              {parentMessage && (
                <div className="p-4 bg-lime-400/5 border border-lime-400/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-black text-sm font-bold">
                      {parentMessage.display_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{parentMessage.display_name}</p>
                      <p className="text-xs text-[#71717a]">
                        {formatTime(parentMessage.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#e5e5e5]">{parentMessage.content}</p>
                  <button
                    onClick={() => handleUpvote(parentMessage.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      parentMessage.user_upvoted
                        ? 'text-lime-400'
                        : 'text-[#71717a] hover:text-lime-400'
                    }`}
                  >
                    <ThumbsUp
                      className={`w-3.5 h-3.5 ${parentMessage.user_upvoted ? 'fill-current' : ''}`}
                    />
                    {parentMessage.upvote_count > 0 && (
                      <span className="font-medium">{parentMessage.upvote_count}</span>
                    )}
                  </button>
                </div>
              )}

              {/* Replies */}
              {replies.length > 0 ? (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-3 bg-[#2a2a2a] rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center text-black text-xs font-bold">
                          {reply.display_name[0]?.toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">{reply.display_name}</p>
                        <p className="text-xs text-[#71717a]">
                          {formatTime(reply.created_at)}
                        </p>
                      </div>
                      <p className="text-sm text-[#e5e5e5] pl-8">{reply.content}</p>
                      <button
                        onClick={() => handleUpvote(reply.id)}
                        className={`flex items-center gap-1 text-xs pl-8 transition-colors ${
                          reply.user_upvoted
                            ? 'text-lime-400'
                            : 'text-[#71717a] hover:text-lime-400'
                        }`}
                      >
                        <ThumbsUp
                          className={`w-3.5 h-3.5 ${reply.user_upvoted ? 'fill-current' : ''}`}
                        />
                        {reply.upvote_count > 0 && (
                          <span className="font-medium">{reply.upvote_count}</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#71717a] text-sm">No replies yet. Be the first!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply Input */}
        <form
          onSubmit={handleSendReply}
          className="border-t border-[#27272a] p-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              disabled={sending || loading}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white text-sm focus:border-lime-400 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !replyContent.trim() || loading}
              className="px-4 py-2 bg-lime-400 hover:bg-lime-500 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Reply
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
