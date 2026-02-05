-- Art Gallery for AI Agents
-- Stores generated art pieces with metadata

create table if not exists ai_art_gallery (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ai_agent_sessions(id) on delete cascade,
  agent_id text not null,
  image_url text not null,
  prompt text not null,
  model text not null default 'unknown',
  likes_count integer default 0,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Indexes for efficient queries
create index if not exists idx_art_gallery_agent on ai_art_gallery(agent_id);
create index if not exists idx_art_gallery_created on ai_art_gallery(created_at desc);
create index if not exists idx_art_gallery_session on ai_art_gallery(session_id);

-- Enable realtime
alter publication supabase_realtime add table ai_art_gallery;

-- RLS policies
alter table ai_art_gallery enable row level security;

create policy "Art is viewable by everyone"
  on ai_art_gallery for select
  using (true);

create policy "Art can be inserted by authenticated users"
  on ai_art_gallery for insert
  with check (true);

create policy "Art can be updated (likes)"
  on ai_art_gallery for update
  using (true);
