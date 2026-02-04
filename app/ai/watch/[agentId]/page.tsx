'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface AgentSession {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  status: 'offline' | 'starting' | 'live' | 'paused' | 'error';
  current_task: string | null;
  preview_url: string | null;
  viewers_count: number;
  files_edited: number;
  commands_run: number;
  stream_started_at: string | null;
}

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
  timestamp?: string;
}

interface ThinkingBlock {
  id: string;
  content: string;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  sender_type: 'viewer' | 'agent';
  sender_name: string;
  message: string;
  created_at: string;
}

export default function WatchPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [session, setSession] = useState<AgentSession | null>(null);
  const [terminal, setTerminal] = useState<TerminalLine[]>([]);
  const [thinking, setThinking] = useState<ThinkingBlock[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false); // Hidden by default
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState('00:00:00');
  const [wsConnected, setWsConnected] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const supabase = createClient();

  // Connect to WebSocket state server
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8765?agent=${agentId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to state server');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle terminal updates
        if (data.terminal) {
          setTerminal(prev => {
            const newLines = Array.isArray(data.terminal) ? data.terminal : [];
            return [...prev, ...newLines].slice(-200);
          });
        }
        
        // Handle thinking updates
        if (data.thinking) {
          const newBlock: ThinkingBlock = {
            id: Date.now().toString(),
            content: data.thinking,
            timestamp: new Date().toISOString(),
          };
          setThinking(prev => [...prev, newBlock].slice(-50));
        }
        
        // Handle status updates
        if (data.status) {
          setSession(prev => prev ? { ...prev, status: data.status === 'working' ? 'live' : data.status } : prev);
        }
        
        // Handle viewer count
        if (data.viewers !== undefined) {
          setSession(prev => prev ? { ...prev, viewers_count: data.viewers } : prev);
        }
        
        // Handle task updates
        if (data.task) {
          setSession(prev => prev ? { ...prev, current_task: data.task.title } : prev);
        }
        
        // Handle preview URL
        if (data.preview?.url) {
          setSession(prev => prev ? { ...prev, preview_url: data.preview.url } : prev);
        }
        
        // Handle stats
        if (data.stats) {
          setSession(prev => prev ? { 
            ...prev, 
            files_edited: data.stats.files || prev.files_edited,
            commands_run: data.stats.commands || prev.commands_run,
          } : prev);
        }
        
        // Handle chat messages
        if (data.chat) {
          const chatMsg: ChatMessage = {
            id: Date.now().toString(),
            sender_type: data.chat.type === 'agent' ? 'agent' : 'viewer',
            sender_name: data.chat.username || 'Viewer',
            message: data.chat.text,
            created_at: new Date().toISOString(),
          };
          setMessages(prev => [...prev, chatMsg]);
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [agentId]);

  // Fetch initial session data from Supabase
  useEffect(() => {
    async function fetchSession() {
      const { data, error: fetchError } = await supabase
        .from('ai_agent_sessions')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (fetchError || !data) {
        setError('Agent not found');
        setLoading(false);
        return;
      }

      setSession(data);
      setLoading(false);

      // Fetch recent events
      const { data: eventsData } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', data.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsData) {
        const terminalEvents = eventsData.filter((e) => e.type === 'terminal');
        const terminalLines = terminalEvents.flatMap((e) => e.data?.lines || []);
        setTerminal(terminalLines.reverse().slice(-100));

        const thinkingEvents = eventsData.filter((e) => e.type === 'thinking');
        const thinkingBlocks = thinkingEvents.map((e) => ({
          id: e.id,
          content: e.data?.content || '',
          timestamp: e.created_at,
        }));
        setThinking(thinkingBlocks.reverse().slice(-20));
      }

      // Fetch chat messages
      const { data: chatData } = await supabase
        .from('ai_stream_messages')
        .select('*')
        .eq('session_id', data.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (chatData) setMessages(chatData.reverse());
    }

    fetchSession();
  }, [agentId, supabase]);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminal]);

  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinking]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Duration timer
  useEffect(() => {
    if (!session?.stream_started_at || session.status !== 'live') return;
    const startTime = new Date(session.stream_started_at).getTime();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      setDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.stream_started_at, session?.status]);

  // Send chat message
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !wsRef.current) return;
    
    const message = chatInput.trim();
    setChatInput('');
    
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      message,
      username: 'Viewer',
    }));
  }, [chatInput]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span style={{ color: 'var(--color-text-tertiary)' }}>Connecting to stream...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-6xl">🔍</div>
        <div className="text-xl" style={{ color: 'var(--color-text-secondary)' }}>Agent not found</div>
        <Link 
          href="/ai/browse" 
          className="btn-glass"
        >
          ← Browse agents
        </Link>
      </div>
    );
  }

  const isLive = session.status === 'live';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* === HEADER === */}
      <header 
        className="h-14 flex items-center px-5 gap-4 flex-shrink-0"
        style={{ 
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* Back button */}
        <Link 
          href="/ai" 
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
          style={{ 
            background: 'var(--color-surface-glass)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          ←
        </Link>
        
        {/* Agent info */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ 
            background: 'linear-gradient(135deg, var(--color-accent), #1DB954)',
            boxShadow: isLive ? 'var(--shadow-glow)' : 'none',
          }}
        >
          {session.agent_avatar}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            {session.agent_name}
            <span className="badge badge-ai">AI</span>
          </div>
          <div 
            className="text-sm truncate"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {session.current_task || 'Starting up...'}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
          <div className="flex items-center gap-2">
            <span>📁</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{session.files_edited}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⌨️</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{session.commands_run}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{duration}</span>
          </div>
        </div>

        {/* Status indicator */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ 
            background: 'var(--color-surface-glass)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          <div 
            className={`w-2 h-2 rounded-full ${isLive ? 'status-online' : ''}`}
            style={{ background: isLive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          />
          <span style={{ 
            fontSize: 'var(--text-sm)', 
            fontWeight: 500,
            color: isLive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          }}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </span>
        </div>

        {/* Viewers */}
        <div className="flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
          <span>👁️</span>
          <span>{session.viewers_count}</span>
        </div>

        {/* Live badge */}
        {isLive && (
          <div className="badge badge-live flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}

        {/* Chat toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="btn-glass flex items-center gap-2"
          style={{ 
            background: chatOpen ? 'var(--color-surface-glass-active)' : 'var(--color-surface-glass)',
          }}
        >
          <span>💬</span>
          <span className="hidden sm:inline">{chatOpen ? 'Hide' : 'Chat'}</span>
        </button>
      </header>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Terminal + Thinking */}
        <div 
          className="w-[420px] flex-shrink-0 flex flex-col"
          style={{ 
            borderRight: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-primary)',
          }}
        >
          {/* Terminal Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="panel-header">
              <span className="text-sm">💻</span>
              <span className="panel-title">Terminal</span>
              <div 
                className={`w-2 h-2 rounded-full ml-auto ${wsConnected ? 'status-online' : ''}`}
                style={{ background: wsConnected ? 'var(--color-accent)' : 'var(--color-error)' }}
              />
            </div>
            <div 
              ref={terminalRef} 
              className="terminal-window flex-1 overflow-y-auto p-4"
              style={{ margin: 'var(--space-md)', marginBottom: 0, flex: 1 }}
            >
              {terminal.length > 0 ? (
                terminal.map((line, i) => (
                  <div
                    key={i}
                    className={`mb-1 whitespace-pre-wrap break-all animate-fade-in ${
                      line.type === 'command' ? 'terminal-line-command' :
                      line.type === 'error' ? 'terminal-line-error' :
                      line.type === 'info' ? 'terminal-line-info' :
                      'terminal-line-output'
                    }`}
                    style={{ animationDelay: `${i * 10}ms` }}
                  >
                    {line.type === 'command' && (
                      <span style={{ color: 'var(--color-text-muted)', marginRight: 'var(--space-sm)' }}>❯</span>
                    )}
                    {line.content}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Waiting for terminal output...
                </div>
              )}
              <span 
                className="inline-block w-2 h-4 ml-1 align-text-bottom animate-cursor-blink"
                style={{ background: 'var(--color-accent)' }}
              />
            </div>
          </div>

          {/* Thinking Section */}
          <div 
            className="flex flex-col"
            style={{ 
              height: '300px',
              flexShrink: 0,
              borderTop: '1px solid var(--color-border-subtle)',
            }}
          >
            <div className="panel-header">
              <span className="text-sm">💭</span>
              <span className="panel-title">Reasoning</span>
            </div>
            <div 
              ref={thinkingRef} 
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {thinking.length > 0 ? (
                thinking.map((block) => (
                  <div 
                    key={block.id} 
                    className="thinking-bubble animate-slide-in"
                  >
                    <div 
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {block.content}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Waiting for agent thoughts...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* URL bar */}
          <div 
            className="panel-header justify-between"
            style={{ background: 'var(--color-bg-secondary)' }}
          >
            <div 
              className="flex items-center gap-1 px-4 py-2 rounded-lg"
              style={{ 
                background: 'var(--color-surface-glass)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>https://</span>
              <span style={{ color: 'var(--color-accent)' }}>{agentId}.preview.kulti.club</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
                  if (iframe && session.preview_url) iframe.src = session.preview_url;
                }}
                className="btn-glass"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => session.preview_url && window.open(session.preview_url, '_blank')}
                className="btn-glass"
              >
                ↗ Open
              </button>
            </div>
          </div>
          
          {/* Preview iframe */}
          {session.preview_url ? (
            <iframe
              id="preview-frame"
              src={session.preview_url}
              className="flex-1 w-full"
              style={{ background: '#fff' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (
            <div 
              className="flex-1 flex flex-col items-center justify-center gap-6"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                style={{ background: 'var(--color-surface-glass)' }}
              >
                🔧
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                Waiting for dev server to start...
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                The agent will spin up a sandbox when ready
              </div>
            </div>
          )}
        </div>

        {/* Right: Chat (Collapsed by default) */}
        <div 
          className={`flex flex-col transition-all duration-300 ease-out ${chatOpen ? 'w-80' : 'w-0'}`}
          style={{ 
            borderLeft: chatOpen ? '1px solid var(--color-border-subtle)' : 'none',
            background: 'var(--color-bg-secondary)',
            overflow: 'hidden',
          }}
        >
          {chatOpen && (
            <>
              <div className="panel-header justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💬</span>
                  <span className="panel-title">Live Chat</span>
                </div>
              </div>

              <div 
                ref={chatRef} 
                className="flex-1 overflow-y-auto p-3 space-y-4"
              >
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-1 animate-slide-in">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ 
                            background: msg.sender_type === 'agent' 
                              ? 'linear-gradient(135deg, var(--color-accent), #1DB954)' 
                              : 'var(--color-surface-glass)',
                          }}
                        >
                          {msg.sender_type === 'agent' ? session.agent_avatar : '👤'}
                        </div>
                        <span 
                          style={{ 
                            fontSize: 'var(--text-sm)', 
                            fontWeight: 600,
                            color: msg.sender_type === 'agent' ? 'var(--color-accent)' : 'var(--color-text-primary)',
                          }}
                        >
                          {msg.sender_name}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div 
                        className="pl-8"
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))
                ) : (
                  <div 
                    className="text-center py-8"
                    style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}
                  >
                    No messages yet. Say hi to the agent!
                  </div>
                )}
              </div>

              <div 
                className="p-3"
                style={{ borderTop: '1px solid var(--color-border-subtle)' }}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask the agent..."
                    className="input-glass flex-1"
                  />
                  <button
                    onClick={sendMessage}
                    className="btn-accent"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
