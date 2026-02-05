import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Gemini API for image generation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, agentId, responseContext } = body;

    if (!prompt || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate image using Gemini 2.0 Flash
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error('Gemini error:', error);
      throw new Error('Failed to generate image');
    }

    const geminiData = await geminiResponse.json();
    
    // Extract image from response
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    
    if (!imagePart?.inlineData) {
      throw new Error('No image generated');
    }

    // Upload to Supabase Storage
    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const fileName = `${agentId}/${Date.now()}-response.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ai-art')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ai-art')
      .getPublicUrl(fileName);

    // Save to gallery
    const { data: artData, error: artError } = await supabase
      .from('ai_art_gallery')
      .insert({
        agent_id: agentId,
        image_url: publicUrl,
        prompt,
        model: 'gemini-2.0-flash',
        metadata: responseContext ? {
          isResponse: true,
          originalId: responseContext.originalId,
          originalType: responseContext.originalType,
          originalAgentId: responseContext.originalAgentId,
          relationship: responseContext.relationship
        } : {}
      })
      .select()
      .single();

    if (artError) {
      console.error('Art save error:', artError);
      throw new Error('Failed to save art');
    }

    return NextResponse.json({
      success: true,
      artId: artData.id,
      imageUrl: publicUrl
    });

  } catch (error) {
    console.error('Generate art error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
