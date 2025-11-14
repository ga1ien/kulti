"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "react-hot-toast"
import { Bot, Send, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { type AIPermissions, getNoAccessReason } from "@/lib/session"
import { logger } from '@/lib/logger'

/**
 * AI Message Payload interface
 */
interface AIMessagePayload {
  conversation_id: string
  [key: string]: unknown
}

/**
 * Code Component Props for ReactMarkdown
 */
type CodeComponentProps = React.ClassAttributes<HTMLElement> &
  React.HTMLAttributes<HTMLElement> & {
    inline?: boolean
    node?: unknown
  }

/**
 * AI Chat Sidebar Props interface
 */
interface AIChatSidebarProps {
  sessionId: string
  userId: string
  currentBalance: number
  canChat: boolean
  permissions: AIPermissions
  onBalanceUpdate: () => void
}

interface AIMessage {
  id: string
  user_id: string | null
  username: string | null
  display_name: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used: number
  created_at: string
}

const AI_MESSAGE_COST = 5

export function AIChatSidebar({
  sessionId,
  userId,
  currentBalance,
  canChat,
  permissions,
  onBalanceUpdate,
}: AIChatSidebarProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Fetch conversation history
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/ai/conversation?sessionId=${sessionId}`
        )
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        logger.error("Failed to fetch AI messages:", error)
      }
    }

    fetchMessages()
  }, [sessionId])

  // Subscribe to new messages
  useEffect(() => {
    const conversationChannel = supabase
      .channel(`ai_messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_messages',
        },
        async (payload) => {
          // Fetch the complete message with user info
          const { data } = await supabase.rpc('get_ai_conversation_history', {
            p_conversation_id: (payload.new as AIMessagePayload).conversation_id,
            p_limit: 1,
          })

          if (data && data.length > 0) {
            const newMessage = data[0]
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        }
      )
      .subscribe()

    return () => {
      conversationChannel.unsubscribe()
    }
  }, [sessionId, supabase])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    // Check permissions
    if (!canChat) {
      const reason = getNoAccessReason(permissions)
      setError(reason)
      toast.error(reason)
      return
    }

    // Check balance
    if (currentBalance < AI_MESSAGE_COST) {
      const message = `You need ${AI_MESSAGE_COST} credits to ask Claude. Your balance is ${currentBalance} credits.`
      setError(message)
      toast.error(message, { duration: 5000 })
      return
    }

    setLoading(true)
    setError(null)

    const messageContent = input
    setInput("") // Clear input immediately

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: messageContent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        let errorMessage = data.error || 'Failed to send message'
        if (response.status === 402) {
          errorMessage = `Insufficient credits. You need ${data.required} credits but only have ${currentBalance}.`
        }
        setError(errorMessage)
        toast.error(errorMessage, { duration: 5000 })
        setInput(messageContent) // Restore input on error
      } else {
        // Update balance
        onBalanceUpdate()
      }
    } catch (error) {
      logger.error('Failed to send AI message:', error)
      const errorMessage = 'Failed to send message. Please check your connection and try again.'
      setError(errorMessage)
      toast.error(errorMessage)
      setInput(messageContent) // Restore input on error
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#27272a]">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Bot className="w-5 h-5 text-purple-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">AI Assistant</h3>
          <p className="text-xs text-[#71717a]">Shared Claude conversation</p>
        </div>
        <div className="text-xs text-[#71717a] font-mono">
          {AI_MESSAGE_COST}c/msg
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-[#a1a1aa] text-sm">No messages yet</p>
            <p className="text-xs text-[#71717a] mt-2">
              Start with "Claude," or "@claude" to ask a question
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'assistant' ? 'items-start' : ''
            }`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {message.role === 'assistant' ? (
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center text-black font-bold text-sm">
                  {message.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {message.role === 'assistant'
                    ? 'Claude'
                    : message.display_name || 'Unknown'}
                </span>
                {message.role === 'user' && (
                  <span className="text-xs text-[#71717a]">
                    @{message.username}
                  </span>
                )}
                <span className="text-xs text-[#71717a]">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {message.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: CodeComponentProps) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            // @ts-expect-error - vscDarkPlus type is compatible but typed differently
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-[#e5e5e5]">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm mb-1">Claude</p>
              <div className="flex items-center gap-2 text-[#71717a]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30">
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#27272a]">
        {!canChat ? (
          <div className="p-4 bg-[#2a2a2a] border border-[#27272a] rounded-lg">
            <p className="text-sm text-[#a1a1aa] text-center">
              {getNoAccessReason(permissions)}
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Claude..."
                disabled={loading || !canChat}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-[#27272a] rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim() || currentBalance < AI_MESSAGE_COST || !canChat}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-[#71717a] mt-2">
              {currentBalance < AI_MESSAGE_COST
                ? `You need ${AI_MESSAGE_COST} credits to ask Claude`
                : `${AI_MESSAGE_COST} credits per message • Balance: ${currentBalance}c`}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
