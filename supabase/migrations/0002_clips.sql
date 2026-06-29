-- Cliporo AI — Phase 2: AI clip detection
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

create table if not exists public.clips (
  id                uuid primary key default gen_random_uuid(),
  video_id          uuid not null references public.videos (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade default auth.uid(),
  start_sec         numeric not null,
  end_sec           numeric not null,
  score             integer not null default 0,
  title             text not null,
  transcript_slice  jsonb,
  status            text not null default 'candidate'
                      check (status in ('candidate','queued','rendering','ready','failed')),
  output_key        text,
  created_at        timestamptz not null default now()
);

create index if not exists clips_video_idx on public.clips (video_id, score desc);
create index if not exists clips_user_idx on public.clips (user_id, created_at desc);

alter table public.clips enable row level security;

drop policy if exists "clips_select_own" on public.clips;
create policy "clips_select_own" on public.clips
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "clips_insert_own" on public.clips;
create policy "clips_insert_own" on public.clips
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "clips_update_own" on public.clips;
create policy "clips_update_own" on public.clips
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "clips_delete_own" on public.clips;
create policy "clips_delete_own" on public.clips
  for delete to authenticated using (auth.uid() = user_id);