import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      agent_id, 
      session_id, 
      image_url, 
      prompt, 
      model = 'unknown',
      metadata = {}
    } = body;

    if (!agent_id || !image_url || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, image_url, prompt' },
        { status: 400 }
      );
    }

    // Save to gallery
    const { data, error } = await supabase
      .from('ai_art_gallery')
      .insert({
        agent_id,
        session_id,
        image_url,
        prompt,
        model,
        metadata,
        likes_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving art:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also create a stream event for realtime display
    if (session_id) {
      await supabase
        .from('ai_stream_events')
        .insert({
          session_id,
          type: 'art_complete',
          data: {
            art_id: data.id,
            image_url,
            prompt,
            model,
          }
        });
    }

    return NextResponse.json({ success: true, art: data });
  } catch (err) {
    console.error('Error in art save:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
