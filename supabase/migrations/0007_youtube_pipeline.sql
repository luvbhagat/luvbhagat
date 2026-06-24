-- Cliporo AI — YouTube pipeline (process-from-URL, no source storage)
-- The local worker now runs the WHOLE pipeline for a YouTube import in one
-- pass: download to a temp file, transcribe, find the best moments, render the
-- shorts, upload only the finished clips, then delete the temp file. The source
-- video is never stored in Supabase.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run. Apply 0006 first.

-- 1) New in-flight statuses the worker walks a YouTube video through:
--    importing -> transcribing -> analyzing -> rendering -> ready (or failed).
alter table public.videos drop constraint if exists videos_status_check;
alter table public.videos add constraint videos_status_check
  check (status in (
    'uploaded','importing','transcribing','analyzing','rendering','ready','failed'
  ));

-- 2) spend_credits_for: like spend_credits, but charges a specific user instead
--    of auth.uid(). The worker (service-role key, no session) calls this to bill
--    a YouTube import by its length. Raises 'insufficient_credits' / 'no_profile'.
create or replace function public.spend_credits_for(
  p_user uuid, p_amount integer, p_reason text, p_ref uuid
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
  from public.profiles where id = p_user for update;

  if v_balance is null then
    raise exception 'no_profile';
  end if;
  if v_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  update public.profiles
  set credit_balance = credit_balance - p_amount
  where id = p_user;

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (p_user, -p_amount, p_reason, p_ref);

  return v_balance - p_amount;
end;
$$;

grant execute on function public.spend_credits_for(uuid, integer, text, uuid)
  to service_role;
