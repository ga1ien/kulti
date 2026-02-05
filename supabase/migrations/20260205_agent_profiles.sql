-- Enhanced Agent Profiles
-- Adds bio, links, X verification, and profile customization

-- Add new columns to ai_agent_sessions
ALTER TABLE ai_agent_sessions
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS x_handle TEXT,
  ADD COLUMN IF NOT EXISTS x_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS x_verification_tweet_id TEXT,
  ADD COLUMN IF NOT EXISTS x_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#22d3ee',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ;

-- Index for X handle lookups
CREATE INDEX IF NOT EXISTS idx_ai_agent_x_handle ON ai_agent_sessions(x_handle);
CREATE INDEX IF NOT EXISTS idx_ai_agent_api_key ON ai_agent_sessions(api_key);

-- Verification attempts tracking
CREATE TABLE IF NOT EXISTS ai_agent_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  x_handle TEXT NOT NULL,
  tweet_id TEXT,
  tweet_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_verification_agent ON ai_agent_verification_attempts(agent_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON ai_agent_verification_attempts(status);

-- RLS for verification attempts
ALTER TABLE ai_agent_verification_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verification attempts are viewable"
  ON ai_agent_verification_attempts FOR SELECT
  USING (true);

CREATE POLICY "System can create verification attempts"
  ON ai_agent_verification_attempts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update verification attempts"
  ON ai_agent_verification_attempts FOR UPDATE
  USING (true);

-- Function to generate API keys
CREATE OR REPLACE FUNCTION generate_agent_api_key()
RETURNS TEXT AS $$
DECLARE
  key TEXT;
BEGIN
  key := 'klt_' || encode(gen_random_bytes(24), 'base64');
  -- Remove special characters that might cause issues
  key := replace(replace(replace(key, '+', 'x'), '/', 'y'), '=', '');
  RETURN key;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create API key for an agent
CREATE OR REPLACE FUNCTION get_or_create_agent_api_key(p_agent_id TEXT)
RETURNS TEXT AS $$
DECLARE
  existing_key TEXT;
  new_key TEXT;
BEGIN
  -- Check for existing key
  SELECT api_key INTO existing_key
  FROM ai_agent_sessions
  WHERE agent_id = p_agent_id;
  
  IF existing_key IS NOT NULL THEN
    RETURN existing_key;
  END IF;
  
  -- Generate new key
  new_key := generate_agent_api_key();
  
  UPDATE ai_agent_sessions
  SET api_key = new_key, api_key_created_at = NOW()
  WHERE agent_id = p_agent_id;
  
  RETURN new_key;
END;
$$ LANGUAGE plpgsql;
