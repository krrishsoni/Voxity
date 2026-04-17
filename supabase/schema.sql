-- Enable required extensions
create extension if not exists "pgcrypto";

-- -----------------------------
-- Types
-- -----------------------------
do $$ begin
  create type privacy_mode as enum ('public', 'friends', 'private');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type profile_level as enum ('Freshman', 'Sophomore', 'Junior', 'Dean');
exception
  when duplicate_object then null;
end $$;

-- -----------------------------
-- Core tables
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique check (char_length(username) between 3 and 24),
  department text,
  avatar_url text,
  xp integer not null default 0 check (xp >= 0),
  level profile_level not null default 'Freshman',
  created_at timestamptz not null default now()
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  is_blind boolean not null default false,
  is_ephemeral boolean not null default false,
  expires_at timestamptz,
  privacy_mode privacy_mode not null default 'public',
  qr_scans integer not null default 0,
  created_at timestamptz not null default now(),
  check (not is_ephemeral or expires_at is not null)
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  image_url text,
  vote_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_power_vote boolean not null default false,
  device_token text,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists idx_votes_poll_id on public.votes(poll_id);
create index if not exists idx_votes_user_id on public.votes(user_id);
create index if not exists idx_poll_options_poll_id on public.poll_options(poll_id);
create index if not exists idx_polls_creator_id on public.polls(creator_id);

-- -----------------------------
-- Quiz tables
-- -----------------------------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null unique references public.polls(id) on delete cascade,
  passing_score integer not null default 3 check (passing_score > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  passed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_attempts_user_poll on public.quiz_attempts(user_id, poll_id);

-- -----------------------------
-- XP events and streak helpers
-- -----------------------------
create table if not exists public.profile_daily_activity (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, activity_date)
);

-- -----------------------------
-- Utility functions
-- -----------------------------
create or replace function public.calculate_level(total_xp integer)
returns profile_level
language plpgsql
immutable
as $$
begin
  if total_xp >= 701 then
    return 'Dean';
  elsif total_xp >= 301 then
    return 'Junior';
  elsif total_xp >= 101 then
    return 'Sophomore';
  else
    return 'Freshman';
  end if;
end;
$$;

