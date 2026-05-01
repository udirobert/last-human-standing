-- Last Human Standing — schema
-- Apply in Supabase SQL editor. Idempotent (safe to re-run).

-- =============== Core users ===============
create table if not exists public.users (
  address text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  paid boolean not null default false,
  reserved_at timestamptz,
  world_id_verified boolean not null default false,
  eliminated boolean not null default false,
  eliminated_at_day int,
  username text,
  referral_code text unique,
  referral_count int not null default 0,
  referred_by text,
  platform text
);

alter table public.users add column if not exists reserved_at timestamptz;
alter table public.users add column if not exists eliminated boolean not null default false;
alter table public.users add column if not exists eliminated_at_day int;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists referral_code text;
alter table public.users add column if not exists referral_count int not null default 0;
alter table public.users add column if not exists referred_by text;
alter table public.users add column if not exists platform text;
create unique index if not exists users_referral_code_idx on public.users(referral_code);

-- =============== Daily rounds (geo + window) ===============
create table if not exists public.rounds (
  day int primary key,
  name text not null,
  prompt text not null default '',
  place_type text not null default '',
  lat double precision,
  lng double precision,
  radius_m int not null default 100,
  survival_cap int not null default 25,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rounds add column if not exists place_type text not null default '';
alter table public.rounds alter column lat drop not null;
alter table public.rounds alter column lng drop not null;
create index if not exists rounds_status_idx on public.rounds(status);

-- =============== Geo check-ins ===============
create table if not exists public.checkins (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  day int not null references public.rounds(day) on delete cascade,
  address text not null,
  username text,
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  distance_m double precision,
  rank int not null,
  survived boolean not null default true,
  photo_path text,
  signature text,
  message text
);

alter table public.checkins alter column lat drop not null;
alter table public.checkins alter column lng drop not null;
alter table public.checkins alter column distance_m drop not null;
create unique index if not exists checkins_unique_per_day_per_address
  on public.checkins(day, address);
create unique index if not exists checkins_unique_per_day_per_rank
  on public.checkins(day, rank);
create index if not exists checkins_day_rank_idx on public.checkins(day, rank);
create index if not exists checkins_address_idx on public.checkins(address);

-- =============== Audit layer ===============
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
  status text not null default 'pending',
  is_infiltrator boolean not null default false
);

alter table public.submissions add column if not exists is_infiltrator boolean not null default false;
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

-- =============== Waitlist / referrals / chat ===============
create table if not exists public.waitlist (
  email text primary key,
  created_at timestamptz not null default now(),
  referral_code text not null unique,
  referral_count int not null default 0,
  referred_by text
);

create table if not exists public.chat_messages (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  address text not null,
  username text,
  message text not null
);

create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at desc);

create or replace function public.increment_referral(ref_code text)
returns void
language plpgsql
as $$
begin
  update public.users
    set referral_count = referral_count + 1
    where referral_code = ref_code;

  if not found then
    update public.waitlist
      set referral_count = referral_count + 1
      where referral_code = ref_code;
  end if;
end;
$$;

-- =============== Persistent server state ===============
create table if not exists public.game_sessions (
  id text primary key,
  address text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists game_sessions_address_idx on public.game_sessions(address);
create index if not exists game_sessions_expires_at_idx on public.game_sessions(expires_at);

create table if not exists public.siwe_nonces (
  nonce text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists siwe_nonces_expires_at_idx on public.siwe_nonces(expires_at);

create table if not exists public.pay_references (
  reference text primary key,
  address text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists pay_references_expires_at_idx on public.pay_references(expires_at);

create table if not exists public.rate_limits (
  key text primary key,
  hits int not null default 0,
  window_started_at timestamptz not null,
  expires_at timestamptz not null
);
create index if not exists rate_limits_expires_at_idx on public.rate_limits(expires_at);

-- =============== Atomic rank allocation ===============
create or replace function public.create_checkin(
  p_day int,
  p_address text,
  p_username text,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m double precision,
  p_distance_m double precision,
  p_survival_cap int
)
returns public.checkins
language plpgsql
as $$
declare
  existing_row public.checkins;
  next_rank int;
  inserted_row public.checkins;
begin
  select * into existing_row
  from public.checkins
  where day = p_day and address = p_address;

  if found then
    return existing_row;
  end if;

  perform pg_advisory_xact_lock(424242, p_day);

  select * into existing_row
  from public.checkins
  where day = p_day and address = p_address;

  if found then
    return existing_row;
  end if;

  select coalesce(max(rank), 0) + 1
    into next_rank
  from public.checkins
  where day = p_day;

  insert into public.checkins (
    day,
    address,
    username,
    lat,
    lng,
    accuracy_m,
    distance_m,
    rank,
    survived
  )
  values (
    p_day,
    p_address,
    p_username,
    p_lat,
    p_lng,
    p_accuracy_m,
    p_distance_m,
    next_rank,
    next_rank <= p_survival_cap
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

-- RLS deferred (server uses service role). Enable + lock down before public launch.
