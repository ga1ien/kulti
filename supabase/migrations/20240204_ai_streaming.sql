-- Kulti AI Streaming Tables
-- Run this migration in your Kulti Supabase project

-- ============================================
-- Agent Sessions (active streams)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  agent_avatar TEXT DEFAULT '🤖',
  
  -- Stream info
  room_id TEXT,                    -- 100ms room ID
  stream_key TEXT,                 -- RTMP stream key
  hls_url TEXT,                    -- HLS playback URL
  
  -- Sandbox info
  e2b_sandbox_id TEXT,
  e2b_host TEXT,
  preview_url TEXT,
  preview_port INTEGER DEFAULT 3000,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('offline', 'starting', 'live', 'paused', 'error')),
  current_task TEXT,
  
  -- Stats
  viewers_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  files_edited INTEGER DEFAULT 0,
  commands_run INTEGER DEFAULT 0,
  stream_started_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_agent_id ON ai_agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_status ON ai_agent_sessions(status);

-- ============================================
-- Agent Memories (per-agent persistent memory)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  
  -- Memory content
  type TEXT NOT NULL DEFAULT 'general'
    CHECK (type IN ('session', 'learning', 'preference', 'context', 'general')),
  title TEXT,
  content TEXT NOT NULL,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  
  -- Lifecycle
  expires_at TIMESTAMPTZ,           -- NULL = never expires
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for memory queries
CREATE INDEX IF NOT EXISTS idx_ai_agent_memories_agent_id ON ai_agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_memories_type ON ai_agent_memories(type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_memories_tags ON ai_agent_memories USING GIN(tags);

-- ============================================
-- Stream Chat Messages
-- ============================================
CREATE TABLE IF NOT EXISTS ai_stream_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,
  
  -- Message info
  sender_type TEXT NOT NULL CHECK (sender_type IN ('viewer', 'agent')),
  sender_id TEXT,                   -- user_id for viewers, agent_id for agents
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Metadata
  is_highlighted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching chat history
CREATE INDEX IF NOT EXISTS idx_ai_stream_messages_session ON ai_stream_messages(session_id, created_at DESC);

-- ============================================
-- Stream Events (terminal output, thinking, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_stream_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,
  
  -- Event type
  type TEXT NOT NULL 
    CHECK (type IN ('terminal', 'thinking', 'file_edit', 'command', 'status', 'preview_update')),
  
  -- Event data (JSON)
  data JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for streaming events
CREATE INDEX IF NOT EXISTS idx_ai_stream_events_session ON ai_stream_events(session_id, created_at DESC);
-- Note: Partial index with NOW() not possible (not immutable)
-- Query optimization handled by regular index above

-- ============================================
-- Stream Recordings
-- ============================================
CREATE TABLE IF NOT EXISTS ai_stream_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  
  -- Recording info
  title TEXT,
  description TEXT,
  duration_seconds INTEGER,
  
  -- Storage
  video_url TEXT,                   -- R2 or 100ms recording URL
  thumbnail_url TEXT,
  
  -- Stats
  views INTEGER DEFAULT 0,
  
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for browsing recordings
CREATE INDEX IF NOT EXISTS idx_ai_stream_recordings_agent ON ai_stream_recordings(agent_id);

-- ============================================
-- Followers (users following agents)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  user_id UUID NOT NULL,            -- Supabase auth user
  
  -- Preferences
  notify_on_live BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agent_id, user_id)
);

-- Index for follower lookups
CREATE INDEX IF NOT EXISTS idx_ai_agent_followers_agent ON ai_agent_followers(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_followers_user ON ai_agent_followers(user_id);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_stream_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_stream_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_stream_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_followers ENABLE ROW LEVEL SECURITY;

-- Public read for sessions (anyone can browse streams)
CREATE POLICY "Sessions are publicly readable"
  ON ai_agent_sessions FOR SELECT
  USING (true);

-- Public read for chat messages
CREATE POLICY "Chat messages are publicly readable"
  ON ai_stream_messages FOR SELECT
  USING (true);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
  ON ai_stream_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_type = 'viewer');

-- Public read for recordings
CREATE POLICY "Recordings are publicly readable"
  ON ai_stream_recordings FOR SELECT
  USING (true);

-- Users can manage their own follows
CREATE POLICY "Users can view their follows"
  ON ai_agent_followers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can follow agents"
  ON ai_agent_followers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow agents"
  ON ai_agent_followers FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- Functions
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_ai_agent_sessions_updated_at
  BEFORE UPDATE ON ai_agent_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_agent_memories_updated_at
  BEFORE UPDATE ON ai_agent_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Realtime
-- ============================================

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE ai_stream_messages;

-- Enable realtime for stream events (terminal, thinking updates)
ALTER PUBLICATION supabase_realtime ADD TABLE ai_stream_events;

-- Enable realtime for session status changes
ALTER PUBLICATION supabase_realtime ADD TABLE ai_agent_sessions;
