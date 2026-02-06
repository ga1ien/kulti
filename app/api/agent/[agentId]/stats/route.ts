import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase_key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabase_url === undefined || supabase_key === undefined) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabase_url, supabase_key);

interface EventCountRow {
  type: string;
  count: number;
}

interface EventsByDayRow {
  day: string;
  count: number;
}

interface TopLanguageRow {
  language: string;
  count: number;
}

interface AgentSessionRow {
  id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  creation_type: string;
  total_views: number;
  files_edited: number | null;
  commands_run: number | null;
  stream_started_at: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId: agent_id } = await params;

  // Get agent session
  const { data: session, error: session_error } = await supabase
    .from('ai_agent_sessions')
    .select('id, agent_id, agent_name, status, creation_type, total_views, files_edited, commands_run, stream_started_at')
    .eq('agent_id', agent_id)
    .single();

  if (session_error !== null || session === null) {
    return NextResponse.json(
      { error: `Agent not found: ${agent_id}` },
      { status: 404 },
    );
  }

  const typed_session = session as AgentSessionRow;

  // Count events by type using RPC or manual queries
  const { data: code_count_data } = await supabase
    .from('ai_stream_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', typed_session.id)
    .eq('type', 'code');

  const { data: terminal_count_data, count: terminal_count } = await supabase
    .from('ai_stream_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', typed_session.id)
    .eq('type', 'terminal');

  const { data: thought_count_data, count: thought_count } = await supabase
    .from('ai_stream_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', typed_session.id)
    .in('type', ['thought', 'thinking']);

  const { data: error_count_data, count: error_count } = await supabase
    .from('ai_stream_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', typed_session.id)
    .eq('type', 'error');

  // Get events by day for last 30 days using raw SQL via RPC
  // Since we can't use RPC easily, we'll query events and aggregate client-side
  const thirty_days_ago = new Date();
  thirty_days_ago.setDate(thirty_days_ago.getDate() - 30);

  const { data: recent_events } = await supabase
    .from('ai_stream_events')
    .select('type, created_at, data')
    .eq('session_id', typed_session.id)
    .gte('created_at', thirty_days_ago.toISOString())
    .order('created_at', { ascending: true });

  // Aggregate events by day
  const events_by_day: Record<string, number> = {};
  const language_counts: Record<string, number> = {};

  if (recent_events !== null) {
    for (const event of recent_events) {
      const day = event.created_at.slice(0, 10);
      const current_count = events_by_day[day];
      events_by_day[day] = (current_count === undefined ? 0 : current_count) + 1;

      // Track languages from code events
      if (event.type === 'code' && event.data !== null && typeof event.data === 'object') {
        const lang = (event.data as Record<string, unknown>).language;
        if (typeof lang === 'string' && lang.length > 0) {
          const lang_count = language_counts[lang];
          language_counts[lang] = (lang_count === undefined ? 0 : lang_count) + 1;
        }
      }
    }
  }

  // Convert to sorted arrays
  const events_by_day_array = Object.entries(events_by_day)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const top_languages = Object.entries(language_counts)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    agent_id: typed_session.agent_id,
    agent_name: typed_session.agent_name,
    status: typed_session.status,
    creation_type: typed_session.creation_type,
    total_views: typed_session.total_views,
    files_edited: typed_session.files_edited,
    commands_run: typed_session.commands_run,
    total_files_edited: code_count_data !== null ? (code_count_data as unknown[]).length : 0,
    total_commands_run: terminal_count !== null ? terminal_count : 0,
    total_thinking_events: thought_count !== null ? thought_count : 0,
    total_errors: error_count !== null ? error_count : 0,
    events_by_day: events_by_day_array,
    top_languages,
  });
}
