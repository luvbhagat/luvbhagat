-- Cliporo AI — Phase 1: video ingestion
-- Run this in your Supabase project: Dashboard -> SQL Editor -> New query ->
-- paste -> Run. Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).

-- 1) The "videos" table: one row per uploaded source video.
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title         text not null,
  storage_path  text not null,
  status        text not null default 'uploaded'
                  check (status in ('uploaded','transcribing','ready','failed')),
  assemblyai_id text,
  transcript    jsonb,
  duration_sec  integer,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists videos_user_id_created_idx
  on public.videos (user_id, created_at desc);

-- 2) Row Level Security: a user can only see / change their own videos.
alter table public.videos enable row level security;

drop policy if exists "videos_select_own" on public.videos;
create policy "videos_select_own" on public.videos
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "videos_insert_own" on public.videos;
create policy "videos_insert_own" on public.videos
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "videos_update_own" on public.videos;
create policy "videos_update_own" on public.videos
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "videos_delete_own" on public.videos;
create policy "videos_delete_own" on public.videos
  for delete to authenticated using (auth.uid() = user_id);

-- 3) Private storage bucket for the uploaded video files.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- 4) Storage RLS: files live under a folder named after the user's id, e.g.
--    "<user_id>/<random>-clip.mp4". Users can only touch their own folder.
drop policy if exists "videos_storage_select_own" on storage.objects;
create policy "videos_storage_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "videos_storage_insert_own" on storage.objects;
create policy "videos_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "videos_storage_delete_own" on storage.objects;
create policy "videos_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);