-- 040 — Lottery-aware close_day + everyone-eligible check-in (Riddle Rounds §5.1).
--
-- Pairs with 039_riddle_rounds.sql.
--
-- Design decision (locked): the survival lottery is drawn SERVER-SIDE by the
-- tested JS implementation (server/lib/survivalLottery.js — Mulberry32 +
-- Fisher-Yates, 24 unit tests). SQL never draws; it only APPLIES the survivor
-- list the server passes in and persists an audit row. One canonical
-- algorithm, replayable by anyone from the public seed.
--
-- Flow:
--   1. advance_rounds() opens due rounds (adaptive arc sizing preserved from
--      migration 031) and reports past-deadline open rounds as "closing".
--      It does NOT call close_day anymore.
--   2. The server, for each closing round: fetches eligible check-ins, runs
--      drawSurvivalLottery() when eligible > cap, persists the draw to
--      survival_draws, then calls close_day() with the survivor list.
--   3. close_day() applies the survivors (or falls back to the rank cut when
--      no list is passed), then runs the full verdict/elimination/streak/
--      winner ceremony — unchanged from migration 033 (cohort_participations
--      as source of truth, single-threshold verdicts, humans-only winner).
--
-- This file deliberately rebuilds close_day on top of the migration 033 body.
-- The earlier draft of this migration regressed 026/032/033 logic; that is
-- gone. Everything below preserves it.

-- =============== 0. pgcrypto (defensive; not used by the JS-drawn path) ===============
create extension if not exists pgcrypto;

-- =============== 1. survival_draws — audit trail for every lottery ===============

create table if not exists public.survival_draws (
  day               int primary key,
  cohort            int not null default 1,
  seed              text not null,
  algorithm_version text not null,
  eligible          int not null,
  cap               int not null,
  survivors         jsonb not null,   -- ordered address list (first `cap` survive)
  eliminated        jsonb not null,
  drawn_at          timestamptz not null default now()
);

comment on table public.survival_draws is
  'Audit trail for the deterministic survival lottery. The draw is computed '
  'server-side (server/lib/survivalLottery.js) and persisted here so anyone '
  'can replay it from the public seed.';

alter table public.survival_draws enable row level security;

-- Public read so the draw is verifiable from any client (matches lottery_results).
drop policy if exists "survival_draws_read" on public.survival_draws;
create policy "survival_draws_read"
  on public.survival_draws for select
  to anon, authenticated
  using (true);

-- =============== 2. Lottery-aware close_day ===============
-- Rebuilt on the migration 033 body. Signature gains two trailing optional
-- params: p_lottery_survivors (the server-drawn survivor list) and
-- p_lottery_meta (audit echo). All prior params keep position + defaults.

drop function if exists public.close_day(int, int, double precision, int, int, double precision);

create or replace function public.close_day(
  p_day int,
  p_cap int,
  p_flag_pct double precision default 0.30, -- deprecated: kept for call compatibility
  p_min_votes int default 3,
  p_cohort int default 1,
  p_verify_pct double precision default 0.70,
  p_lottery_survivors text[] default null,
  p_lottery_meta jsonb default null
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
  remaining_agents int := 0;
  winner_addr text := null;
  streak_bonuses int := 0;
  eligible_count int;
  lottery_used boolean := false;
  round_status text;
begin
  -- Guard: never close an already-closed round (idempotent re-entry).
  -- The lock serializes concurrent close attempts (the server may re-report
  -- a "closing" round after a crash between ticks).
  perform pg_advisory_xact_lock(42424201);
  select status into round_status from public.rounds where day = p_day;
  if round_status = 'closed' then
    return jsonb_build_object('day', p_day, 'already_closed', true);
  end if;

  -- 1. Determine survivors.
  select count(*) into eligible_count
    from public.checkins where day = p_day and survived = true;

  if p_lottery_survivors is not null then
    -- Server-drawn lottery (eligible > cap). Apply the survivor list:
    -- mark everyone not-survived, then re-survive the drawn addresses.
    lottery_used := true;

    update public.checkins set survived = false
      where day = p_day and survived = true;

    update public.checkins set survived = true
      where day = p_day
        and lower(address) in (select lower(unnest(p_lottery_survivors)));

  else
    -- No lottery passed: rank cut (original behavior). With the
    -- everyone-eligible check-in model this only binds if the server failed
    -- to pass a survivor list on overflow — a safe degradation to the old
    -- first-come cut rather than letting everyone through.
    update public.checkins set survived = false
      where day = p_day and rank > p_cap;
  end if;

  -- 2. Finalize every still-pending submission for the day.
  --    SINGLE THRESHOLD (migration 032): identical to settleSubmissionVotes
  --    in server/index.js — verified iff REAL >= p_verify_pct at quorum.
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
    if w_total >= p_min_votes and (w_real / w_total) >= p_verify_pct then
      new_status := 'verified';
    elsif w_total >= p_min_votes then
      new_status := 'flagged';
    else
      new_status := 'verified'; -- below quorum: insufficient evidence
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
  --    cohort_participations is the source of truth (migration 026); the
  --    sync trigger mirrors into users. Agents are eliminated here too.
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

  -- Reveal the committed spec at close (T+18h, before voting opens).
  update public.round_specs set revealed_at = now()
    where day = p_day and revealed_at is null;

  -- 7. Endgame detection — HUMANS ONLY for the title + remaining count.
  select count(*) into remaining_active
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where cp.cohort = p_cohort and u.paid = true and u.is_agent = false
      and cp.eliminated = false;
  if remaining_active = 1 then
    select cp.address into winner_addr
      from public.cohort_participations cp
      join public.users u on u.address = cp.address
      where cp.cohort = p_cohort and u.paid = true and u.is_agent = false
        and cp.eliminated = false
      limit 1;
  end if;
  select count(*) into remaining_agents
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where cp.cohort = p_cohort and u.paid = true and u.is_agent = true
      and cp.eliminated = false;

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
    'remaining_agents', remaining_agents,
    'winner', winner_addr,
    'lottery_used', lottery_used,
    'lottery', p_lottery_meta
  );
