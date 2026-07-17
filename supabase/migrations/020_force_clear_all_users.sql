-- 020 — Force clear all users before cohort 1 launch
-- Previous migrations (018, 019) failed to clear ghost profiles
-- This is the nuclear option: delete EVERYTHING

-- Clear all related tables first
DELETE FROM public.checkins;
DELETE FROM public.submissions;
DELETE FROM public.votes;
DELETE FROM public.chat_messages;

-- Now clear all users
DELETE FROM public.users;
