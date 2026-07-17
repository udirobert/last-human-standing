-- 019 — Clear all test entries before cohort 1 launch
-- reservedCount should start at 0 for the real launch

-- Delete all checkins first (no FK constraint)
DELETE FROM public.checkins;

-- Delete ALL users (both paid and free test entries)
DELETE FROM public.users;
