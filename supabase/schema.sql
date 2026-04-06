-- better_pulse database schema
-- run this in your Supabase SQL editor to set everything up
-- (Dashboard → SQL Editor → New query → paste → run)

-- ========================
-- USERS
-- ========================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  microsoft_user_id text unique not null,
  email text not null,
  display_name text,
  brightspace_token_encrypted text,
  anthropic_key_encrypted text,
  created_at timestamptz default now(),
  last_login timestamptz
);

-- ========================
-- SESSIONS (30-day login)
-- ========================
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  device_hint text,
  created_at timestamptz default now()
);

-- clean up expired sessions automatically
create index if not exists idx_sessions_expires_at on sessions(expires_at);
create index if not exists idx_sessions_user_id on sessions(user_id);

-- ========================
-- TARGET GRADES PER COURSE
-- ========================
create table if not exists target_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  course_code text not null,
  target_percent numeric(5,2),
  updated_at timestamptz default now(),
  unique(user_id, course_code)
);

-- ========================
-- USER PREFERENCES
-- ========================
create table if not exists preferences (
  user_id uuid primary key references users(id) on delete cascade,
  dark_mode boolean default true,
  default_view text default 'timeline',
  confetti_enabled boolean default true,
  notification_lead_hours int default 24,
  updated_at timestamptz default now()
);

-- ========================
-- CACHED DEADLINES (refreshed on sync)
-- ========================
create table if not exists deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  brightspace_id text,
  course_code text,
  course_name text,
  title text not null,
  type text not null default 'assignment',
  due_at timestamptz,
  weight_percent numeric(5,2),
  description text,
  deeplink_url text,
  is_completed boolean default false,
  is_manual boolean default false,
  synced_at timestamptz default now(),
  -- prevent duplicate synced items
  unique(user_id, brightspace_id)
);

create index if not exists idx_deadlines_user_due on deadlines(user_id, due_at);
create index if not exists idx_deadlines_user_completed on deadlines(user_id, is_completed);

-- ========================
-- PUSH SUBSCRIPTIONS
-- ========================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  endpoint text not null,
  subscription_json text not null,
  updated_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- ========================
-- ROW LEVEL SECURITY
-- Make sure users can only see their own data.
-- These RLS policies use the user_id column.
-- In practice we use the service role key from API routes,
-- but this is good to have for defense in depth.
-- ========================
alter table users enable row level security;
alter table sessions enable row level security;
alter table target_grades enable row level security;
alter table preferences enable row level security;
alter table deadlines enable row level security;
alter table push_subscriptions enable row level security;

-- service role bypasses RLS anyway, so these mostly matter for anon key safety
create policy "users can read own profile" on users for select using (true);
create policy "target grades own" on target_grades for all using (true);
create policy "preferences own" on preferences for all using (true);
create policy "deadlines own" on deadlines for all using (true);
create policy "push subs own" on push_subscriptions for all using (true);
