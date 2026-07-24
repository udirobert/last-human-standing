-- 026 — Multi-cohort elimination scoping.
--
-- Problem: `eliminated`, `eliminated_at_day`, `immunity_until_day`,
-- `checkin_streak`, and `last_checkin_day` are global columns on
-- `users`. A player eliminated in cohort 1 stays globally eliminated,
-- blocking them from rejoining cohort 2.
--
-- Solution: create a `cohort_participations` table that scopes per-cohort
-- game state. Cross-cohort data (jury_tickets, referral_count, humanity)
-- stays on `users`. Per-cohort state moves to the new table.
--
-- The old columns on `users` are kept as a compatibility shim: a trigger
-- syncs them from the ACTIVE cohort's participation row, so existing
-- server code and SQL functions that read `users.eliminated` continue
-- to work without modification for the current cohort.
--
-- Idempotent — safe to re-run.

-- =============== cohort_participations table ===============
create table if not exists public.cohort_participations (
  id bigserial primary key,
  cohort int not null,
  address text not null references public.users(address) on delete cascade,
  joined_at timestamptz not null default now(),
  eliminated boolean not null default false,
  eliminated_at_day int,
  immunity_until_day int,
  checkin_streak int not null default 0,
  last_checkin_day int,
  revived boolean not null default false,
  unique(cohort, address)
);

create index if not exists cohort_participations_cohort_idx
  on public.cohort_participations(cohort);
create index if not exists cohort_participations_address_idx
  on public.cohort_participations(address);
create index if not exists cohort_participations_active_idx
  on public.cohort_participations(cohort)
  where eliminated = false;

-- =============== Backfill: migrate existing cohort 1 state ===============
-- For every paid user in cohort 1, create a participation row from
-- their current users-table state. Only run if no rows exist yet.
insert into public.cohort_participations
  (cohort, address, eliminated, eliminated_at_day, immunity_until_day, checkin_streak, last_checkin_day, revived)
select
  coalesce(u.cohort, 1),
  u.address,
  u.eliminated,
  u.eliminated_at_day,
  u.immunity_until_day,
  coalesce(u.checkin_streak, 0),
  u.last_checkin_day,
  false
from public.users u
where u.paid = true
  and not exists (
    select 1 from public.cohort_participations cp
    where cp.address = u.address and cp.cohort = coalesce(u.cohort, 1)
  );

-- =============== Helper: get active cohort for an address ===============
-- Returns the most recent cohort the user has a participation row in.
-- Used by the sync trigger and available for ad-hoc queries.
create or replace function public.active_cohort_for(p_address text)
returns int
language sql
security definer
as $$
  select cp.cohort
  from public.cohort_participations cp
  where cp.address = p_address
  order by cp.cohort desc
  limit 1;
$$;

-- =============== Sync trigger: cohort_participations -> users ===============
-- When a participation row for the user's active cohort changes,
-- mirror the eliminated/eliminated_at_day/immunity_until_day/checkin_streak/
-- last_checkin_day columns back onto the users row so existing code
-- that reads users.eliminated etc. keeps working without changes.
create or replace function public.sync_users_from_participation()
returns trigger
language plpgsql
security definer
as $$
declare
  v_active_cohort int;
begin
  -- Only sync if this participation row is for the user's active (latest) cohort
  select public.active_cohort_for(new.address) into v_active_cohort;
  if new.cohort = v_active_cohort then
    update public.users set
      eliminated = new.eliminated,
      eliminated_at_day = new.eliminated_at_day,
      immunity_until_day = new.immunity_until_day,
      checkin_streak = new.checkin_streak,
      last_checkin_day = new.last_checkin_day
    where address = new.address;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_users_from_participation on public.cohort_participations;
create trigger trg_sync_users_from_participation
  after insert or update on public.cohort_participations
  for each row
  execute function public.sync_users_from_participation();

