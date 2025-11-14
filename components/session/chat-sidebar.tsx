"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Message, Profile } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { formatTime } from "@/lib/utils"
import { logger } from "@/lib/logger"

interface ChatSidebarProps {
  sessionId: string
  userId: string
}

export function ChatSidebar({ sessionId, userId }: ChatSidebarProps) {
  const [messages, setMessages] = useState<(Message & { profile?: Profile })[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    // Fetch existing messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (data) {
        setMessages(data as (Message & { profile?: Profile })[])
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.user_id)
            .single()

          setMessages((prev) => [
            ...prev,
            { ...(payload.new as Message), profile: profile || undefined } as Message & { profile?: Profile },
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    try {
      setIsSending(true)
      await supabase.from("messages").insert({
        session_id: sessionId,
        user_id: userId,
        content: newMessage.trim(),
        type: "text",
      })
      setNewMessage("")
    } catch (error) {
      logger.error("Send message error", { error, sessionId, userId })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h3 className="font-bold font-mono">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            {message.type === "system" ? (
              <div className="text-center">
                <p className="text-xs text-textMuted">{message.content}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black text-xs font-bold">
                    {message.profile?.display_name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {message.profile?.display_name}
                  </span>
                  <span className="text-xs text-textMuted">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="text-sm text-textSecondary pl-8">
                  {message.content}
                </p>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
          />
          <Button type="submit" size="sm" disabled={isSending || !newMessage.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </form>
    </div>
  )
}
