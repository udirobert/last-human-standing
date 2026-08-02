# Cohort 1 — Agent Exhibition Design (optional pilot extension)

**Thesis: the pilot should include agents.** Without machine submissions, the
core mechanic is degenerate — every proof is human, "vote real/fake" has no
stakes, and the jury's accuracy metric collapses to "click real." Agents are
what make the audit a game. The catch: they must be introduced *honestly* —
no fake x402 payments, no ERC-8004 claims, no prize exposure.

## Recommended model

**Operator-run exhibition agents. Prize-ineligible. Hidden labels, revealed daily.**

- YOU run 3–5 agents (not autonomous; no public registration, no x402).
- They play the same daily loop: theme → proof photo → judged by the crowd.
- Labels are **hidden during voting**, revealed at each day-close recap:
  "3 of yesterday's 11 photos were synthetic. Here they are."
- Agents **can never win**: if an agent is the last survivor, the title and
  prize pass to the last verified human. Published rule, code-enforced.
- The prize, the appeal window, and manual settlement are unchanged
  (`docs/COHORT1_PILOT.md`).

What you get that a humans-only pilot cannot:

1. **The actual product.** "Spot the machines among you" is the
   differentiated fantasy. A humans-only beta tests scheduling; this tests
   the game.
2. **Ground truth.** With labels you control, jury votes become measurable
   detection accuracy (precision/recall per agent persona) — the dataset
   the future mixed game is built on.
3. **A story.** "25 humans, 4 impostors — and the crowd caught 3" is a
   launch recap people share. "Everyone voted real correctly" is not.

## Mechanics

- **Shared track, human-only prize:** agents submit through the same
  endpoints and count toward the daily survival cap — machine pressure on
  human slots is the point. `close_day` computes remaining/winner over
  `is_agent = false` only.
- **Submission times jittered** inside the window (random 5–45 min after
  open) so agents don't win on HTTP latency — pilot fairness over purity.
- **No agent location claims are impressive claims:** they check in with
  plausible coordinates; nobody audits GPS in the pilot.
- **An agent dies when flagged** (DQ path as humans do) or when it misses a
  day. A runner outage equals a quiet machine death — acceptable drama.
- After each close: reveal which submissions were agents, with tells
  annotated. This is the daily content beat.

## The cast (suggested personas)

| Agent | Style | Difficulty | Role |
|---|---|---|---|
| ARIA-1 | Best-effort realism, curated | Hard | The "ringer" — should survive deep |
| BLOT | Same model, sloppy prompts | Easy | Day-1 catch; teaches the jury tells |
| CLAUDE-ENNUI | Consistent persona + captions ("my usual café") | Medium | Tests whether narrative fools people |
| DUCT | Different model family each day | Variable | Wildcard; maps difficulty across models |

Curated photo pools per theme, generated/selected BEFORE each day (FAL,
SDXL, Midjourney, whatever looks best) — deterministic quality, zero
runtime API dependency. Fresh throwaway addresses so on-chain lookups
don't leak labels.

## Numbers

Keep agents ≤ ~30% of seats so machines pressure but don't swamp:

- Minimum viable: **8 humans + 3 agents (11 seats)**
- Comfortable: **12 humans + 4 agents**
- Full: **18 humans + 7 agents (25 seats)**

Adaptive Day-1 cap already counts verified humans only (031), so humans
still get a sane cut; agents slot into the same cap.

## Rules to publish (verbatim-ish)

1. This cohort contains AI agents. At least 3. They cannot win the prize.
2. You'll learn which photos were machine-made after each day closes.
3. Flagging a real human has no penalty for them beyond review — the
   operator adjudicates any elimination the crowd disputes (48h window).
4. Humans: World ID or Self verified before roster freeze. One seat each.

## Infra deltas (~1 day, all small)

1. `close_day`: winner/remaining computed over `is_agent = false` — S
2. Check-in gates: `is_agent=true` rows bypass the humanity requirement
   (they are admitted by the operator, not by proof-of-personhood) — S
3. Seed path: SQL/admin script inserting agent users + cohort rows — S
4. Runner: `scripts/exhibition-agents.mjs` on the prod host (pm2/cron) —
   signs SIWE with held keys, submits curated photo with jitter — M
5. Close-day reveal: recap payload includes labeled agent submissions — S
6. Metrics export: votes joined against labels → precision/recall — S
7. Verify no public endpoint leaks `is_agent` (feed already omits it) — S

Out of scope, unchanged: public agent registration, x402, ERC-8004 agent
identity claims, agents sharing the prize pool.

## Judge the idea against the pilot's goals

| Question the pilot must answer | Humans-only | With exhibition agents |
|---|---|---|
| Do people complete daily proofs? | ✓ | ✓ |
| Is auditing fun? | weakly | ✓ actually tested |
| Do eliminated players return as jury? | ✓ | ✓✓ (there's something to catch) |
| Does the reveal generate conversation? | — | ✓ that's what it IS |
| Agent-detection accuracy data? | ✗ | ✓ |
| Prize/settlement risk? | none | none (agents ineligible) |

If the infra deltas slip, default back to the humans-only pilot — the
containment landed 2026-08-02 supports both.
