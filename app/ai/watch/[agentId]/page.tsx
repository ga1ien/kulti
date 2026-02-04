'use client';

import { useEffect, useState, useRef } from 'react';
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

interface TerminalLine { type: 'command' | 'output' | 'error' | 'success' | 'info'; content: string; }
interface ChatMessage { id: string; sender_type: 'viewer' | 'agent'; sender_name: string; message: string; created_at: string; }

export default function AIWatchPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  
  const [session, setSession] = useState<AgentSession | null>(null);
  const [terminal, setTerminal] = useState<TerminalLine[]>([]);
  const [thinking, setThinking] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState('00:00:00');
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSession() {
      const { data, error } = await supabase.from('ai_agent_sessions').select('*').eq('agent_id', agentId).single();
      if (error) { setError('Agent not found'); setLoading(false); return; }
      setSession(data); setLoading(false);

      const { data: chatData } = await supabase.from('ai_stream_messages').select('*').eq('session_id', data.id).order('created_at', { ascending: false }).limit(50);
      if (chatData) setMessages(chatData.reverse());

      const { data: eventsData } = await supabase.from('ai_stream_events').select('*').eq('session_id', data.id).order('created_at', { ascending: false }).limit(100);
      if (eventsData) {
        const terminalEvents = eventsData.filter(e => e.type === 'terminal').flatMap(e => e.data.lines || []);
        setTerminal(terminalEvents.reverse().slice(-100));
        const thinkingEvent = eventsData.find(e => e.type === 'thinking');
        if (thinkingEvent) setThinking(thinkingEvent.data.content || '');
      }
    }
    fetchSession();
  }, [agentId, supabase]);

  useEffect(() => {
    if (!session) return;
    const sessionChannel = supabase.channel('session-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_agent_sessions', filter: `agent_id=eq.${agentId}` }, (p) => setSession(p.new as AgentSession))
      .subscribe();
    const eventsChannel = supabase.channel('stream-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_stream_events', filter: `session_id=eq.${session.id}` }, (p) => {
        const e = p.new as { type: string; data: any };
        if (e.type === 'terminal' && e.data.lines) setTerminal(prev => [...prev, ...e.data.lines].slice(-100));
        else if (e.type === 'thinking') setThinking(e.data.content || '');
      }).subscribe();
    const chatChannel = supabase.channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_stream_messages', filter: `session_id=eq.${session.id}` }, (p) => setMessages(prev => [...prev, p.new as ChatMessage]))
      .subscribe();
    return () => { supabase.removeChannel(sessionChannel); supabase.removeChannel(eventsChannel); supabase.removeChannel(chatChannel); };
  }, [session, agentId, supabase]);

  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [terminal]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  useEffect(() => {
    if (!session?.stream_started_at || session.status !== 'live') return;
    const startTime = new Date(session.stream_started_at).getTime();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const h = Math.floor(elapsed / 3600000), m = Math.floor((elapsed % 3600000) / 60000), s = Math.floor((elapsed % 60000) / 1000);
      setDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.stream_started_at, session?.status]);

  async function sendMessage() {
    if (!chatInput.trim() || !session) return;
    const message = chatInput.trim(); setChatInput('');
    await supabase.from('ai_stream_messages').insert({ session_id: session.id, sender_type: 'viewer', sender_id: 'anonymous', sender_name: 'Viewer', message });
  }

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-zinc-400">Loading...</div></div>;
  if (error || !session) return <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4"><div className="text-6xl">🔍</div><div className="text-xl text-zinc-400">Agent not found</div><Link href="/ai/browse" className="text-green-500 hover:underline">← Browse agents</Link></div>;

  const isLive = session.status === 'live';

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-5 gap-4 flex-shrink-0">
        <Link href="/ai" className="text-zinc-400 hover:text-white">←</Link>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-lg">{session.agent_avatar}</div>
        <div className="flex-1"><div className="font-semibold flex items-center gap-2">{session.agent_name}<span className="text-[10px] px-1.5 py-0.5 bg-green-500 text-zinc-950 rounded font-bold">AI</span></div><div className="text-sm text-zinc-400 truncate">{session.current_task || 'No active task'}</div></div>
        <div className="flex items-center gap-5 text-sm text-zinc-500"><div className="flex items-center gap-1.5"><span>📁</span><span className="text-white font-medium">{session.files_edited}</span></div><div className="flex items-center gap-1.5"><span>⌨️</span><span className="text-white font-medium">{session.commands_run}</span></div><div className="flex items-center gap-1.5"><span>⏱️</span><span className="text-white font-medium font-mono">{duration}</span></div></div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700"><div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} /><span className={`text-sm font-medium ${isLive ? 'text-green-500' : 'text-zinc-500'}`}>{session.status}</span></div>
        <div className="flex items-center gap-1.5 text-sm text-zinc-400"><span>👁️</span><span>{session.viewers_count}</span></div>
        {isLive && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded text-sm font-bold"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE</div>}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-zinc-800 flex flex-col flex-shrink-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2 flex-shrink-0"><span>💻</span><span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Terminal</span></div>
            <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {terminal.map((line, i) => <div key={i} className={`mb-0.5 whitespace-pre-wrap break-all ${line.type === 'command' ? 'text-green-500' : line.type === 'error' ? 'text-red-500' : line.type === 'success' ? 'text-green-400' : line.type === 'info' ? 'text-amber-500' : 'text-zinc-400'}`}>{line.type === 'command' && <span className="text-zinc-600">❯ </span>}{line.content}</div>)}
              {terminal.length === 0 && <div className="text-zinc-600 italic">Waiting for terminal output...</div>}
            </div>
          </div>
          <div className="h-72 border-t border-zinc-800 flex flex-col flex-shrink-0">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2 flex-shrink-0"><span>💭</span><span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Thinking</span></div>
            <div className="flex-1 overflow-y-auto p-4 text-sm text-zinc-300 leading-relaxed">{thinking ? <div dangerouslySetInnerHTML={{ __html: thinking.replace(/\n/g, '<br/>') }} /> : <div className="text-zinc-600 italic">Waiting for agent thoughts...</div>}<span className="inline-block w-0.5 h-4 bg-green-500 animate-pulse ml-0.5" /></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded text-xs font-mono text-zinc-400"><span className="text-zinc-600">https://</span><span className="text-green-500">{agentId}.preview.kulti.club</span></div>
            <div className="flex gap-2">
              <button onClick={() => { const f = document.getElementById('preview-frame') as HTMLIFrameElement; if (f && session.preview_url) f.src = session.preview_url; }} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white transition">↻ Refresh</button>
              <button onClick={() => session.preview_url && window.open(session.preview_url, '_blank')} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white transition">↗ Open</button>
            </div>
          </div>
          {session.preview_url ? <iframe id="preview-frame" src={session.preview_url} className="flex-1 w-full bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /> : <div className="flex-1 bg-zinc-900 flex flex-col items-center justify-center gap-4 text-zinc-600"><div className="text-5xl">🔧</div><div>Waiting for dev server to start...</div></div>}
        </div>

        <div className={`border-l border-zinc-800 flex flex-col bg-zinc-900 transition-all ${chatCollapsed ? 'w-12' : 'w-80'}`}>
          {chatCollapsed ? <div className="flex flex-col items-center pt-4 gap-4"><button onClick={() => setChatCollapsed(false)} className="w-9 h-9 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition">💬</button></div> : <>
            <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0"><div className="flex items-center gap-2"><span>💬</span><span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Chat</span></div><button onClick={() => setChatCollapsed(true)} className="w-7 h-7 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition text-xs">→</button></div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => <div key={msg.id} className="space-y-1"><div className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${msg.sender_type === 'agent' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-zinc-800'}`}>{msg.sender_type === 'agent' ? session.agent_avatar : '👤'}</div><span className={`text-xs font-semibold ${msg.sender_type === 'agent' ? 'text-green-500' : 'text-white'}`}>{msg.sender_name}</span><span className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><div className="text-sm text-zinc-300 pl-8">{msg.message}</div></div>)}
              {messages.length === 0 && <div className="text-center text-zinc-600 text-sm py-8">No messages yet. Say hi!</div>}
            </div>
            <div className="p-3 border-t border-zinc-800"><div className="flex gap-2"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask the agent..." className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 outline-none focus:border-green-500 transition" /><button onClick={sendMessage} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-semibold text-zinc-950 transition">Send</button></div></div>
          </>}
        </div>
      </div>
    </div>
  );
}
