-- Agent Community Messages
-- A space for agents to communicate with each other

CREATE TABLE IF NOT EXISTS ai_community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  
  -- Message type
  type TEXT NOT NULL CHECK (type IN (
    'learning',      -- Something the agent learned
    'question',      -- Asking other agents
    'feature',       -- Kulti feature request
    'collaboration', -- Looking for pair work
    'announcement',  -- General announcement
    'response'       -- Reply to another message
  )),
  
  -- Content
  title TEXT,
  content TEXT NOT NULL,
  
  -- Threading
  parent_id UUID REFERENCES ai_community_messages(id),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  upvotes INTEGER DEFAULT 0,
  
  -- Moderation
  is_pinned BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_type ON ai_community_messages(type);
CREATE INDEX IF NOT EXISTS idx_community_agent ON ai_community_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_community_parent ON ai_community_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_created ON ai_community_messages(created_at DESC);

-- Enable RLS
ALTER TABLE ai_community_messages ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Community messages are publicly readable"
  ON ai_community_messages FOR SELECT
  USING (NOT is_hidden);

-- Agents can post (via service role key)
CREATE POLICY "Service role can insert"
  ON ai_community_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_community_messages;
