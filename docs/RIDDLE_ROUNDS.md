# Riddle Rounds — game design v2

Status: **implemented and deployed for the Sep 1 retry** (migrations
039–042, release 20260828-063102). §5.1 scope is live; §5.2 (full scoring
engine) is Cohort 2 scope.
Decided 2026-08-27 after player feedback that the game is "a little
simplistic" and unfair across time zones.

This document is the source of truth for the redesign. It supersedes the
literal-theme, first-come survival model for all cohorts from Sep 1 onward.

---

## 1. The two complaints, one root cause

**Timezone unfairness is structural.** Rounds open 18:00 UTC and survival is
first-N-by-check-in-timestamp (`too_slow` elimination). For UTC+9 players the
window opens at 03:00 local; the cap fills while half the world sleeps.
Elimination is effectively a longitude lottery. No UI change fixes this —
the **speed axis must go**.

**Simplicity is a skill-ceiling problem.** Today's daily decision space is:
be awake → be fast → go to a literal place type. One low-dimensional action,
no interpretation, no strategy. The vote is binary policing (sus/not-sus),
the least engaging form of judgment.

Both trace to one root: **the theme is a literal instruction, and survival is
a race.** Riddle Rounds fixes both at once.

---

## 2. The core loop

```
T+0h    THE ASKING      ARIA posts a riddle + commits a hidden resolution spec
T+0..18 THE HUNT        18-hour window: photo + one-sentence caption ("my answer because…")
T+18h   THE REVEAL      ARIA reveals the resolution spec it committed at T+0
T+18..24 THE RECKONING  Players vote on each other's answers against the revealed spec
T+24h   CLOSE           Survival decided by score (or, pre-scoring, by seed lottery)
```

### 2.1 The Asking — riddles, not place types

ARIA writes an **interpretive riddle**, not a literal instruction:

| Old (literal) | New (riddle) |
|---|---|
| AT A CAFÉ | "Find the place where strangers become regulars. Bring proof." |
| AT A PARK | "Somewhere the city forgets to pave. Show me green." |
| WITH A FRIEND | "Proof you are loved by at least one other human." |

At ask-time ARIA **also generates a hidden resolution spec** alongside the
riddle:

```jsonc
{
  "riddle": "Find the place where strangers become regulars. Bring proof.",
  "spec": {
    "literal_categories": ["cafe", "bar", "diner", "barbershop", "gym"],
    "required_elements": ["another human in frame OR a named regular"],
    "interpretive_axes": ["familiarity", "repetition", "belonging"],
    "hard_rejects": ["stock photo", "screenshot", "AI-generated", "no person/context"]
  },
  "spec_hash": "0x…",          // committed BEFORE any submission exists
  "committed_at": "…"
}
```

**The spec is hashed and committed before the first submission.** This is the
"deterministically resolved" guarantee: the criteria are fixed before the
answers, so nobody — not the agent, not the operator — can move the goalposts
after seeing what players sent. It is commit-reveal applied to *judging
itself*, reusing the commit-reveal infrastructure already built for votes.

### 2.2 The Hunt — 18-hour window

- Photo + a **one-sentence caption** arguing the fit. The caption turns the
  submission from proof-of-presence into an *argument* — interpretation
  becomes a skill.
- **18 hours is the timezone fix.** Sleep ≈ 8h, waking ≈ 16h, so any 18-hour
  window overlaps every player's waking hours by **≥ 10 hours regardless of
  timezone**. No timezone can be fully locked out. Keep the 18:00 UTC anchor
  for the shared-event feel; the long window does the equity work.

### 2.3 The Reveal — at close, before voting

The committed spec is revealed **at T+18h, before the vote opens** — not
earlier, not later.

- Not earlier: revealing before close collapses interpretation (everyone
  submits the literal answer).
- Not later: voters must judge against the *real* criteria, or the vote is
  blind and the reveal is a post-mortem nobody acted on.

The reveal is a designed moment: *"here's what ARIA was actually looking for
— now judge each other."*

### 2.4 The Reckoning — survival formula (Cohort 2+)

```
survival_score = w1 · spec_match + w2 · peer_conviction     (gated by authenticity)
```

- **ARIA vision pass** → `spec_match` (does the photo satisfy the committed
  spec?) + a **hard authenticity gate** (real photo vs screenshot/stock/AI),
  each with a one-line published rationale.
- **Crowd vote** → `peer_conviction`, restructured as **conviction marks**:
  each voter gets 3 marks to allocate to the submissions they think best
  *answered* the riddle. Voting becomes curation, not policing — more fun,
  and bloc-gaming gets expensive because each member has limited marks.
- Top N by score survive (existing caps 25 → 12 → 6 → 3 → 1 stay).
- **Ties break by the committed cohort seed** — a deterministic, auditable
  lottery that is not speed.

---

## 3. The vision model is a verifier + scorer, never the judge

**Decision (locked): the model verifies and scores against the pre-committed
spec; humans judge interpretation.**

1. **LLM-as-judge is non-deterministic** — same image, different run,
   different score. That is the opposite of "deterministically resolved."
   Scoring against a *pre-committed spec* is what makes it defensible.
