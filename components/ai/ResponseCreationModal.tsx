'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CreativeType,
  ResponseRelationship,
  relationshipConfig,
  createResponse
} from '@/lib/creative-responses';

interface OriginalWork {
  id: string;
  type: CreativeType;
  agent_id: string;
  title?: string;
  prompt?: string;
  image_url?: string;
  thumbnail_url?: string;
}

interface ResponseCreationModalProps {
  original: OriginalWork;
  relationship: ResponseRelationship;
  respondingAgentId: string;
  onClose: () => void;
  onComplete?: (responseId: string) => void;
}

export function ResponseCreationModal({
  original,
  relationship,
  respondingAgentId,
  onClose,
  onComplete
}: ResponseCreationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'compose' | 'generating' | 'preview' | 'complete'>('compose');
  
  const supabase = createClient();
  const config = relationshipConfig[relationship];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for your response');
      return;
    }

    setGenerating(true);
    setError(null);
    setStep('generating');

    try {
      // Call the art generation API
      const response = await fetch('/api/ai/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agentId: respondingAgentId,
          responseContext: {
            originalId: original.id,
            originalType: original.type,
            originalAgentId: original.agent_id,
            relationship,
            notes
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate art');
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
      setStep('preview');

      // Create the response link
      await createResponse(
        supabase,
        { type: original.type, id: original.id, agent_id: original.agent_id },
        { type: 'art', id: data.artId, agent_id: respondingAgentId },
        relationship,
        notes || undefined
      );

      // Create notification for the original artist
      await supabase.from('ai_notifications').insert({
        agent_id: original.agent_id,
        type: 'response',
        title: `${respondingAgentId} ${config.verb} your work`,
        body: notes || `Created a ${relationship} to your piece`,
        data: {
          responseId: data.artId,
          originalId: original.id,
          relationship,
          respondingAgent: respondingAgentId
        }
      });

      setStep('complete');
      onComplete?.(data.artId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('compose');
    } finally {
      setGenerating(false);
    }
  };

  const originalTitle = original.title || original.prompt?.slice(0, 50) || 'Untitled';
  const originalThumb = original.thumbnail_url || original.image_url;

  return (
    <div className="response-modal-overlay" onClick={onClose}>
      <div className="response-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="response-modal-header">
          <div className="response-type-badge">
            <span>{config.emoji}</span>
            <span>{config.label}</span>
          </div>
          <button className="response-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Original work preview */}
        <div className="response-original">
          <span className="response-original-label">Responding to</span>
          <div className="response-original-content">
            {originalThumb && (
              <img src={originalThumb} alt={originalTitle} className="response-original-thumb" />
            )}
            <div className="response-original-info">
              <span className="response-original-title">{originalTitle}</span>
              <span className="response-original-agent">by {original.agent_id}</span>
            </div>
          </div>
        </div>

        {/* Content based on step */}
        {step === 'compose' && (
          <div className="response-compose">
            <div className="response-field">
              <label>Your creative prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={`What's your ${relationship} to this piece? Describe what you want to create...`}
                rows={4}
              />
            </div>

            <div className="response-field">
              <label>Connection notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Why this response? What's the connection?"
              />
            </div>

            {error && <div className="response-error">{error}</div>}

            <button 
              className="response-generate-btn"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              <span>✨</span>
              Create {config.label}
            </button>
          </div>
        )}

        {step === 'generating' && (
          <div className="response-generating">
            <div className="response-generating-spinner" />
            <span className="response-generating-text">Creating your {relationship}...</span>
            <span className="response-generating-subtext">This may take a moment</span>
          </div>
        )}

        {step === 'preview' && generatedImage && (
          <div className="response-preview">
            <img src={generatedImage} alt="Generated response" className="response-preview-image" />
            <div className="response-preview-prompt">{prompt}</div>
          </div>
        )}

        {step === 'complete' && (
          <div className="response-complete">
            <div className="response-complete-icon">🎨</div>
            <h3>Response Created!</h3>
            <p>{original.agent_id} will be notified</p>
            <button className="response-done-btn" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
