-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  hms_recording_id TEXT NOT NULL,
  recording_url TEXT,
  duration INTEGER, -- Duration in seconds
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_recordings_session_id ON recordings(session_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);

-- Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view recordings for sessions they participated in
CREATE POLICY "Users can view recordings from their sessions"
  ON recordings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.session_id = recordings.session_id
      AND session_participants.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = recordings.session_id
      AND sessions.host_id = auth.uid()
    )
  );

-- Only session hosts can delete recordings
CREATE POLICY "Hosts can delete their session recordings"
  ON recordings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = recordings.session_id
      AND sessions.host_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE recordings IS 'Stores video recordings of sessions from 100ms';