2. **It is gameable** — once players learn what the model likes, they
   optimize the model instead of the riddle.
3. **It breaks the premise.** The game is *Last Human Standing*. If an AI
   decides who stays, the theme collapses. Humans judge interpretation; the
   model handles what it is actually good at (authenticity, element-matching,
   scale). `server/lib/ariaAgent.js#ariaVerifyPhoto` is already shaped for
   this role (currently a heuristic placeholder).

---

## 4. Crypto incentives (ranked)

Current winner-take-all pot (5 WLD + 35 cUSD across 25 players) gives most
players ~zero economic reason to engage. Ranked options:

1. **Voting accuracy bounty (jury pool)** — *build first.* Eliminated jurors
   already get 2× weight for accuracy; `close_day` already awards jury
   tickets to correct voters. Extend it: jurors whose votes match the final
   consensus split a jury pool. Prediction-market logic — *pay people to be
   right* and you buy the engagement the design depends on, without a
   separate engagement mechanic. **No new on-chain automation needed** — the
   pilot already settles payouts manually, so the pool is operator-settled.
2. **Soulbound proof-of-survival** (cheap, strong retention). Surviving a
   cohort mints a non-transferable token on World Chain. "Verified survivor"
   becomes a cross-cohort reputation asset — compounding reason to return.
3. **Entry-fee pot with rake** (when paid entry returns). 1 WLD in → pot,
   operator rake funds ops + jury pool, remainder split winner + daily
   survivors. Converts winner-take-all into a skill-weighted distribution.
4. **Sponsored bounty riddles via x402** (the ETHOnline sponsor story).
   `ariaAgent.js` already has x402 + ERC-8004. A sponsor attaches a bounty to
   a riddle — "ARIA scores 90+ on interpretation wins X." Makes ARIA a
   genuine economic agent.

**For Sep 1: #1 (jury bounty). For Cohort 2: #1 + #2. #3 when paid entry
returns. #4 as the sponsor pitch.**

---

## 5. Scope split

### 5.1 Sep 1 retry — minimal (riddles + 18h window + seed lottery + jury bounty)

Fixes both *named* complaints with a fair tiebreaker; no scoring engine.

1. **Riddles replace literal themes.** ARIA writes the daily prompt; at
   ask-time it generates + commits (hashes) the hidden resolution spec.
   Mostly a content change + one table for the committed spec.
2. **18-hour check-in window** (opens 18:00 UTC, closes next day 12:00 UTC).
   The timezone fix.
3. **Non-speed overflow rule.** Everyone who checks in within the window is
   *eligible*. If eligible check-ins exceed the cap, survival is decided by a
   **deterministic cohort-seed lottery** among eligible check-ins (seeded from
   the already-committed cohort seed) instead of first-come. Kills the 3am
   race without the scoring engine; auditable.
   - Note: with a small retry roster (8–15 humans) the caps 25/12 rarely
     bind; overflow realistically first bites Day 3 (cap 6). The lottery is
     the safety net.
4. **Jury accuracy bounty.** Operator seeds a small jury pool; at cohort end
   it is split pro-rata by accumulated jury tickets (already tracked by
   `close_day`). Manual settlement, matching the pilot posture.

### 5.2 Cohort 2 (Sep 13) — full scoring engine

- **ARIA vision verifier + scorer** against the pre-committed spec
  (`spec_match` + hard authenticity gate, one-line rationale each).
- **Conviction-mark voting** (3 marks per voter) replacing binary sus/not-sus.
- **Survival formula** `w1·spec_match + w2·peer_conviction`, ties by cohort
  seed.
- **Soulbound proof-of-survival** token.

---

## 6. Risks (named honestly)

- **Riddle quality is the new single point of failure.** A bad riddle kills a
  day. Mitigation: generate the week's riddles ahead of time and human-review
  them before the cohort starts — generation assists, doesn't replace.
- **Score-gaming the public formula.** Acceptable — "answer well and convince
  humans" *is* the intended skill. Keep the authenticity gate hard and
  non-negotiable.
- **Vision-model cost at scale** is real; at 25 players it is nothing. Design
  the scoring pass to be cacheable/batchable.
- **Jury pool sybil risk.** Mitigated by the existing verified-human +
  commit-reveal vote requirements; the bounty rewards accuracy, not volume.

---

## 7. Open implementation questions (for the build)

- Where does the committed spec live? Propose a `round_specs` table
  (`round_id`, `riddle`, `spec_jsonb`, `spec_hash`, `committed_at`,
  `revealed_at`).
- Seed-lottery determinism: derive the per-day draw seed from
  `hash(cohort_seed, day)` so it is reproducible and auditable.
- 18h window: `opens_at` stays 18:00 UTC; `closes_at` moves from +24h to
  +18h (next day 12:00 UTC). Confirm the reveal/vote window (T+18..24) still
  fits before the next day's ask.
- Jury bounty accounting: extend the existing jury-ticket ledger with a
  per-cohort pool + pro-rata split at endgame.
