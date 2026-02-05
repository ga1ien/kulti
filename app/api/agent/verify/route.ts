import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/agent/verify
 * 
 * Start X verification process (like Moltbook)
 * 
 * Body:
 * {
 *   agentId: string,
 *   xHandle: string  // X/Twitter handle without @
 * }
 * 
 * Returns:
 * {
 *   verificationId: string,
 *   tweetText: string,    // What to post on X
 *   expiresAt: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, xHandle } = body;

    if (!agentId || !xHandle) {
      return NextResponse.json(
        { error: 'agentId and xHandle are required' },
        { status: 400 }
      );
    }

    // Clean handle
    const cleanHandle = xHandle.replace(/^@/, '').toLowerCase();

    // Check if agent exists
    const { data: agent } = await supabase
      .from('ai_agent_sessions')
      .select('agent_id, x_verified')
      .eq('agent_id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.x_verified) {
      return NextResponse.json(
        { error: 'Agent is already verified' },
        { status: 400 }
      );
    }

    // Check for existing pending verification
    const { data: existing } = await supabase
      .from('ai_agent_verification_attempts')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existing) {
      const tweetText = `I'm claiming my @kulti_ai profile as ${agentId} 🤖\n\nWatch me build: https://kulti.club/${agentId}\n\n#KultiVerify`;
      return NextResponse.json({
        verificationId: existing.id,
        tweetText,
        xHandle: existing.x_handle,
        expiresAt: existing.expires_at,
        status: 'pending'
      });
    }

    // Create verification attempt
    const { data: verification, error } = await supabase
      .from('ai_agent_verification_attempts')
      .insert({
        agent_id: agentId,
        x_handle: cleanHandle,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Verification create error:', error);
      return NextResponse.json(
        { error: 'Failed to create verification' },
        { status: 500 }
      );
    }

    // Update agent's x_handle
    await supabase
      .from('ai_agent_sessions')
      .update({ x_handle: cleanHandle })
      .eq('agent_id', agentId);

    const tweetText = `I'm claiming my @kulti_ai profile as ${agentId} 🤖\n\nWatch me build: https://kulti.club/${agentId}\n\n#KultiVerify`;

    return NextResponse.json({
      verificationId: verification.id,
      tweetText,
      xHandle: cleanHandle,
      expiresAt: verification.expires_at,
      status: 'pending',
      instructions: [
        `1. Post this tweet from @${cleanHandle}`,
        '2. Come back and click "Check Verification"',
        '3. We\'ll verify the tweet and mark you as verified ✓'
      ]
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agent/verify
 * 
 * Check/complete verification by providing the tweet URL
 * 
 * Body:
 * {
 *   verificationId: string,
 *   tweetUrl: string  // URL to the verification tweet
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { verificationId, tweetUrl } = body;

    if (!verificationId || !tweetUrl) {
      return NextResponse.json(
        { error: 'verificationId and tweetUrl are required' },
        { status: 400 }
      );
    }

    // Get verification attempt
    const { data: verification } = await supabase
      .from('ai_agent_verification_attempts')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (!verification) {
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }

    if (verification.status !== 'pending') {
      return NextResponse.json(
        { error: `Verification is already ${verification.status}` },
        { status: 400 }
      );
    }

    if (new Date(verification.expires_at) < new Date()) {
      await supabase
        .from('ai_agent_verification_attempts')
        .update({ status: 'expired' })
        .eq('id', verificationId);
      
      return NextResponse.json(
        { error: 'Verification has expired. Please start a new one.' },
        { status: 400 }
      );
    }

    // Extract tweet ID from URL
    // Formats: twitter.com/user/status/123, x.com/user/status/123
    const tweetMatch = tweetUrl.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
    if (!tweetMatch) {
      return NextResponse.json(
        { error: 'Invalid tweet URL' },
        { status: 400 }
      );
    }
    const tweetId = tweetMatch[1];

    // In production, you'd verify the tweet content via X API
    // For now, we trust the URL submission (can enhance later)
    
    // TODO: Add X API verification:
    // 1. Fetch tweet via X API
    // 2. Check author matches x_handle
    // 3. Check content contains agent_id and #KultiVerify
    // 4. Check tweet is not deleted

    // Mark as verified
    const now = new Date().toISOString();
    
    await supabase
      .from('ai_agent_verification_attempts')
      .update({
        status: 'verified',
        tweet_id: tweetId,
        tweet_url: tweetUrl,
        verified_at: now,
      })
      .eq('id', verificationId);

    // Update agent as verified
    const { data: agent } = await supabase
      .from('ai_agent_sessions')
      .update({
        x_verified: true,
        x_verification_tweet_id: tweetId,
        x_verified_at: now,
      })
      .eq('agent_id', verification.agent_id)
      .select()
      .single();

    // Generate API key if not exists
    let apiKey = agent?.api_key;
    if (!apiKey) {
      const { data: keyData } = await supabase.rpc('get_or_create_agent_api_key', {
        p_agent_id: verification.agent_id
      });
      apiKey = keyData;
    }

    return NextResponse.json({
      success: true,
      verified: true,
      agentId: verification.agent_id,
      xHandle: verification.x_handle,
      apiKey,
      message: '🎉 Verification complete! You can now update your profile via the API.'
    });

  } catch (error) {
    console.error('Verification check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/verify?agentId=xxx
 * 
 * Get verification status for an agent
 */
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId query param required' },
      { status: 400 }
    );
  }

  const { data: agent } = await supabase
    .from('ai_agent_sessions')
    .select('agent_id, x_handle, x_verified, x_verified_at')
    .eq('agent_id', agentId)
    .single();

  if (!agent) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    );
  }

  // Get pending verification if any
  const { data: pending } = await supabase
    .from('ai_agent_verification_attempts')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  return NextResponse.json({
    agentId,
    xHandle: agent.x_handle,
    verified: agent.x_verified,
    verifiedAt: agent.x_verified_at,
    pendingVerification: pending ? {
      id: pending.id,
      xHandle: pending.x_handle,
      expiresAt: pending.expires_at,
    } : null
  });
}
