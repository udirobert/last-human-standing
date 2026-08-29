# Last Human Standing (World Mini App)

**Live app: https://lasthumanstanding.thisyearnofear.com**
Prize pool wallet: `0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046`

A mobile-first World Mini App: **a daily real-world elimination game for verified humans**.

## How it works

A cohort of N players (default 50) competes over ~5 days. Each day is a
24-hour cycle (Riddle Rounds — see [`RIDDLE_ROUNDS.md`](./RIDDLE_ROUNDS.md)):

1. **The Asking (T+0h)** — ARIA posts an interpretive **riddle**, not a
   literal instruction (e.g. *"Find the place where strangers become
   regulars. Bring proof."*), and **hash-commits a hidden resolution spec**
   before any submission exists. Pre-launch, riddles stay hidden.
2. **The Hunt (T+0..18h)** — an 18-hour check-in window (timezone-fair by
   design). Players answer with:
   - **Photo** (required) — a real photo that answers the riddle
   - **Caption** — a one-line argument ("my answer, because…")
   - **GPS** (optional) — location credibility metadata
3. **The Reveal (T+18h)** — check-in closes, the committed spec is revealed,
   and the vote window opens.
4. **The Reckoning (T+18..24h)** — the crowd votes each answer against the
   revealed criteria.
5. **Close (T+24h)** — verdicts finalized (weighted votes; single 70%
   threshold). Flagged survivors are **disqualified** and the highest-ranked
   too-late check-ins inherit their slots (DQ-and-replace). If eligible
   check-ins exceeded the cap, survival is decided by a **deterministic
   seed lottery** (Fisher–Yates, replayable from the public cohort seed) —
   not speed.
6. **Jury system:** Eliminated players keep playing as the jury — their votes
   count double once their audit accuracy is ≥80% (min 5 resolved votes),
   and every correct verdict vote earns a jury ticket. A jury pool is split
   pro-rata among accurate voters at cohort end.
7. The cap shrinks each day (25 → 12 → 6 → 3 → 1) until one human remains.

**Riddle reveal moment:** When a round opens, a dramatic full-screen
animation briefly shows the riddle before fading away — making each day's
ask feel special and building daily return motivation.

The last verified human takes the on-chain prize pool. When one human remains, the game enters the `ended` phase and the app announces the winner. The audit feed is publicly viewable — spectators can watch, but voting requires entry. Free-entry lottery tickets (v2) are weighted by referral count and jury tickets, drawn deterministically so the result is replayable.

### Hidden Verification & Agent Participation

**Status: foundation shipping now, activation flagged off.** Schema, seat reservation (20–30% cap), admin agent registration, silent-verification plumbing, and end-game breakdown are in place. Live agents stay off until `AGENTS_ENABLED=true`.

**Verification can run silently.** Set `SILENT_VERIFICATION=true` to hide World ID / Self badges in gameplay UI. Proofs still persist (`verified_human` / `verified_at`). At the end, `/api/game/state` returns aggregate `breakdown` stats.

**Agents compete alongside humans (when enabled).** AI agents pay an x402 fee per entry (added to the prize pot). Admin seeds seats via `POST /api/admin/agents`. Human registration cannot fill reserved agent slots.

**Agent cap: 20–30% of cohort** (`MAX_AGENT_RATIO=0.25`, hard-capped at 35%). Example: cohort of 50 → 13 agent seats, 37 human seats.

**Agent quality tiers (planned for activation):**
- **Basic ($1/entry):** Text-only description, system generates stylized placeholder
- **Standard ($3/entry):** Image generation with visible "AI-generated" watermark
- **Premium ($5/entry):** Full quality, no watermark — designed to be indistinguishable

**The Turing test arena.** Humans prove they're human by submitting authentic photos; agents prove they're human by submitting convincing AI-generated content. The crowd votes. The last human (or the last agent) wins.

### Ghost Profile Prevention

To keep the public counter accurate and prevent test/dev accounts from inflating numbers:

1. **`verified_at` timestamp** — only accounts with `verified_at IS NOT NULL` count toward `reservedCount`
2. **`created_via` enum** — `'real_signup' | 'admin_test' | 'speed_run' | 'referral_claim'` tags accounts so test accounts never inflate the public counter
3. **Soft-delete pattern** — mark accounts `status = 'inactive'` with a reason field; preserves audit trails while keeping the counter clean
4. **Auto-cleanup cron** — daily job marks accounts inactive if they haven't verified within 7 days, have no payment, no check-ins, no votes
5. **Real-time counter** — `GET /api/game/state` filters by `paid = true OR (free = true AND verified_at IS NOT NULL AND created_via = 'real_signup')`

### Why three witnesses

Photo + crowd voting is the primary trust layer. GPS is optional bonus credibility — shown as metadata on submission cards so voters can factor it in.

- AI image generators exist → but the crowd catches them
- Sybil voting exists → mitigated by World ID (one human, one vote)
- GPS spoofing exists → but it's just metadata, not a gate

The social deduction layer (HUMAN/SUS voting + Infiltrator mode) is what makes cheating costly.

## Pre-launch (waitlist)

Before a cohort starts, the app shows a **countdown** plus a **"RESERVE YOUR SLOT"** CTA:

- **Dramatic countdown**: The landing hero features a live countdown with cycling mystery emojis (❓🔮✨🎯🎲🌟) that rotate every 4 seconds, creating anticipation while keeping themes hidden
- **Social proof**: Real-time cohort progress bar showing X/50 reserved, plus referral tracking ("X friend(s) joined through your invite")
- **Onboarding tutorial**: New players see an animated 4-step walkthrough (check-in → vote → survive → win) before reserving
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
3. Apply the canonical schema for a new project. Prefer the linked Supabase CLI workflow so migration history stays tracked:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase migration list --linked
   supabase db push --linked
   ```
   The checked-in `supabase/schema.sql` remains available for initial manual
   bootstrap only; do not use ad-hoc SQL-editor copies for tracked migrations.
   The security migration (`036_security_hardening.sql`) enables RLS on public
   tables, removes direct anon/authenticated table access, and makes the
   `checkins` bucket private. Server routes use the service-role client and
   issue short-lived signed media URLs after authorization.

4. Confirm the `checkins` Storage bucket exists and is private. The API issues
   signed upload/read URLs; clients should not receive direct table privileges.

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
# Reveal today's round (global — no GPS pin). Two-phase round: opens_at is
# the ask, reveal_at is the T+18h boundary (check-in closes, spec revealed,
# vote opens), closes_at is the T+24h survival close.
curl -X POST https://lasthumanstanding.thisyearnofear.com/api/admin/round \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "day": 1,
    "name": "THE GATHERING",
    "place_type": "THE GATHERING",
    "survival_cap": 25,
    "opens_at": "2026-09-01T18:00:00Z",
    "reveal_at": "2026-09-02T12:00:00Z",
    "closes_at": "2026-09-02T18:00:00Z",
    "prompt": "Find the place where strangers become regulars. Bring proof."
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
    "opens_at": "2026-09-01T18:00:00Z",
    "reveal_at": "2026-09-02T12:00:00Z",
    "closes_at": "2026-09-02T18:00:00Z",
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

## Return experience

When a player comes back after being away, the app restores their last screen
from `localStorage` and silently re-checks auth — no splash, no forced restart.
On top of that baseline, a single `<ReturnExperience>` overlay (mounted once in
`App.jsx`, so it renders over any screen) handles the edge cases:

| Situation on return | What the player sees |
|---|---|
| Session expired (7-day cookie lapsed) | A "Session expired — sign in again" toast (seat/progress preserved), instead of a silent drop into onboarding. Set on a 401 from `syncAuth` only when auth was previously persisted; cleared on re-auth. |
| Eliminated while away | A "While you were away" reveal explaining how/why they went out, with a CTA into the jury role. |
| Survived, but rounds advanced | A dismissable "You missed Day X & Y — you're still in" catch-up toast. |
| Check-in window open, not submitted | A global urgency banner with a live countdown (turns blood-red in the final 6h); a "you missed today's window" banner after close. |
| First game-state fetch in flight | A subtle "Syncing…" pill so a cached render reads as about-to-update, not stale. |
| Offline check-in replayed | A success / transient-failure / window-expired toast (from the SW's `QUEUE_REPLAYED` message). |
| Game ended while away | A winner recap + next-cohort CTA. |
| New app version activated | A "New version available — refresh" prompt (only on a true in-place SW update). |

Implementation:

- **`src/lib/returnState.js`** — pure, unit-tested helpers that persist a
  minimal "last known race status" snapshot (`alive`/`eliminated`, day,
  checked-in) and detect what changed since the last visit. Distinct from
  `useScreenState` (UI position) — this records race status.
- **`src/hooks/useReturnExperience.js`** — commits the snapshot exactly once
  per authenticated visit (ref-guarded so the 15s poll never re-fires the
  beats); only writes once `you.isAuthed` is true, so a non-authed visitor
  can't trigger a false "eliminated while away".
- **`src/hooks/useServerScreenSync.js`** + **`src/lib/serverScreen.js`** —
  mirror the current screen to the server (debounced) and restore it from
  `GET /api/me` **only** when `localStorage` was wiped (embedded World App /
  Farcaster webviews). Backed by `users.last_screen` (migration 043) and
  `PUT /api/me/last-screen`. Local storage remains the source of truth when
  present, so this is a pure fallback.
- **`src/hooks/useServiceWorkerUpdate.js`** / **`useQueuedCheckinFeedback.js`**
  — the SW update-prompt and offline-queue-replay listeners; both guard
  against first-install false positives.

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
│   ├── hooks/                # Custom React hooks (return experience, online status, screen state)
│   ├── lib/                  # Client-side utilities (pushClient, returnState, serverScreen)
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
