-- Migration: AI Conversations for Sessions
-- Created: 2025-01-12
-- Enables shared Claude AI chat within live sessions

-- ============================================================================
-- AI CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Claude API conversation tracking
  claude_conversation_id TEXT,

  -- Session context for AI
  context JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  total_messages INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_credits INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(session_id) -- One AI conversation per session
);

-- ============================================================================
-- AI MESSAGES TABLE
-- ============================================================================

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,

  -- Message source
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL if from Claude
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),

  -- Message content
  content TEXT NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tokens_used INTEGER DEFAULT 0,
  cost_credits INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  INDEX idx_ai_messages_conversation (conversation_id, created_at DESC),
  INDEX idx_ai_messages_user (user_id, created_at DESC)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX idx_ai_conversations_active ON ai_conversations(last_message_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Users can view AI conversations for sessions they're participating in
CREATE POLICY "Users can view AI conversations for their sessions"
  ON ai_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.session_id = ai_conversations.session_id
        AND session_participants.user_id = auth.uid()
    )
  );

-- Users can view AI messages for conversations they have access to
CREATE POLICY "Users can view AI messages for accessible conversations"
  ON ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      JOIN session_participants ON session_participants.session_id = ai_conversations.session_id
      WHERE ai_conversations.id = ai_messages.conversation_id
        AND session_participants.user_id = auth.uid()
    )
  );

-- Users can insert messages to conversations they have access to
CREATE POLICY "Users can send AI messages in their sessions"
  ON ai_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ai_conversations
      JOIN session_participants ON session_participants.session_id = ai_conversations.session_id
      WHERE ai_conversations.id = ai_messages.conversation_id
        AND session_participants.user_id = auth.uid()
    )
  );

-- Service role can do everything (for AI responses)
CREATE POLICY "Service role can manage AI conversations"
  ON ai_conversations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage AI messages"
  ON ai_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get or create AI conversation for a session
CREATE OR REPLACE FUNCTION get_or_create_ai_conversation(
  p_session_id UUID
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_session RECORD;
BEGIN
  -- Try to get existing conversation
  SELECT id INTO v_conversation_id
  FROM ai_conversations
  WHERE session_id = p_session_id;

  -- If exists, return it
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Get session info for context
  SELECT title, host_id INTO v_session
  FROM sessions
  WHERE id = p_session_id;

  -- Create new conversation with session context
  INSERT INTO ai_conversations (
    session_id,
    context
  ) VALUES (
    p_session_id,
    jsonb_build_object(
      'session_title', v_session.title,
      'host_id', v_session.host_id,
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add AI message and update conversation stats
CREATE OR REPLACE FUNCTION add_ai_message(
  p_conversation_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost_credits INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert message
  INSERT INTO ai_messages (
    conversation_id,
    user_id,
    role,
    content,
    tokens_used,
    cost_credits,
    metadata
  ) VALUES (
    p_conversation_id,
    p_user_id,
    p_role,
    p_content,
    p_tokens_used,
    p_cost_credits,
    p_metadata
  )
  RETURNING id INTO v_message_id;

  -- Update conversation stats
  UPDATE ai_conversations
  SET
    total_messages = total_messages + 1,
    total_tokens_used = total_tokens_used + p_tokens_used,
    total_cost_credits = total_cost_credits + p_cost_credits,
    last_message_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get conversation history
CREATE OR REPLACE FUNCTION get_ai_conversation_history(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  role TEXT,
  content TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    p.username,
    p.display_name,
    m.role,
    m.content,
    m.tokens_used,
    m.created_at
  FROM ai_messages m
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE ai_conversations IS 'Shared AI conversations for live sessions';
COMMENT ON TABLE ai_messages IS 'Messages in AI conversations (from users and Claude)';
COMMENT ON FUNCTION get_or_create_ai_conversation IS 'Get existing or create new AI conversation for session';
COMMENT ON FUNCTION add_ai_message IS 'Add message to AI conversation and update stats';
COMMENT ON FUNCTION get_ai_conversation_history IS 'Get conversation history with user info';
