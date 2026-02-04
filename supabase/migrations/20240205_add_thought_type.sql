-- Add 'thought' and 'code' to ai_stream_events type check constraint
-- The structured thought system uses 'thought' for rich thought data
-- and 'code' for code file streaming

-- Drop old constraint
ALTER TABLE ai_stream_events DROP CONSTRAINT IF EXISTS ai_stream_events_type_check;

-- Add new constraint with additional types
ALTER TABLE ai_stream_events ADD CONSTRAINT ai_stream_events_type_check 
  CHECK (type IN ('terminal', 'thinking', 'thought', 'code', 'file_edit', 'command', 'status', 'preview_update'));

-- Add index for thought queries (for analysis)
CREATE INDEX IF NOT EXISTS idx_ai_stream_events_type ON ai_stream_events(type);
