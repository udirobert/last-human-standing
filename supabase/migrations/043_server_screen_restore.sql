-- 043 — Server-side screen restore (return experience, item #9).
--
-- In World App / Farcaster frames the host may kill and recreate the webview,
-- which can wipe localStorage. We persist the user's last screen on the
-- server so position can be restored even when localStorage is gone.
--
-- Client flow:
--   - On navigation, the client debounces a PUT /api/me/last-screen
--   - On mount, if localStorage has no screen state, the client GETs
--     /api/me and restores lastScreen if present.
--
-- Session-owned, so a 401 (session expired) simply won't restore — the user
-- re-authenticates and continues from a sensible default.

alter table public.users add column if not exists last_screen text;
alter table public.users add column if not exists last_screen_at timestamptz;

comment on column public.users.last_screen is
  'Last in-app screen (home/feed/chat/leaderboard) for server-side restore '
  'when localStorage is wiped (embedded webviews).';