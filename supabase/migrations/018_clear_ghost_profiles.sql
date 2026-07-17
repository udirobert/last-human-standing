-- 018 — Clear ghost free profiles before cohort 1 launch.
--
-- These 27 free users are test/dev data from earlier sessions.
-- The site hasn't been announced yet, so reservedCount should start at 0.
--
-- Delete all users where paid=false (free tier) to reset the counter.
-- This is idempotent: if run multiple times, it's safe.

delete from public.users
where paid = false;
