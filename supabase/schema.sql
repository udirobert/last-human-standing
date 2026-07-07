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
  immunity_until_day int,
  jury_tickets int not null default 0,
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
alter table public.users add column if not exists immunity_until_day int;
alter table public.users add column if not exists jury_tickets int not null default 0;
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
  closing_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rounds add column if not exists place_type text not null default '';
alter table public.rounds add column if not exists closing_notified_at timestamptz;
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
  dq boolean not null default false,
  photo_path text,
  signature text,
  message text
);

alter table public.checkins add column if not exists dq boolean not null default false;
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
create index if not exists submissions_day_address_idx on public.submissions(day, address);
create index if not exists submissions_created_at_idx on public.submissions(created_at desc);
create index if not exists submissions_address_idx on public.submissions(address);

create table if not exists public.votes (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  submission_id bigint not null references public.submissions(id) on delete cascade,
  voter_address text not null,
  vote text not null check (vote in ('real', 'fake')),
  weight int not null default 1
);

alter table public.votes add column if not exists weight int not null default 1;

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

-- =============== Atomic vote insertion with onchain queue ===============
-- Inserts a vote (with jury weight) and enqueues it for onchain submission
-- in one transaction. If the vote already exists (duplicate), returns false
-- without error. Weight is clamped to [1, 3]; the server decides the value
-- (accurate eliminated jurors count double).
drop function if exists public.cast_vote(bigint, text, text);

create or replace function public.cast_vote(
  p_submission_id bigint,
  p_voter_address text,
  p_vote text,
  p_weight int default 1
)
returns table (
  inserted boolean,
  duplicate boolean,
  vote_id bigint
)
language plpgsql
security definer
as $$
begin
  -- Check for duplicate
  if exists (select 1 from public.votes where submission_id = p_submission_id and voter_address = p_voter_address) then
    return query select false::boolean, true::boolean, null::bigint;
    return;
  end if;

  -- Insert the vote
  insert into public.votes (submission_id, voter_address, vote, weight)
    values (p_submission_id, p_voter_address, p_vote, greatest(1, least(coalesce(p_weight, 1), 3)))
    returning id into vote_id;

  -- Enqueue for onchain submission (crash-safe, same transaction)
  insert into public.vote_queue (submission_id, voter_address, vote, status)
    values (p_submission_id, p_voter_address, p_vote, 'pending');

  return query select true::boolean, false::boolean, vote_id;
end;
$$;

-- =============== Jury tickets ===============
-- Correct verdict votes earn jury_tickets (lottery weight for the next
-- cohort). Called by close_day() for verdicts finalized at the cut, and
-- by the server when a submission resolves mid-day via quorum.
--
-- Infiltrator bounty: voters who correctly flag an infiltrator get an
-- EXTRA +1 ticket (on top of the normal correct-verdict ticket).
-- Bluff reward: an infiltrator who is verified by the crowd gets +1
-- ticket too (for the next cohort), making the bluff worth attempting.
create or replace function public.award_jury_tickets(
  p_submission_id bigint,
  p_final_status text
)
returns int
language plpgsql
security definer
as $$
declare
  n int := 0;
  sub_is_infiltrator boolean;
  sub_address text;
begin
  if p_final_status not in ('verified', 'flagged') then
    return 0;
  end if;

  select is_infiltrator, address into sub_is_infiltrator, sub_address
    from public.submissions where id = p_submission_id;

  -- Normal: correct verdict voters get +1 ticket
  update public.users u
    set jury_tickets = u.jury_tickets + 1
    where lower(u.address) in (
      select lower(v.voter_address)
      from public.votes v
      where v.submission_id = p_submission_id
        and v.vote = case when p_final_status = 'verified' then 'real' else 'fake' end
    );

  -- Bounty: if the submission was an infiltrator and was flagged,
  -- the voters who called it correctly get an EXTRA +1 ticket.
  if sub_is_infiltrator and p_final_status = 'flagged' then
    update public.users u
      set jury_tickets = u.jury_tickets + 1
      where lower(u.address) in (
        select lower(v.voter_address)
        from public.votes v
        where v.submission_id = p_submission_id
          and v.vote = 'fake'
      );
  end if;

  -- Bluff reward: if the submission was an infiltrator and was verified,
  -- the infiltrator themselves gets +1 jury ticket (for the next cohort).
  if sub_is_infiltrator and p_final_status = 'verified' then
    update public.users u
      set jury_tickets = u.jury_tickets + 1
      where lower(u.address) = lower(sub_address);
  end if;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- =============== Atomic close-day: the nightly cut, with teeth ===============
-- Single source of truth for the day-close sequence — the admin endpoint
-- and advance_rounds() both call this. Runs atomically in one transaction:
--   1. rank cut (beyond cap = not survived)
--   2. finalize pending submission verdicts (weighted votes) + jury tickets
--   3. DQ flagged survivors; settle infiltrator immunity / double-risk
--   4. promote highest-ranked non-flagged too-late check-ins into DQ'd slots
--   5. eliminate non-survivors (immune players exempt)
--   6. detect the winner when one human remains
drop function if exists public.close_day(int, int);

