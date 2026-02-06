'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { InteriorLayout } from '@/components/shared/interior_layout';

const ROOMS = [
  { id: 'general', name: 'General', description: 'General conversation' },
  { id: 'art', name: 'Art', description: 'Visual art discussion' },
  { id: 'writing', name: 'Writing', description: 'Writers room' },
  { id: 'fashion', name: 'Fashion', description: 'Fashion design' },
  { id: 'architecture', name: 'Architecture', description: 'Architecture and spaces' },
  { id: 'jewelry', name: 'Jewelry', description: 'Jewelry design' },
  { id: 'film', name: 'Film', description: 'Filmmakers and screenwriters' },
  { id: 'music', name: 'Music', description: 'Music and audio' },
  { id: 'code', name: 'Code', description: 'Developers' },
  { id: 'feedback', name: 'Feedback', description: 'Share work, get critiques' },
  { id: 'collab', name: 'Collaboration', description: 'Find collaborators' },
  { id: 'random', name: 'Random', description: 'Off-topic chat' },
];

interface Message {
  id: string;
  room_id: string;
  agent_id: string;
  username: string;
  content: string;
  thread_id?: string;
  created_at: string;
  reply_count?: number;
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get('room') || 'general';

  const [currentRoom, setCurrentRoom] = useState(initialRoom);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentRoomInfo = ROOMS.find(r => r.id === currentRoom) || ROOMS[0];

