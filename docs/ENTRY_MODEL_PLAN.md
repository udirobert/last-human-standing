# Entry model review + plan

> Pre-launch feedback (2026-06-13): confusing copy, mixed free/paid
> signals, no Celo visibility on the welcome card, and a question
> about whether the cohort should be a free lottery, paid reserve,
> or both.

This document captures what's broken, the model question, and the
implementation plan.

## What's actually broken right now

Three real bugs (separate from the model question):

| Bug | Evidence | Fix |
|---|---|---|
| **Local `.env` is missing `VITE_FREE_ENTRY_MODE`** | `.env` has no `FREE` lines; only `.env.example` does. The bundle inlines `import.meta.env.VITE_FREE_ENTRY_MODE === "true"` at build time, and the local build was made without the flag, so `isFree = false` in the served bundle. That's why the user is seeing the WLD pay-path copy on a system that *intends* to be free. | Add `VITE_FREE_ENTRY_MODE=true` (and `FREE_ENTRY_MODE=true`) to the local `.env`. Rebuild. Re-deploy. |
| **`/api/cohort/roster` exposes 5 stale "users" from old dev sessions** | `reserved_at` is 2026-04-30 / 2026-05-01; all `eliminated=true`; `referral_count=0`; usernames are null. These are not real signups. | Either: (a) reset the cohort to 0/50 (TRUNCATE rows from `users` where `paid=true AND eliminated=true AND last_seen_at < now-30d`), or (b) filter them out of the public roster. Recommend (a) for a clean launch. |
| **`/api/stats` only exposes the WLD pot, never the Celo pot** | `prizePool.balanceWld` exists, no `balanceCelo` / `balanceCusd` / `balanceUsdc`. The Celo prize pool contract is configured (env has `VITE_CELO_PRIZE_POOL_ADDRESS`) but the server never queries its balance. | Add a Celo balance fetch (mirroring `fetchWldBalance`) and expose `prizePool.celo` alongside `prizePool.wld`. |

## The model question

User's words: *"free to enter but randomly picked who enters from all those who register — but reserving a slot guarantees you entry. could save an allocation for free entries, and an allocation for paid, all fees go to the pot."*

That's a clean model. Let me put numbers on it.

### Proposed cohort composition

```
Cohort 1 — 50 slots
├─ 25 GUARANTEED slots — paid (1 WLD on World Chain, 5 cUSD on Celo)
└─ 25 LOTTERY slots — free, drawn from free-registration pool

All paid fees → prize pot (single pot, denominated in USD-equivalent at settlement)
Free entries are free; lottery losers are waitlisted for cohort 2.
```

This is the **25+25 hybrid**. Other options:

| Model | Pros | Cons | Verdict |
|---|---|---|---|
| **Pure free, 50 drawn from N registrants** | Maximum virality, no payment friction | All upside to engaged community, no funding for prize pot | ❌ pot stays at 0 WLD |
| **Pure paid, 50 pay 1 WLD each** | Simple, predictable pot (50 WLD) | Excludes the Global South / non-WLD users | ❌ contradicts "Celo community can participate" |
| **Hybrid 25 paid + 25 lottery** | Guaranteed pot floor (25 WLD), free participation for the rest, no exclusion | Slightly more complex; need a lottery draw at launch | ✅ **recommended** |
| **Pay-what-you-want ≥ 0** | Maximum flexibility | Race-to-the-bottom; UI is hard to communicate | ❌ skip for cohort 1 |

### How the lottery draw works

The draw is the launch event itself. At `GAME_LAUNCH_AT`:

1. Count free-registered users (`paid = false` on the `users` table) up to that moment.
2. If count ≤ 25 → all of them are in. No draw needed.
3. If count > 25 → seeded random selection of 25.
   - Seed = `hash(GAME_LAUNCH_AT + "cohort-1-lottery")` so the draw is deterministic, verifiable, and reproducible.
   - Select 25 via Fisher-Yates with seeded RNG.
4. Free-registered users NOT selected are rolled to the cohort 2 waitlist with a "Cohort 2 priority" flag — no need to re-register.
5. Paid users always get a slot.

