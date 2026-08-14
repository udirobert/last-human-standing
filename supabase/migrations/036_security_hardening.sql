-- 036 — Direct Supabase API and Storage hardening.
--
-- The application exposes public game data through the Express API, which
-- uses the service_role client. Browser clients do not need direct PostgREST
-- access to application tables. Lock direct anon/authenticated access down
-- to prevent raw-row exposure (PII, GPS coordinates, signatures, payment
-- records, and private gameplay state).
--
-- The checkins bucket remains private. Uploads use short-lived signed upload
-- tokens created by the backend; reads use server-created signed URLs.
-- Safe to re-run.

-- Ensure every currently deployed application table is RLS-protected,
-- including tables introduced by historical migrations.
do $$
declare
  table_record record;
begin
  for table_record in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_record.tablename
    );
  end loop;
end
$$;

-- The service role is the only database client used by the server. Do not
-- grant direct PostgREST table access to browser roles.
revoke all privileges on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- SECURITY DEFINER functions are callable through PostgREST when EXECUTE is
-- granted. Remove default public execution so game-state mutation RPCs are
-- server-only as well.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Remove legacy policies that made whole rows public. RLS cannot hide
-- individual columns when a SELECT policy permits a row.
drop policy if exists "users_public_read" on public.users;
drop policy if exists "rounds_public_read" on public.rounds;
drop policy if exists "checkins_public_read" on public.checkins;
drop policy if exists "submissions_public_read" on public.submissions;
drop policy if exists "votes_public_read" on public.votes;
drop policy if exists "chat_messages_public_read" on public.chat_messages;
drop policy if exists "waitlist_public_read" on public.waitlist;
drop policy if exists "lottery_results_read" on public.lottery_results;

-- Signed URLs, rather than bucket-wide public policies, are the only client
-- media access path. `createSignedUploadUrl` returns a time-bound upload
-- token, so an anon INSERT policy is neither required nor appropriate.
update storage.buckets
  set public = false
  where id = 'checkins';

drop policy if exists "checkins_service_upload" on storage.objects;
drop policy if exists "checkins_public_read" on storage.objects;
drop policy if exists "checkins_service_delete" on storage.objects;
