# Production Readiness Review — Last Human Standing (2026-05-04)

> Multi-dimensional audit: **Product Design · System Architecture · UI/UX · Production Readiness**
> Audited by OpenHands. Findings below. Severity: 🔴 Critical · 🟡 Medium · ⚪ Low · ✅ Shipped

---

## 1. PRODUCT DESIGN — 🟡 Needs attention

### 1a. Core loop — ✅ Strong skeleton, edge cases need clarity
- **Daily elimination** with geo check-in + photo + crowd audit: good loop. The first-N-survive mechanic is simple, fair, and legible.
- **Infiltrator Mode**: creative twist that adds strategic depth. The "double elimination risk" framing is clear.
- **Survival cap shrinking**: 25→12→6→3→1 is a compelling arc. ✅
- **Prize pool distribution**: documented as "manual / scripted step (out of scope)". For production, this needs on-chain automation — otherwise it becomes a trust bottleneck and a single point of failure if the admin goes dark.

### 1b. Trust model — ⚠️ Unresolved tension between World App and browser users
- **Two-tier trust is real but undocumented in the UX**. The app runs in browser mode with full game participation but no World ID PoH. The UI shows a muted banner ("Running in browser mode") but doesn't explicitly tell users they have *lower trust* in that flow.
- **Voting requires World ID** in some configs (`VITE_REQUIRE_WORLD_ID_FOR_VOTING`) — but browser users who haven't verified won't understand why they can't vote. No clear gate messaging.
- **Recommendation**: Add a trust-tier indicator on the onboarding "YOU'RE IN" screen. Browser users should see a provisional badge ("Provisional — complete World ID for full trust"), World App users see a verified badge ("✅ Verified Human").

