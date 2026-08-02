-- 031 — Adaptive day-1 cut + full arc re-derivation.
--
-- advance_rounds() previously sized Day 1 to a fixed cap (25) regardless of
-- how many humans actually entered. An underfilled cohort therefore produced
-- NO elimination on Day 1 — the drama collapsed exactly when the room was
-- small. This migration makes the cut adaptive:
--
--   * When Day 1 opens at the default cap (25), it reads the live active
--     roster (paid, non-eliminated) and sets:
--         day1Cap = clamp(ceil(active * 0.6), 1, 25)
--   * It then re-derives the whole arc across all future scheduled rounds by
--     floor-halving, so caps stay monotonic and converge to 1 by Day 5.
--   * Admin-customized caps and already-open rounds are untouched.
--
-- A full 50-person cohort still yields 25 → 12 → 6 → 3 → 1 (matches the
-- public arc and migration 029), while a 20-person cohort yields
-- 12 → 6 → 3 → 1 → 1.
--
-- Idempotent — safe to re-run.

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
          -- Adaptive day-1 cut: when day 1 opens at the default cap (25),
          -- size the whole arc to the actual active roster so even a small
          -- cohort still produces an elimination. Custom caps are respected.
          if round_row.day = 1 and round_row.survival_cap = 25 then
            -- Pilot containment: size the arc from the FROZEN admitted
            -- cohort-1 roster (paid, non-eliminated, verified humans with
            -- a cohort-1 participation row) — NOT all-time global
            -- users.paid. Stale, loser, cross-cohort, or unverified rows
            -- must not alter the survival arc. This matches the JS launch
            -- gate in autoAdvanceRounds().
            select count(*) into active_cnt
              from public.users u
              join public.cohort_participations cp
                on cp.address = u.address and cp.cohort = 1
              where u.paid = true
                and u.is_agent = false
                and cp.eliminated = false
                and (u.world_id_verified = true or u.humanity_nullifier is not null);
            arc_cap := greatest(1, least(25, ceil(coalesce(active_cnt, 0) * 0.6)));
            -- Re-derive the full arc (floor-halving) across all scheduled
            -- future rounds. A full 50-person cohort yields 25 → 12 → 6 → 3 → 1.
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
          -- Non-day-1 or admin-customized round: apply decay only if the cap
          -- is still the default (25); otherwise respect the admin's cap.
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
