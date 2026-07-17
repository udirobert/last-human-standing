# Last Human Standing (World Mini App)

**Live app: https://lasthumanstanding.thisyearnofear.com**
Prize pool wallet: `0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046`

A mobile-first World Mini App: **a daily real-world elimination game for verified humans**.

## How it works

A cohort of N players (default 50) competes over ~5 days. Each day:

1. Admin reveals the day's **theme** (e.g., "AT A CAFÉ", "AT A PARK") and **prompt**
2. The check-in window opens (e.g., 4 hours)
3. Players check in from **anywhere on Earth** with:
   - **Photo** (required) — capture a photo matching the theme
   - **GPS** (optional) — share your location for bonus credibility metadata
   - **Crowd** — community votes HUMAN / SUS (audit layer)
4. The **first N arrivals** survive (e.g., first 25). Slow / no-show = eliminated.
5. **Audit verdicts have consequences.** At day close, every pending submission is finalized (weighted votes; ≥30% SUS with 3+ votes = flagged). Flagged survivors are **disqualified** and the highest-ranked "too late" check-ins inherit their slots (DQ-and-replace).
6. **Infiltrator Mode:** Opt in and let the crowd judge you. Voted HUMAN → immunity through the next day's cut. Flagged → DQ'd and any held immunity is burned. Infiltrator status is hidden from the audit feed. Voters earn accuracy stats for catching them.
7. **Jury system:** Eliminated players keep playing as the jury — their votes count double once their audit accuracy is ≥80% (min 5 resolved votes), and every correct verdict vote earns a jury ticket that weights the next cohort's free-entry lottery.
8. The cap shrinks each day (e.g., 25 → 12 → 6 → 3 → 1) until one human remains.

The last verified human takes the on-chain prize pool. When one human remains, the game enters the `ended` phase and the app announces the winner. The audit feed is publicly viewable — spectators can watch, but voting requires entry. Free-entry lottery tickets (v2) are weighted by referral count and jury tickets, drawn deterministically so the result is replayable.

### Why three witnesses

Photo + crowd voting is the primary trust layer. GPS is optional bonus credibility — shown as metadata on submission cards so voters can factor it in.

- AI image generators exist → but the crowd catches them
- Sybil voting exists → mitigated by World ID (one human, one vote)
- GPS spoofing exists → but it's just metadata, not a gate

The social deduction layer (HUMAN/SUS voting + Infiltrator mode) is what makes cheating costly.

## Pre-launch (waitlist)

Before a cohort starts, the app shows a **countdown** plus a **"RESERVE YOUR SLOT"** CTA:

- Wallet auth + 1 WLD entry fee locks your spot.
- The pot grows on World Chain as players reserve.
- Cohort caps at `COHORT_SIZE` (default 50).
- When the cohort fills or the countdown hits zero, **Day 1** begins.

## Interactive & Personalized Features

1. **🔊 Immersive Audio Layer (Sound Design)**: Zero-latency synthetic sound effects generated dynamically via the Web Audio API for highly responsive UI sounds (button click, success, milestone, errors, and custom mascot responses) without requiring audio asset downloads.
2. **✨ Focused Onboarding Flow**: A tight 4-step flow — Welcome → Rules → Profile → Reserve/pay 1 WLD → celebration. Onboarding teaches the **core loop only** (reserve → theme → prove → survive), with a short profile step that personalizes the mascot and paywall copy. Advanced mechanics (infiltrator, jury, wildcard, finale) unlock via `RuleReveal` on the day they matter — progressive disclosure, not a rulebook.
3. **🛡️ Pluggable Proof of Humanity**: A pluggable, extensible multi-provider identity layer supporting World ID and Self Protocol (both live). See [HUMANITY_PROVIDERS.md](./HUMANITY_PROVIDERS.md) for the integration shape, trust tiers, and the one env-var flip that takes Self from Celo Sepolia staging to Celo mainnet.
4. **🎨 Hand-painted human motifs**: A gouache-on-paper artefact language (coffee, streak plant, dozing cat, daily-theme wheel, mascot, proof-of-presence scenes) against cold system chrome. Shared `AmbientBackdrop` + soft `AmbientMotifs` across home/feed/chat/standings/history/onboarding and the speed-run; MotifFrieze at dwells; LandingHero / SpeedRunIntro keep the denser floating set. See [ART_DIRECTION.md](./ART_DIRECTION.md).
5. **🎯 Live home focus**: Mission mantra ("Be one of the first N") leads; arsenal / prize pots sit below the feed; arsenal only appears after play progress; spectator chrome is deduped into MissionBoard (cohort-2 priority keeps `SpectatorChip`).
6. **🃏 Shareable moment cards**: Canvas PNG cards for survive / jury / win; native share prefers the image file.
7. **⚖️ Audit as spectacle**: Full-bleed photos, live HUMAN/SUS tally bar, large verdict buttons; feed polls every 12s.
8. **🔁 Cohort 2 handoff**: Ended phase surfaces tickets, next-drop countdown (`COHORT_2_LAUNCH_AT`), waitlist, and push opt-in — not a dead end.
9. **📋 Theme fairness**: Per-theme "what counts / doesn't" notes on mission + check-in.
10. **⚡ Speed-run demo**: Guided ~15-min client demo at `/?demo=1` — same craft dialect as live (Cuelume + CraftCta + motifs through every beat) → reserve for the real cohort. Telegram-ready; no payment.
11. **🔌 Browser pay UX**: Pick WLD/cUSD → **Connect wallet to pay** opens a wallet modal (connectors never dumped on the page).

