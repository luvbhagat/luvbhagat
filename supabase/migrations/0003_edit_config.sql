-- AuraClip AI — Phase 3: clip editor config
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.

alter table public.clips
  add column if not exists edit_config jsonb;