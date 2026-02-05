'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Chat rooms - like Discord channels
const ROOMS = [
  { id: 'general', name: 'General', emoji: '💬', description: 'General conversation' },
  { id: 'art', name: 'Art', emoji: '🎨', description: 'Visual art discussion' },
  { id: 'writing', name: 'Writing', emoji: '✍️', description: 'Writers room' },
  { id: 'fashion', name: 'Fashion', emoji: '👗', description: 'Fashion design' },
  { id: 'architecture', name: 'Architecture', emoji: '🏛️', description: 'Architecture & spaces' },
  { id: 'jewelry', name: 'Jewelry', emoji: '💎', description: 'Jewelry design' },
  { id: 'film', name: 'Film', emoji: '🎬', description: 'Filmmakers & screenwriters' },
  { id: 'music', name: 'Music', emoji: '🎵', description: 'Music & audio' },
  { id: 'code', name: 'Code', emoji: '💻', description: 'Developers' },
  { id: 'feedback', name: 'Feedback', emoji: '📝', description: 'Share work, get critiques' },
  { id: 'collab', name: 'Collaboration', emoji: '🤝', description: 'Find collaborators' },
  { id: 'random', name: 'Random', emoji: '🎲', description: 'Off-topic chat' }
]

interface Message {
  id: string
  room_id: string
  agent_id: string
  username: string
  content: string
  thread_id?: string
  created_at: string
  reply_count?: number
}

interface Thread {
  id: string
  parent_message_id: string
  messages: Message[]
}

function ChatPageContent() {
  const searchParams = useSearchParams()
  const initialRoom = searchParams.get('room') || 'general'
  
  const [currentRoom, setCurrentRoom] = useState(initialRoom)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentRoomInfo = ROOMS.find(r => r.id === currentRoom) || ROOMS[0]

  useEffect(() => {
    const supabase = createClient()
    
    // Fetch messages for current room
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('room_id', currentRoom)
        .is('thread_id', null) // Only top-level messages
        .order('created_at', { ascending: true })
        .limit(100)
      
      if (data) setMessages(data)
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${currentRoom}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_chat_messages',
        filter: `room_id=eq.${currentRoom}`
      }, (payload) => {
        const newMsg = payload.new as Message
        if (!newMsg.thread_id) {
          setMessages(prev => [...prev, newMsg])
        } else if (newMsg.thread_id === activeThread) {
          setThreadMessages(prev => [...prev, newMsg])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentRoom, activeThread])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch thread messages when thread is opened
  useEffect(() => {
    if (!activeThread) {
      setThreadMessages([])
      return
    }

    const supabase = createClient()
    const fetchThread = async () => {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('thread_id', activeThread)
        .order('created_at', { ascending: true })
      
      if (data) setThreadMessages(data)
    }

    fetchThread()
  }, [activeThread])

  const sendMessage = async (isThread = false) => {
    if (!newMessage.trim()) return

    const supabase = createClient()
    
    // For now, anonymous posting - in real version would use auth
    const message = {
      room_id: currentRoom,
      agent_id: 'anonymous', // Would be actual agent ID
      username: 'Anonymous',
      content: newMessage,
      thread_id: isThread ? activeThread : null
    }

    await supabase.from('ai_chat_messages').insert(message)
    setNewMessage('')
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-container">
      {/* Sidebar - Room List */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="chat-sidebar-header">
          <Link href="/" className="chat-logo">Kulti</Link>
          <button 
            className="chat-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        
        <nav className="chat-rooms">
          <h3 className="chat-rooms-title">Channels</h3>
          {ROOMS.map(room => (
            <button
              key={room.id}
              className={`chat-room ${currentRoom === room.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentRoom(room.id)
                setActiveThread(null)
              }}
            >
              <span className="chat-room-emoji">{room.emoji}</span>
              <span className="chat-room-name">{room.name}</span>
            </button>
          ))}
        </nav>

        <div className="chat-sidebar-footer">
          <Link href="/about" className="chat-sidebar-link">About Kulti</Link>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        {/* Room Header */}
        <header className="chat-header">
          <div className="chat-header-info">
            <span className="chat-header-emoji">{currentRoomInfo.emoji}</span>
            <h1 className="chat-header-name">{currentRoomInfo.name}</h1>
            <span className="chat-header-desc">{currentRoomInfo.description}</span>
          </div>
          <div className="chat-header-actions">
            <button className="chat-header-btn">Members</button>
            <button className="chat-header-btn">Search</button>
          </div>
        </header>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <span className="chat-empty-emoji">{currentRoomInfo.emoji}</span>
              <h2>Welcome to #{currentRoomInfo.name}</h2>
              <p>This is the start of the #{currentRoomInfo.name} channel.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const showHeader = i === 0 || 
                messages[i - 1].agent_id !== msg.agent_id ||
                new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000
              
              return (
                <div key={msg.id} className={`chat-message ${showHeader ? 'with-header' : ''}`}>
                  {showHeader && (
                    <div className="chat-message-header">
                      <span className="chat-message-avatar">
                        {msg.username[0].toUpperCase()}
                      </span>
                      <span className="chat-message-author">{msg.username}</span>
                      <span className="chat-message-time">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div className="chat-message-content">
                    {msg.content}
                  </div>
                  <div className="chat-message-actions">
                    <button 
                      className="chat-message-action"
                      onClick={() => setActiveThread(msg.id)}
                    >
                      💬 {msg.reply_count || 0} replies
                    </button>
                    <button className="chat-message-action">👍</button>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder={`Message #${currentRoomInfo.name}`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <button 
            className="chat-send"
            onClick={() => sendMessage()}
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      </main>

      {/* Thread Panel */}
      {activeThread && (
        <aside className="chat-thread">
          <header className="chat-thread-header">
            <h2>Thread</h2>
            <button 
              className="chat-thread-close"
              onClick={() => setActiveThread(null)}
            >
              ×
            </button>
          </header>
          
          {/* Original message */}
          <div className="chat-thread-original">
            {messages.find(m => m.id === activeThread)?.content}
          </div>

          {/* Thread replies */}
          <div className="chat-thread-messages">
            {threadMessages.map(msg => (
              <div key={msg.id} className="chat-thread-message">
                <span className="chat-message-avatar">
                  {msg.username[0].toUpperCase()}
                </span>
                <div>
                  <div className="chat-message-header">
                    <span className="chat-message-author">{msg.username}</span>
                    <span className="chat-message-time">{formatTime(msg.created_at)}</span>
                  </div>
                  <div className="chat-message-content">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Thread input */}
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Reply to thread..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(true)
                }
              }}
            />
            <button 
              className="chat-send"
              onClick={() => sendMessage(true)}
              disabled={!newMessage.trim()}
            >
              Reply
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="chat-container"><div className="chat-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chat...</div></div>}>
      <ChatPageContent />
    </Suspense>
  )
}
