# Last Human Standing (World Mini App)

**Live app: https://lasthumanstanding.thisyearnofear.com**
Prize pool wallet: `0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046`

A mobile-first World Mini App: **a daily real-world elimination game for verified humans**.

## How it works

A cohort of N players (default 50) competes over ~5 days. Each day:

1. Admin reveals the day's **location** (GPS pin + radius) and **prompt** (e.g., "selfie at the carousel")
2. The check-in window opens (e.g., 4 hours)
3. Players check in with **three witnesses**:
   - **GPS** — physically within the radius during the window
   - **Photo** — capture a photo matching the prompt
   - **Crowd** — community votes real / fake (audit layer)
4. The **first N arrivals** survive (e.g., first 25). Slow / no-show = eliminated.
5. After the audit window, any survivor with too many "fake" votes is disqualified and the next-ranked candidate is promoted.
6. The cap shrinks each day (e.g., 25 → 12 → 6 → 3 → 1) until one human remains.

The last verified human takes the on-chain prize pool.

### Why three witnesses

Each witness is weak alone:
- GPS spoofers exist
- AI image generators exist
- Sybil voting exists (mitigated separately by World ID)

Combined, the cheating cost is high — you'd have to spoof location **and** generate a convincing live-prompt photo **and** survive the crowd audit.

## Pre-launch (waitlist)

Before a cohort starts, the app shows a **countdown** plus a **"RESERVE YOUR SLOT"** CTA:

- Wallet auth + 1 WLD entry fee locks your spot.
- The pot grows on World Chain as players reserve.
- Cohort caps at `COHORT_SIZE` (default 50).
- When the cohort fills or the countdown hits zero, **Day 1** begins.

## World Stack usage

- **World ID** — sybil-resistant identity (one human, one slot)
- **World Wallet (SIWE via MiniKit)** — server-verified login
- **MiniKit Pay** — 1 WLD entry fee directly into the on-chain pool
- **MiniKit Sign Message** — cryptographic stamp on every check-in
- **World Chat (XMTP)** — coordination, trash talk, audit chatter

## Local development

```bash
npm i
npm run dev:all
```

In a normal browser, MiniKit commands fall back. Demo / browser mode auto-completes wallet auth + pay so you can walk through the UI without World App.

## Configuration

Copy `.env.example` → `.env`. New values for the cohort/geo model:

```bash
# Pre-launch / cohort
GAME_LAUNCH_AT=2026-05-01T18:00:00Z   # ISO timestamp; before this → "prelaunch" phase
COHORT_SIZE=50                         # max reservations before pre-launch closes early

# Daily round defaults
DAILY_SURVIVAL_CAP=25                  # default first-N survivors per day
CHECKIN_RADIUS_M=100                   # default GPS radius (meters)

# Admin tooling
ADMIN_TOKEN=<random-long-secret>       # required header on /api/admin/* endpoints
```

Existing values (Supabase, World Dev Portal, World ID) are unchanged — see `.env.example`.

## Supabase setup

1. Create a Supabase project
2. Create a storage bucket (default `checkins`)
3. Run `supabase/schema.sql` in the SQL editor — adds `users`, `submissions`, `votes`, **`rounds`**, **`checkins`** tables (idempotent).

## Admin operations

The admin endpoints are gated by the `x-admin-token` header. Examples:

```bash
# Reveal today's round
curl -X POST https://lasthumanstanding.thisyearnofear.com/api/admin/round \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "day": 1,
    "name": "DUMBO Brooklyn",
    "lat": 40.7033,
    "lng": -73.9881,
    "radius_m": 100,
    "survival_cap": 25,
    "opens_at": "2026-05-02T15:00:00Z",
    "closes_at": "2026-05-02T19:00:00Z",
    "prompt": "Selfie at the carousel"
  }'

# Close a day → marks non-survivors as eliminated
curl -X POST https://lasthumanstanding.thisyearnofear.com/api/admin/close-day \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"day": 1}'

# Inspect game state (no auth)
curl https://lasthumanstanding.thisyearnofear.com/api/game/state
```

## Pilot playbook (50-user test)

1. Set `GAME_LAUNCH_AT` ~3 days out, `COHORT_SIZE=50`, `DAILY_SURVIVAL_CAP=25`
2. Share the live URL → players reserve slots
3. At launch time, run `/api/admin/round` with Day 1 location
4. After the window closes, run `/api/admin/close-day`
5. Repeat with shrinking caps (25 → 12 → 6 → 3 → 1) until one survivor

## Hackathon submission

See `submission.md`, `ONE_PAGER.md`, `DEMO.md`.
