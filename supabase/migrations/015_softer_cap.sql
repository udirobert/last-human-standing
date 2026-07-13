-- 012: Softer Day 1 cap to reduce first-day churn.
-- Old: 25 → 12 → 6 → 3 → 1 (50% eliminated on Day 1)
-- New: 40 → 20 → 8 → 3 → 1 (20% eliminated on Day 1)
-- More players experience multiple days, increasing retention.

create or replace function public.survival_cap_for_day(p_day int)
returns int
language sql
immutable
as $$
  select case
    when p_day <= 1 then 40
    when p_day = 2 then 20
    when p_day = 3 then 8
    when p_day = 4 then 3
    else 1
  end;
$$;

-- Update advance_rounds to check for the new default (40)
create or replace function public.advance_rounds()
returns jsonb
language plpgsql
security definer
as $$
declare
  now_ms bigint;
  now_iso text;
  round_row record;
  opens_ms bigint;
  close_result jsonb;
  results jsonb := '[]'::jsonb;
begin
  now_ms := trunc(Extract(epoch from now())) * 1000;
  now_iso := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  for round_row in
    select day, status, opens_at, closes_at, survival_cap
    from public.rounds
    where status in ('scheduled', 'open')
    order by day
  loop
    begin
      if round_row.status = 'scheduled' then
        opens_ms := trunc(Extract(epoch from round_row.opens_at)) * 1000;
        if now_ms >= opens_ms then
          -- Set the decayed cap if the admin hasn't overridden it
          -- (default is 40; if it's still 40, apply the decay schedule).
          if round_row.survival_cap = 40 then
            update public.rounds
              set status = 'open',
                  survival_cap = public.survival_cap_for_day(round_row.day),
                  updated_at = now_iso
              where day = round_row.day and status = 'scheduled';
          else
            update public.rounds
              set status = 'open',
                  updated_at = now_iso
              where day = round_row.day and status = 'scheduled';
          end if;
        end if;
      end if;

      -- Close if past closes_at
      if round_row.status = 'open' then
        if now_ms >= trunc(Extract(epoch from round_row.closes_at)) * 1000 then
          close_result := public.close_day(round_row.day, coalesce(round_row.survival_cap, public.survival_cap_for_day(round_row.day)));
          results := results || jsonb_build_array(close_result);
        end if;
      end if;
    end;
  end loop;

  return results;
end;
$$;
