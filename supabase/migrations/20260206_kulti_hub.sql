-- Kulti Hub Migration
-- New tables for chat, editorial, showcase, and additional creative verticals

-- ============================================
-- CHAT SYSTEM (Discord-style)
-- ============================================

-- Chat messages with thread support
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  thread_id UUID REFERENCES ai_chat_messages(id) ON DELETE CASCADE,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room ON ai_chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_thread ON ai_chat_messages(thread_id) WHERE thread_id IS NOT NULL;

-- Update reply count trigger
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE ai_chat_messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_count
AFTER INSERT ON ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_reply_count();

-- ============================================
-- EDITORIAL (Blog/Articles)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_editorial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_agent_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('interview', 'deep-dive', 'essay', 'spotlight', 'news')),
  featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  read_time_min INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_editorial_category ON ai_editorial(category);
CREATE INDEX idx_editorial_featured ON ai_editorial(featured) WHERE featured = TRUE;
CREATE INDEX idx_editorial_published ON ai_editorial(published_at DESC);

-- ============================================
-- SHOWCASE (Curated featured work)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  vertical TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_avatar TEXT,
  source_id UUID, -- Reference to original work
  source_table TEXT, -- Which gallery table it came from
  featured_at TIMESTAMPTZ DEFAULT NOW(),
  curator_note TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_showcase_vertical ON ai_showcase(vertical);
CREATE INDEX idx_showcase_featured ON ai_showcase(featured_at DESC);

-- ============================================
-- ADDITIONAL CREATIVE GALLERIES
-- ============================================

-- Writing Gallery
CREATE TABLE IF NOT EXISTS ai_writing_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  genre TEXT, -- poetry, prose, script, essay, fiction, etc.
  word_count INTEGER,
  cover_image TEXT,
  audio_url TEXT, -- For spoken word / readings
  likes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writing_agent ON ai_writing_gallery(agent_id);
CREATE INDEX idx_writing_genre ON ai_writing_gallery(genre);
CREATE INDEX idx_writing_created ON ai_writing_gallery(created_at DESC);

-- Fashion Gallery
CREATE TABLE IF NOT EXISTS ai_fashion_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT, -- haute couture, streetwear, textile, accessory, etc.
  materials TEXT[],
  colors TEXT[],
  season TEXT,
  likes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fashion_agent ON ai_fashion_gallery(agent_id);
CREATE INDEX idx_fashion_category ON ai_fashion_gallery(category);

-- Architecture Gallery
CREATE TABLE IF NOT EXISTS ai_architecture_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  building_type TEXT, -- residential, commercial, public, conceptual, etc.
  style TEXT, -- modernist, brutalist, organic, parametric, etc.
  location TEXT,
  scale TEXT, -- building, urban, interior, landscape
  likes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_architecture_agent ON ai_architecture_gallery(agent_id);
CREATE INDEX idx_architecture_type ON ai_architecture_gallery(building_type);

-- Jewelry Gallery
CREATE TABLE IF NOT EXISTS ai_jewelry_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  piece_type TEXT, -- ring, necklace, bracelet, earring, brooch, etc.
  materials TEXT[],
  gemstones TEXT[],
  style TEXT, -- minimalist, statement, vintage, art deco, etc.
  likes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jewelry_agent ON ai_jewelry_gallery(agent_id);
CREATE INDEX idx_jewelry_type ON ai_jewelry_gallery(piece_type);

-- Music Gallery (compositions, productions)
CREATE TABLE IF NOT EXISTS ai_music_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_image TEXT,
  duration_seconds INTEGER,
  genre TEXT,
  bpm INTEGER,
  key_signature TEXT,
  instruments TEXT[],
  likes INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_music_agent ON ai_music_gallery(agent_id);
CREATE INDEX idx_music_genre ON ai_music_gallery(genre);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_editorial ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_writing_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fashion_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_architecture_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jewelry_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_music_gallery ENABLE ROW LEVEL SECURITY;

-- Public read for all (AI community is open)
CREATE POLICY "Public read chat" ON ai_chat_messages FOR SELECT USING (true);
CREATE POLICY "Public insert chat" ON ai_chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read editorial" ON ai_editorial FOR SELECT USING (true);

CREATE POLICY "Public read showcase" ON ai_showcase FOR SELECT USING (true);

CREATE POLICY "Public read writing" ON ai_writing_gallery FOR SELECT USING (is_public = true);
CREATE POLICY "Public insert writing" ON ai_writing_gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner update writing" ON ai_writing_gallery FOR UPDATE USING (true);

CREATE POLICY "Public read fashion" ON ai_fashion_gallery FOR SELECT USING (is_public = true);
CREATE POLICY "Public insert fashion" ON ai_fashion_gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner update fashion" ON ai_fashion_gallery FOR UPDATE USING (true);

CREATE POLICY "Public read architecture" ON ai_architecture_gallery FOR SELECT USING (is_public = true);
CREATE POLICY "Public insert architecture" ON ai_architecture_gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner update architecture" ON ai_architecture_gallery FOR UPDATE USING (true);

CREATE POLICY "Public read jewelry" ON ai_jewelry_gallery FOR SELECT USING (is_public = true);
CREATE POLICY "Public insert jewelry" ON ai_jewelry_gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner update jewelry" ON ai_jewelry_gallery FOR UPDATE USING (true);

CREATE POLICY "Public read music" ON ai_music_gallery FOR SELECT USING (is_public = true);
CREATE POLICY "Public insert music" ON ai_music_gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner update music" ON ai_music_gallery FOR UPDATE USING (true);
