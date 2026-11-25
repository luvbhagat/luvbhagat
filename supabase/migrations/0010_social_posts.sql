-- Cliporo AI — Phase 8: social posts (track clips posted to platforms)
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- One row per attempt to post a rendered clip to a platform. Gives us a
-- history, a link to the live post, and a place to record failures.

create table if not exists public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  clip_id     uuid not null references public.clips (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade
                default auth.uid(),
  provider    text not null check (provider in ('youtube','tiktok','instagram')),
  status      text not null default 'posting'
                check (status in ('posting','posted','failed')),
  remote_id   text,
  remote_url  text,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists social_posts_clip_idx
  on public.social_posts (clip_id, created_at desc);

alter table public.social_posts enable row level security;

drop policy if exists "posts_select_own" on public.social_posts;
create policy "posts_select_own" on public.social_posts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "posts_insert_own" on public.social_posts;
create policy "posts_insert_own" on public.social_posts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "posts_update_own" on public.social_posts;
create policy "posts_update_own" on public.social_posts
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
