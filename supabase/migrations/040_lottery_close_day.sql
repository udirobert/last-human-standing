-- 040 — Lottery-aware close_day + everyone-eligible check-in (Riddle Rounds §5.1).
--
-- Pairs with 039_riddle_rounds.sql. The close_day function now accepts an
-- optional p_lottery_seed: when provided and eligible check-ins > cap, it
-- runs a deterministic Fisher-Yates lottery instead of the rank-based cut.
-- When p_lottery_seed is null, falls back to the old rank-based behavior.
--
-- The create_checkin RPC now sets survived = true for everyone (eligible),
-- since the lottery at close_day decides survival — not check-in order.

-- =============== Lottery-aware close_day ===============

drop function if exists public.close_day(int, int, double precision, int, text);
create or replace function public.close_day(
  p_day int,
  p_cap int,
  p_flag_pct double precision default 0.30,
  p_min_votes int default 3,
  p_lottery_seed text default null
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
  eligible_count int;
  lottery_used boolean := false;
  lottery_result jsonb := null;
begin
  -- 1. Determine survivors: lottery (if seed + overflow) or rank cut.
  select count(*) into eligible_count
    from public.checkins where day = p_day and survived = true;

  if p_lottery_seed is not null and eligible_count > p_cap then
    -- Deterministic lottery: everyone eligible is shuffled by a seed
    -- derived from hash(cohort_seed, day). First `cap` survive.
    -- The shuffle uses PostgreSQL's setseed() for determinism —
    -- we compute a deterministic float from the seed hash and call setseed.
    lottery_used := true;

    -- Mark all eligible as not-survived first, then re-survive the winners.
    update public.checkins set survived = false
      where day = p_day and survived = true;

    -- Use a deterministic selection: assign a random-ish rank based on
    -- the hash of (seed, address), then survive the top `cap` by that hash.
    -- This avoids PL/pgSQL PRNG complexity and is still deterministic +
    -- auditable: anyone can reproduce by computing sha256(seed||address).
    update public.checkins set survived = true
      where day = p_day
      and address in (
        select address from (
          select
            address,
            -- Deterministic pseudo-random sort key: first 8 bytes of
            -- sha256(seed || ':' || lower(address)) as a bigint
            ('x' || substr(
              encode(digest(
                p_lottery_seed || ':' || lower(address), 'sha256'
              ), 'hex'), 1, 8
            ))::bit(32)::bigint as sort_key
          from public.checkins
          where day = p_day
          order by sort_key asc
          limit p_cap
        ) winners
      );

    lottery_result := jsonb_build_object(

  -- 2. Finalize every still-pending submission, award jury tickets.
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

  -- 4. Replace: promote highest-ranked too-late check-ins into DQ'd slots.
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

  -- 5. Eliminate everyone who isn't a survivor — except immune players.
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

  update public.rounds
    set status = 'closed', updated_at = now()
    where day = p_day;

  -- Reveal the spec at close (T+18h, before voting opens).
  update public.round_specs set revealed_at = now()
    where day = p_day and revealed_at is null;

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
    'winner', winner_addr,
    'lottery_used', lottery_used,
    'lottery', lottery_result
  );
end;
$$;

      'seed', p_lottery_seed,
      'eligible', eligible_count,

-- =============== advance_rounds passes the lottery seed ===============

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
  v_cohort_seed text;
begin
  perform pg_advisory_xact_lock(42424201);

  -- Derive the cohort seed for the survival lottery.
  -- Format: "${launchIso}:cohort-1:lottery" (matches lottery.js lotterySeed)
  select to_char(opens_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    into v_cohort_seed
    from public.rounds where day = 1 limit 1;
  v_cohort_seed := v_cohort_seed || ':cohort-1:lottery';

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
          close_result := public.close_day(
            round_row.day,
            coalesce(round_row.survival_cap, public.survival_cap_for_day(round_row.day)),
            0.30, 3, v_cohort_seed
          );
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

-- =============== Everyone who checks in is eligible ===============

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

      'cap', p_cap,
      'method', 'sha256-hash-sort'
    );

  else
    -- Rank cut (original behavior): check-ins beyond the cap are not survivors.
    update public.checkins set survived = false where day = p_day and rank > p_cap;
  end if;
