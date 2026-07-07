-- 013_vote_platform.sql
-- Add platform column to votes table to track where a vote came from
-- (web, farcaster, farcaster_frame). This enables analytics on which
-- distribution channels drive the most engagement.

alter table public.votes add column if not exists platform text default 'web';
