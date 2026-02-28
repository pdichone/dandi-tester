-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Creates the tables required for API keys and dev user support

-- Users (linked to NextAuth session by email, or used as dev user)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  image text,
  created_at timestamptz default now()
);

-- API keys (per-user, with rate limit)
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  value text not null unique,
  usage int not null default 0,
  "limit" int not null default 1000,
  created_at timestamptz default now()
);

-- Indexes for lookups
create index if not exists api_keys_user_id_idx on public.api_keys(user_id);
create index if not exists api_keys_value_idx on public.api_keys(value);

-- Allow anonymous read/insert/update/delete for service role and anon (your app uses anon key with RLS or you may need to add policies)
-- If you use Row Level Security (RLS), add policies so your app can access these tables. Example:

alter table public.users enable row level security;
alter table public.api_keys enable row level security;

-- Policy: allow all for authenticated and anon (your Next.js API uses the anon key; restrict in production as needed)
create policy "Allow all on users for service and anon"
  on public.users for all
  using (true)
  with check (true);

create policy "Allow all on api_keys for service and anon"
  on public.api_keys for all
  using (true)
  with check (true);

-- Create the dev user so API key creation works without sign-in (when ALLOW_ANON_API_KEYS=true).
-- Run this in Supabase → SQL Editor. Then: Table Editor → users → copy the "id" of dev@local.dev
-- and add to .env.local:  DEV_USER_ID=<that-uuid>
insert into public.users (email, name)
values ('dev@local.dev', 'Local Dev User')
on conflict (email) do nothing;
