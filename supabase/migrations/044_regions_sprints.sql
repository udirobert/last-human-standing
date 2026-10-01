-- 044 — Regions and regional sprints (docs/TOKEN_ROUNDS.md §3.4, §3.3).
--
-- The v3 track. Co-presence requires local density, so a single global
-- window is structurally wrong: it means everyone plays at the wrong time.
-- Sprints are scoped to a region instead, and regional windows overlap
-- PARTIALLY so that each region never plays an empty world alone.
--
-- Nothing here modifies a v2 table. Rounds/cohorts are untouched.

create table if not exists public.regions (
  id          text primary key,
  name        text not null,
  -- Centroid + radius define the region's catchment. A player competes
  -- with people inside this disc, not with a global clock.
  lat         double precision not null,
  lng         double precision not null,
  radius_m    integer       not null default 250000,
  -- Sprints open at this local time-of-day (minutes from midnight in the
  -- region's own timezone). Keeping the cadence in LOCAL time is what makes
  -- the window land on waking hours for the people who must show up.
  opens_local_minute integer not null default 1080,
  -- IANA tz used to resolve opens_local_minute.
  timezone    text          not null default 'UTC',
  active      boolean       not null default true,
  created_at  timestamptz   not null default now()
);

comment on table public.regions is
  'Geographic regions for v3 sprint scoping. Each region owns its own sprint '
  'cadence in local time. Seeded by the operator (Americas / EMEA / APAC).';

create table if not exists public.sprints (
  id           bigserial primary key,
  region_id    text        not null references public.regions(id) on delete cascade,
  season       integer     not null default 1,
  -- Bounded sprint: brief -> field -> settlement.
  opens_at     timestamptz not null,
  field_opens_at timestamptz not null,
  closes_at    timestamptz not null,
  status       text        not null default 'scheduled'
                 check (status in ('scheduled', 'brief', 'field', 'settled')),
  -- Optional committed intent from the always-on layer: where the player
  -- said they would go and what they would carry. Prepping online is what
  -- makes the sprint the EXECUTION of a plan rather than a cold start.
  intent_count integer     not null default 0,
  settled_at   timestamptz,
  created_at   timestamptz not null default now(),
  check (field_opens_at >= opens_at),
  check (closes_at > field_opens_at)
);

comment on table public.sprints is
  'Bounded v3 sprint windows, scoped to a region. Overlapping regional '
  'windows keep matches warm; a player never plays a global clock.';

create index if not exists sprints_region_status_idx
  on public.sprints (region_id, status, field_opens_at);

-- Flash moments are telegraphed scarcity windows, NOT random events: a
-- location opens for a bounded period and only N verified humans may be
-- inside. The short, non-repeatable window is the whole point — missing it
-- has to cost something real.
create table if not exists public.sprint_flashes (
  id          bigserial primary key,
  sprint_id   bigint      not null references public.sprints(id) on delete cascade,
  label       text        not null,
  lat         double precision not null,
  lng         double precision not null,
  radius_m    integer     not null default 120,
  capacity    integer     not null default 12,
  opens_at    timestamptz not null,
  closes_at   timestamptz not null,
  created_at  timestamptz not null default now(),
  check (closes_at > opens_at),
  check (capacity > 0)
);

comment on table public.sprint_flashes is
  'Telegraphed scarcity windows ("Token is 200m away and someone is carrying '
  'it"). Bounded by time and headcount capacity — that is what makes them '
  'feel scarce instead of free.';

create index if not exists sprint_flashes_sprint_idx
  on public.sprint_flashes (sprint_id, opens_at);

-- RLS: enabled with NO policies (service-role only), matching migration 041.
-- Public reads of regions/sprints are served by /api/v3/*, not by direct
-- table access.
alter table public.regions       enable row level security;
alter table public.sprints        enable row level security;
alter table public.sprint_flashes enable row level security;