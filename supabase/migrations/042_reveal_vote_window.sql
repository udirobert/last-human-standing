-- 042 — Two-phase round: reveal-then-vote window (Riddle Rounds §2, §2.3).
--
-- The design timeline for every round is a 24-hour cycle:
--
--   T+0h     THE ASKING      riddle posted, spec committed
--   T+0..18  THE HUNT        18-hour check-in window
--   T+18h    THE REVEAL      committed spec revealed, voting opens
--   T+18..24 THE RECKONING   players vote against the revealed spec
--   T+24h    CLOSE           survival decided (seed lottery on overflow)
--
-- Before this migration the round was 18h: check-in closed AND close_day ran
-- at T+18, so the spec was revealed at the same instant submissions were
-- finalized — voters judged blind and the reveal was a post-mortem. This
-- splits the two moments.
--
-- Mechanics:
--   * New rounds.reveal_at = the T+18 boundary. Check-in closes here and the
--     spec is revealed (server-side reveal step), opening the vote window.
--   * rounds.closes_at moves from T+18 to T+24 (survival close). This also
--     aligns each round with the 24h currentDayNumber clock — previously the
--     18h close left a 6h gap where the day number had not yet rolled.
--
-- Pairs with 039 (round_specs) and 040 (lottery close_day). The close_day
-- spec-reveal in 040 stays as an idempotent safety net; the scheduled reveal
-- at reveal_at normally fires first.

-- =============== 1. Add reveal_at to rounds ===============

alter table public.rounds
  add column if not exists reveal_at timestamptz;

comment on column public.rounds.reveal_at is
  'T+18h boundary: check-in closes, the committed spec is revealed, and the '
  'vote window opens. Survival close stays at closes_at (T+24h).';

-- =============== 2. Reschedule Sep 1-5 onto 24h cycles ===============
--
-- reveal_at takes the old T+18 closes_at value; closes_at moves to T+24
-- (opens_at + 24h). Both right-hand sides are evaluated from the pre-update
-- row, so a single statement is correct. The reveal_at-is-null guard makes
-- the migration idempotent; closed rounds are never touched.

update public.rounds
   set reveal_at = closes_at,
       closes_at = opens_at + interval '24 hours',
       updated_at = now()
 where reveal_at is null
   and status <> 'closed';
