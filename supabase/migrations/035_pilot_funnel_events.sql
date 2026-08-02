-- 035 — Pilot funnel events (measurement for the Cohort 1 pilot).
--
-- The pilot must be able to distinguish rule confusion, verification
-- friction, submission friction, and weak return motivation. Page views
-- alone cannot. This table records the 11-event funnel:
--
--   landing_view → reserve_click → verification_started → verified →
--   checkin_opened → photo_added → submitted → votes_completed →
--   verdict_seen → shared → returned_next_day
--
-- Written by POST /api/track (server-only, same rate-limited path as page
-- views). No PII: session_id is the anonymous lhs_session cookie and
-- ip_hash is a sha256 of the request IP.

create table if not exists public.funnel_events (
  id bigint generated always as identity primary key,
  event text not null,
  day int,
  value text,
  path text,
  session_id text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_funnel_events_event_created
  on public.funnel_events (event, created_at desc);

create index if not exists idx_funnel_events_created
  on public.funnel_events (created_at desc);

alter table public.funnel_events enable row level security;

-- Server-only writes; no client read path is ever exposed.
drop policy if exists "funnel_events_server_only" on public.funnel_events;
create policy "funnel_events_server_only"
  on public.funnel_events
  for all
  to service_role
  using (true)
  with check (true);
