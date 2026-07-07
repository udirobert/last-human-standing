-- 009 — Automatic survival cap decay + infiltrator bounty + jury stats.
--
-- Three changes:
--
-- 1. Cap decay: the survival cap shrinks daily so the game actually
--    converges to a winner. The schedule is:
--      Day 1: 25  Day 2: 12  Day 3: 6  Day 4: 3  Day 5+: 1
--    A SQL function computes the cap from the day number, and
--    advance_rounds() sets it when opening a scheduled round (only
--    if the admin hasn't manually overridden it).
--
-- 2. Infiltrator bounty: voters who correctly flag an infiltrator
--    earn an extra jury ticket (on top of the normal correct-verdict
--    ticket). This gives voters a tangible reward for catching
--    bluffs, making the social-deduction layer real.
--
-- 3. Successful bluff reward: an infiltrator who is verified by the
--    crowd now earns a jury_ticket too (not just immunity). This
--    makes the infiltrator play worth attempting.

-- =============== 1. Cap decay function ===============
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

-- =============== 2. advance_rounds: set cap when opening ===============
-- Only re-set the cap if it's still the default (25) — this preserves
-- manual admin overrides.
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

-- =============== 3. Infiltrator bounty + successful bluff reward ===============
-- Extend award_jury_tickets to also award tickets for:
--   - Voters who correctly flagged an infiltrator (bounty)
--   - Infiltrators who were verified by the crowd (bluff reward)
-- Both are +1 jury_ticket on top of the normal correct-verdict ticket.

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
