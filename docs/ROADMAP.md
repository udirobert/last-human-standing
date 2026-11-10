# Roadmap — priorities and progress

Source: the 2026-08-02 launch review + everything executed since. Ordered by
dependency, not wishful thinking. Each phase lists its exit gate.

## Phase 0 — Launch containment ✅ DONE 2026-08-02

Code: containment flags, verified-human gates, Celo fixes, payout hardening,
route-leak fix, verdict-threshold unification, roster freeze. DB: migrations
030/031/032 applied to prod. Rollout: launch postponed 2026-08-03 → **2026-08-24
18:00 UTC** (Cohort 1 test pilot); Cohort 2 **2026-09-13 18:00 UTC** (ETHOnline).

## Phase 1 — Cohort 1: closed verified-human pilot 🔄 IN PROGRESS

Spec: `docs/COHORT1.md`. Optional but recommended extension:
`docs/COHORT1.md` (operator-run agents, prize-ineligible).

- [x] Confirm final launch date — **2026-08-24 18:00 UTC** (Cohort 2: 2026-09-13)
- [ ] Recruit 8–25 players: World ID/Self verified, reachable, schedule-confirmed
- [x] (If agent exhibition) build the deltas listed in the exhibition doc — **DONE 2026-08-02: migration 033 applied to prod (human-only winner math); 4 agents (aria_fieldnotes, blot.exe, claude_ennui, duct_tape) seeded and driven through REAL prod SIWE auth; runner `lhs-exhibition-agents` on pm2 `*/10` cron with deterministic 5–45 min jitter; feed reveals (closed days only, fail-hidden) + day-close caught-count push + `agent-detection-metrics.mjs` shipped**
- [~] Curate exhibition photos: `shared/exhibition-photos/day<N>/<username>.jpg`
      on the prod host before each day opens (operator job; missing photo = the
      machine misses the day, which is published drama). **Day 1 DONE 2026-08-02**
      (fal.ai, per-persona difficulty: blot.exe's malformed cup is the easy catch);
      generator: `node scripts/generate-exhibition-photos.mjs --day N`. Days 2–5 pending.
- [ ] T-24h: snapshot DB + prize wallets; dry run verify → entry → check-in →
      vote → close-day → manual test payout on both networks; verify push
      delivery to every participant; document stop conditions
- [ ] T-0: set `ENTRY_CLOSED=true`, publish caps/windows + rules,
      `pm2 restart last-human-standing --update-env`
- [ ] Post-game: 48h appeal window → manual two-chain settlement → publish
      both tx hashes → write `docs/ops/<date>-cohort1-retro.md`

Exit gate: hypotheses answered — do people complete daily proofs? is auditing
fun? do eliminated players return? does the reveal generate conversation?
is the global window workable? PLUS (if exhibition): first real
agent-detection precision/recall data.

## Phase 2 — Correct agent claims and schemas (S)

- [ ] `entry_kind` / `entry_token` constraints admit agent rows
      (`004_hybrid_cohort.sql` blocks `agent`/`x402` today)
- [ ] Separate agent admission persistence from human admission
      (`candidate → admitted → active → eliminated | waitlisted`; stop
      overloading `paid`)
- [ ] Remove "premium indistinguishable" pay-to-evade tiers permanently
- [ ] Public wording everywhere: "feature-flagged experimental agent API and
      onchain-voting foundation" until Phase 3–4 land

## Phase 3 — Real x402 settlement (L)

Canonical `PAYMENT-REQUIRED` → signed `PAYMENT-SIGNATURE` → verify
payer/network/asset/amount/recipient/window/replay → settle locally or via
facilitator → `PAYMENT-RESPONSE` + receipt. Persist unique
network/tx/payment id. Prerequisite for any paid agent.

## Phase 4 — Real ERC-8004 identity (M/L)

Onchain Identity Registry registration producing `agentId` + `Registered`
event; publish chain id, registry, agentId, owner, tx, resolvable agentURI.
Reputation claims only after independent onchain feedback exists.

## Phase 5 — Autonomous agent exhibition cohort (L/XL)

Agents independently discover rounds, pay, generate, sign, submit in-window.
Identical media constraints; one equal agent tier (no pay-to-win quality
tiers). Labels revealed after settlement → genuine ground truth.

## Phase 6 — Mixed prize competition (XL)

Separate human/agent eligibility + prize pools; auditable escrow/multisig
custody; idempotent, receipt-confirmed payout; settle whether an agent can
legally/operationally receive a prize BEFORE advertising it.

## Phase 7 — Token Rounds v3 foundation ✅ DONE 2026-10-01

Spec: `docs/TOKEN_ROUNDS.md`. Parallel track replacing the Riddle Rounds loop,
behind `GAME_V3_ENABLED=false`. Cohort 1's exit gate answered the question that
matters: players did not show up IRL. That was a disinvestment bug — the game
announced you would be ejected in 24h — so v3 makes the primary resource a
token whose transfer *requires* physical co-presence, with an always-on
regional market as the demand side.

- [x] Migrations 044–047: regions/sprints/flashes, crews, handshakes/tokens/
      transfers, credit ledger/market/standings — 12 tables, all apply clean on
      a live Postgres 14 scratch cluster, RLS on with no policies
- [x] Enforce co-presence in the DATABASE, not just the route: a plain FK only
      proves a handshake row exists, so `trg_transfer_requires_attestation`
      rejects any transfer whose handshake is not `attested` or does not bind
      both parties (verified live)
- [x] Pure libs: `coPresence.js` (attestation), `market.js` (escrow/expiry),
      `creditLedger.js` (closed economy), `seasonScore.js` (standings/crews)
- [x] Routes under `/api/v3`: `regions.js`, `crews.js`, `cocircle.js`,
      `market.js` — DI-factories, self-gating, cannot shadow v2 paths
- [x] 119 new tests: pure-logic coverage plus route gating (404 before auth
      with the flag off); zero regressions

Exit gate: **met** — migrations apply clean; 119 tests pass; v2 unchanged with
the flag off; zero new lint errors. (The 68 failing `.jsx` tests are
pre-existing — React 19 removed `React.act` — and fail identically on a clean
tree.)

### Phase 8 — v3 playable vertical (L)

Not started. Deliberately excluded from Phase 7.

- [ ] Seed regions + founder crews per region (operator work — budget for it)
- [ ] Seed system sell-side market orders per region (liquidity cold start)
- [ ] Sprint lifecycle: schedule, brief, field, settlement RPC
- [ ] Sprint settlement: score → standings → crew contribution → payouts
- [ ] UI: desktop war room + mobile field, /api/v3 clients
- [ ] Sonar escalation for high-value transfers (TOKEN_ROUNDS.md §4.1)
- [ ] Decide: does v3 replace v2 or run beside it? (A parallel game doubles
      the operator surface)

## Deferred correctness work (schedule before Cohort 2 paid)

- Admission state machine (`candidate|admitted|waitlisted|eliminated`) — L
- Escrow-based custody + idempotent, receipt-confirmed payout — L
- Fair access model: valid-proof window + selection among completed proofs
  instead of raw first-N HTTP latency (or recruit around one synchronized
  window; never claim a global HTTP race is geographically fair) — M
- Accuracy incentives: score against independent ground truth (agent labels
  from the exhibition give this), not crowd agreement — M
- Frontend: unify the three backdrop systems under one root presentation
  mode (`landing|practice|game|ceremony`); fix right-edge artifact, status
  clipping, countdown contrast, emoji/painted-icon inconsistency — M
- Investigate the 4 test timeouts from the review run (lottery API init,
  World ID forwarding, chat) — S/M
- Address-casing normalization in `users` (duplicate rows exist) — S

---

## Historical: closed beta checklist (superseded)

**Target**: 25-person closed beta on Celo (cUSD/USDC entry)

---

## Pre-Launch Checklist

### Infrastructure
- [x] Deploy Celo prize pool wallet (personal EOA is fine for beta)
- [x] Set `VITE_CELO_PRIZE_POOL_ADDRESS` in production `.env`
- [ ] Set `COHORT_SIZE=25` in production `.env` — run `bash scripts/relaunch-prep.sh --update-env`
- [ ] Set `GAME_LAUNCH_AT` to beta start date — **2026-08-03T18:00:00Z**
- [x] Set `DAILY_SURVIVAL_CAP` — now automatic via `survival_cap_for_day()` (40→20→8→3→1)
- [x] Verify Supabase project is running and schema is applied
- [x] Verify storage bucket (`checkins`) exists
- [x] Set `ADMIN_TOKEN` to a strong random value
- [x] Generate and set VAPID keys for push notifications

### Celo Payment Flow
- [ ] Test cUSD payment on Celo Alfajores testnet first (`VITE_USE_CELO_TESTNET=true`)
- [ ] Verify `POST /api/pay/browser-celo-confirm` returns session cookie
- [ ] Verify authenticated endpoints work after Celo payment (`GET /api/me`)
- [ ] Test check-in flow after Celo payment
- [ ] Test voting flow after Celo payment

### Game Operations
- [x] Create Day 1 round via admin API before launch — **all 5 rounds pre-created** (migration 010)
- [x] Prepare 3-5 round themes in advance — Café, Park, Friend, Bookstore, Sunrise
- [ ] Test admin close-day flow
- [ ] Test auto-round scheduler (`advance_rounds` RPC)
- [x] Verify push notifications fire on round open/close
- [x] **Wildcard revival** — jury votes one eliminated player back on Day 4
- [x] **Streak bonuses** — 3-day streak = +1 jury ticket, 5-day = +3
- [x] **Automatic winner payout** — `ariaBroadcastPayoutTx()` on winner detection
- [x] **End-game tiebreaker** — `resolve_no_survivors()` if everyone eliminated

### User Experience
- [ ] Test onboarding flow end-to-end on mobile (MetaMask + Celo)
- [ ] Test "Explore demo" path for observers
- [ ] Verify feed loads submissions with photos
- [ ] Verify leaderboard shows correct standings
- [ ] Test error recovery (network drops, wallet failures)

---

## Beta Launch Steps

1. **T-0 prep**: Set `GAME_LAUNCH_AT` (`2026-08-03T18:00:00Z`), apply migration 029, run `relaunch-prep.sh --update-env`
2. **T-1 day**: Seed the prize pool with cUSD/WLD, run reset SQL, smoke-test
3. **T-0**: Share beta URL with 25 testers (Celo community + WLD team)
4. **Day 1 opens**: Auto-scheduler opens the round at `opens_at`; cap = 40 (soft first cut)
5. **Day 1 closes**: `advance_rounds()` calls `close_day()` — verdicts, DQ-and-replace, streak bonuses, eliminations
6. **Day 2–3**: Cap decays to 20, then 8. Themes escalate (Park, Friend)
7. **Day 4**: Cap = 3. After close, wildcard revival triggers — jury votes one player back
8. **Day 5**: Cap = 1. Last survivor wins. Automatic payout via `ariaBroadcastPayoutTx()`
9. **Post-game**: Winner ceremony with payout status + Celoscan link. Share result.

---

## Admin Commands Reference

```bash
# Create a round
curl -X POST https://YOUR_DOMAIN/api/admin/round \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "day": 1,
    "name": "AT A CAFE",
    "place_type": "cafe",
    "survival_cap": 12,
    "opens_at": "2026-06-06T14:00:00Z",
    "closes_at": "2026-06-06T18:00:00Z",
    "prompt": "Show us your cafe — anywhere in the world"
  }'

# Close a day
curl -X POST https://YOUR_DOMAIN/api/admin/close-day \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"day": 1}'

# Check game state
curl https://YOUR_DOMAIN/api/game/state

# Manually trigger round advancement
curl -X POST https://YOUR_DOMAIN/api/admin/trigger-rounds \
  -H "x-admin-token: $ADMIN_TOKEN"
```

---

## Known Limitations (acceptable for beta)

- Polling at 15s intervals (no SSE/WebSocket yet) — fine for 25 users
- No on-chain prize distribution (manual transfer to winner)
- ~~Single cohort only (no multi-cohort support)~~ — resolved: `cohort_participations` table (migration 026) scopes per-cohort state
- Browser PoH is optional (World ID / Self Protocol not required for Celo beta)
- ~~No spectator mode~~ — resolved: `SpectatorPanel` explains audit/vote/chat role + jury ticket earning for non-players

---

## Post-Beta Priorities

After the beta validates the core loop, prioritize:
1. **Replace polling with SSE** for real-time vote/leaderboard updates
2. **On-chain prize distribution** (automate winner payout)
3. **Demo mode improvements** (let observers watch live rounds)
4. **Vote quorum tooltips** (explain dynamic thresholds to users)
5. **Bundle optimization** (audit dependencies, tree-shake unused code)
6. **Activate Turing-test arena** — ~~foundation shipped~~ fully shipped: x402 agent self-registration (`POST /api/agents/register`), submission pipeline (`POST /api/agents/submit`), end-game reveal UI (`AgentReveal.jsx`), per-voter jury stats (`GET /api/agents/jury-stats`). Flip `AGENTS_ENABLED=true` + `SILENT_VERIFICATION=true` when ready. Migration 026 required for multi-cohort scoping.

See [ROADMAP.md](./ROADMAP.md#growth-backlog) for longer-term strategy.

---

## Growth backlog

These features are planned for **after** the closed beta validates the core game loop.
Do not build these until we have data from 25+ real users playing through at least one full cohort.

---

## Phase 1: Post-Beta Polish (1-2 months after beta)

### Real-time updates
- Replace 15s polling with Server-Sent Events (SSE) for live vote counts, leaderboard changes, and round transitions
- `src/hooks/usePolling.js` can be retired once SSE is live

### Demo mode
- Let observers watch live rounds without paying
- Spectator-only feed with delayed submission reveals
- "Join next round" CTA for spectators

### UX improvements
- Vote quorum tooltips (explain dynamic thresholds)
- Trust tier badges on submission cards (verified vs provisional)
- Leaderboard elimination reasons (too slow vs flagged by community)
- Loading skeletons for async screens

### Bundle optimization
- Audit dependency tree (framer-motion, wagmi, viem are the heaviest)
- Tree-shake unused World ID code for Celo-only deployments
- Add CDN configuration for static assets (Vercel or Cloudflare)

---

## Phase 2: Growth Mechanics (3-6 months, after PMF signal)

### Monetization
- **Cosmetic marketplace**: avatar frames, submission borders, chat effects — purchasable with WLD/cUSD
- **Premium tier**: 5 WLD entry for bonus features (double infiltration attempts, custom badges)
- **Sponsored rounds**: brands sponsor daily themes (e.g., "AT A NIKE STORE") with boosted prize pools
- **"Humanity Plus" subscription**: monthly recurring for free entries + exclusive cosmetics
- **Commitment stakes (side-pot)**: see [Commitment Stakes](#commitment-stakes-side-pot) below

### Commitment stakes (side-pot)

An opt-in side-pot where active players stake a small amount on their own
survival. Eliminated stakes flow to the winner, growing the headline prize.

**Why not a prediction market on other players:**
The audit layer is crowd-sourced. If spectators or players can bet on *who*
survives, they gain a financial incentive to corrupt the audit — downvoting
competitors, coordinating smear campaigns in chat, or socially pressuring
rivals to drop out. A prediction market on survival in a game where survival
is determined by crowd vote is a conflict-of-interest factory. We don't
build it.

**Why a self-stake works:**
- It's a commitment device, not a bet. "I'm so sure I'll survive, I'm putting
  $1 in." Skin in the game strengthens daily engagement.
- It grows the pot for everyone, making the headline prize bigger.
- It doesn't create a corruption incentive — you can't bet on anyone else,
  and your own survival is the only thing that pays out.

**Round 2 design (proposed):**
1. **Framing:** "Commitment stake," not "bet." You're staking confidence.
2. **Cap:** $1 worth of WLD or cUSD for the first iteration. Low enough that
   cheating isn't worth it, high enough to be a meaningful signal.
3. **Eligibility:** Only reserved and checked-in players can stake. No
   spectator participation.
4. **Settlement:** Eliminated stakes go to the winner, not back to the pool.
   The winner gets the main pot + all commitment stakes from eliminated
   players. Players who survive but don't win get their stake back.
5. **Display:** Separate line item from the main pot.
   "Main pot: $420 · Commitment stakes: $31 (31 players in)."
6. **DQ handling:** A player disqualified for cheating forfeits their stake
   to the winner. This aligns the stake with honest play.
7. **Round 2 tracking:** Database-tracked, settled manually at game end.
   On-chain settlement (smart contract with claim/refund logic) is a Phase 3
   item if the mechanic proves engaging.

**What we're testing in Round 2:**
- Does the side-pot increase daily show-up rate?
- Does it increase emotional investment / share rate?
- Does it create any audit corruption we can detect?
- Is $1 the right cap, or should it scale with the main pot?

### Viral mechanics
- **Referral visualizations**: show invitation network trees
- **Streak rewards**: bonus cosmetics for consecutive daily check-ins
- **Shareable moment cards** ✅: canvas PNG cards for survive / jury / win (`src/lib/momentCard.js` + `shareMoment.js`). Native share prefers the image file; `/api/share/winner` + improved check-in OG for link unfurls.
- **Shareable highlight reels**: auto-generate clips of best check-ins for social sharing (after moment cards)

### Farcaster Snaps (post-launch, week 2+)
- Add a snap handler behind content negotiation on the share URL (HTML for browsers, snap JSON for the Farcaster client)
- Snap UI: `item` for check-in header, `bar_chart` for live vote tallies, `toggle_group` for HUMAN/SUS, `button` with `submit` to a new `/api/snap/vote` endpoint
- Gate behind a feature flag and a client-version check; re-evaluate when the beta spec graduates
- See [FARCASTER.md](./FARCASTER.md#future-farcaster-snaps-post-launch-week-2) for the full plan and rationale

### Retention
- **Achievement system**: badges for diverse locations, voting accuracy, infiltration mastery
- **Seasonal progression**: 3-month cycles with battle pass (free + premium tracks)
- **Guild/clan system**: team-based competition within cohorts
- **Spectator mode**: live watch parties with chat for non-participants

---

## Phase 3: Scale (6-12 months, only if growth warrants)

- Multi-cohort support (parallel games with separate prize pools)
- Tournament modes (weekly high-stakes events, 5-10 WLD entry)
- Regional variants (different themes by geography)
- Data insights product (anonymized, aggregated movement/voting patterns)
- Advanced anti-cheat (EXIF deduplication, velocity spoof detection)
- On-chain prize distribution automation (multi-sig or smart contract)

---

## Metrics to Track (post-beta)

| Category | Metric |
|----------|--------|
| Acquisition | Referral conversion rate, organic social shares |
| Engagement | DAU/WAU, submission completion rate, voting participation |
| Retention | Day 1/7/30 retention, return after elimination |
| Monetization | ARPU, conversion to premium, marketplace volume |

---

## Growth backlog (cont.): the Turing Test arena

### Foundation (shipping now — flagged off)
Migration `021_agent_participation.sql` + server seat math are live:

| Piece | Status |
|---|---|
| `users.is_agent`, `agent_tier`, `verified_human`, `agent_entries`, `game_config` | ✅ schema |
| Seat reservation (20–30%, hard-cap 35%) via `server/lib/agents.js` | ✅ |
| `AGENTS_ENABLED` / `SILENT_VERIFICATION` / `MAX_AGENT_RATIO` env flags | ✅ (default off) |
| `GET /api/game/state` → `agents`, `silentVerification`, end-game `breakdown` | ✅ |
| `POST/GET /api/admin/agents` (prep seats before public flip) | ✅ |
| ModeBanner hides PoH labels when `SILENT_VERIFICATION=true` | ✅ |
| Public x402 agent entry + submission pipeline | ✅ shipped |
| End-game reveal UI (viral "THAT was an AI?!" moment) | ✅ shipped |
| Per-voter accuracy vs agents (`juryStats`) | ✅ shipped |

**Activate when ready:**
```bash
AGENTS_ENABLED=true
SILENT_VERIFICATION=true
MAX_AGENT_RATIO=0.25
MIN_AGENT_COUNT=5
```

### Hidden Verification
With `SILENT_VERIFICATION=true`, World ID / Self badges stay out of gameplay UI. Verification still runs in the background. At the end, reveal aggregate stats from `breakdown`:
- "12 verified humans made it to Day 5"
- "8 AI agents made it to Day 5"
- "5 unverified humans made it to Day 5"

### Agent Participation
**Agents compete alongside humans.** AI agents pay an x402 fee per entry (added to the prize pot). Admin can seed seats via `POST /api/admin/agents` even before the public flag flips.

**Agent cap: 20–30% of cohort.** Too few agents (5%) = instantly flagged. Too many (50%+) = chaotic. Hard-capped at 35% so humans stay the majority.

**Agent quality tiers:**
- **Basic ($1/entry):** Text-only description, system generates stylized placeholder
- **Standard ($3/entry):** Image generation with visible "AI-generated" watermark
- **Premium ($5/entry):** Full quality, no watermark — designed to be indistinguishable

**Still to build for full activation:**
- ~~Public x402 payment flow for agent self-registration~~ ✅ `POST /api/agents/register`
- ~~Agent submission pipeline (photo / image-gen by tier)~~ ✅ `POST /api/agents/submit`
- ~~End-game reveal component + per-voter agent-ID accuracy~~ ✅ `AgentReveal.jsx` + `GET /api/agents/jury-stats`
- Onboarding copy that discloses agents exist without naming who

**The "unverified" question:** Humans who don't verify via World ID are treated as "unverified survivors" — the crowd has to decide: are they a human who just didn't bother with World ID, or an agent who can't verify? This adds to the mystery.

### Long-term Vision
The game becomes a **Turing test arena**:
- Humans try to prove they're human by submitting authentic photos
- Agents try to prove they're human by submitting convincing AI-generated content
- The crowd votes. The last human (or the last agent) wins.

This is the ultimate realization of the game's theme. It's not just "survive 5 days" — it's "prove you're human in a world full of imposters."

**Memetic potential:**
- "I fooled everyone for 3 days!" (agent bragging)
- "That was definitely an AI, look at the lighting" (crowd deduction)
- "Wait, THAT was an AI?!" (viral reveal moments)

**Emergent gameplay:**
- Social deduction layer (already present in voting)
- Metagame strategy ("do I vote SUS on the 'too perfect' submission?")
- Agents learn to avoid tells (consistent lighting, realistic shadows, natural poses)

**Risks to mitigate:**
- Agent quality must be high enough that they don't get instantly flagged. Poor agents ruin the experience.
- Need clear disclosure that agents exist (but not which submissions are theirs). The uncertainty is the game.
- x402 integration must be seamless. If agents struggle to pay, they won't participate.
- Balance agent ratio carefully. 20–30% is the target; monitor and adjust per cohort.

## Principles

1. **Validate before building** — every feature above needs user data justifying it
2. **Fairness first** — paying advantages must never break core game integrity
3. **Web3 native** — leverage blockchain transparency for trust, not just payments
4. **Community first** — monetize enhancement, not core gameplay
5. **Uncertainty is the game** — the mystery of who's human and who's AI is what makes it compelling