### 1c. Proof-of-humanity gate — ⚪ Browser path needs PoH layer before production
- **World App users**: World ID Orb verification via `@worldcoin/idkit` v4 (`IDKitRequestWidget` with server-signed `rp_context`) → `/api/idkit/verify` → `https://developer.world.org/api/v4/verify/{rp_id}`. Cloud verification, v4 endpoint. ✅
- **Browser users**: NO PoH layer today. SIWE auth + on-chain WLD payment is a WEAK sybil signal — someone can create unlimited wallets to get multiple entries. The payment is real but not human-verified.
- **Recommendation (pre-pilot)**: Choose one:
  - **Option A**: Embed [World ID Flex](https://docs.worldcoin.org/id/flex) (phone number or cloud) into browser onboarding for a lighter PoH signal. World ID JS SDK supports this via `VerificationLevel.Device` or the cloud flow.
  - **Option B**: Require browser users to also verify via World ID (same SDK, browser popup). The `WorldIdVerify.jsx` component already exists — just wire it into `Onboarding.jsx` for browser users too (not just World App).
  - **Option C**: Accept the risk for pilot scope (50 users, manual oversight) and label browser users as "provisional" in the UI.

### 1d. Referral mechanics — ⚪ Good for virality, undermonetized
- Referral link captures `ref` param → stored as `referred_by` on signup. ✅
- Top referrers get "priority check-in" — but "priority check-in" is vague. What does it mean mechanically? If it's just a UX perk, fine. If it should grant a check-in slot ahead of others, the DB schema needs a priority field.
- Referral count increments via `increment_referral()` Postgres function. ✅

### 1e. Eliminated user engagement — ✅ Creative retention hook
- Eliminated users can still vote, chat, challenge via World Chat. This is smart — keeps the social layer alive even after elimination.
- Challenge flow: `sendWorldChat()` opens a DM with the challenged user. Works in World App, falls back with a toast in browser. Good degradation.

---

## 2. SYSTEM ARCHITECTURE — 🟡 Solid core, gaps in observability and multi-cohort

### 2a. Tech stack — ✅
- **Frontend**: React + Vite + Tailwind + Framer Motion. Good modern stack. `react-router` not used (single-page with state-based routing) — fine for mini app scale.
- **Backend**: Express + Node. No TypeScript — acceptable for MVP but increases runtime-error surface. Consider gradual migration.
- **Database**: Supabase (Postgres + PostgREST + Storage). Schema is well-structured with proper indexes. ✅
- **Auth**: SIWE nonce + verify via `@worldcoin/minikit-js`. Sessions stored in `game_sessions` table with TTL. ✅
- **Payments**: MiniKit Pay (World App) + on-chain WLD transfer verification (browser). Dual-path is well-designed.

### 2b. Session management — ✅
- Nonces stored in `siwe_nonces` table with TTL. Consumed on use (prevents replay). ✅
- Session cookies: `httpOnly`, `sameSite: 'lax'`. **Missing**: `secure: true` flag — this will block sessions over HTTPS in production. 🔴 **Fix**: always set `secure: true` when `IS_PROD`.
- Sessions expire after 24h. Re-auth on expiry. ✅

### 2c. Payment verification — ✅ Browser path needs stress-test
- World App path: MiniKit `pay` → `/api/pay/confirm` → World Dev Portal API. ✅
- Browser path: wagmi wallet → sign transaction → `/api/pay/browser-confirm` → RPC call to `eth_getTransactionReceipt`. ✅ (Already shipped)
- **Gap**: `verifyWldTransfer()` in the browser confirm path does a raw RPC call to World Chain RPC. If the RPC is down or rate-limited, payment verification fails silently. Consider adding a fallback retry or a Supabase `payment_confirmations` table with async polling.

### 2d. Anti-cheat — ✅ Good foundation, some gaps
| Check | Status | Notes |
|---|---|---|
| GPS plausibility (`checkGpsPlausibility`) | ✅ | Rejects static coords, implausible velocity |
| Timing anomaly (`checkTimingAnomaly`) | ✅ | Detects burst submissions |
| Vote ring detection (`checkVoteRing`) | ✅ | Flags coordinated voting clusters |
| GPS accuracy threshold | ⚪ | 50m threshold not enforced on all submission paths |
| Velocity spoof detection | ⚪ | Planned but not shipped |
| EXIF strip + photo dedup | ⚪ | Planned but not shipped |
| Audit DQ-and-replace | ⚪ | Votes collected but not yet auto-enforced |

### 2e. Auto-round scheduler — ✅ Just shipped
- `autoAdvanceRounds()` runs every 60s. Opens rounds on schedule, closes them, eliminates non-survivors, promotes next-in-line. Clean implementation.
- **Single-instance assumption**: This works on a single server. If you scale to multiple Express instances behind a load balancer, `autoAdvanceRounds()` runs N times per interval. Use Supabase advisory locks (`pg_advisory_xact_lock`) or a dedicated cron (e.g., Supabase Edge Functions / pg_cron) for multi-instance deployments.
- **No idempotency guard**: Between the `select` and `update`, there's a window where concurrent calls could double-close a round. The `eq("status", "open")` guard helps but a row-level lock (`FOR UPDATE`) would be safer.

### 2f. Multi-cohort support — ⚪ Out of scope but architecture has gaps
- Today: single `GAME_LAUNCH_AT` + single cohort. For multi-cohort, you need:
  - A `cohorts` table (id, name, launch_at, cohort_size, status)
  - Rounds keyed to `(cohort_id, day)` instead of just `day`
  - Cohort-scoped user state (`paid`, `eliminated`) per cohort, not global per address
  - The current schema has `eliminated` as a global boolean on `users` — a user who joins two cohorts would be globally eliminated after the first. 🔴 **Fix before multi-cohort**.

### 2g. Observability — ⚪ Limited
- Structured JSON logs via `log()` helper. ✅ (Used for: auth, payment, check-in, anti-cheat, round lifecycle)
- Client-side errors captured at `/api/report-error`. ✅
- **Missing**: No distributed tracing, no request-level logging with correlation IDs, no live metrics dashboard.
- **Recommendation for production**: Add structured logging with `request-id` headers, log to stdout (so Hetzner/PM2 can pipe to your aggregator), consider Grafana Loki or similar.
- **Sentry**: Planned but not shipped. ⚪

### 2h. Security headers — ✅ Upgraded to helmet + cors
- Manual headers replaced with `helmet` + `cors` middleware. CSP allowlist scoped to known origins and World Dev Portal. ✅
- **CSP gap**: `worker-src` not set. If you ever use Web Workers or service workers, you need `worker-src 'self' blob:`. Not immediately critical.
- **CORS origin check**: Good. ✅

---

## 3. UI/UX — 🟡 Strong aesthetic, flow gaps and empty states

### 3a. Visual design — ✅ Distinctive, consistent
- **Aesthetic**: "Terminal horror meets cyberpunk" — `font-display`, `font-body`, `font-mono` tiering. Bone/blood/neon/ember palette. Very distinctive and memorable.
- **Animations**: Framer Motion throughout — page transitions, card animations, countdown pulse. Premium feel.
- **Mobile-first**: ✅ Touch targets generous, thumb-zone navigation, bottom nav.
- **`animate-pulse-blood`**: Custom keyframe animation. Works in dev but verify on Safari (some Safari versions have issues with non-standard animation names). Test before deploy.

### 3b. Onboarding flow — 🟡 Clear core, browser path needs refinement
- **3-step flow** (Welcome → Rules → Reserve): clean, progressive disclosure. ✅
- **Pre-launch state**: Countdown + cohort progress bar. Strong. ✅
- **Live state**: "ENTER ARENA" CTA. Good. ✅
- **"YOU'RE IN" confirmation**: After payment, shows email capture + referral link. Good virality hook. ✅
- **Browser fallback**: Shows `BrowserWalletPay` component + "open in World App" CTA. Clear degradation. ✅
- **Gap**: World ID verification is shown *after* payment for browser users (conditional on `requireWorldId`). This is good — payment is the primary action, PoH is secondary. But there's no visual indicator of *why* World ID matters at that point (trust tier, voting access).
- **Error recovery**: "Retry" button on wallet auth/pay errors. Good. ✅ No state reset between retries — users might need a "clear and start over" button if the error is persistent.

### 3c. Feed (Audit Layer) — 🟡 Voting UX good, trust badges missing
- Filter tabs (all/pending/verified/flagged). Clean. ✅
- Quorum progress bar per submission. Good signal. ✅
- **Trust badge gap**: No visual indicator of whether a submission author is World ID verified or browser-only. A `✅ Verified` vs `⏳ Provisional` badge next to each username would help voters calibrate their trust.
- Challenge button → World Chat DM. Smart integration. ✅
- Fire reaction toggle. Nice gamification touch. ✅
- **Empty state**: "No submissions yet for {theme}" — clear and friendly. ✅

### 3d. Check-in flow — ✅ Well-structured
- Photo capture → GPS capture → message → signature → submit. Logical sequence. ✅
- GPS accuracy warning. Good. ✅
- Rank reveal after submit. Compelling moment. ✅
- "You're eliminated" state with engagement hooks. ✅

### 3e. Leaderboard — ✅ Good game state view
- Survivors by day with rank. Clear. ✅
- Eliminated users shown separately. Good clarity. ✅
- **Gap**: The leaderboard doesn't show *why* someone was eliminated (e.g., "rank 27 — too slow" vs "flagged by community"). Adding the elimination reason would make the social deduction layer more legible.

### 3f. Error states and loading — ⚪ Inconsistent
- **ErrorBoundary** at app root: catches crashes, reports to server, shows reload button. ✅
- **Loading states**: Feed has "Loading feed…" but most other screens use no loading state (instant navigation). For async operations (wallet auth, payment), there's inline loading text but no spinner/skeleton.
- **Network error handling**: `syncAuth()` silently swallows network errors. If the server is down, the user sees no feedback. Consider an `isOffline` banner.
- **Empty states**: Feed and Leaderboard have empty states. CheckIn has one if round is not open. Home and Chat may not have explicit empty states.

### 3g. Accessibility — ⚪ Not audited
- No ARIA labels on several interactive elements (e.g., bottom nav icons, filter buttons).
- No skip-to-content or focus management on screen transitions.
- Color contrast: some `ember`/`dim` text on `smoke` backgrounds may not meet WCAG AA (4.5:1). Quick check needed.
- `animate-pulse-blood` — motion sensitivity concern. No `prefers-reduced-motion` check.
- Font sizing is in `rem` — good for text zoom. ✅

---

## 4. PRODUCTION READINESS — 🟡 Core shipped, hardening checklist incomplete

### 4a. What's shipped ✅
| Feature | Status |
|---|---|
| Schema (rounds, checkins, user lifecycle) | ✅ |
| `/api/game/state` | ✅ |
| `/api/checkin/location` | ✅ |
| Admin tooling (token-gated) | ✅ |
| Pre-launch waitlist UI | ✅ |
| Geo CheckIn UI | ✅ |
| Phase-aware Home + Standings | ✅ |
| Sessions DB-backed (Supabase) | ✅ |
| Anti-cheat: GPS plausibility + timing + vote ring | ✅ |
| Structured logs + client error reporting | ✅ |
| Browser wallet payment flow | ✅ |
| Auto-round scheduler | ✅ Shipped today |
| helmet + cors middleware | ✅ Shipped today |

### 4b. Critical gaps 🔴
| Issue | Impact | Fix |
|---|---|---|
| `secure: true` not set on session cookies in production | Session hijacking risk | Add to `SESSION_COOKIE_OPTS` in prod |
| Multi-cohort: `eliminated` is global, not per-cohort | A user eliminated in cohort 1 can't rejoin cohort 2 | Add `cohort_id` to `users` or separate `cohort_participations` table |
| Browser users have no PoH layer | Sybil attacks possible via multiple wallets | Add World ID Flex or wire existing World ID verify into browser path |
| Auto-scheduler not safe on multi-instance | Rounds may close multiple times under load | Use Supabase advisory lock or move scheduler to pg_cron |

### 4c. Medium gaps 🟡
| Issue | Impact | Fix |
|---|---|
| Sentry not integrated | No production error visibility | Add `@sentry/react` + `SENTRY_DSN` |
| Prize pool distribution is manual | Trust bottleneck, no automation | Implement on-chain distribution or multi-sig script |
| No rate limit on `/api/checkin/location` per wallet | Bot submission possible | Add per-wallet + per-IP rate limit |
| Vote quorum not publicly configurable | Hardcoded thresholds | Move to environment variables or round config |
| No velocity spoof detection | GPS can be spoofed | Implement `last_known_location` tracking |
| No photo deduplication | Same photo can be re-submitted | Hash uploaded photos, check for duplicates |
| No `prefers-reduced-motion` support | Motion sensitivity | Add `usePrefersReducedMotion` or CSS media query |
| No CSP `worker-src` directive | Blocks future Web Workers | Add `worker-src 'self' blob:` to helmet CSP |

### 4d. Low gaps ⚪
| Issue | Fix |
|---|---|
| No favicon diversity | Add platform-specific favicons |
| No `og:image` meta tag for social sharing | Add social preview image |
| `animate-pulse-blood` Safari compatibility | Test + add `-webkit-` prefix if needed |
| Referral "priority check-in" mechanic is vague | Define it clearly in the product spec |
| No dark/light mode toggle | Consider system preference detection |
| Leaderboard missing elimination reason | Add `eliminated_reason` field |

### 4e. Deploy (Hetzner / PM2) — ✅ Automated

Deploy is handled by `scripts/deploy.sh` from the project root:

```bash
bash scripts/deploy.sh
```

This builds locally, rsyncs to a timestamped release directory on the server, symlinks shared `.env` and `node_modules`, restarts PM2, and runs a health check. On failure it rolls back automatically.

To roll back manually:
```bash
bash scripts/deploy-rollback.sh
```

**Server layout:**
```
/opt/last-human-standing/
├── shared/          # .env (protected), node_modules (shared)
├── releases/        # Timestamped release dirs (keep 2)
└── current -> releases/<latest>/
```

**Critical**: The build happens locally (Vite). The server only runs `npm install --omit=dev` for Express production deps. Never run `npm run build` on the server.

---

## 5. OVERALL VERDICT

| Dimension | Score | Notes |
|---|---|---|
| Product Design | 7/10 | Strong core loop, infiltrator mode is creative. Browser PoH is the biggest gap. |
| System Architecture | 7.5/10 | Solid Express + Supabase foundation. Anti-cheat is ahead of most competitors. Multi-cohort gap is the main architectural risk. |
| UI/UX | 7/10 | Distinctive dark aesthetic with great animation. Trust badges and loading states are the main gaps. |
| Production Readiness | 7/10 | Most critical systems shipped. Security (cookies, multi-instance), PoH (browser), and observability (Sentry) are the three things to close before a real-money launch. |

**Recommended launch gate**: Fix the 🔴 issues (secure cookies, browser PoH, multi-instance scheduler safety) before opening to more than ~50 users. For the 50-user pilot, the current state is **usable** — the gaps exist but are manageable with manual oversight.

---

*Reviewed: 2026-05-04 · Last Human Standing · OpenHands audit agent*