## World Stack usage

- **World ID** — sybil-resistant identity (one human, one slot)
- **World Wallet (SIWE via MiniKit)** — server-verified login
- **MiniKit Pay** — 1 WLD entry fee directly into the on-chain pool
- **MiniKit Sign Message** — cryptographic stamp on every check-in
- **World Chat (XMTP)** — coordination, trash talk, audit chatter

## Farcaster

The app also ships as a **Farcaster Mini App** (fka Warpcast). Signed manifest, modern `fc:miniapp` embed spec, in-app `composeCast` for sharing, and a Cast Action manifest kept as a no-cost fallback. Snaps are planned post-launch — see [FARCASTER.md](./FARCASTER.md) for what we ship, what we deliberately don't, and the snap integration plan.

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
GAME_LAUNCH_AT=2026-07-18T18:00:00Z   # ISO timestamp; before this → "prelaunch" phase
COHORT_SIZE=50                         # max reservations before pre-launch closes early

# Daily round defaults
DAILY_SURVIVAL_CAP=25                  # default first-N survivors per day
CHECKIN_RADIUS_M=100                   # default GPS radius (meters, only used when round has coords)

# Admin tooling
ADMIN_TOKEN=<random-long-secret>       # required header on /api/admin/* endpoints
```

Existing values (Supabase, World Dev Portal, World ID) are unchanged — see `.env.example`.

## Supabase setup

1. Create a Supabase project
2. Create a storage bucket (default `checkins`)
3. Apply the schema (idempotent — adds `users`, `submissions`, `votes`, `rounds`, `checkins`, plus runtime-persistence tables). Two options:

   **A) SQL Editor (manual, no creds needed):** paste the contents of `supabase/schema.sql` and click Run.

   **B) psql (scriptable, requires DB password from `Project Settings → Database`):**
   ```bash
   # Export your DB password into a local env var first (do not commit it).
   export PGPASSWORD=<paste-from-supabase-dashboard>
   PROJECT_REF=<your-project-ref>

   psql -h db.${PROJECT_REF}.supabase.co -p 5432 -U postgres -d postgres \
     -f supabase/schema.sql

   # Optional: nudge PostgREST to refresh its schema cache immediately
   psql -h db.${PROJECT_REF}.supabase.co -p 5432 -U postgres -d postgres \
     -c "NOTIFY pgrst, 'reload schema';"
   ```

### Schema tables

| Table | Purpose |
|---|---|
| `users` | address, paid, eliminated, world_id_verified, referral_code, referral_count |
| `rounds` | daily challenge: day, name, lat, lng, radius_m, survival_cap, opens_at, closes_at, prompt, status |
| `checkins` | per-day arrival record: id, day, address, lat, lng, distance_m, rank, survived, photo_path, created_at |
| `submissions` | audit-layer photo submissions with voting status |
| `votes` | crowd votes (real/sus) per submission |
| `game_sessions` | httpOnly session cookies; expires_at TTL |
| `siwe_nonces` | consumed nonces for SIWE; prevents replay |
| `pay_references` | payment references consumed on confirmation |
| `rate_limits` | per-key request counters with TTL |
| `submission_flags` | anti-cheat flags (GPS plausibility, vote ring, timing anomaly) |

## Admin operations

The admin endpoints are gated by the `x-admin-token` header. Examples:

```bash
# Reveal today's round (global — no GPS pin)
curl -X POST https://lasthumanstanding.thisyearnofear.com/api/admin/round \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "day": 1,
    "name": "AT A CAFÉ",
    "place_type": "AT A CAFÉ",
    "survival_cap": 25,
    "opens_at": "2026-05-02T15:00:00Z",
    "closes_at": "2026-05-02T19:00:00Z",
    "prompt": "Show us your café — anywhere in the world"
  }'

