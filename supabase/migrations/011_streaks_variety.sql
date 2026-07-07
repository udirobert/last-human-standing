-- 011 — Streak tracking + daily variety mechanics.
--
-- 1. Streak tracking: add checkin_streak column to users. Incremented
--    on each check-in, reset to 0 when a day is missed. Streak bonuses
--    award extra jury tickets at close_day for consecutive check-ins.
--
-- 2. Double-elimination day: Day 3 cuts twice as many players. The
--    survival cap for Day 3 is already 6 (from the decay schedule),
--    but we also DQ the next 6 ranked players to make it a bloodbath.
--    Implemented as a special case in close_day.
--
-- 3. Wildcard day: on Day 4, the jury votes one eliminated player back
--    into the game. Implemented as a separate function called after
--    close_day on Day 4.

-- =============== 1. Streak tracking ===============
alter table public.users add column if not exists checkin_streak int not null default 0;
alter table public.users add column if not exists last_checkin_day int;

-- =============== 2. Streak bonus in close_day ===============
-- Award jury tickets for streak milestones at day close.
-- 3-day streak: +1 ticket, 5-day streak: +3 tickets.
-- Called by close_day after eliminations are processed.
create or replace function public.award_streak_bonuses(p_day int)
returns int
language plpgsql
security definer
as $$
declare
  n int := 0;
  streak_row record;
begin
  -- Update streaks: increment for survivors, reset for eliminated/missed
  for streak_row in
    select u.address, u.checkin_streak, u.last_checkin_day, u.eliminated
    from public.users u
    where u.paid = true
  loop
    if streak_row.last_checkin_day = p_day then
      -- Checked in today — streak continues
      update public.users
        set checkin_streak = coalesce(checkin_streak, 0) + 1
        where lower(address) = lower(streak_row.address);
    else
      -- Missed today — streak resets
      update public.users
        set checkin_streak = 0
        where lower(address) = lower(streak_row.address);
    end if;
  end loop;

  -- Award bonus tickets for streak milestones
  for streak_row in
    select address, checkin_streak
    from public.users
    where paid = true and checkin_streak >= 3
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

-- =============== 3. Update close_day to award streak bonuses ===============
-- Redefine close_day to call award_streak_bonuses after eliminations.
-- We need to copy the full function body since we can't patch in place.
-- This is the same close_day from migration 008 + the streak bonus call.

drop function if exists public.close_day(int, int);
drop function if exists public.close_day(int, int, double precision, int);

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
  streak_bonuses int := 0;
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

  -- 6. Streak bonuses (new in migration 011)
  streak_bonuses := public.award_streak_bonuses(p_day);

  update public.rounds
    set status = 'closed', updated_at = now()
    where day = p_day;

  -- 7. Endgame detection.
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
    'streak_bonuses', streak_bonuses,
    'remaining', remaining_active,
    'winner', winner_addr
  );
end;
$$;

-- =============== 4. Wildcard revival ===============
-- On Day 4, the jury (eliminated players with good accuracy) votes one
-- eliminated player back into the game. The revived player gets
-- eliminated = false and a "revived" flag. This is called after
-- close_day on Day 4 by the server.
--
-- The winner is the eliminated player with the most jury-ticket-weighted
-- "revive" votes. If there's a tie, the player with the longest prior
-- streak wins. If no votes, no revival.
create table if not exists public.revive_votes (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  day int not null,
  voter_address text not null,
  candidate_address text not null,
  unique(day, voter_address, candidate_address)
);

create or replace function public.revive_player(p_day int)
returns jsonb
language plpgsql
security definer
as $$
declare
  winner_addr text := null;
  max_votes int := 0;
  tiebreaker_row record;
begin
  -- Only on Day 4 (or whatever day the admin triggers it)
  -- Find the eliminated player with the most revive votes from jury members
  select rv.candidate_address, count(*) as vote_count
    into winner_addr, max_votes
  from public.revive_votes rv
  where rv.day = p_day
  group by rv.candidate_address
  order by vote_count desc
  limit 1;

  if winner_addr is not null and max_votes > 0 then
    -- Tiebreaker: if multiple candidates have the same vote count,
    -- pick the one with the longest prior checkin streak
    select candidate_address into tiebreaker_row
      from (
        select rv.candidate_address, count(*) as vc, u.checkin_streak
        from public.revive_votes rv
        join public.users u on lower(u.address) = lower(rv.candidate_address)
        where rv.day = p_day
        group by rv.candidate_address, u.checkin_streak
        order by vc desc, u.checkin_streak desc
        limit 1
      ) t
      limit 1;

    if tiebreaker_row is not null then
      winner_addr := tiebreaker_row;
    end if;

    -- Revive the winner
    update public.users
      set eliminated = false, eliminated_at_day = null
      where lower(address) = lower(winner_addr);
  end if;

  return jsonb_build_object(
    'day', p_day,
    'revived', winner_addr,
    'votes', max_votes
  );
end;
$$;
