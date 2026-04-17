-- ==========================================================
-- Migration: Add live lobby support and voter role metadata
-- Run this in your Supabase SQL editor or via supabase db push
-- ==========================================================

-- 1) Add user type to profiles
alter table public.profiles
  add column if not exists user_type text not null default 'voter';

alter table public.profiles
  drop constraint if exists profiles_user_type_check;

alter table public.profiles
  add constraint profiles_user_type_check
  check (user_type in ('voter', 'caster', 'admin'));

-- 2) Live session tables
create table if not exists public.live_sessions (
  poll_id uuid primary key references public.polls(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'started', 'closed')),
  room_code text unique,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.live_participants (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists idx_live_participants_poll_id on public.live_participants(poll_id);

-- 3) Row-level security
alter table public.live_sessions enable row level security;
alter table public.live_participants enable row level security;

-- live_sessions policies
drop policy if exists "live_sessions_select_visible" on public.live_sessions;
create policy "live_sessions_select_visible"
on public.live_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = live_sessions.poll_id
      and (p.privacy_mode = 'public' or p.creator_id = auth.uid())
  )
);

drop policy if exists "live_sessions_insert_host" on public.live_sessions;
create policy "live_sessions_insert_host"
on public.live_sessions
for insert
to authenticated
with check (host_id = auth.uid());

drop policy if exists "live_sessions_update_host_only" on public.live_sessions;
create policy "live_sessions_update_host_only"
on public.live_sessions
for update
to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

-- live_participants policies
drop policy if exists "live_participants_select_visible" on public.live_participants;
create policy "live_participants_select_visible"
on public.live_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = live_participants.poll_id
      and (p.privacy_mode = 'public' or p.creator_id = auth.uid())
  )
);

drop policy if exists "live_participants_insert_self" on public.live_participants;
create policy "live_participants_insert_self"
on public.live_participants
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "live_participants_delete_self_or_host" on public.live_participants;
create policy "live_participants_delete_self_or_host"
on public.live_participants
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.polls p
    where p.id = live_participants.poll_id
      and p.creator_id = auth.uid()
  )
);
