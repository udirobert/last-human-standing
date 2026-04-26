# Production readiness plan (Last Human Standing)

This documents the **modes**, the **cohort lifecycle**, and what's left to harden before scaling beyond pilot.

## 1) Modes

### A) Demo / Browser mode
- MiniKit not installed → simulate wallet auth + pay (browser fallback)
- When `DEV_BYPASS_VERIFICATION=true` on the server, the browser-fallback `walletAuth` calls **`POST /api/dev/login`** which mints a real httpOnly session cookie + marks the stub address as `paid`. This lets the demo exercise the real `/api/checkin/location` flow end-to-end.
- The `/api/dev/login` endpoint returns `404 not_enabled` whenever `DEV_BYPASS_VERIFICATION` is anything other than `"true"` — keep this off in production.
- Geo check-in still works (real navigator.geolocation)
- Useful for screen-shareable walkthroughs

### B) Real / World App mode (pilot)
- SIWE wallet auth verified on backend
- Pay verified on backend (World Dev Portal API)
- Geo check-in: GPS within radius + photo + signed message
- Audit voting collected (non-binding in pilot — used to tune thresholds)

### C) Production mode
- Everything in pilot, plus:
  - Audit DQ-and-replace turned ON
  - World ID required for check-in + voting
  - RLS / storage policies hardened
  - Observability and alerts
  - Multi-cohort scheduling

## 2) Cohort lifecycle (the new game loop)

```
prelaunch    →    live (Day 1..N)    →    ended
   ↑                    ↑                       ↓
 reservations     daily rounds            winner / payout
 (1 WLD lock)     (admin-set)             (next cohort spawns)
```

### Pre-launch
- `GAME_LAUNCH_AT` controls when reservations close
- `COHORT_SIZE` caps the cohort (e.g., 50)
- Any user can reserve via wallet auth + 1 WLD payment
- Pre-launch closes when cap is hit OR countdown expires

### Live
- `currentDay = floor((now - launchAt) / 86400) + 1`
- Each day requires an admin-set `round` row (via `/api/admin/round`)
- Players within the round's window + radius can check in
- First `survival_cap` arrivals (by `created_at`) survive that day
- `/api/admin/close-day` marks non-survivors as eliminated

### Ended
- 1 (or 0) survivors remain → game ends
- Prize pool distribution is a separate manual / scripted step (out of scope for this doc)

## 3) System architecture

**Client (Mini App)**
- React/Vite UI with phase-aware screens (prelaunch / live / eliminated / ended)
- Calls:
  - MiniKit commands (walletAuth, pay, signMessage, chat)
  - Backend APIs for game state, check-ins, votes, stats

**Backend (Express)**
- Auth: SIWE nonce + verify, httpOnly session cookies
- Game state: `/api/game/state` aggregates phase + round + your status
- Geo check-in: haversine distance check, atomic rank assignment
- Admin endpoints: token-gated round CRUD + day close
- Verification: World Dev Portal payment verify, World ID v4 RP signatures

**Supabase**
- `users` (address, paid, eliminated, eliminated_at_day, world_id_verified, …)
- `rounds` (day, name, lat, lng, radius_m, survival_cap, opens_at, closes_at, prompt, status)
- `checkins` (id, day, address, lat, lng, distance_m, rank, survived, photo_path, created_at)
- `submissions` + `votes` — kept for the audit layer (currently non-binding)

## 4) Hardening checklist (post-pilot)

### Security
- Move sessions from in-memory Map → DB-backed (or signed JWT)
- Stricter rate limits on `/api/checkin/location` (per-wallet + per-IP)
- Schema-validate all request bodies (zod)
- Cookies: `secure: true`, `sameSite: 'lax'`
- Admin endpoints: rotate `ADMIN_TOKEN` regularly, restrict by IP allow-list

### Anti-cheat
- Reject GPS when `accuracy > 50m` or coordinates haven't changed in the last 10s (likely emulator/spoof)
- Detect impossible velocity (last-known-loc → check-in distance vs time)
- Strip EXIF, hash the photo, reject duplicates within a cohort
- Audit DQ-and-replace ON in production
- Optional: AI-image-detection signal in audit

### Supabase policies
- Private `checkins` storage bucket + signed read URLs only
- RLS: server-role writes only; clients can read their own checkins
- Add unique index on `(day, address)` (already in schema)

### Observability
- Structured logs (pino)
- Error tracking (Sentry)
- Metrics: check-ins/min, audit votes/min, p95 latency on `/api/checkin/location`
- Alert on: round window opening with no admin row, anomalous GPS clusters

### UX hardening
- Loading + empty + error states for every screen (not just happy path)
- Clear "you're eliminated" state with engagement hooks (vote, chat)
- Prelaunch countdown survives offline (server-supplied `now` for clock skew correction)

## 5) Deploy notes (Hetzner / PM2)

Standard deploy from local:
```bash
rsync -az --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='.env' \
  ./ snel-bot:/opt/last-human-standing/

ssh snel-bot 'cd /opt/last-human-standing && \
  npm install && \                # full install — vite is a devDependency
  npm run build && \
  pm2 restart last-human-standing && \
  sleep 2 && \
  curl -s https://lasthumanstanding.thisyearnofear.com/api/health'
```

**Gotcha:** the build step (`npm run build` → `vite build`) needs vite, which is in `devDependencies`. Do **not** use `npm install --omit=dev` — the build will fail with `vite: not found`. The runtime (Express server) does not need vite, but the static client bundle does.

## 6) Pilot → production timeline

| Step | Status |
|---|---|
| Schema (rounds, checkins, user lifecycle) | ✅ shipped |
| `/api/game/state` | ✅ shipped |
| `/api/checkin/location` | ✅ shipped |
| Admin tooling | ✅ shipped |
| Pre-launch waitlist UI | ✅ shipped |
| Geo CheckIn UI | ✅ shipped |
| Phase-aware Home + Standings | ✅ shipped |
| Audit DQ-and-replace | 🟡 collected, not enforced |
| Sessions out of memory | ⚪ todo |
| Anti-spoof signals | ⚪ todo |
| Multi-cohort scheduler | ⚪ todo |
| Sentry + structured logs | ⚪ todo |
