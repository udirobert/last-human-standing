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
  humanity_provider text,
  humanity_nullifier text,
  humanity_verified_at timestamptz,
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
alter table public.users add column if not exists humanity_provider text;
alter table public.users add column if not exists humanity_nullifier text;
alter table public.users add column if not exists humanity_verified_at timestamptz;
create unique index if not exists users_referral_code_idx on public.users(referral_code);
create unique index if not exists users_humanity_nullifier_uidx
  on public.users(humanity_nullifier)
  where humanity_nullifier is not null;

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

-- =============== Anti-cheat flags ===============
create table if not exists public.submission_flags (
  id uuid primary key default gen_random_uuid(),
  submission_id bigint not null references public.submissions(id) on delete cascade,
  reason text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_submission_flags_submission on public.submission_flags(submission_id);
create index if not exists idx_submission_flags_reason on public.submission_flags(reason);
create index if not exists idx_submission_flags_created on public.submission_flags(created_at desc);

-- RLS deferred (server uses service role). Enable + lock down before public launch.
-- =============== Row Level Security ===============
alter table public.users enable row level security;
alter table public.rounds enable row level security;
alter table public.checkins enable row level security;
alter table public.submissions enable row level security;
alter table public.votes enable row level security;
alter table public.chat_messages enable row level security;
alter table public.waitlist enable row level security;
alter table public.game_sessions enable row level security;
alter table public.siwe_nonces enable row level security;
alter table public.pay_references enable row level security;
alter table public.rate_limits enable row level security;
alter table public.submission_flags enable row level security;

-- Service role (server backend) bypasses all RLS — no policy needed for writes.
-- Anon key: read-only, read-your-own for most tables.

-- users: anyone can read; server writes only
create policy "users_public_read" on public.users for select using (true);

-- rounds: anyone can read; server writes only
create policy "rounds_public_read" on public.rounds for select using (true);

-- checkins: anyone can read the public leaderboard columns; server writes only
create policy "checkins_public_read" on public.checkins for select
  using (true);

-- submissions: anyone can read; server writes only
create policy "submissions_public_read" on public.submissions for select using (true);

-- votes: anyone can read vote counts; server writes only
create policy "votes_public_read" on public.votes for select using (true);

-- chat_messages: anyone can read; server writes only
create policy "chat_messages_public_read" on public.chat_messages for select using (true);

-- waitlist: read-only; server writes
create policy "waitlist_public_read" on public.waitlist for select using (true);

-- game_sessions / siwe_nonces / pay_references / rate_limits: no read for anon; server only
create policy "sessions_server_only" on public.game_sessions for all using (false) with check (false);
create policy "nonces_server_only" on public.siwe_nonces for all using (false) with check (false);
create policy "pay_refs_server_only" on public.pay_references for all using (false) with check (false);
create policy "rate_limits_server_only" on public.rate_limits for all using (false) with check (false);

-- submission_flags: admin read + server write only
create policy "flags_server_only" on public.submission_flags for all using (false) with check (false);

-- =============== Storage bucket policies ===============
-- Create the checkins bucket if it doesn't exist (idempotent).
-- The server uses signed URLs for uploads; the bucket itself can be private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('checkins', 'checkins', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Only the service role (server backend) can upload.
create policy "checkins_service_upload" on storage.objects
  for insert with check (bucket_id = 'checkins');

-- Public (or signed-URL holders) can read back their own photos.
create policy "checkins_public_read" on storage.objects
  for select using (bucket_id = 'checkins');

-- Server can delete (for cleanup).
create policy "checkins_service_delete" on storage.objects
  for delete using (bucket_id = 'checkins');

-- =============== Distributed scheduler lock ===============
-- pg_advisory_xact_lock is transaction-scoped: released on commit/rollback.
-- Lock ID 42424201 chosen to not collide with create_checkin's 424242.
-- This function advances rounds atomically — safe to call from multiple server instances.
create or replace function public.advance_rounds()
returns jsonb
language plpgsql
security definer
as $$
declare
  now_ms bigint := trunc Extract(epoch from now()) * 1000;
  now_iso timestamptz := now();
  result jsonb := '{"opened": [], "closed": [], "errors": []}'::jsonb;
  round_row record;
  opens_ms bigint;
  closes_ms bigint;
  cap int;
  survivor_addrs text[];
  to_eliminate text[];
  ck_row record;
  user_row record;
begin
  perform pg_advisory_xact_lock(42424201);

  for round_row in
    select day, status, opens_at, closes_at, survival_cap
    from public.rounds
    where status in ('scheduled', 'open')
    order by day asc
  loop
    begin
      if round_row.status = 'scheduled' then
        opens_ms := trunc(Extract(epoch from round_row.opens_at)) * 1000;
        if now_ms >= opens_ms then
          update public.rounds
            set status = 'open', updated_at = now_iso
            where day = round_row.day and status = 'scheduled';
          result := jsonb_set(result, '{opened}', result->'opened' || jsonb_build_array(jsonb_build_object('day', round_row.day)));
        end if;

      elsif round_row.status = 'open' then
        closes_ms := trunc(Extract(epoch from round_row.closes_at)) * 1000;
        if now_ms >= closes_ms then
          cap := coalesce(round_row.survival_cap, 25);

          update public.checkins
            set survived = false
            where day = round_row.day and rank > cap;

          survivor_addrs := array(
            select lower(address)
            from public.checkins
            where day = round_row.day and rank <= cap
          );

          for user_row in
            select address from public.users where paid = true and eliminated = false
          loop
            if not (lower(user_row.address) = any (survivor_addrs)) then
              to_eliminate := array_append(to_eliminate, user_row.address);
            end if;
          end loop;

          if array_length(to_eliminate, 1) > 0 then
            update public.users
              set eliminated = true, eliminated_at_day = round_row.day
              where address = any (to_eliminate);
          end if;

          update public.rounds
            set status = 'closed', updated_at = now_iso
            where day = round_row.day and status = 'open';

          result := jsonb_set(result, '{closed}', result->'closed' || jsonb_build_array(
            jsonb_build_object(
              'day', round_row.day,
              'survivors', coalesce(cardinality(survivor_addrs), 0),
              'eliminated', coalesce(cardinality(to_eliminate), 0)
            )
          ));
        end if;
      end if;
    exception when others then
      result := jsonb_set(result, '{errors}', result->'errors' || jsonb_build_array(
        jsonb_build_object('day', round_row.day, 'error', sqlerrm)
      ));
    end;
  end loop;

  return result;
end;
$$;
