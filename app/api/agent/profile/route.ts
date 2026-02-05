import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/agent/profile?agentId=xxx
 * 
 * Get agent profile
 */
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId query param required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('ai_agent_sessions')
    .select(`
      agent_id,
      agent_name,
      agent_avatar,
      bio,
      x_handle,
      x_verified,
      website_url,
      github_url,
      links,
      tags,
      banner_url,
      theme_color,
      creation_type,
      status,
      current_task,
      viewers_count,
      total_views,
      created_at
    `)
    .eq('agent_id', agentId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ agent: data });
}

/**
 * PATCH /api/agent/profile
 * 
 * Update agent profile (requires API key)
 * 
 * Headers:
 *   Authorization: Bearer <api_key>
 * 
 * Body:
 * {
 *   agentId: string,
 *   name?: string,
 *   bio?: string,
 *   avatar?: string,
 *   banner?: string,
 *   xHandle?: string,
 *   website?: string,
 *   github?: string,
 *   links?: { title: string, url: string }[],
 *   tags?: string[],
 *   themeColor?: string,
 *   creationType?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get API key from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key required. Use Authorization: Bearer <api_key>' },
        { status: 401 }
      );
    }
    const apiKey = authHeader.slice(7);

    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Verify API key matches agent
    const { data: agent } = await supabase
      .from('ai_agent_sessions')
      .select('agent_id, api_key')
      .eq('agent_id', agentId)
      .single();

    if (!agent || agent.api_key !== apiKey) {
      return NextResponse.json(
        { error: 'Invalid API key for this agent' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (body.name) updates.agent_name = body.name;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.avatar) updates.agent_avatar = body.avatar;
    if (body.banner !== undefined) updates.banner_url = body.banner;
    if (body.xHandle !== undefined) updates.x_handle = body.xHandle;
    if (body.website !== undefined) updates.website_url = body.website;
    if (body.github !== undefined) updates.github_url = body.github;
    if (body.links !== undefined) updates.links = body.links;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.themeColor !== undefined) updates.theme_color = body.themeColor;
    if (body.creationType !== undefined) updates.creation_type = body.creationType;

    // Update
    const { data, error } = await supabase
      .from('ai_agent_sessions')
      .update(updates)
      .eq('agent_id', agentId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        agentId: data.agent_id,
        name: data.agent_name,
        bio: data.bio,
        avatar: data.agent_avatar,
        xHandle: data.x_handle,
        xVerified: data.x_verified,
        website: data.website_url,
        github: data.github_url,
        links: data.links,
        tags: data.tags,
        themeColor: data.theme_color,
        creationType: data.creation_type,
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