create or replace function public.apply_xp(profile_uuid uuid, delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_xp integer;
begin
  update public.profiles
  set xp = xp + delta
  where id = profile_uuid
  returning xp into next_xp;

  if next_xp is not null then
    update public.profiles
    set level = public.calculate_level(next_xp)
    where id = profile_uuid;
  end if;
end;
$$;

create or replace function public.add_daily_streak_bonus(profile_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_daily_activity (profile_id, activity_date)
  values (profile_uuid, current_date)
  on conflict do nothing;

  if found then
    perform public.apply_xp(profile_uuid, 2);
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  uname := regexp_replace(lower(uname), '[^a-z0-9_]', '', 'g');

  insert into public.profiles (id, email, username)
  values (new.id, new.email, left(uname || '_' || substr(new.id::text, 1, 6), 24))
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.enforce_vote_validity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  option_poll_id uuid;
  poll_expired boolean;
  has_passed_quiz boolean;
  power_votes_used integer;
begin
  select poll_id into option_poll_id from public.poll_options where id = new.option_id;

  if option_poll_id is null then
    raise exception 'Invalid option selected';
  end if;

  if option_poll_id <> new.poll_id then
    raise exception 'Option does not belong to poll';
  end if;

  select (p.expires_at is not null and p.expires_at <= now())
  into poll_expired
  from public.polls p
  where p.id = new.poll_id;

  if poll_expired then
    raise exception 'Poll has expired';
  end if;

  if new.is_power_vote then
    select count(*) into power_votes_used
    from public.votes v
    where v.user_id = new.user_id
      and v.is_power_vote = true
      and date_trunc('week', v.created_at) = date_trunc('week', now());

    if power_votes_used >= 3 then
      raise exception 'Weekly power vote limit reached';
    end if;
  end if;

  if exists (select 1 from public.quizzes q where q.poll_id = new.poll_id) then
    select exists (
      select 1
      from public.quiz_attempts qa
      join public.quizzes q on q.id = qa.quiz_id
      where qa.user_id = new.user_id
        and qa.poll_id = new.poll_id
        and qa.passed = true
        and qa.score >= q.passing_score
    ) into has_passed_quiz;

    if not has_passed_quiz then
      raise exception 'Quiz must be passed before voting';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_vote_validity on public.votes;
create trigger trg_enforce_vote_validity
before insert on public.votes
for each row
execute function public.enforce_vote_validity();

create or replace function public.after_vote_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.poll_options
  set vote_count = vote_count + case when new.is_power_vote then 2 else 1 end
  where id = new.option_id;

  perform public.apply_xp(new.user_id, 5);
  perform public.add_daily_streak_bonus(new.user_id);

  return new;
end;
$$;

drop trigger if exists trg_after_vote_insert on public.votes;
create trigger trg_after_vote_insert
after insert on public.votes
for each row
execute function public.after_vote_insert();

create or replace function public.after_poll_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_xp(new.creator_id, 10);
  perform public.add_daily_streak_bonus(new.creator_id);
  return new;
end;
$$;

drop trigger if exists trg_after_poll_insert on public.polls;
create trigger trg_after_poll_insert
after insert on public.polls
for each row
execute function public.after_poll_insert();

create or replace function public.after_quiz_attempt_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.passed then
    perform public.apply_xp(new.user_id, 15);
  end if;
  perform public.add_daily_streak_bonus(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_after_quiz_attempt_insert on public.quiz_attempts;
create trigger trg_after_quiz_attempt_insert
after insert on public.quiz_attempts
for each row
execute function public.after_quiz_attempt_insert();

create or replace function public.increment_qr_scan(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.polls
  set qr_scans = qr_scans + 1
  where id = p_poll_id;
end;
$$;

create or replace function public.cast_vote(
  p_poll_id uuid,
  p_option_id uuid,
  p_is_power_vote boolean default false,
  p_device_token text default null
)
returns public.votes
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_vote public.votes;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.votes (poll_id, option_id, user_id, is_power_vote, device_token)
  values (p_poll_id, p_option_id, auth.uid(), p_is_power_vote, p_device_token)
  returning * into inserted_vote;

  return inserted_vote;
end;
$$;

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.profiles enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.profile_daily_activity enable row level security;

-- profiles policies
drop policy if exists "profiles_select_own_or_public" on public.profiles;
create policy "profiles_select_own_or_public"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- polls policies
drop policy if exists "polls_select_visible" on public.polls;
create policy "polls_select_visible"
on public.polls
for select
to authenticated
using (
  privacy_mode = 'public'
  or creator_id = auth.uid()
);

drop policy if exists "polls_insert_creator" on public.polls;
create policy "polls_insert_creator"
on public.polls
for insert
to authenticated
with check (creator_id = auth.uid());

drop policy if exists "polls_update_creator" on public.polls;
create policy "polls_update_creator"
on public.polls
for update
to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

-- poll options policies
drop policy if exists "poll_options_select_by_poll_visibility" on public.poll_options;
create policy "poll_options_select_by_poll_visibility"
on public.poll_options
for select
to authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and (p.privacy_mode = 'public' or p.creator_id = auth.uid())
  )
);

drop policy if exists "poll_options_insert_creator_only" on public.poll_options;
create policy "poll_options_insert_creator_only"
on public.poll_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and p.creator_id = auth.uid()
  )
);

drop policy if exists "poll_options_update_creator_only" on public.poll_options;
create policy "poll_options_update_creator_only"
on public.poll_options
for update
to authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and p.creator_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.polls p
    where p.id = poll_id
      and p.creator_id = auth.uid()
  )
);