end;
$$;

grant execute on function public.close_day(int, int, double precision, int, int, double precision, text[], jsonb)
  to service_role;

-- =============== 3. advance_rounds: open rounds + report closing, never close ===============
-- Rebuilt on the migration 031 body (adaptive day-1 arc sizing preserved).
-- The close is now driven by the server so the JS lottery can run first.

create or replace function public.advance_rounds()
returns jsonb
language plpgsql
security definer
as $$
declare
  now_ms bigint := trunc(Extract(epoch from now())) * 1000;
  now_iso timestamptz := now();
  result jsonb := '{"opened": [], "closing": [], "errors": []}'::jsonb;
  round_row record;
  opens_ms bigint;
  closes_ms bigint;
  active_cnt int;
  arc_cap int;
  arc_row record;
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
          -- Adaptive day-1 cut (migration 031): size the whole arc from the
          -- frozen admitted cohort-1 roster when day 1 opens at default cap.
          if round_row.day = 1 and round_row.survival_cap = 25 then
            select count(*) into active_cnt
              from public.users u
              join public.cohort_participations cp
                on cp.address = u.address and cp.cohort = 1
              where u.paid = true
                and u.is_agent = false
                and cp.eliminated = false
                and (u.world_id_verified = true or u.humanity_nullifier is not null);
            arc_cap := greatest(1, least(25, ceil(coalesce(active_cnt, 0) * 0.6)));
            for arc_row in
              select day
              from public.rounds
              where status = 'scheduled' and day >= round_row.day
              order by day asc
            loop
              update public.rounds
                set survival_cap = arc_cap, updated_at = now_iso
                where day = arc_row.day and status = 'scheduled';
              arc_cap := greatest(1, floor(arc_cap / 2));
            end loop;
            update public.rounds
              set status = 'open', updated_at = now_iso
              where day = round_row.day and status = 'scheduled';
          elsif round_row.survival_cap = 25 then
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
          result := jsonb_set(result, '{opened}', result->'opened' || jsonb_build_array(
            jsonb_build_object('day', round_row.day)
          ));
        end if;

      elsif round_row.status = 'open' then
        closes_ms := trunc(Extract(epoch from round_row.closes_at)) * 1000;
        if now_ms >= closes_ms then
          -- Report as closing; the server draws the lottery (if overflow)
          -- and then calls close_day(). Left as 'open' here so a crash
          -- between ticks re-reports it (idempotent).
          result := jsonb_set(result, '{closing}', result->'closing' || jsonb_build_array(
            jsonb_build_object(
              'day', round_row.day,
              'survival_cap', coalesce(round_row.survival_cap, public.survival_cap_for_day(round_row.day))
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

grant execute on function public.advance_rounds() to service_role;

-- =============== 4. Everyone who checks in is eligible ===============
-- Same signature as before (server call unchanged); survived is now always
-- true — the lottery at close decides survival, not check-in order.

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
    day, address, username, lat, lng, accuracy_m, distance_m, rank, survived
  )
  values (
    p_day, p_address, p_username, p_lat, p_lng, p_accuracy_m, p_distance_m,
    next_rank,
    true  -- everyone is eligible; the lottery at close_day decides
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

grant execute on function public.create_checkin(int, text, text, double precision, double precision, double precision, double precision, int)
  to service_role;
