-- AuraClip AI — Phase 3b: rendered clip storage
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.

-- Private bucket for finished MP4s (one folder per user).
insert into storage.buckets (id, name, public)
values ('renders', 'renders', false)
on conflict (id) do nothing;

drop policy if exists "renders_select_own" on storage.objects;
create policy "renders_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);

-- Note: the render worker uploads with the service-role key, which bypasses
-- RLS, so no INSERT policy is needed here for the worker. Users can read their
-- own finished files via the SELECT policy above.