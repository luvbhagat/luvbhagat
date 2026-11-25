-- Cliporo AI — Phase 7: social connections (connect TikTok / YouTube / Instagram)
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- One row per (user, platform). Holds the OAuth tokens we use to post clips on
-- the user's behalf later. Tokens are written/read only by server code; the
-- UI selects just the safe columns (provider, username, expiry).

create table if not exists public.social_connections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade
                        default auth.uid(),
  provider            text not null
                        check (provider in ('youtube','tiktok','instagram')),
  provider_account_id text,
  username            text,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  scopes              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.social_connections enable row level security;

drop policy if exists "social_select_own" on public.social_connections;
create policy "social_select_own" on public.social_connections
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "social_insert_own" on public.social_connections;
create policy "social_insert_own" on public.social_connections
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "social_update_own" on public.social_connections;
create policy "social_update_own" on public.social_connections
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "social_delete_own" on public.social_connections;
create policy "social_delete_own" on public.social_connections
  for delete to authenticated using (auth.uid() = user_id);
