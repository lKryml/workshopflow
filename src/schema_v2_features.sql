-- ============================================================
-- WorkshopFlow v2 — Feature Schema Migration
-- Run AFTER schema_v2_core.sql has been verified working
-- Safe to run on existing data — all new tables
-- ============================================================

-- 1. Modules (course mode: Day 1, Day 2, Module 1, etc.)
create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  title text not null,
  description text,
  module_order int not null,
  is_locked boolean not null default true,
  created_at timestamptz default now()
);

-- 2. Add module_id to tasks (nullable = workshop/flat mode, set = course mode)
alter table tasks
  add column if not exists module_id uuid references modules(id) on delete set null;

-- 3. Custom registration fields per session
create table if not exists session_fields (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  field_key text not null,
  field_label text not null,
  field_type text not null default 'text', -- 'text' | 'url' | 'select'
  is_required boolean not null default false,
  field_order int not null default 0,
  options text[] default '{}',
  unique(session_id, field_key)
);

-- 4. Resources (links, file uploads, embeds) per session or per task
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,      -- null = session-wide
  module_id uuid references modules(id) on delete set null, -- null = session-wide
  title text not null,
  resource_type text not null, -- 'link' | 'file' | 'embed'
  url text,         -- for link and embed types
  file_path text,   -- for file type (Supabase Storage path)
  description text,
  resource_order int not null default 0,
  created_at timestamptz default now()
);

-- 5. RLS for new tables (open, matches existing pattern)
alter table modules enable row level security;
alter table session_fields enable row level security;
alter table resources enable row level security;

drop policy if exists "Open access modules" on modules;
drop policy if exists "Open access session_fields" on session_fields;
drop policy if exists "Open access resources" on resources;

create policy "Open access modules"       on modules       for all using (true) with check (true);
create policy "Open access session_fields" on session_fields for all using (true) with check (true);
create policy "Open access resources"     on resources     for all using (true) with check (true);

-- 6. Enable realtime for new tables
alter publication supabase_realtime add table modules;
alter publication supabase_realtime add table session_fields;
alter publication supabase_realtime add table resources;

-- ============================================================
-- Storage bucket: create manually in Supabase Dashboard
--   1. Go to Storage → New Bucket
--   2. Name: "resources", toggle Public: ON
--   3. Under Policies, add:
--      - SELECT: allow all (public read)
--      - INSERT: allow authenticated users
-- ============================================================
