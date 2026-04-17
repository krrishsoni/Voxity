-- ==========================================================
-- Migration: Add avatar support to profiles
-- Run this in your Supabase SQL editor
-- ==========================================================

-- 1) Add avatar_url column to profiles
alter table public.profiles
  add column if not exists avatar_url text;

-- 2) Create avatars storage bucket (public read)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3) Storage policies for avatars bucket
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avatars');

drop policy if exists "Public can view avatars" on storage.objects;
create policy "Public can view avatars"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' and owner = auth.uid())
with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
on storage.objects
for delete
to authenticated
using (bucket_id = 'avatars' and owner = auth.uid());

-- 4) Broader votes SELECT so we can show voter names on public polls
--    Any authenticated user can see votes on public polls
drop policy if exists "votes_select_public_polls" on public.votes;
create policy "votes_select_public_polls"
on public.votes
for select
to authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = votes.poll_id
      and p.privacy_mode = 'public'
  )
);
