-- 010 — Round schedule for the first cohort (Days 1-5).
--
-- Creates the 5 daily rounds starting at GAME_LAUNCH_AT (2026-07-14T18:00:00Z).
-- Each round is open for 24 hours. The survival cap is left at the default
-- (40) so advance_rounds() applies the decay schedule (40→20→8→3→1) when
-- the round opens. Admin can override per-round before opening.
--
-- Day themes are chosen to escalate in difficulty:
--   Day 1: AT A CAFÉ (easy, ubiquitous)
--   Day 2: AT A PARK (easy, but requires going outside)
--   Day 3: WITH A FRIEND (social proof, harder to fake)
--   Day 4: AT A BOOKSTORE (rare, requires effort to find)
--   Day 5: OUTSIDE AT SUNRISE (temporal constraint — must be early)

-- Idempotent: only insert if the round doesn't already exist.
insert into public.rounds (day, name, prompt, place_type, survival_cap, opens_at, closes_at, status)
select
  d.day, d.name, d.prompt, d.place_type, 40, d.opens_at, d.closes_at, 'scheduled'
from (values
  (1, 'AT A CAFÉ',      'Find a café anywhere in the world. Snap your proof.',         'AT A CAFÉ',
   '2026-07-14T18:00:00Z'::timestamptz, '2026-07-15T18:00:00Z'::timestamptz),
  (2, 'AT A PARK',      'Touch grass. Literally. Any park, any country.',              'AT A PARK',
   '2026-07-15T18:00:00Z'::timestamptz, '2026-07-16T18:00:00Z'::timestamptz),
  (3, 'WITH A FRIEND',  'Prove you have at least one real human friend.',              'WITH A FRIEND',
   '2026-07-16T18:00:00Z'::timestamptz, '2026-07-17T18:00:00Z'::timestamptz),
  (4, 'AT A BOOKSTORE', 'Rare breed. Find a bookstore and show yourself.',             'AT A BOOKSTORE',
   '2026-07-17T18:00:00Z'::timestamptz, '2026-07-18T18:00:00Z'::timestamptz),
  (5, 'OUTSIDE AT SUNRISE', 'Early humans get the prize pool. Sunrise or nothing.',    'OUTSIDE AT SUNRISE',
   '2026-07-18T18:00:00Z'::timestamptz, '2026-07-19T18:00:00Z'::timestamptz)
) as d(day, name, prompt, place_type, opens_at, closes_at)
where not exists (select 1 from public.rounds r where r.day = d.day);
