-- 024 — Reset cohort 1 zombie state before Jul 29 re-launch.
--
-- Clears the empty Jul 18 lottery draw, zeroes in-game progress, and
-- resets elimination/immunity so the next cohort starts clean.
-- Idempotent. Safe to re-run. Preserves reserved users (signups stay).
--
-- Run AFTER 023 and AFTER bumping GAME_LAUNCH_AT on the server so the
-- next lazy draw uses seed: 2026-07-29T18:00:00Z:cohort-1:lottery.

-- Drop the stale lottery result (empty draw from Jul 19).
delete from public.lottery_results
 where cohort = 1;

-- Clear any in-progress game artifacts (production had none, but be safe).
delete from public.checkins;
delete from public.submissions;
delete from public.votes;
delete from public.chat_messages;

-- Reset per-game player state. Jury tickets are cross-cohort rewards —
-- leave them unless you want a full wipe (see LAUNCH_RESET.md).
update public.users
   set eliminated = false,
       eliminated_at_day = null,
       immunity_until_day = null
 where paid = true
    or entry_kind = 'free';
