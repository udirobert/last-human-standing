-- 025 — Clean cohort 1 signups + add reachability / contact columns.
--
-- Wipes the anonymous free-entry ghost before Jul 29 beta. Preserves
-- rounds/lottery reset from 023–024. Idempotent column adds.

-- Clear in-progress artifacts (safe if empty).
delete from public.checkins;
delete from public.submissions;
delete from public.votes;
delete from public.chat_messages;
delete from public.push_subscriptions;
delete from public.world_push_subscriptions;
delete from public.lottery_results where cohort = 1;

-- Remove all reserved players — beta starts with strict onboarding.
delete from public.users;

-- Reachability: how ops / the game can contact each entrant.
alter table public.users add column if not exists contact_email text;
alter table public.users add column if not exists telegram_user_id bigint;
alter table public.users add column if not exists telegram_username text;
alter table public.users add column if not exists telegram_link_token text;
alter table public.users add column if not exists telegram_link_expires_at timestamptz;
alter table public.users add column if not exists farcaster_fid bigint;
alter table public.users add column if not exists reachability_completed_at timestamptz;

create unique index if not exists users_contact_email_uidx
  on public.users (lower(contact_email))
  where contact_email is not null;

create unique index if not exists users_telegram_user_id_uidx
  on public.users (telegram_user_id)
  where telegram_user_id is not null;

create unique index if not exists users_farcaster_fid_uidx
  on public.users (farcaster_fid)
  where farcaster_fid is not null;