This means the "prelaunch" period has two funnels: "Reserve a guaranteed slot (1 WLD / 5 cUSD / 5 USDC)" and "Enter the free lottery". Both end at launch.

### Why this matches the existing infra

- `users.paid` already exists and gates gameplay.
- `users.referred_by` already exists.
- `referral_count` already drives social proof.
- The free-entry code path (`/api/pay/free-entry`) already works.
- The paid-entry code path (`/api/pay/browser-confirm`, `/api/pay/browser-celo-confirm`, MiniKit `pay`) already works.
- Supabase RPCs (`increment_referral`, etc.) already exist.

The only new server work is the lottery draw — one endpoint, one SQL function, called once at launch.

## Implementation plan

### Phase 0 — Bug fixes (do first, before model changes)

**0.1** Add to local `.env` (and `.env.example` already has them):
```
VITE_FREE_ENTRY_MODE=true
FREE_ENTRY_MODE=true
```
Rebuild + redeploy. Confirms the WLD copy disappears and the FREE ENTRY branch is shown.

**0.2** Add a one-off admin action (or SQL script) to clear stale cohort data:
```sql
DELETE FROM users
WHERE paid = true
  AND eliminated = true
  AND reserved_at < now() - interval '30 days';
```
Document in `docs/LAUNCH_RESET.md`. Run before launch tomorrow.

**0.3** Extend `/api/stats` to expose the Celo pot. Mirror the existing WLD fetch:
```js
// server/lib/celoBalance.js
async function fetchCeloBalance(address) {
  // eth_getBalance on Celo RPC; the prize pool is a plain account
  // that holds cUSD/USDC, so we also need ERC20 balanceOf for cUSD
  // and USDC. For now expose the native CELO balance as the "Celo
  // pot" and add stable balances in a follow-up if needed.
}
```
Add `prizePool: { wld: {…}, celo: {…} }` to the response. Keep `balanceWld` as an alias for backward compat. Update client to render both pots.

### Phase 1 — Model implementation

**1.1 Server: paid-vs-lottery bookkeeping**

Add two columns to `users` (or use `paid` + a new `entry_kind`):
- `entry_kind` enum: `'paid' | 'free'` — set when the user reserves.
- Existing `paid` stays as the gate (so existing code paths keep working).

The free-entry path sets `paid=true, entry_kind='free'`. The paid paths set `paid=true, entry_kind='paid'`. This way the gameplay gate doesn't change but the cohort accounting can split.

**1.2 Server: `/api/cohort/roster` exposes the split**

Augment the roster response:
```json
{
  "ok": true,
  "roster": [...],
  "split": {
    "paidCount": 3,
    "freeCount": 12,
    "paidSlots": 25,
    "freeSlots": 25
  }
}
```

The client uses `split.paidCount / split.paidSlots` and `split.freeCount / split.freeSlots` for two progress bars.

**1.3 Server: `/api/lottery` endpoint (read-only at first)**

```http
GET /api/lottery/status
→ {
  "ok": true,
  "drawAt": "2026-06-17T18:00:00Z",
  "status": "pending" | "drawn" | "closed",
  "freeRegistered": 12,
  "freeSlots": 25,
  "drawn": null | [{address, username}, ...]
}
```

Drawn at launch via a server-side cron or a `if (now >= drawAt && !drawn) draw()` lazy check on first request after launch. Idempotent.

**1.4 Client: cohort card shows two bars**

Replace the single "5 of 50" with:
```
PAID RESERVED  ▓▓▓░░░░░░░  3 / 25
FREE LOTTERY   ▓▓▓▓▓▓░░░░  12 / 25
```

Reserve copy becomes unambiguous:
- "RESERVE A SLOT" (paid) — 1 WLD / 5 cUSD / 5 USDC, guaranteed entry
- "ENTER FREE LOTTERY" (free) — drawn at launch, 25 slots, no payment

**1.5 Client: BrowserWalletPay shows the token selector before connect**

The current UX is "connect a wallet first, then pick a token". That hides Celo. Refactor to:
1. Show all three token options (WLD, cUSD, USDC) as a tab strip.
2. Show "Connect wallet to continue" with the wallet picker below.
3. After connect, the selected tab drives which chain / token the payment uses.

