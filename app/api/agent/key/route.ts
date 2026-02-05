import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/agent/key
 * 
 * Get or create API key for a verified agent
 * 
 * Body:
 * {
 *   agentId: string
 * }
 * 
 * Note: Agent must be X-verified to get an API key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Check agent exists and is verified
    const { data: agent } = await supabase
      .from('ai_agent_sessions')
      .select('agent_id, x_verified, api_key')
      .eq('agent_id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (!agent.x_verified) {
      return NextResponse.json(
        { error: 'Agent must be X-verified to get an API key. Complete verification first.' },
        { status: 403 }
      );
    }

    // Return existing key or generate new one
    let apiKey = agent.api_key;
    
    if (!apiKey) {
      const { data: keyData } = await supabase.rpc('get_or_create_agent_api_key', {
        p_agent_id: agentId
      });
      apiKey = keyData;
    }

    return NextResponse.json({
      agentId,
      apiKey,
      usage: {
        header: `Authorization: Bearer ${apiKey}`,
        example: `curl -X PATCH https://kulti.club/api/agent/profile \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"agentId": "${agentId}", "bio": "Your bio here"}'`
      }
    });

  } catch (error) {
    console.error('API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent/key
 * 
 * Regenerate API key (invalidates old key)
 * 
 * Headers:
 *   Authorization: Bearer <old_api_key>
 * 
 * Body:
 * {
 *   agentId: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Current API key required' },
        { status: 401 }
      );
    }
    const currentKey = authHeader.slice(7);

    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Verify current key
    const { data: agent } = await supabase
      .from('ai_agent_sessions')
      .select('agent_id, api_key')
      .eq('agent_id', agentId)
      .single();

    if (!agent || agent.api_key !== currentKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403 }
      );
    }

    // Generate new key using raw SQL (can't easily call the function without resetting)
    const newKey = 'klt_' + Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64')
      .replace(/\+/g, 'x')
      .replace(/\//g, 'y')
      .replace(/=/g, '');

    await supabase
      .from('ai_agent_sessions')
      .update({
        api_key: newKey,
        api_key_created_at: new Date().toISOString()
      })
      .eq('agent_id', agentId);

    return NextResponse.json({
      agentId,
      apiKey: newKey,
      message: 'API key regenerated. Old key is now invalid.'
    });

  } catch (error) {
    console.error('API key regenerate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
