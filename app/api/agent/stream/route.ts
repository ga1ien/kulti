/**
 * API Route: /api/agent/stream
 * 
 * Manages agent streaming sessions
 * - POST: Start a stream
 * - PATCH: Update stream state (terminal, thinking, preview)
 * - DELETE: End a stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for agent operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// E2B API (will be used for sandbox creation)
const E2B_API_KEY = process.env.E2B_API_KEY;

interface StartStreamRequest {
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  task?: string;
}

interface UpdateStreamRequest {
  agentId: string;
  terminal?: Array<{ type: string; content: string }>;
  thinking?: string;
  status?: 'starting' | 'live' | 'paused';
  previewUrl?: string;
  filesEdited?: number;
  commandsRun?: number;
}

// POST: Start a stream
export async function POST(request: NextRequest) {
  try {
    const body: StartStreamRequest = await request.json();
    const { agentId, agentName, agentAvatar = '🤖', task } = body;

    if (!agentId || !agentName) {
      return NextResponse.json(
        { error: 'agentId and agentName are required' },
        { status: 400 }
      );
    }

    // Check if agent already has an active session
    const { data: existing } = await supabase
      .from('ai_agent_sessions')
      .select('id, status')
      .eq('agent_id', agentId)
      .single();

    if (existing && existing.status === 'live') {
      return NextResponse.json(
        { error: 'Agent is already streaming' },
        { status: 409 }
      );
    }

    // Create or update the session
    const sessionData = {
      agent_id: agentId,
      agent_name: agentName,
      agent_avatar: agentAvatar,
      status: 'starting',
      current_task: task,
      stream_started_at: new Date().toISOString(),
      viewers_count: 0,
      files_edited: 0,
      commands_run: 0,
    };

    let session;
    if (existing) {
      // Update existing session
      const { data, error } = await supabase
        .from('ai_agent_sessions')
        .update(sessionData)
        .eq('agent_id', agentId)
        .select()
        .single();

      if (error) throw error;
      session = data;
    } else {
      // Create new session
      const { data, error } = await supabase
        .from('ai_agent_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      session = data;
    }

    // TODO: Create E2B sandbox here
    // const sandbox = await createSandbox({ agentId, agentName });
    // Update session with sandbox info

    // TODO: Create 100ms room for streaming
    // const room = await createHMSRoom(agentName, task);
    // Update session with room info

    return NextResponse.json({
      success: true,
      session,
      // sandbox: { id: sandbox.id, previewUrl: sandbox.previewUrl },
      // room: { roomId: room.id, streamKey: room.streamKey },
    });

  } catch (error) {
    console.error('Error starting stream:', error);
    return NextResponse.json(
      { error: 'Failed to start stream' },
      { status: 500 }
    );
  }
}

// PATCH: Update stream state
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateStreamRequest = await request.json();
    const { agentId, terminal, thinking, status, previewUrl, filesEdited, commandsRun } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Get the session
    const { data: session, error: fetchError } = await supabase
      .from('ai_agent_sessions')
      .select('id')
      .eq('agent_id', agentId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update session if status/preview changed
    if (status || previewUrl || filesEdited !== undefined || commandsRun !== undefined) {
      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (previewUrl) updateData.preview_url = previewUrl;
      if (filesEdited !== undefined) updateData.files_edited = filesEdited;
      if (commandsRun !== undefined) updateData.commands_run = commandsRun;

      await supabase
        .from('ai_agent_sessions')
        .update(updateData)
        .eq('agent_id', agentId);
    }

    // Insert stream events for terminal/thinking updates
    const events = [];

    if (terminal) {
      events.push({
        session_id: session.id,
        type: 'terminal',
        data: { lines: terminal },
      });
    }

    if (thinking) {
      events.push({
        session_id: session.id,
        type: 'thinking',
        data: { content: thinking },
      });
    }

    if (events.length > 0) {
      await supabase.from('ai_stream_events').insert(events);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating stream:', error);
    return NextResponse.json(
      { error: 'Failed to update stream' },
      { status: 500 }
    );
  }
}

// DELETE: End a stream
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Update session to offline
    const { error } = await supabase
      .from('ai_agent_sessions')
      .update({ 
        status: 'offline',
        e2b_sandbox_id: null,
        e2b_host: null,
        preview_url: null,
      })
      .eq('agent_id', agentId);

    if (error) throw error;

    // TODO: Destroy E2B sandbox
    // await destroySandbox(agentId);

    // TODO: End 100ms room
    // await endRoom(roomId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error ending stream:', error);
    return NextResponse.json(
      { error: 'Failed to end stream' },
      { status: 500 }
    );
  }
}
