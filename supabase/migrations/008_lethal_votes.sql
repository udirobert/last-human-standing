-- 007 — Lethal votes: audit verdicts with game consequences.
--
-- Before this migration the HUMAN/SUS vote was cosmetic: elimination was
-- purely check-in rank vs cap. This migration makes the audit layer real:
--
--   1. At day close, every still-pending submission gets a final verdict
--      (weighted votes; >= p_flag_pct SUS with enough votes => flagged).
--   2. DQ-and-replace: flagged survivors lose their slot; the highest-ranked
--      "too late" check-ins (not themselves flagged) inherit it.
--   3. Infiltrator stakes are real: verified infiltrator => immunity through
--      the next day; flagged infiltrator => any held immunity is revoked.
--   4. Jury: votes carry a weight (accurate eliminated voters count double —
--      set by the server at cast time) and correct verdict votes earn
--      jury_tickets, which weight the next cohort's entry lottery.
--   5. close_day() reports the remaining-active count and the winner when
--      one human is left, so the API can enter the "ended" phase.
--
-- close_day() is the single source of truth; advance_rounds() delegates.
-- Idempotent — safe to re-run.

-- =============== Columns ===============
alter table public.users add column if not exists immunity_until_day int;
alter table public.users add column if not exists jury_tickets int not null default 0;
alter table public.votes add column if not exists weight int not null default 1;
alter table public.checkins add column if not exists dq boolean not null default false;
alter table public.rounds add column if not exists closing_notified_at timestamptz;

create index if not exists submissions_day_address_idx on public.submissions(day, address);

-- =============== cast_vote with jury weight ===============
-- Signature changes (adds p_weight), so drop the old overload first —
-- otherwise PostgREST sees two cast_vote functions and rejects the RPC.
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
  if exists (select 1 from public.votes where submission_id = p_submission_id and voter_address = p_voter_address) then
    return query select false::boolean, true::boolean, null::bigint;
    return;
  end if;

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
begin
  if p_final_status not in ('verified', 'flagged') then
    return 0;
  end if;
  update public.users u
    set jury_tickets = u.jury_tickets + 1
    where lower(u.address) in (
      select lower(v.voter_address)
      from public.votes v
      where v.submission_id = p_submission_id
        and v.vote = case when p_final_status = 'verified' then 'real' else 'fake' end
    );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- =============== close_day: the nightly cut, now with teeth ===============
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
  --    (Submissions already resolved mid-day keep their status; the
  --    server awards their jury tickets at resolution time.)
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
      -- Benefit of the doubt: too few votes, or crowd sided HUMAN.
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
        -- Double risk: a caught infiltrator burns any immunity they held.
        update public.users set immunity_until_day = null
          where lower(address) = lower(sub.address);
      end if;
    else
      verified_count := verified_count + 1;
      if sub.is_infiltrator then
        -- The bluff worked: immunity through tomorrow's cut.
        update public.users set immunity_until_day = p_day + 1
          where lower(address) = lower(sub.address);
        immunity_addrs := array_append(immunity_addrs, lower(sub.address));
      end if;
    end if;
  end loop;

  -- 4. Replace: promote the highest-ranked too-late check-ins (not
  --    themselves flagged) into the DQ'd slots. Promotion also reverses
  --    the immediate elimination the check-in endpoint applied.
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

-- =============== advance_rounds: delegate the close to close_day ===============
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
          close_result := public.close_day(round_row.day, coalesce(round_row.survival_cap, 25));
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
