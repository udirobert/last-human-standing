-- 030 — Align survival-cap fallback with the Aug 3 cohort (25 → 12 → 6 → 3 → 1).
--
-- Migration 029 pinned the Aug 3 rounds to explicit caps (25/12/6/3/1),
-- but the fallback function survival_cap_for_day() and advance_rounds()
-- still carried the OLD 40/20/8/3/1 arc and a `40` "default" sentinel.
-- That meant any round created without an explicit cap would inherit the
-- stale arc, and day 1 could report a cap of 40 against a 50-person cohort.
--
-- Fix: survival_cap_for_day() now mirrors migration 029 exactly, and the
-- advance_rounds() sentinel matches the rounds.survival_cap default (25).
-- Idempotent — safe to re-run.

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
          -- Apply the decayed cap only if the admin hasn't overridden it
          -- (rounds default to the schema default of 25).
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
