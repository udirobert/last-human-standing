-- 038 — Bump cohort 1 launch to 2026-09-01 (Tue 18:00 UTC); cohort 2 stays 2026-09-13.
--
-- The Aug 24 pilot ended at day 4 with 4 reserved players (below the
-- MIN_LAUNCH_PARTICIPANTS=8 floor). Reschedule the five daily rounds onto
-- Sep 1 – Sep 5 for the Cohort 1 retry; Cohort 2 (public ETHOnline
-- iteration) remains Sep 13.
--
-- Pair with GAME_LAUNCH_AT / COHORT_2_LAUNCH_AT on the server
-- (scripts/relaunch-prep.sh --update-env).

update public.rounds set
  name = 'AT A CAFÉ',
  prompt = 'Find a café anywhere in the world. Snap your proof.',
  place_type = 'AT A CAFÉ',
  survival_cap = 25,
  opens_at = '2026-09-01T18:00:00Z'::timestamptz,
  closes_at = '2026-09-02T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 1;

update public.rounds set
  name = 'AT A PARK',
  prompt = 'Touch grass. Literally. Any park, any country.',
  place_type = 'AT A PARK',
  survival_cap = 12,
  opens_at = '2026-09-02T18:00:00Z'::timestamptz,
  closes_at = '2026-09-03T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 2;

update public.rounds set
  name = 'WITH A FRIEND',
  prompt = 'Prove you have at least one real human friend.',
  place_type = 'WITH A FRIEND',
  survival_cap = 6,
  opens_at = '2026-09-03T18:00:00Z'::timestamptz,
  closes_at = '2026-09-04T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 3;

update public.rounds set
  name = 'AT A BOOKSTORE',
  prompt = 'Rare breed. Find a bookstore and show yourself.',
  place_type = 'AT A BOOKSTORE',
  survival_cap = 3,
  opens_at = '2026-09-04T18:00:00Z'::timestamptz,
  closes_at = '2026-09-05T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 4;

update public.rounds set
  name = 'OUTSIDE AT SUNRISE',
  prompt = 'Early humans get the prize pool. Sunrise or nothing.',
  place_type = 'OUTSIDE AT SUNRISE',
  survival_cap = 1,
  opens_at = '2026-09-05T18:00:00Z'::timestamptz,
  closes_at = '2026-09-06T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 5;

-- Reset stale Aug 24 in-progress artifacts. Preserves reserved users/agents.
delete from public.lottery_results where cohort = 1;
delete from public.payouts where cohort = 1;
delete from public.checkins;
delete from public.submission_flags;
delete from public.submissions;
delete from public.votes;
delete from public.vote_commits where cohort = 1;
delete from public.chat_messages;

delete from public.revive_votes;

update public.cohort_participations
   set eliminated = false,
       eliminated_at_day = null,
       immunity_until_day = null,
       checkin_streak = 0,
       last_checkin_day = null,
       revived = false
 where cohort = 1;

update public.users
   set eliminated = false,
       eliminated_at_day = null,
       immunity_until_day = null
 where paid = true
    or entry_kind = 'free'
    or is_agent = true;
