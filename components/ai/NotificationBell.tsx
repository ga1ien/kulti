'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  type: 'stream_live' | 'new_art' | 'followed_you' | 'mentioned' | 'response';
  agent_id: string;
  title: string;
  body: string | null;
  data: any;
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  agentId?: string; // For agent-specific notifications
}

export default function NotificationBell({ agentId }: NotificationBellProps = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const supabase = createClient();

  // Get or create guest ID for anonymous users
  useEffect(() => {
    let id = localStorage.getItem('kulti_guest_id');
    if (!id) {
      id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('kulti_guest_id', id);
    }
    setGuestId(id);
  }, []);

  // Load notifications - either for an agent or a guest
  useEffect(() => {
    const targetId = agentId || guestId;
    if (!targetId) return;

    async function load() {
      // Query by agent_id if provided, otherwise by guest_id
      let query = supabase
        .from('ai_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (agentId) {
        query = query.eq('agent_id', agentId);
      } else {
        query = query.eq('guest_id', guestId);
      }
      
      const { data } = await query;
      if (data) setNotifications(data);
    }
    load();

    // Realtime subscription
    const filterField = agentId ? 'agent_id' : 'guest_id';
    const filterValue = agentId || guestId;
    
    const channel = supabase
      .channel(`notifications-${filterValue}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_notifications',
        filter: `${filterField}=eq.${filterValue}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agentId, guestId, supabase]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from('ai_notifications')
      .update({ read: true })
      .eq('id', id);
    
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  }, [supabase]);

  const markAllRead = useCallback(async () => {
    const targetId = agentId || guestId;
    if (!targetId) return;
    
    let query = supabase
      .from('ai_notifications')
      .update({ read: true })
      .eq('read', false);
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    } else {
      query = query.eq('guest_id', guestId);
    }
    
    await query;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [agentId, guestId, supabase]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'stream_live': return '🔴';
      case 'new_art': return '🎨';
      case 'followed_you': return '👋';
      case 'mentioned': return '💬';
      case 'response': return '🔄';
      default: return '⚡';
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-white/[0.04] transition"
      >
        <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 z-50 glass rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/80">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-cyan-400/70 hover:text-cyan-400 transition"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-2xl mb-2">🔔</div>
                  <p className="text-sm text-white/30">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  // For response notifications, link to the response piece
                  const href = n.type === 'response' && n.data?.respondingAgent && n.data?.responseId
                    ? `/${n.data.respondingAgent}/gallery?item=${n.data.responseId}`
                    : `/${n.agent_id}`;
                  
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => {
                        markAsRead(n.id);
                        setIsOpen(false);
                      }}
                      className={`block px-4 py-3 hover:bg-white/[0.02] transition border-b border-white/[0.02] ${
                        !n.read ? 'bg-cyan-500/[0.03]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${n.read ? 'text-white/50' : 'text-white/80'}`}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-white/30 mt-0.5 truncate">{n.body}</p>
                          )}
                          <p className="text-[10px] text-white/20 mt-1">{formatTime(n.created_at)}</p>
                        </div>
                        {!n.read && (
                          <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
