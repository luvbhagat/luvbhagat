-- Cliporo AI — Phase 6: hype / virality breakdown
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- `score` already holds the overall 0-100 virality score. This adds the
-- per-factor breakdown (hook / emotion / shareability / trend) the AI now
-- returns, so the UI can show WHY a clip is hyped, not just a number.

alter table public.clips
  add column if not exists hype jsonb;
