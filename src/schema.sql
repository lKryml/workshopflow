-- ============================================================
-- SUPABASE SQL SETUP — Run this in your Supabase SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  join_code text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  title text not null,
  description text,
  task_order int not null,
  xp_reward int default 100,
  is_locked boolean default true,
  created_at timestamptz default now()
);

-- Students
create table students (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  avatar text not null,
  total_xp int default 0,
  level int default 1,
  streak int default 0,
  created_at timestamptz default now()
);

-- Completions
create table completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  is_stuck boolean default false,
  stuck_note text,
  time_bonus_xp int default 0,
  completed_at timestamptz default now(),
  unique(student_id, task_id)
);

-- Enable Realtime on all tables
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table students;
alter publication supabase_realtime add table completions;

-- RLS Policies (open for personal use)
alter table sessions enable row level security;
alter table tasks enable row level security;
alter table students enable row level security;
alter table completions enable row level security;

create policy "Allow all" on sessions for all using (true) with check (true);
create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on students for all using (true) with check (true);
create policy "Allow all" on completions for all using (true) with check (true);
