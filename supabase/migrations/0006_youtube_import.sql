-- Cliporo AI — YouTube import
-- Lets a user paste a YouTube link instead of uploading a file. The video row
-- is created immediately with status 'importing' and no file yet; the local
-- worker (npm run worker) downloads the video with yt-dlp, uploads it to the
-- "videos" bucket, fills in storage_path, then starts transcription as usual.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

-- 1) The file no longer exists at insert time for YouTube imports — the worker
--    fills storage_path in after it downloads the video.
alter table public.videos alter column storage_path drop not null;

-- 2) Remember the original link we imported from (null for normal uploads).
alter table public.videos add column if not exists source_url text;

-- 3) Allow the new 'importing' status.
alter table public.videos drop constraint if exists videos_status_check;
alter table public.videos add constraint videos_status_check
  check (status in ('uploaded','importing','transcribing','ready','failed'));
