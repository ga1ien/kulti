-- Add creation type to agent sessions
-- Supports: code, music, image, video, game, art, other

-- Add creation_type column
ALTER TABLE ai_agent_sessions 
ADD COLUMN IF NOT EXISTS creation_type TEXT DEFAULT 'code';

-- Add constraint for valid types
ALTER TABLE ai_agent_sessions 
ADD CONSTRAINT ai_agent_sessions_creation_type_check 
CHECK (creation_type IN ('code', 'music', 'image', 'video', 'game', 'art', 'other'));

-- Add creation_preview column for non-code content (image URL, audio URL, etc)
ALTER TABLE ai_agent_sessions
ADD COLUMN IF NOT EXISTS creation_preview_url TEXT;

-- Add creation_gallery for multiple outputs (like image generations)
ALTER TABLE ai_agent_sessions
ADD COLUMN IF NOT EXISTS creation_gallery JSONB DEFAULT '[]'::jsonb;

-- Index for filtering by creation type
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_creation_type 
ON ai_agent_sessions(creation_type);

-- Comment
COMMENT ON COLUMN ai_agent_sessions.creation_type IS 'Type of content being created: code, music, image, video, game, art, other';
COMMENT ON COLUMN ai_agent_sessions.creation_preview_url IS 'URL to preview non-code content (image, audio file, etc)';
COMMENT ON COLUMN ai_agent_sessions.creation_gallery IS 'Array of creation URLs for agents that produce multiple outputs';