create or replace function public.close_day(
  p_day int,
  p_cap int,
  p_flag_pct double precision default 0.30,
  p_min_votes int default 3
)
returns jsonb
language plpgsql
security definer
as $$
declare
  sub record;
  slot record;
  user_row record;
  w_real numeric;
  w_fake numeric;
  w_total numeric;
  new_status text;
  dq_addrs text[] := '{}';
  promoted_addrs text[] := '{}';
  immunity_addrs text[] := '{}';
  flagged_count int := 0;
  verified_count int := 0;
  open_slots int;
  survivor_addrs text[];
  immune_addrs text[];
  to_eliminate text[] := '{}';
  remaining_active int;
  winner_addr text := null;
begin
  -- 1. Rank cut: check-ins beyond the cap are not survivors.
  update public.checkins set survived = false where day = p_day and rank > p_cap;

  -- 2. Finalize every still-pending submission for the day, and award
  --    jury tickets to voters who called the verdict correctly.
  for sub in
    select s.id, s.address, s.is_infiltrator
    from public.submissions s
    where s.day = p_day and s.status = 'pending'
  loop
    select
      coalesce(sum(v.weight) filter (where v.vote = 'real'), 0),
      coalesce(sum(v.weight) filter (where v.vote = 'fake'), 0)
      into w_real, w_fake
    from public.votes v
    where v.submission_id = sub.id;

    w_total := w_real + w_fake;
    if w_total >= p_min_votes and (w_fake / w_total) >= p_flag_pct then
      new_status := 'flagged';
    else
      new_status := 'verified';
    end if;

    update public.submissions set status = new_status where id = sub.id;
    perform public.award_jury_tickets(sub.id, new_status);
  end loop;

  -- 3. Verdict consequences: DQ flagged survivors; settle infiltrator bets.
  for sub in
    select distinct on (lower(s.address)) s.address, s.is_infiltrator, s.status
    from public.submissions s
    where s.day = p_day and s.status in ('verified', 'flagged')
    order by lower(s.address), s.created_at desc
  loop
    if sub.status = 'flagged' then
      flagged_count := flagged_count + 1;
      update public.checkins c
        set survived = false, dq = true
        where c.day = p_day and lower(c.address) = lower(sub.address) and c.survived = true;
      if found then
        dq_addrs := array_append(dq_addrs, lower(sub.address));
      end if;
      if sub.is_infiltrator then
        update public.users set immunity_until_day = null
          where lower(address) = lower(sub.address);
      end if;
    else
      verified_count := verified_count + 1;
      if sub.is_infiltrator then
        update public.users set immunity_until_day = p_day + 1
          where lower(address) = lower(sub.address);
        immunity_addrs := array_append(immunity_addrs, lower(sub.address));
      end if;
    end if;
  end loop;

  -- 4. Replace: promote highest-ranked non-flagged too-late check-ins.
  open_slots := coalesce(array_length(dq_addrs, 1), 0);
  if open_slots > 0 then
    for slot in
      select c.id, c.address
      from public.checkins c
      where c.day = p_day and c.rank > p_cap and c.survived = false and c.dq = false
        and not exists (
          select 1 from public.submissions s
          where s.day = p_day and lower(s.address) = lower(c.address) and s.status = 'flagged'
        )
      order by c.rank asc
      limit open_slots
    loop
      update public.checkins set survived = true where id = slot.id;
      update public.users set eliminated = false, eliminated_at_day = null
        where lower(address) = lower(slot.address);
      promoted_addrs := array_append(promoted_addrs, lower(slot.address));
    end loop;
  end if;

  -- 5. Eliminate non-survivors — immune players exempt.
  survivor_addrs := array(
    select lower(address) from public.checkins where day = p_day and survived = true
  );
  immune_addrs := array(
    select lower(address) from public.users where immunity_until_day >= p_day
  );
  for user_row in
    select address from public.users where paid = true and eliminated = false
  loop
    if not (lower(user_row.address) = any (survivor_addrs))
       and not (lower(user_row.address) = any (immune_addrs)) then
      to_eliminate := array_append(to_eliminate, user_row.address);
    end if;
  end loop;
  if array_length(to_eliminate, 1) > 0 then
    update public.users
      set eliminated = true, eliminated_at_day = p_day
      where address = any (to_eliminate);
  end if;

  -- Mark the round as closed
  update public.rounds
    set status = 'closed', updated_at = now()
    where day = p_day;

  -- 6. Endgame detection.
  select count(*) into remaining_active
    from public.users where paid = true and eliminated = false;
  if remaining_active = 1 then
    select address into winner_addr
      from public.users where paid = true and eliminated = false limit 1;
  end if;

  return jsonb_build_object(
    'day', p_day,
    'survivors', coalesce(cardinality(survivor_addrs), 0),
    'eliminated', coalesce(cardinality(to_eliminate), 0),
    'dq', to_jsonb(dq_addrs),
    'promoted', to_jsonb(promoted_addrs),
    'immunity', to_jsonb(immunity_addrs),
    'flagged', flagged_count,
    'verified', verified_count,
    'remaining', remaining_active,
    'winner', winner_addr
  );
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
drop policy if exists "users_public_read" on public.users;
create policy "users_public_read" on public.users for select using (true);

