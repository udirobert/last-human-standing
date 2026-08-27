-- 041 — Jury bounty pool (docs/RIDDLE_ROUNDS.md §4, item #1).
--
-- Operator seeds a small jury pool; at cohort end it is split pro-rata by
-- accumulated jury tickets. Manual settlement, matching the pilot posture.
-- The pool is a single record keyed by cohort number.

create table if not exists public.jury_bounty_pools (
  cohort      int primary key,
  token       text not null default 'WLD',
  amount      numeric not null default 0,
  seeded_at   timestamptz not null default now(),
  settled_at  timestamptz,
  settlement  jsonb  -- the pro-rata split result, set at settlement
);

comment on table public.jury_bounty_pools is
  'Operator-seeded jury accuracy bounty. At cohort end, the pool is split '
  'pro-rata by accumulated jury tickets among eligible jurors. Manual '
  'settlement (no on-chain automation) for the pilot.';

-- RLS: enabled with NO policies. The server reads/writes via the service
-- role (bypasses RLS) through the /api/jury-bounty/* endpoints. Anon/auth
-- clients cannot read or write the pool directly — the public status
-- endpoint is served by the server, not by direct table access.
alter table public.jury_bounty_pools enable row level security;
