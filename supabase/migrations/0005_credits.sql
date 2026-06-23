-- AuraClip AI — Phase 5: credits & billing
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.

-- 1) profiles: one row per user, caches the credit balance.
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text,
  credit_balance integer not null default 100,
  plan           text not null default 'free',
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- 2) credit_ledger: append-only source of truth for credit changes.
create table if not exists public.credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  delta      integer not null,
  reason     text not null,
  ref_id     uuid,
  created_at timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;

drop policy if exists "ledger_select_own" on public.credit_ledger;
create policy "ledger_select_own" on public.credit_ledger
  for select to authenticated using (auth.uid() = user_id);

-- 3) On signup: create a profile and grant starter credits.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, credit_balance, plan)
  values (new.id, new.email, 100, 'free')
  on conflict (id) do nothing;
  insert into public.credit_ledger (user_id, delta, reason)
  values (new.id, 100, 'signup_grant');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Backfill existing users.
insert into public.profiles (id, email, credit_balance, plan)
select id, email, 100, 'free' from auth.users
on conflict (id) do nothing;

insert into public.credit_ledger (user_id, delta, reason)
select p.id, 100, 'signup_grant'
from public.profiles p
where not exists (
  select 1 from public.credit_ledger l where l.user_id = p.id
);

-- 5) spend_credits: atomic debit for the current user. Raises
--    'insufficient_credits' if the balance is too low.
create or replace function public.spend_credits(
  p_amount integer, p_reason text, p_ref uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  select credit_balance into v_balance
  from public.profiles where id = auth.uid() for update;

  if v_balance is null then
    raise exception 'no_profile';
  end if;
  if v_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  update public.profiles
  set credit_balance = credit_balance - p_amount
  where id = auth.uid();

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (auth.uid(), -p_amount, p_reason, p_ref);

  return v_balance - p_amount;
end;
$$;

grant execute on function public.spend_credits(integer, text, uuid) to authenticated;

-- 6) grant_credits: add credits to a user (refunds + purchases). Called by the
--    render worker / Stripe webhook using the service-role key.
create or replace function public.grant_credits(
  p_user uuid, p_amount integer, p_reason text, p_ref uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set credit_balance = credit_balance + p_amount
  where id = p_user;

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (p_user, p_amount, p_reason, p_ref);
end;
$$;