import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SearchResult {
  type: 'user' | 'session' | 'topic' | 'room'
  id: string
  title: string
  subtitle: string
  link: string
  avatar?: string
  icon?: string
  meta?: string
}

interface SearchResponse {
  results: {
    users: SearchResult[]
    sessions: SearchResult[]
    topics: SearchResult[]
    rooms: SearchResult[]
  }
  query: string
  totalCount: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: { users: [], sessions: [], topics: [], rooms: [] },
        query: query || '',
        totalCount: 0
      })
    }

    const searchPattern = `%${query}%`
    const results: SearchResponse['results'] = {
      users: [],
      sessions: [],
      topics: [],
      rooms: []
    }

    // Search users (if type is 'all' or 'users')
    if (type === 'all' || type === 'users') {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role')
        .or(`username.ilike.${searchPattern},display_name.ilike.${searchPattern}`)
        .eq('is_approved', true)
        .limit(limit)

      results.users = users?.map(u => ({
        type: 'user' as const,
        id: u.id,
        title: u.display_name || u.username,
        subtitle: `@${u.username}`,
        avatar: u.avatar_url || undefined,
        link: `/profile/${u.username}`,
        meta: u.role === 'admin' ? 'Admin' : u.role === 'moderator' ? 'Moderator' : undefined
      })) || []
    }

    // Search sessions (if type is 'all' or 'sessions')
    if (type === 'all' || type === 'sessions') {
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          description,
          room_code,
          status,
          host_id,
          is_public,
          host:profiles!host_id(username, display_name, avatar_url)
        `)
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .in('status', ['live', 'scheduled'])
        .eq('is_public', true)
        .order('started_at', { ascending: false, nullsFirst: false })
        .limit(limit)

      results.sessions = sessions?.map(s => {
        const host = Array.isArray(s.host) ? s.host[0] : s.host
        return {
          type: 'session' as const,
          id: s.id,
          title: s.title,
          subtitle: `Hosted by ${host?.display_name || 'Unknown'}`,
          link: `/s/${s.room_code}`,
          meta: s.status === 'live' ? 'Live' : 'Scheduled',
          avatar: host?.avatar_url || undefined
        }
      }) || []
    }

    // Search topics (if type is 'all' or 'topics')
    if (type === 'all' || type === 'topics') {
      const { data: topics } = await supabase
        .from('discussion_topics')
        .select('id, title, description, upvote_count, status')
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .order('upvote_count', { ascending: false })
        .limit(limit)

      results.topics = topics?.map(t => ({
        type: 'topic' as const,
        id: t.id,
        title: t.title,
        subtitle: `${t.upvote_count} upvotes`,
        link: `/community/topics/${t.id}`,
        meta: t.status
      })) || []
    }

    // Search community rooms (if type is 'all' or 'rooms')
    if (type === 'all' || type === 'rooms') {
      const { data: rooms } = await supabase
        .from('community_rooms')
        .select('id, slug, name, description, category, icon_emoji, member_count')
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .is('archived_at', null)
        .order('member_count', { ascending: false })
        .limit(limit)

      results.rooms = rooms?.map(r => ({
        type: 'room' as const,
        id: r.id,
        title: r.name,
        subtitle: `${r.member_count || 0} members`,
        icon: r.icon_emoji,
        link: `/community/${r.slug}`,
        meta: r.category
      })) || []
    }

    const totalCount =
      results.users.length +
      results.sessions.length +
      results.topics.length +
      results.rooms.length

    return NextResponse.json({
      results,
      query,
      totalCount
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