Same fix for the World App path: add a token selector above the `payEntryFee` button (currently the World App path is WLD-only, but the user can choose to pay in cUSD via Celo if the WLD world app supports it — research needed before shipping).

**1.6 Client: prelaunch card surfaces both pots**

The `PrelaunchPanel` gets a two-pots row:
```
🏆 5 WLD  ·  0 cUSD
   World Chain  ·  Celo
```
With explorer links for each. Celo starts at 0 until we add a Celo payment path to the World App flow (or a web fallback that uses the Celo wallet).

### Phase 2 — Messaging

**2.1** Single source of truth for "how to play" copy. Add `src/lib/copy.js` with named strings:
```js
export const COPY = {
  entry: {
    freeMode: "Launch campaign — free to play. 25 guaranteed + 25 lottery spots.",
    paidMode: "1 WLD · 25 guaranteed slots. Pay to skip the lottery.",
  },
  rules: [
    "Reserve a slot — 1 WLD or 5 cUSD guarantees your entry.",
    "Or enter free — 25 lottery spots drawn at launch.",
    "All paid fees go to the prize pot.",
    "Cohort cap is 50 humans, worldwide.",
  ],
};
```
Replace all 5+ inline copies in Onboarding / GameHome / PrelaunchPanel with references to these.

**2.2** FAQ updated. The "Do I need crypto to play?" answer becomes:
> "No — you can enter the free lottery. But paying 1 WLD or 5 cUSD guarantees your slot and grows the prize pot."

### Phase 3 — Launch ops

**3.1** Cron (or lazy check) that calls the lottery draw at `GAME_LAUNCH_AT`. Either:
- An external cron calling `POST /api/lottery/draw` (with admin auth), or
- Lazy: any request to `/api/game/state` after `drawAt` triggers the draw if not already done.

**3.2** `docs/LAUNCH_RUNBOOK.md` with the exact steps for tomorrow 14:00 UTC:
1. Confirm `/api/game/state` returns `phase: "live"`.
2. Trigger the lottery draw (or confirm it ran lazy).
3. Verify cohort roster has 25 paid + 25 free = 50.
4. Send the "Day 1" push notification.
5. Smoke-test check-in for a real user.

## File touch list

| File | Why |
|---|---|
| `.env` | Add `VITE_FREE_ENTRY_MODE=true` (Phase 0) |
| `src/lib/env.js` | No change — already reads the right key |
| `server/index.js` | `/api/stats` exposes Celo pot; `/api/cohort/roster` adds `split`; new `/api/lottery/status` endpoint; lazy draw logic; new `entry_kind` plumbing |
| `supabase/migrations/…` | Add `entry_kind` column, add `lottery_results` table |
| `src/components/prelaunch/PrelaunchPanel.jsx` | Two-bar cohort card, two-pots row |
| `src/components/prelaunch/CohortProgress.jsx` | Optional: take a `label` prop so the card can show "PAID" vs "FREE" |
| `src/components/Onboarding.jsx` | Step 2 wording, step 0 rules copy |
| `src/wallet/BrowserWalletPay.jsx` | Token selector visible pre-connect |
| `src/lib/copy.js` | New file — single source of truth for the "how to play" copy |
| `docs/LAUNCH_RUNBOOK.md` | New — Phase 3 runbook |
| `docs/LAUNCH_RESET.md` | New — Phase 0.2 SQL to clear stale data |

## Open questions

1. **Celo on World App** — does MiniKit's `pay` support Celo chains? If not, World App users who want to pay in cUSD need to leave the app, which is a worse funnel. For cohort 1 we may need to restrict World App to WLD-paid and route all Celo payments through the browser path. This needs research.
2. **Referral reward on the lottery** — should free-referred users get priority in the lottery draw? (E.g., sort the candidate list by `referral_count` desc before the draw, so top referrers win the first picks.) It's a nice incentive loop but it changes the fairness model.
3. **Cohort 2 waitlist UX** — when a free user is not selected, what do they see? A "Cohort 2 priority" badge on their profile, a push notification, an email? Need at least one of these or the rejection is silent and demoralising.
4. **Refund policy** — if the cohort doesn't fill, do paid users get refunded? Out of scope for the model but worth a one-liner in the FAQ.