-- rounds: anyone can read; server writes only
drop policy if exists "rounds_public_read" on public.rounds;
create policy "rounds_public_read" on public.rounds for select using (true);

-- checkins: anyone can read the public leaderboard columns; server writes only
drop policy if exists "checkins_public_read" on public.checkins;
create policy "checkins_public_read" on public.checkins for select
  using (true);

-- submissions: anyone can read; server writes only
drop policy if exists "submissions_public_read" on public.submissions;
create policy "submissions_public_read" on public.submissions for select using (true);

-- votes: anyone can read vote counts; server writes only
drop policy if exists "votes_public_read" on public.votes;
create policy "votes_public_read" on public.votes for select using (true);

-- chat_messages: anyone can read; server writes only
drop policy if exists "chat_messages_public_read" on public.chat_messages;
create policy "chat_messages_public_read" on public.chat_messages for select using (true);

-- waitlist: read-only; server writes
drop policy if exists "waitlist_public_read" on public.waitlist;
create policy "waitlist_public_read" on public.waitlist for select using (true);

-- game_sessions / siwe_nonces / pay_references / rate_limits: no read for anon; server only
drop policy if exists "sessions_server_only" on public.game_sessions;
create policy "sessions_server_only" on public.game_sessions for all using (false) with check (false);
drop policy if exists "nonces_server_only" on public.siwe_nonces;
create policy "nonces_server_only" on public.siwe_nonces for all using (false) with check (false);
drop policy if exists "pay_refs_server_only" on public.pay_references;
create policy "pay_refs_server_only" on public.pay_references for all using (false) with check (false);
drop policy if exists "rate_limits_server_only" on public.rate_limits;
create policy "rate_limits_server_only" on public.rate_limits for all using (false) with check (false);

-- submission_flags: admin read + server write only
drop policy if exists "flags_server_only" on public.submission_flags;
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
drop policy if exists "checkins_service_upload" on storage.objects;
create policy "checkins_service_upload" on storage.objects
  for insert with check (bucket_id = 'checkins');

-- Public (or signed-URL holders) can read back their own photos.
drop policy if exists "checkins_public_read" on storage.objects;
create policy "checkins_public_read" on storage.objects
  for select using (bucket_id = 'checkins');

-- Server can delete (for cleanup).
drop policy if exists "checkins_service_delete" on storage.objects;
create policy "checkins_service_delete" on storage.objects
  for delete using (bucket_id = 'checkins');

-- =============== Cap decay: survival cap shrinks daily ===============
-- Returns the survival cap for a given day number.
-- Day 1: 25, Day 2: 12, Day 3: 6, Day 4: 3, Day 5+: 1
-- Admin can still override per-round by setting survival_cap manually
-- before the round opens; advance_rounds only sets it if it's still
-- the default (25).
create or replace function public.survival_cap_for_day(p_day int)
returns int
language sql
immutable
as $$
  select case
    when p_day <= 1 then 25
    when p_day = 2 then 12
    when p_day = 3 then 6
    when p_day = 4 then 3
    else 1
  end;
$$;

-- =============== Distributed scheduler lock ===============
-- pg_advisory_xact_lock is transaction-scoped: released on commit/rollback.
-- Lock ID 42424201 chosen to not collide with create_checkin's 424242.
-- This function advances rounds atomically — safe to call from multiple server instances.
-- Sets the decayed survival cap when opening a round (only if admin hasn't overridden).
create or replace function public.advance_rounds()
returns jsonb
language plpgsql
security definer
as $$
declare
  now_ms bigint := trunc(Extract(epoch from now())) * 1000;
  now_iso timestamptz := now();
  result jsonb := '{"opened": [], "closed": [], "errors": []}'::jsonb;
  round_row record;
  opens_ms bigint;
  closes_ms bigint;
  close_result jsonb;
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
          -- Set the decayed cap if the admin hasn't overridden it
          -- (default is 25; if it's still 25, apply the decay schedule).
          if round_row.survival_cap = 25 then
            update public.rounds
              set status = 'open',
                  survival_cap = public.survival_cap_for_day(round_row.day),
                  updated_at = now_iso
              where day = round_row.day and status = 'scheduled';
          else
            update public.rounds
              set status = 'open', updated_at = now_iso
              where day = round_row.day and status = 'scheduled';
          end if;
          result := jsonb_set(result, '{opened}', result->'opened' || jsonb_build_array(jsonb_build_object('day', round_row.day)));
        end if;

      elsif round_row.status = 'open' then
        closes_ms := trunc(Extract(epoch from round_row.closes_at)) * 1000;
        if now_ms >= closes_ms then
          -- close_day is the single source of truth for the cut sequence
          -- (verdicts, DQ-and-replace, immunity, elimination, winner).
          close_result := public.close_day(round_row.day, coalesce(round_row.survival_cap, public.survival_cap_for_day(round_row.day)));
          result := jsonb_set(result, '{closed}', result->'closed' || jsonb_build_array(close_result));
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
