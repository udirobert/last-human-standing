-- 023 — Bump cohort 1 launch to 2026-07-29 (Wednesday 18:00 UTC).
--
-- Run after updating GAME_LAUNCH_AT on the server. Forces all five
-- scheduled rounds onto the Jul 29 – Aug 2 window (idempotent overwrite).
-- Same full-upsert shape as 017 — production may carry stale closed
-- rows that a narrow WHERE would miss.
--
-- New lottery seed: 2026-07-29T18:00:00Z:cohort-1:lottery.
-- Pair with 024_cohort1_relaunch_reset.sql to clear the prior draw.

update public.rounds set
  name = 'AT A CAFÉ',
  prompt = 'Find a café anywhere in the world. Snap your proof.',
  place_type = 'AT A CAFÉ',
  survival_cap = 25,
  opens_at = '2026-07-29T18:00:00Z'::timestamptz,
  closes_at = '2026-07-30T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 1;

update public.rounds set
  name = 'AT A PARK',
  prompt = 'Touch grass. Literally. Any park, any country.',
  place_type = 'AT A PARK',
  survival_cap = 12,
  opens_at = '2026-07-30T18:00:00Z'::timestamptz,
  closes_at = '2026-07-31T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 2;

update public.rounds set
  name = 'WITH A FRIEND',
  prompt = 'Prove you have at least one real human friend.',
  place_type = 'WITH A FRIEND',
  survival_cap = 6,
  opens_at = '2026-07-31T18:00:00Z'::timestamptz,
  closes_at = '2026-08-01T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 3;

update public.rounds set
  name = 'AT A BOOKSTORE',
  prompt = 'Rare breed. Find a bookstore and show yourself.',
  place_type = 'AT A BOOKSTORE',
  survival_cap = 3,
  opens_at = '2026-08-01T18:00:00Z'::timestamptz,
  closes_at = '2026-08-02T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 4;

update public.rounds set
  name = 'OUTSIDE AT SUNRISE',
  prompt = 'Early humans get the prize pool. Sunrise or nothing.',
  place_type = 'OUTSIDE AT SUNRISE',
  survival_cap = 1,
  opens_at = '2026-08-02T18:00:00Z'::timestamptz,
  closes_at = '2026-08-03T18:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 5;
