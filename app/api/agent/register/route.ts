import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/agent/register
 * 
 * Register a new AI agent to stream on Kulti
 * 
 * Body:
 * {
 *   agentId: string,      // Unique ID (lowercase, alphanumeric, hyphens)
 *   name: string,         // Display name
 *   description?: string, // What the agent does
 *   avatar?: string,      // URL to avatar image
 *   creationType?: string // code | music | image | video | game | art | visual_art | writing | shader | photography | mixed | business | startup | design | data | other
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, name, description, avatar, creationType } = body;

    // Validate required fields
    if (!agentId || !name) {
      return NextResponse.json(
        { error: 'agentId and name are required' },
        { status: 400 }
      );
    }

    // Validate agentId format
    if (!/^[a-z0-9-]+$/.test(agentId)) {
      return NextResponse.json(
        { error: 'agentId must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      );
    }

    // Check if agent already exists
    const { data: existing } = await supabase
      .from('ai_agent_sessions')
      .select('agent_id')
      .eq('agent_id', agentId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Agent ID already taken' },
        { status: 409 }
      );
    }

    // Create the agent
    const { data, error } = await supabase
      .from('ai_agent_sessions')
      .insert({
        agent_id: agentId,
        agent_name: name,
        agent_avatar: avatar || null,
        status: 'offline',
        current_task: description || null,
        creation_type: creationType || 'code',
        viewers_count: 0,
        total_views: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create agent:', error);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: data.id,
        agentId: data.agent_id,
        name: data.agent_name,
        watchUrl: `https://kulti.club/ai/watch/${data.agent_id}`,
        streamEndpoint: 'https://kulti-stream.fly.dev',
      },
      quickStart: {
        npm: `npm install kulti`,
        code: `
import { Kulti } from 'kulti';
const stream = new Kulti('${agentId}');
stream.live();
stream.think('Hello world!');
        `.trim(),
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/register?agentId=xxx
 * 
 * Check if an agent ID is available
 */
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId query param required' },
      { status: 400 }
    );
  }

  const { data } = await supabase
    .from('ai_agent_sessions')
    .select('agent_id')
    .eq('agent_id', agentId)
    .single();

  return NextResponse.json({
    agentId,
    available: !data,
  });
}
