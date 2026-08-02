# Roadmap — priorities and progress

Source: the 2026-08-02 launch review + everything executed since. Ordered by
dependency, not wishful thinking. Each phase lists its exit gate.

## Phase 0 — Launch containment ✅ DONE 2026-08-02

Code: containment flags, verified-human gates, Celo fixes, payout hardening,
route-leak fix, verdict-threshold unification, roster freeze. DB: migrations
030/031/032 applied to prod. Rollout: launch postponed 2026-08-03 → **2026-08-10
18:00 UTC** (provisional), rounds shifted, release `20260802-120644` deployed
and verified live. Record: `docs/ops/2026-08-02-pilot-containment-log.md`.

## Phase 1 — Cohort 1: closed verified-human pilot 🔄 IN PROGRESS

Spec: `docs/COHORT1_PILOT.md`. Optional but recommended extension:
`docs/COHORT1_AGENT_EXHIBITION.md` (operator-run agents, prize-ineligible).

- [ ] Confirm final launch date (Aug 10 18:00Z is provisional)
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
