-- 033 — Agent exhibition: the prize is human-only.
--
-- Cohort 1 admits a small cast of operator-run exhibition agents
-- (docs/COHORT1_AGENT_EXHIBITION.md). They play the SAME daily survival
-- track — themes, check-ins, caps, crowd audit, DQ — but they can never
-- win. This migration makes the endgame math human-only:
--
--   * close_day(): remaining_active and the winner pick now exclude
--     is_agent users. The game ends on the LAST VERIFIED HUMAN; any
--     agents still alive at that point are "the machines that slipped
--     through" and appear in the recap as such.
--   * resolve_no_survivors(): the no-survivors tiebreaker can never
--     resurrect an agent as winner.
--
-- Day-to-day elimination (sections 1–6) is deliberately UNCHANGED:
-- agents occupy survival-cap slots and are DQ'd when flagged. Machine
-- pressure on human slots is the point of the exhibition.
--
-- Idempotent — safe to re-run.

-- ── resolve_no_survivors: human-only tiebreaker ─────────────────────────
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
  -- Find the best HUMAN candidate among players eliminated on p_day in
  -- this cohort. Exhibition agents are prize-ineligible.
  select u.address into winner_row
    from public.cohort_participations cp
    join public.users u on u.address = cp.address
    where cp.cohort = v_cohort and u.paid = true and u.is_agent = false
      and cp.eliminated_at_day = p_day
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

-- ── close_day: remaining/winner over verified-humans-eligible rows ─────
drop function if exists public.close_day(int, int, double precision, int, int, double precision);

create or replace function public.close_day(
  p_day int,
  p_cap int,
  p_flag_pct double precision default 0.30, -- deprecated: kept for call compatibility, no longer used
  p_min_votes int default 3,
  p_cohort int default 1,
  p_verify_pct double precision default 0.70
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
begin
  -- 1. Rank cut: check-ins beyond the cap are not survivors.
  update public.checkins set survived = false where day = p_day and rank > p_cap;

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
  --    Agents are eliminated by this track too: they must survive each
  --    daily cut exactly like humans.
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

  -- 7. Endgame detection — HUMANS ONLY for the title + remaining count.
  --    Agents still alive when one human remains are "the machines that
  --    slipped through" and are reported via remaining_agents for the recap.
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
    'winner', winner_addr
  );
end;
$$;

grant execute on function public.close_day(int, int, double precision, int, int, double precision)
  to service_role;