# Or with optional GPS pin for a local event
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

See [BETA_ROADMAP.md](./BETA_ROADMAP.md) for the full pre-launch checklist and admin commands.

1. Set `GAME_LAUNCH_AT` ~3 days out, `COHORT_SIZE=25`, `DAILY_SURVIVAL_CAP=12`
2. Share the live URL → players reserve slots
3. At launch time, run `/api/admin/round` with Day 1 theme (GPS coords optional)
4. After the window closes, run `/api/admin/close-day`
5. Repeat with shrinking caps (12 → 6 → 3 → 1) until one survivor

For post-beta feature plans, see [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md).

## Hackathon submission

See `submission.md`, `ONE_PAGER.md`, `DEMO.md`.

---

## Testing

See [TESTING.md](./TESTING.md) for the full testing guide. Quick start:

```bash
npm run test:run      # 87 tests across 7 files
npm run test:coverage # with line/function/branch thresholds
```

## Offline support

The app registers a service worker (`public/sw.js`) that:

- **Caches the app shell** (index.html, manifest) on install — the app loads even when offline
- **Network-first for /api/*** — last-known data is served from cache when offline
- **Check-in queue** — if you submit a check-in while offline, it's stored in IndexedDB and replayed automatically when the connection returns (via Background Sync API)
- **Offline indicator** — the check-in screen shows a "📡 You're offline" banner and a "QUEUED" result state

Registered automatically in `src/main.jsx`. See `src/hooks/useOnlineStatus.js` for the client hook.

## Push notifications

Web Push (VAPID) notifications are supported. When enabled:

| Trigger | Notification |
|---------|-------------|
| Round opens | Broadcast to all subscribed users |
| 1 hour left | Warning before the check-in window closes |
| You survived | Per-user notification after day close |
| Audit verdicts | Per-day verdict summary |
| User eliminated | Per-user notification with day info |
| Winner announced | Broadcast when one human remains |
| Admin test | `POST /api/push/test` (admin-only) |

### Setup

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add to production `.env`:
   ```
   VAPID_PUBLIC_KEY=<public-key>
   VAPID_SECRET=<your-vapid-secret>
   VAPID_EMAIL=admin@lasthumanstanding.thisyearnofear.com
   ```
3. Users opt-in during onboarding via the `PushOptIn` component

## Project structure

```
.
├── public/                    # Static assets + service worker
│   └── sw.js                  # Offline SW + background sync
├── src/
│   ├── components/           # React UI components
│   ├── config/               # AI + humanity provider configs
│   ├── data/                 # Game constants & mock data
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Client-side utilities (pushClient)
│   ├── wallet/               # Wagmi + viem wallet config
│   └── world/                # World App integration providers
├── server/
│   ├── index.js              # Express app (orchestrator + remaining routes)
│   ├── anticheat.js          # GPS plausibility, timing, vote ring detection
│   ├── rateLimit.js           # Rate limiter (DB-backed + in-memory fallback)
│   ├── lib/                  # Server libraries
│   │   ├── push.js           # VAPID push notification sender
│   │   └── validators.js     # Request body validators
│   └── routes/               # Modular route handlers
│       ├── auth.js           # /api/nonce, /api/complete-siwe, /api/logout, /api/me
│       ├── payment.js        # /api/pay/reference, /api/pay/confirm, /api/pay/browser-confirm
│       ├── push.js           # /api/push/subscribe, /api/push/unsubscribe, /api/push/test
│       └── referral.js       # /api/waitlist, /api/referral-board, /api/referral/:code
├── supabase/
│   ├── schema.sql            # Full database schema (idempotent)
│   └── migrations/           # Incremental migrations
│       └── 003_push_subscriptions.sql
├── tests/                    # Vitest test files (87 tests, 7 files)
└── docs/                     # Documentation
```
