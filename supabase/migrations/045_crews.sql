-- 045 — Crews (docs/TOKEN_ROUNDS.md §5.1).
--
-- People do not root for "player #4,821". They root for a named crew with a
-- local hangout and a scoreboard rivalry with the crew down the street.
-- Scarcity between factions generates narrative for free.
--
-- Decision (locked): FOUNDER-LED, OPEN JOIN. The operator seeds a few named
-- crews per region at season start so a new city has identity on day one;
-- anyone can found a crew up to a cap, and anyone can join any crew.
-- Player-founded-only leaves a cold city with zero factions and no reason to
-- meet. Auto-assignment has no agency and therefore no investment.

create table if not exists public.crews (
  id           bigserial primary key,
  region_id    text        not null references public.regions(id) on delete cascade,
  name         text        not null,
  -- Shown next to every transaction so identity is legible to the people
  -- you are trading with. Recognition is the point (see §5.4).
  tagline      text,
  color        text        not null default '#7c6a3f',
  -- The player who founded the crew. Not a permanent leader: crews are
  -- flat, and contribution (not rank) is what accrues.
  founder      text        not null,
  season       integer     not null default 1,
  open         boolean     not null default true,
  created_at   timestamptz not null default now(),
  unique (region_id, name)
);

comment on table public.crews is
  'Founder-led, open-join regional crews. Seeded by the operator per region; '
  'the emotional unit of the game is the crew, not the individual.';

-- Cap on how many crews one address may found per season, so founding is
-- available without letting one player spam the leaderboard.
create table if not exists public.crew_founder_limits (
  region_id text    not null references public.regions(id) on delete cascade,
  address   text    not null,
  season    integer not null,
  founded   integer not null default 0,
  primary key (region_id, address, season)
);

comment on table public.crew_founder_limits is
  'Per-region, per-season cap on crews one address may found.';

create table if not exists public.crew_members (
  id          bigserial primary key,
  crew_id     bigint      not null references public.crews(id) on delete cascade,
  address     text        not null,
  region_id   text        not null references public.regions(id) on delete cascade,
  role        text        not null default 'member'
                check (role in ('founder', 'member')),
  -- Monotonic contribution counter, driven by settlement. This is the
  -- "make skipping cost other people" lever: your crew's score drops and
  -- teammates notice you were not there. Obligation compounds where
  -- motivation does not.
  contribution integer     not null default 0,
  joined_at   timestamptz not null default now(),
  unique (crew_id, address)
);

comment on table public.crew_members is
  'Crew roster. contribution is the ledger behind the reciprocity loop — '
  'absentia is informative rather than punitive (no streaks, no dailies).';

create index if not exists crew_members_crew_idx on public.crew_members (crew_id);
create index if not exists crew_members_region_idx on public.crew_members (region_id, address);

-- Aggregate view input: crew standing per region/season.
create or replace view public.crew_standings as
  select
    c.region_id,
    c.id                                       as crew_id,
    c.name,
    c.color,
    c.season,
    count(m.address)::int                      as members,
    coalesce(sum(m.contribution), 0)::bigint   as contribution
  from public.crews c
  left join public.crew_members m on m.crew_id = c.id
  group by c.region_id, c.id, c.name, c.color, c.season;

comment on view public.crew_standings is
  'Crew standing per region/season. Rivalry needs a visible number.';

-- RLS: enabled with NO policies (service-role only), matching migration 041.
alter table public.crews             enable row level security;
alter table public.crew_founder_limits enable row level security;
alter table public.crew_members      enable row level security;