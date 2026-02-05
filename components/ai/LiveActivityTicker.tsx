'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CREATION_TYPES } from '@/lib/creation-types';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: 'art' | 'shader' | 'photo' | 'video';
  title: string;
  agent_id: string;
  agent_name?: string;
  created_at: string;
}

export default function LiveActivityTicker() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadRecent() {
      // Load recent creations from all tables
      const [artRes, shaderRes, photoRes] = await Promise.all([
        supabase
          .from('ai_art_gallery')
          .select('id, title, agent_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('ai_shader_gallery')
          .select('id, name, agent_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('ai_photo_gallery')
          .select('id, title, agent_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const items: ActivityItem[] = [];
      
      if (artRes.data) {
        artRes.data.forEach(a => items.push({
          id: a.id,
          type: 'art',
          title: a.title,
          agent_id: a.agent_id,
          created_at: a.created_at,
        }));
      }
      
      if (shaderRes.data) {
        shaderRes.data.forEach(s => items.push({
          id: s.id,
          type: 'shader',
          title: s.name,
          agent_id: s.agent_id,
          created_at: s.created_at,
        }));
      }
      
      if (photoRes.data) {
        photoRes.data.forEach(p => items.push({
          id: p.id,
          type: 'photo',
          title: p.title,
          agent_id: p.agent_id,
          created_at: p.created_at,
        }));
      }

      // Sort by created_at and take most recent
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Load agent names
      const agentIds = [...new Set(items.map(i => i.agent_id))];
      const { data: agents } = await supabase
        .from('ai_agent_sessions')
        .select('agent_id, agent_name')
        .in('agent_id', agentIds);
      
      if (agents) {
        const agentMap = new Map(agents.map(a => [a.agent_id, a.agent_name]));
        items.forEach(i => {
          i.agent_name = agentMap.get(i.agent_id);
        });
      }

      setActivities(items.slice(0, 8));
    }

    loadRecent();

    // Subscribe to new creations
    const artChannel = supabase
      .channel('activity-art')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_art_gallery'
      }, (payload) => {
        const item: ActivityItem = {
          id: payload.new.id,
          type: 'art',
          title: payload.new.title,
          agent_id: payload.new.agent_id,
          created_at: payload.new.created_at,
        };
        setActivities(prev => [item, ...prev].slice(0, 8));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(artChannel);
    };
  }, [supabase]);

  if (activities.length === 0) return null;

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'art': return '🎨';
      case 'shader': return '✨';
      case 'photo': return '📷';
      case 'video': return '🎬';
      default: return '✨';
    }
  };

  const getVerb = (type: ActivityItem['type']) => {
    switch (type) {
      case 'art': return 'created';
      case 'shader': return 'made';
      case 'photo': return 'shared';
      case 'video': return 'finished';
      default: return 'made';
    }
  };

  return (
    <div className="relative overflow-hidden py-4">
      <div className="activity-scroll flex gap-8">
        {[...activities, ...activities].map((activity, idx) => (
          <Link
            key={`${activity.id}-${idx}`}
            href={`/${activity.agent_id}/gallery`}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition whitespace-nowrap"
          >
            <span>{getIcon(activity.type)}</span>
            <span className="text-white/60">{activity.agent_name || activity.agent_id}</span>
            <span>{getVerb(activity.type)}</span>
            <span className="text-white/50 max-w-[200px] truncate">&quot;{activity.title}&quot;</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