-- =============== Helper: ensure participation row exists ===============
-- Called by the server when a user pays / enters a cohort. Creates
-- the participation row if it doesn't exist for this cohort+address.
create or replace function public.ensure_cohort_participation(
  p_address text,
  p_cohort int default 1
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.cohort_participations (cohort, address)
  values (p_cohort, p_address)
  on conflict (cohort, address) do nothing;
end;
$$;

-- =============== Updated close_day: scope by cohort ===============
-- The close_day function now operates on cohort_participations instead
-- of users directly for elimination/immunity/streak state. The users
-- table is kept in sync via the trigger.
--
-- Key changes:
--   - Elimination updates go to cohort_participations
--   - Immunity updates go to cohort_participations
--   - Survivor/active counts query cohort_participations for the cohort
--   - The cohort is derived from the round's day (via a lookup) or
--     defaults to 1 for now (single-cohort mode)
--
-- For backward compat, the users table columns are still updated by
-- the trigger, so server code reading users.eliminated still works.

drop function if exists public.close_day(int, int);
drop function if exists public.close_day(int, int, double precision, int);

create or replace function public.close_day(
  p_day int,
  p_cap int,
  p_flag_pct double precision default 0.30,
  p_min_votes int default 3,
  p_cohort int default 1
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
  streak_bonuses int := 0;
begin
  -- 1. Rank cut: check-ins beyond the cap are not survivors.
  update public.checkins set survived = false where day = p_day and rank > p_cap;

  -- 2. Finalize every still-pending submission for the day.
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
        update public.cohort_participations set immunity_until_day = null
          where cohort = p_cohort and lower(address) = lower(sub.address);
      end if;
    else
      verified_count := verified_count + 1;
      if sub.is_infiltrator then
        update public.cohort_participations set immunity_until_day = p_day + 1
          where cohort = p_cohort and lower(address) = lower(sub.address);
        immunity_addrs := array_append(immunity_addrs, lower(sub.address));
      end if;
    end if;
  end loop;

  -- 4. Replace: promote the highest-ranked too-late check-ins into DQ'd slots.
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
      update public.cohort_participations
        set eliminated = false, eliminated_at_day = null
        where cohort = p_cohort and lower(address) = lower(slot.address);
      promoted_addrs := array_append(promoted_addrs, lower(slot.address));
    end loop;
  end if;

  -- 5. Eliminate everyone who isn't a survivor — except immune players.
  --    Scoped to this cohort's active participants.
  survivor_addrs := array(
    select lower(address) from public.checkins where day = p_day and survived = true
  );
  immune_addrs := array(
    select lower(address) from public.cohort_participations
    where cohort = p_cohort and immunity_until_day >= p_day
  );
  for user_row in
    select cp.address
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where cp.cohort = p_cohort and u.paid = true and cp.eliminated = false
  loop
    if not (lower(user_row.address) = any (survivor_addrs))
       and not (lower(user_row.address) = any (immune_addrs)) then
      to_eliminate := array_append(to_eliminate, user_row.address);
    end if;
  end loop;
  if array_length(to_eliminate, 1) > 0 then
    update public.cohort_participations
      set eliminated = true, eliminated_at_day = p_day
      where cohort = p_cohort and address = any (to_eliminate);
  end if;

  -- 6. Streak bonuses
  streak_bonuses := public.award_streak_bonuses(p_day);

  update public.rounds
    set status = 'closed', updated_at = now()
    where day = p_day;

  -- 7. Endgame detection — scoped to this cohort.
  select count(*) into remaining_active
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where cp.cohort = p_cohort and u.paid = true and cp.eliminated = false;
  if remaining_active = 1 then
    select cp.address into winner_addr
      from public.cohort_participations cp
      join public.users u on u.address = cp.address
      where cp.cohort = p_cohort and u.paid = true and cp.eliminated = false
      limit 1;
  end if;

  return jsonb_build_object(
    'day', p_day,
    'cohort', p_cohort,
    'survivors', coalesce(cardinality(survivor_addrs), 0),
    'eliminated', coalesce(cardinality(to_eliminate), 0),
    'dq', to_jsonb(dq_addrs),
    'promoted', to_jsonb(promoted_addrs),
    'immunity', to_jsonb(immunity_addrs),
    'flagged', flagged_count,
    'verified', verified_count,
    'streak_bonuses', streak_bonuses,
    'remaining', remaining_active,
    'winner', winner_addr
  );
end;
$$;

-- =============== Updated advance_rounds: pass cohort ===============
-- For now, rounds are single-cohort (cohort 1). The p_cohort param
-- defaults to 1 so existing callers are unaffected. When multi-cohort
-- support lands, rounds will carry a cohort column.
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
          update public.rounds
            set status = 'open', updated_at = now_iso
            where day = round_row.day and status = 'scheduled';
          result := jsonb_set(result, '{opened}', result->'opened' || jsonb_build_array(jsonb_build_object('day', round_row.day)));
        end if;

      elsif round_row.status = 'open' then
        closes_ms := trunc(Extract(epoch from round_row.closes_at)) * 1000;
        if now_ms >= closes_ms then
          close_result := public.close_day(round_row.day, coalesce(round_row.survival_cap, 25), 0.30, 3, 1);
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

-- =============== Updated award_streak_bonuses: scope by cohort ===============
create or replace function public.award_streak_bonuses(p_day int)
returns int
language plpgsql
security definer
as $$
declare
  n int := 0;
  streak_row record;
  v_cohort int := 1;
begin
  -- Update streaks: increment for survivors, reset for eliminated/missed
  -- Operates on cohort_participations (active cohort) instead of users.
  for streak_row in
    select cp.address, cp.checkin_streak, cp.last_checkin_day, cp.eliminated, cp.cohort
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where u.paid = true and cp.cohort = v_cohort
  loop
    if streak_row.last_checkin_day = p_day then
      update public.cohort_participations
        set checkin_streak = coalesce(checkin_streak, 0) + 1
        where cohort = streak_row.cohort and lower(address) = lower(streak_row.address);
    else
      update public.cohort_participations
        set checkin_streak = 0
        where cohort = streak_row.cohort and lower(address) = lower(streak_row.address);
    end if;
  end loop;

  -- Award bonus tickets for streak milestones (jury_tickets stay on users — cross-cohort)
  for streak_row in
    select cp.address, cp.checkin_streak
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where u.paid = true and cp.cohort = v_cohort and cp.checkin_streak >= 3
  loop
    if streak_row.checkin_streak = 3 then
      update public.users set jury_tickets = jury_tickets + 1
        where lower(address) = lower(streak_row.address);
      n := n + 1;
    elsif streak_row.checkin_streak >= 5 then
      update public.users set jury_tickets = jury_tickets + 3
        where lower(address) = lower(streak_row.address);
      n := n + 3;
    end if;
  end loop;

  return n;
end;
$$;

-- =============== Updated revive_player: scope by cohort ===============
create or replace function public.revive_player(p_day int)
returns jsonb
language plpgsql
security definer
as $$
declare
  winner_addr text := null;
  max_votes int := 0;
  tiebreaker_row record;
  v_cohort int := 1;
begin
  -- Find the eliminated player with the most revive votes from jury members
  -- Scoped to this cohort's eliminated participants
  select rv.candidate_address, count(*) as vote_count
    into winner_addr, max_votes
  from public.revive_votes rv
  join public.cohort_participations cp on lower(cp.address) = lower(rv.candidate_address)
  where rv.day = p_day and cp.cohort = v_cohort and cp.eliminated = true
  group by rv.candidate_address
  order by vote_count desc
  limit 1;

  if winner_addr is not null and max_votes > 0 then
    -- Tiebreaker: longest prior checkin streak
    select candidate_address into tiebreaker_row
      from (
        select rv.candidate_address, count(*) as vc, cp.checkin_streak
        from public.revive_votes rv
        join public.cohort_participations cp on lower(cp.address) = lower(rv.candidate_address)
        where rv.day = p_day and cp.cohort = v_cohort and cp.eliminated = true
        group by rv.candidate_address, cp.checkin_streak
        order by vc desc, cp.checkin_streak desc
        limit 1
      ) t
      limit 1;

    if tiebreaker_row is not null then
      winner_addr := tiebreaker_row;
    end if;

    -- Revive the winner in their cohort participation
    update public.cohort_participations
      set eliminated = false, eliminated_at_day = null, revived = true
      where cohort = v_cohort and lower(address) = lower(winner_addr);
  end if;

  return jsonb_build_object(
    'day', p_day,
    'revived', winner_addr,
    'votes', max_votes
  );
end;
$$;

-- =============== Updated resolve_no_survivors: scope by cohort ===============
create or replace function public.resolve_no_survivors(p_day int)
returns jsonb
language plpgsql
security definer
as $$
declare
  winner_addr text := null;
  winner_row record;
  v_cohort int := 1;
begin
  -- Find the best candidate among players eliminated on p_day in this cohort
  select u.address into winner_row
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where cp.cohort = v_cohort and u.paid = true and cp.eliminated_at_day = p_day
    order by
      cp.checkin_streak desc,
      u.jury_tickets desc,
      u.reserved_at asc
    limit 1;

  if found then
    winner_addr := winner_row.address;
    -- Un-eliminate the winner so remaining_active = 1
    update public.cohort_participations
      set eliminated = false, eliminated_at_day = null
      where cohort = v_cohort and lower(address) = lower(winner_addr);

    update public.rounds set game_winner = winner_addr where day = p_day;
  end if;

  return jsonb_build_object(
    'day', p_day,
    'winner', winner_addr,
    'reason', 'no_survivors_tiebreaker'
  );
end;
$$;
