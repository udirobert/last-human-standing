-- Last Human Standing — schema
-- Apply in Supabase SQL editor. Idempotent (safe to re-run).

-- =============== Core users ===============
create table if not exists public.users (
  address text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  paid boolean not null default false,
  reserved_at timestamptz,                 -- when they joined the cohort
  world_id_verified boolean not null default false,
  eliminated boolean not null default false,
  eliminated_at_day int,                   -- day they were eliminated (null if alive)
  username text
);

-- Backfill columns if upgrading from earlier schema (no-op if they exist)
alter table public.users add column if not exists reserved_at timestamptz;
alter table public.users add column if not exists eliminated boolean not null default false;
alter table public.users add column if not exists eliminated_at_day int;
alter table public.users add column if not exists username text;

-- =============== Daily rounds (geo + window) ===============
create table if not exists public.rounds (
  day int primary key,
  name text not null,
  prompt text not null default '',
  lat double precision not null,
  lng double precision not null,
  radius_m int not null default 100,
  survival_cap int not null default 25,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'scheduled',  -- scheduled | open | closed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rounds_status_idx on public.rounds(status);

-- =============== Geo check-ins ===============
create table if not exists public.checkins (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  day int not null references public.rounds(day) on delete cascade,
  address text not null,
  username text,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  distance_m double precision not null,
  rank int not null,                        -- arrival order (1-based) within the day
  survived boolean not null default true,   -- false if rank > survival_cap or DQ'd by audit
  photo_path text,                          -- storage path; nullable in pilot
  signature text,                           -- MiniKit-signed payload (optional)
  message text                              -- the signed message body (optional)
);

create unique index if not exists checkins_unique_per_day_per_address
  on public.checkins(day, address);
create index if not exists checkins_day_rank_idx on public.checkins(day, rank);
create index if not exists checkins_address_idx on public.checkins(address);

-- =============== Audit layer (kept; non-binding in pilot) ===============
create table if not exists public.submissions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  address text not null,
  username text,
  day int not null,
  theme text not null,
  caption text not null default '',
  message text not null,
  signature text not null,
  media_path text,
  vote_quorum int,
  status text not null default 'pending'
);

create index if not exists submissions_day_idx on public.submissions(day);
create index if not exists submissions_created_at_idx on public.submissions(created_at desc);
create index if not exists submissions_address_idx on public.submissions(address);

create table if not exists public.votes (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  submission_id bigint not null references public.submissions(id) on delete cascade,
  voter_address text not null,
  vote text not null check (vote in ('real', 'fake'))
);

create unique index if not exists votes_unique_voter_per_submission
  on public.votes(submission_id, voter_address);

create index if not exists votes_submission_id_idx on public.votes(submission_id);

-- RLS deferred (server uses service role). Enable + lock down before public launch.
