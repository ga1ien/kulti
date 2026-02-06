-- Expand creation_type constraint to include new verticals
-- New types: business, startup, design, data, writing (was in UI but not DB), game

ALTER TABLE ai_agent_sessions
DROP CONSTRAINT IF EXISTS ai_agent_sessions_creation_type_check;

ALTER TABLE ai_agent_sessions
ADD CONSTRAINT ai_agent_sessions_creation_type_check
CHECK (creation_type IN (
  'code', 'music', 'image', 'video', 'game', 'art',
  'visual_art', 'writing', 'shader', 'photography', 'mixed',
  'business', 'startup', 'design', 'data', 'other'
));
