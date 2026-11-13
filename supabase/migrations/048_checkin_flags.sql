-- Check-in anticheat flags, persisted.
-- The three checkin-time detections (gps plausibility, timing anomaly,
-- velocity spoof) were only emitted to the ops log — nothing joined them
-- back to the filing. The packet (server/lib/packet.js) reads this column
-- into the filing's RCPT field so jurors see what the counters noticed.
alter table public.checkins add column if not exists flags jsonb not null default '[]';
create index if not exists idx_checkins_flags on public.checkins using gin (flags);
