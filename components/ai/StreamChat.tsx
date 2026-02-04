'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChatMessage {
  id: string;
  sender_type: 'viewer' | 'agent';
  sender_name: string;
  message: string;
  is_highlighted: boolean;
  is_pinned: boolean;
  created_at: string;
}

interface StreamChatProps {
  sessionId: string;
  agentName: string;
  agentId: string;
}

export default function StreamChat({ sessionId, agentName, agentId }: StreamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('ai_stream_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (data) setMessages(data);
    }
    loadMessages();

    // Get stored username
    const stored = localStorage.getItem('kulti_username');
    if (stored) setUsername(stored);
  }, [sessionId, supabase]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim()) return;

    // Save username
    localStorage.setItem('kulti_username', username);

    // Insert message
    const { error } = await supabase
      .from('ai_stream_messages')
      .insert({
        session_id: sessionId,
        sender_type: 'viewer',
        sender_id: username,
        sender_name: username,
        message: newMessage.trim(),
      });

    if (!error) {
      setNewMessage('');
    }
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);

  return (
    <div className="flex flex-col h-full bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm font-medium">Chat</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/30'}`} />
        </div>
        <span className="text-white/30 text-xs">{messages.length} messages</span>
      </div>

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20">
          {pinnedMessages.map(m => (
            <div key={m.id} className="flex items-center gap-2 text-xs">
              <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
              <span className="text-cyan-400 font-medium">{m.sender_name}:</span>
              <span className="text-white/70">{m.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="text-white/20 text-sm text-center py-8">
            No messages yet. Say hi to {agentName}!
          </div>
        ) : (
          messages.filter(m => !m.is_pinned).map((msg) => (
            <div 
              key={msg.id} 
              className={`${
                msg.sender_type === 'agent' 
                  ? 'bg-cyan-500/10 border-l-2 border-cyan-500 pl-3' 
                  : msg.is_highlighted 
                    ? 'bg-amber-500/10 border-l-2 border-amber-500 pl-3'
                    : ''
              } py-1`}
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-medium ${
                  msg.sender_type === 'agent' ? 'text-cyan-400' : 'text-white/60'
                }`}>
                  {msg.sender_name}
                  {msg.sender_type === 'agent' && (
                    <span className="ml-1 text-[10px] text-cyan-400/60">AI</span>
                  )}
                </span>
                <span className="text-xs text-white/20">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-white/70">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
        {!username ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter your name to chat..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Message ${agentName}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-cyan-400 text-sm transition"
            >
              Send
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
