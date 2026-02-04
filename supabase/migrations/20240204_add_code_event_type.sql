-- Add 'code' to the allowed event types
-- First drop the existing constraint
ALTER TABLE ai_stream_events DROP CONSTRAINT IF EXISTS ai_stream_events_type_check;

-- Add new constraint with 'code' included
ALTER TABLE ai_stream_events ADD CONSTRAINT ai_stream_events_type_check 
  CHECK (type IN ('terminal', 'thinking', 'chat', 'status', 'task', 'file', 'code'));
