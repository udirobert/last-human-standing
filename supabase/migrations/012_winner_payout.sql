-- 012 — Winner payout tracking + end-game edge cases.
--
-- 1. payouts table: records each prize distribution. Prevents double-payout
--    and provides an audit trail. The server checks this table before
--    attempting a payout.
--
-- 2. End-game edge case: if close_day eliminates all remaining players
--    (e.g. both finalists miss a day), the player with the longest
--    check-in streak among the last-eliminated is declared the winner
--    instead of leaving the game with no winner.
--
-- 3. game_winner column on rounds: records the final winner address
--    so the endgame cache and UI can display it consistently.

create table if not exists public.payouts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  winner_address text not null,
  amount_usd numeric(12,2),
  token text not null default 'cUSD',
  tx_hash text,
  explorer_url text,
  status text not null default 'pending', -- pending | submitted | confirmed | failed
  error text,
  cohort int,
  day int
);

create index if not exists idx_payouts_winner on public.payouts(lower(winner_address));
create index if not exists idx_payouts_status on public.payouts(status);

-- Add game_winner to rounds (the final winner, set once)
alter table public.rounds add column if not exists game_winner text;

-- =============== End-game edge case: no survivors ===============
-- If close_day eliminates everyone (both finalists miss a day, or all
-- remaining are DQ'd), pick the player with the longest check-in streak
-- among those eliminated on the closing day. If still tied, pick the
-- one with the most jury tickets. If still tied, pick the earliest
-- reserved player.
--
-- This is called by the server after close_day when remaining_active = 0.
create or replace function public.resolve_no_survivors(p_day int)
returns jsonb
language plpgsql
security definer
as $$
declare
  winner_addr text := null;
  winner_row record;
begin
  -- Find the best candidate among players eliminated on p_day
  select u.address into winner_row
    from public.users u
    where u.paid = true and u.eliminated_at_day = p_day
    order by
      u.checkin_streak desc,
      u.jury_tickets desc,
      u.reserved_at asc
    limit 1;

  if found then
    winner_addr := winner_row.address;
    -- Un-eliminate the winner so remaining_active = 1
    update public.users
      set eliminated = false, eliminated_at_day = null
      where lower(address) = lower(winner_addr);

    -- Record the winner on the round
    update public.rounds set game_winner = winner_addr where day = p_day;
  end if;

  return jsonb_build_object(
    'day', p_day,
    'winner', winner_addr,
    'reason', 'no_survivors_tiebreaker'
  );
end;
$$;

-- =============== Record final winner when remaining = 1 ===============
-- Called by the server when close_day reports remaining_active = 1.
-- Records the winner on the round and marks the game as ended.
create or replace function public.record_winner(p_day int, p_winner_address text)
returns jsonb
language plpgsql
security definer
as $$
begin
  update public.rounds set game_winner = p_winner_address where day = p_day;
  return jsonb_build_object('day', p_day, 'winner', p_winner_address);
end;
$$;
