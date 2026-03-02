-- ============================================================
-- WorkshopFlow v2 — Core Schema Migration
-- Run this FIRST in your Supabase SQL Editor
-- Safe to run on existing data — all changes are additive
-- ============================================================

-- 1. Fix level column: int → text (was storing 1 forever)
alter table students
  alter column level type text using level::text;
alter table students
  alter column level set default 'Newbie';
-- Back-fill any numeric or unknown value to 'Newbie'
update students
set level = 'Newbie'
where level not in ('Newbie', 'Apprentice', 'Developer', 'Hacker', 'Wizard');

-- 2. Add instructor ownership, type, description, settings to sessions
alter table sessions
  add column if not exists instructor_id uuid references auth.users(id),
  add column if not exists session_type text not null default 'workshop',
  add column if not exists description text,
  add column if not exists settings jsonb not null default '{}';

-- 3. Add extended registration fields to students
alter table students
  add column if not exists email text,
  add column if not exists github_username text,
  add column if not exists phone text,
  add column if not exists custom_fields jsonb not null default '{}',
  add column if not exists registered_at timestamptz default now();

-- 4. Instructors table (linked to Supabase auth.users)
create table if not exists instructors (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz default now()
);

alter table instructors enable row level security;

-- Clean up any previously-created policy before re-creating (idempotency)
drop policy if exists "Own record only" on instructors;
create policy "Own record only"
  on instructors for all
  using (id = auth.uid())
  with check (id = auth.uid());

alter publication supabase_realtime add table instructors;

-- 5. Auto-create instructor row on first auth signup
create or replace function handle_new_instructor_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.instructors (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_instructor_signup();

-- ============================================================
-- Verification: after running, create a test auth user in the
-- Supabase Dashboard (Auth > Users > Invite) and confirm a row
-- appears in public.instructors.
-- ============================================================