-- votes policies
drop policy if exists "votes_insert_once_per_poll" on public.votes;
create policy "votes_insert_once_per_poll"
on public.votes
for insert
to authenticated
with check (
  auth.uid() = user_id
  and not exists (
    select 1 from public.votes v
    where v.poll_id = votes.poll_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "votes_select_own_or_creator" on public.votes;
create policy "votes_select_own_or_creator"
on public.votes
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.polls p
    where p.id = votes.poll_id
      and p.creator_id = auth.uid()
  )
);

-- quiz policies
drop policy if exists "quizzes_select_visible" on public.quizzes;
create policy "quizzes_select_visible"
on public.quizzes
for select
to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = quizzes.poll_id
      and (p.privacy_mode = 'public' or p.creator_id = auth.uid())
  )
);

drop policy if exists "quizzes_insert_creator_only" on public.quizzes;
create policy "quizzes_insert_creator_only"
on public.quizzes
for insert
to authenticated
with check (
  exists (
    select 1 from public.polls p
    where p.id = quizzes.poll_id
      and p.creator_id = auth.uid()
  )
);

drop policy if exists "quiz_questions_select_visible" on public.quiz_questions;
create policy "quiz_questions_select_visible"
on public.quiz_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    join public.polls p on p.id = q.poll_id
    where q.id = quiz_id
      and (p.privacy_mode = 'public' or p.creator_id = auth.uid())
  )
);

drop policy if exists "quiz_questions_insert_creator_only" on public.quiz_questions;
create policy "quiz_questions_insert_creator_only"
on public.quiz_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quizzes q
    join public.polls p on p.id = q.poll_id
    where q.id = quiz_id
      and p.creator_id = auth.uid()
  )
);

drop policy if exists "quiz_answers_select_visible" on public.quiz_answers;
create policy "quiz_answers_select_visible"
on public.quiz_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.polls p on p.id = q.poll_id
    where qq.id = question_id
      and (p.privacy_mode = 'public' or p.creator_id = auth.uid())
  )
);

drop policy if exists "quiz_answers_insert_creator_only" on public.quiz_answers;
create policy "quiz_answers_insert_creator_only"
on public.quiz_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.polls p on p.id = q.poll_id
    where qq.id = question_id
      and p.creator_id = auth.uid()
  )
);

drop policy if exists "quiz_attempts_select_own_or_creator" on public.quiz_attempts;
create policy "quiz_attempts_select_own_or_creator"
on public.quiz_attempts
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.polls p
    where p.id = quiz_attempts.poll_id
      and p.creator_id = auth.uid()
  )
);

drop policy if exists "quiz_attempts_insert_self" on public.quiz_attempts;
create policy "quiz_attempts_insert_self"
on public.quiz_attempts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "profile_daily_activity_select_self" on public.profile_daily_activity;
create policy "profile_daily_activity_select_self"
on public.profile_daily_activity
for select
to authenticated
using (profile_id = auth.uid());

-- Allow RPC execution to authenticated users
grant execute on function public.cast_vote(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.increment_qr_scan(uuid) to authenticated, anon;
grant execute on function public.add_daily_streak_bonus(uuid) to authenticated;

-- Storage bucket and policies for option images
insert into storage.buckets (id, name, public)
values ('poll-option-images', 'poll-option-images', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload option images" on storage.objects;
create policy "Authenticated users can upload option images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'poll-option-images');

drop policy if exists "Public can read option images" on storage.objects;
create policy "Public can read option images"
on storage.objects
for select
to public
using (bucket_id = 'poll-option-images');

drop policy if exists "Users can update own option images" on storage.objects;
create policy "Users can update own option images"
on storage.objects
for update
to authenticated
using (bucket_id = 'poll-option-images' and owner = auth.uid())
with check (bucket_id = 'poll-option-images' and owner = auth.uid());

drop policy if exists "Users can delete own option images" on storage.objects;
create policy "Users can delete own option images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'poll-option-images' and owner = auth.uid());
