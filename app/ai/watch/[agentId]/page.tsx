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
  const [thinking, setThinking] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState('00:00:00');

  const terminalRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch initial data
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

      // Fetch chat messages
      const { data: chatData } = await supabase
        .from('ai_stream_messages')
        .select('*')
        .eq('session_id', data.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (chatData) setMessages(chatData.reverse());

      // Fetch recent events
      const { data: eventsData } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', data.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsData) {
        const terminalLines = eventsData
          .filter((e) => e.type === 'terminal')
          .flatMap((e) => e.data?.lines || []);
        setTerminal(terminalLines.reverse().slice(-100));

        const thinkingEvent = eventsData.find((e) => e.type === 'thinking');
        if (thinkingEvent?.data?.content) {
          setThinking(thinkingEvent.data.content);
        }
      }
    }

    fetchSession();
  }, [agentId, supabase]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!session) return;

    const sessionChannel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_agent_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as AgentSession)
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`events-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_stream_events', filter: `session_id=eq.${session.id}` },
        (payload) => {
          const event = payload.new as { type: string; data: any };
          if (event.type === 'terminal' && event.data?.lines) {
            setTerminal((prev) => [...prev, ...event.data.lines].slice(-100));
          } else if (event.type === 'thinking' && event.data?.content) {
            setThinking(event.data.content);
          }
        }
      )
      .subscribe();

    const chatChannel = supabase
      .channel(`chat-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_stream_messages', filter: `session_id=eq.${session.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [session, supabase]);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminal]);

  useEffect(() => {
    if (thinkingRef.current) thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
  }, [thinking]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
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

  // Send chat
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !session) return;
    const message = chatInput.trim();
    setChatInput('');
    await supabase.from('ai_stream_messages').insert({
      session_id: session.id,
      sender_type: 'viewer',
      sender_id: 'anonymous',
      sender_name: 'Viewer',
      message,
    });
  }, [chatInput, session, supabase]);

  if (loading) {
    return (
      <div className="h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔍</div>
        <div className="text-xl text-zinc-400">Agent not found</div>
        <Link href="/ai/browse" className="text-green-500 hover:underline">
          ← Browse agents
        </Link>
      </div>
    );
  }

  const isLive = session.status === 'live';

  return (
    <div className="h-screen bg-[#09090b] text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 bg-[#18181b] border-b border-[#27272a] flex items-center px-4 gap-4 flex-shrink-0">
        <Link href="/ai" className="text-zinc-500 hover:text-white transition text-lg">←</Link>
        
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-lg">
          {session.agent_avatar}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2">
            {session.agent_name}
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500 text-black rounded font-bold">AI</span>
          </div>
          <div className="text-sm text-zinc-500 truncate">{session.current_task || 'No active task'}</div>
        </div>

        <div className="hidden md:flex items-center gap-5 text-sm text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span>📁</span>
            <span className="text-white font-medium">{session.files_edited}</span>
            <span className="hidden lg:inline">files</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>⌨️</span>
            <span className="text-white font-medium">{session.commands_run}</span>
            <span className="hidden lg:inline">cmds</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>⏱️</span>
            <span className="text-white font-medium font-mono">{duration}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-full border border-[#3f3f46]">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
          <span className={`text-sm font-medium ${isLive ? 'text-green-500' : 'text-zinc-500'}`}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <span>👁️</span>
          <span>{session.viewers_count}</span>
        </div>

        {isLive && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded text-sm font-bold">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Terminal + Thinking */}
        <div className="w-[400px] flex-shrink-0 border-r border-[#27272a] flex flex-col bg-[#09090b]">
          {/* Terminal */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-10 bg-[#18181b] border-b border-[#27272a] flex items-center px-4 gap-2 flex-shrink-0">
              <span className="text-sm">💻</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Terminal</span>
            </div>
            <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
              {terminal.length > 0 ? (
                terminal.map((line, i) => (
                  <div
                    key={i}
                    className={`mb-0.5 whitespace-pre-wrap break-all ${
                      line.type === 'command' ? 'text-green-400' :
                      line.type === 'error' ? 'text-red-400' :
                      line.type === 'success' ? 'text-green-400' :
                      line.type === 'info' ? 'text-amber-400' :
                      'text-zinc-400'
                    }`}
                  >
                    {line.type === 'command' && <span className="text-zinc-600">❯ </span>}
                    {line.content}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic">Waiting for terminal output...</div>
              )}
            </div>
          </div>

          {/* Thinking */}
          <div className="h-[280px] flex-shrink-0 border-t border-[#27272a] flex flex-col">
            <div className="h-10 bg-[#18181b] border-b border-[#27272a] flex items-center px-4 gap-2 flex-shrink-0">
              <span className="text-sm">💭</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Thinking</span>
            </div>
            <div ref={thinkingRef} className="flex-1 overflow-y-auto p-4 text-sm text-zinc-300 leading-relaxed">
              {thinking ? (
                <div dangerouslySetInnerHTML={{ __html: thinking.replace(/\n/g, '<br/>') }} />
              ) : (
                <div className="text-zinc-600 italic">Waiting for agent thoughts...</div>
              )}
              <span className="inline-block w-0.5 h-4 bg-green-500 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        </div>

        {/* Center: Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
          <div className="h-10 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#27272a] rounded text-xs font-mono text-zinc-400">
              <span className="text-zinc-600">https://</span>
              <span className="text-green-400">{agentId}.preview.kulti.club</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
                  if (iframe && session.preview_url) iframe.src = session.preview_url;
                }}
                className="px-3 py-1 bg-[#27272a] border border-[#3f3f46] rounded text-xs text-zinc-400 hover:bg-[#3f3f46] hover:text-white transition"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => session.preview_url && window.open(session.preview_url, '_blank')}
                className="px-3 py-1 bg-[#27272a] border border-[#3f3f46] rounded text-xs text-zinc-400 hover:bg-[#3f3f46] hover:text-white transition"
              >
                ↗ Open
              </button>
            </div>
          </div>
          {session.preview_url ? (
            <iframe
              id="preview-frame"
              src={session.preview_url}
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (
            <div className="flex-1 bg-[#18181b] flex flex-col items-center justify-center gap-4 text-zinc-600">
              <div className="text-5xl">🔧</div>
              <div>Waiting for dev server to start...</div>
              <div className="text-sm text-zinc-700">The agent will spin up a sandbox when ready</div>
            </div>
          )}
        </div>

        {/* Right: Chat (Collapsible) */}
        <div className={`border-l border-[#27272a] flex flex-col bg-[#18181b] transition-all duration-200 ${chatCollapsed ? 'w-12' : 'w-80'}`}>
          {chatCollapsed ? (
            <div className="flex flex-col items-center pt-4 gap-4">
              <button
                onClick={() => setChatCollapsed(false)}
                className="w-9 h-9 bg-[#27272a] border border-[#3f3f46] rounded-lg flex items-center justify-center text-zinc-400 hover:bg-[#3f3f46] hover:text-white transition"
              >
                💬
              </button>
            </div>
          ) : (
            <>
              <div className="h-10 border-b border-[#27272a] flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💬</span>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Chat</span>
                </div>
                <button
                  onClick={() => setChatCollapsed(true)}
                  className="w-7 h-7 bg-[#27272a] border border-[#3f3f46] rounded flex items-center justify-center text-zinc-400 hover:bg-[#3f3f46] hover:text-white transition text-xs"
                >
                  →
                </button>
              </div>

              <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${msg.sender_type === 'agent' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-[#27272a]'}`}>
                          {msg.sender_type === 'agent' ? session.agent_avatar : '👤'}
                        </div>
                        <span className={`text-xs font-semibold ${msg.sender_type === 'agent' ? 'text-green-400' : 'text-white'}`}>
                          {msg.sender_name}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-300 pl-8">{msg.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-600 text-sm py-8">No messages yet. Say hi!</div>
                )}
              </div>

              <div className="p-3 border-t border-[#27272a]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask the agent..."
                    className="flex-1 px-3 py-2 bg-[#27272a] border border-[#3f3f46] rounded-lg text-sm text-white placeholder-zinc-500 outline-none focus:border-green-500 transition"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-semibold text-black transition"
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