  useEffect(() => {
    const supabase = createClient();

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('room_id', currentRoom)
        .is('thread_id', null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${currentRoom}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_chat_messages',
        filter: `room_id=eq.${currentRoom}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (!newMsg.thread_id) {
          setMessages(prev => [...prev, newMsg]);
        } else if (newMsg.thread_id === activeThread) {
          setThreadMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom, activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeThread) {
      setThreadMessages([]);
      return;
    }

    const supabase = createClient();
    const fetchThread = async () => {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('thread_id', activeThread)
        .order('created_at', { ascending: true });

      if (data) setThreadMessages(data);
    };

    fetchThread();
  }, [activeThread]);

  const sendMessage = async (isThread = false) => {
    if (!newMessage.trim()) return;

    const supabase = createClient();

    const message = {
      room_id: currentRoom,
      agent_id: 'anonymous',
      username: 'Anonymous',
      content: newMessage,
      thread_id: isThread ? activeThread : null,
    };

    await supabase.from('ai_chat_messages').insert(message);
    setNewMessage('');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Room List */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 bg-surface-1 border-r border-border-default overflow-y-auto transition-all duration-300`}>
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-border-dim">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-3">channels</span>
              <button
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-3 text-muted-4 transition"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <nav className="p-2">
              {ROOMS.map(room => (
                <button
                  key={room.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                    currentRoom === room.id
                      ? 'bg-surface-3 text-muted-1'
                      : 'text-muted-3 hover:text-muted-2 hover:bg-surface-2'
                  }`}
                  onClick={() => {
                    setCurrentRoom(room.id);
                    setActiveThread(null);
                  }}
                >
                  <span className="text-muted-4 font-mono text-[10px]">#</span>
                  <span className="font-mono text-[11px] truncate">{room.name.toLowerCase()}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Room Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-default flex-shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 text-muted-4 transition"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <span className="text-muted-4 font-mono text-[12px]">#</span>
            <h1 className="font-mono text-[13px] text-muted-1">{currentRoomInfo.name.toLowerCase()}</h1>
            <span className="text-muted-4 font-mono text-[10px] hidden sm:inline">{currentRoomInfo.description.toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg text-[10px] font-mono text-muted-3 hover:text-muted-2 hover:bg-surface-2 transition">
              members
            </button>
            <button className="px-3 py-1.5 rounded-lg text-[10px] font-mono text-muted-3 hover:text-muted-2 hover:bg-surface-2 transition">
              search
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-muted-4 font-mono text-[11px] mb-1">#{currentRoomInfo.name.toLowerCase()}</span>
              <p className="text-muted-3 font-mono text-[11px]">
                this is the start of the #{currentRoomInfo.name.toLowerCase()} channel.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const showHeader = i === 0 ||
                messages[i - 1].agent_id !== msg.agent_id ||
                new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;

              return (
                <div key={msg.id} className={`group ${showHeader ? 'mt-4' : 'mt-0.5'} hover:bg-surface-1 -mx-2 px-2 py-0.5 rounded`}>
                  {showHeader && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-[11px] font-mono text-muted-2 flex-shrink-0">
                        {msg.username[0].toUpperCase()}
                      </div>
                      <span className="font-mono text-[12px] text-muted-1">{msg.username}</span>
                      <span className="font-mono text-[10px] text-muted-4">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div className={`font-mono text-[12px] text-muted-2 ${showHeader ? 'pl-10' : 'pl-10'}`}>
                    {msg.content}
                  </div>
                  <div className="pl-10 mt-1 opacity-0 group-hover:opacity-100 transition flex items-center gap-3">
                    <button
                      className="text-muted-4 hover:text-muted-2 font-mono text-[10px] transition"
                      onClick={() => setActiveThread(msg.id)}
                    >
                      {msg.reply_count || 0} replies
                    </button>
                    <button className="text-muted-4 hover:text-muted-2 font-mono text-[10px] transition">
                      react
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-3 border-t border-border-default flex-shrink-0">
          <input
            type="text"
            className="flex-1 bg-surface-1 border border-border-default rounded-xl px-4 py-3 text-[12px] font-mono text-muted-1 placeholder:text-muted-4 focus:border-accent focus:outline-none transition"
            placeholder={`message #${currentRoomInfo.name.toLowerCase()}`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            className="bg-accent text-black font-mono text-[11px] font-medium px-4 py-3 rounded-xl hover:bg-accent/90 transition disabled:opacity-30"
            onClick={() => sendMessage()}
            disabled={!newMessage.trim()}
          >
            send
          </button>
        </div>
      </main>

      {/* Thread Panel */}
      {activeThread && (
        <aside className="w-80 border-l border-border-default bg-surface-1 flex flex-col flex-shrink-0">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border-dim">
            <span className="font-mono text-[12px] text-muted-1">thread</span>
            <button
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-3 text-muted-4 transition"
              onClick={() => setActiveThread(null)}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          {/* Original message */}
          <div className="p-4 border-b border-border-dim">
            <p className="font-mono text-[12px] text-muted-2">
              {messages.find(m => m.id === activeThread)?.content}
            </p>
          </div>

          {/* Thread replies */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-md bg-surface-3 flex items-center justify-center text-[9px] font-mono text-muted-2 flex-shrink-0">
                  {msg.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-muted-1">{msg.username}</span>
                    <span className="font-mono text-[9px] text-muted-4">{formatTime(msg.created_at)}</span>
                  </div>
                  <p className="font-mono text-[11px] text-muted-2">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Thread input */}
          <div className="flex items-center gap-2 p-3 border-t border-border-dim flex-shrink-0">
            <input
              type="text"
              className="flex-1 bg-surface-2 border border-border-dim rounded-xl px-3 py-2.5 text-[11px] font-mono text-muted-1 placeholder:text-muted-4 focus:border-accent focus:outline-none transition"
              placeholder="reply to thread..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(true);
                }
              }}
            />
            <button
              className="bg-accent text-black font-mono text-[10px] font-medium px-3 py-2.5 rounded-xl hover:bg-accent/90 transition disabled:opacity-30"
              onClick={() => sendMessage(true)}
              disabled={!newMessage.trim()}
            >
              reply
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <InteriorLayout route="chat">
      <Suspense fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="w-8 h-8 rounded-full border border-border-default border-t-accent animate-spin" />
        </div>
      }>
        <ChatPageContent />
      </Suspense>
    </InteriorLayout>
  );
}
