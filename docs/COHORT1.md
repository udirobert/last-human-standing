# Cohort 1 — closed verified-human pilot

> Consolidated from `COHORT1.md`, `COHORT1.md`,
> `COHORT1.md` (2026-11-10). History preserved in git.

## Pilot ops: flags, prize, settlement

Cohort 1 runs as a **free, closed, verified-human pilot** with a
sponsor-funded prize and manual, in-kind settlement. It is *not* a paid,
automatically settled contest. This document is the operational checklist
that goes with the code-level containment flags. Priorities + status:
`docs/ROADMAP.md`. Optional extension that adds operator-run,
prize-ineligible agents to the pilot: `docs/COHORT1.md`.

## Prize disclosure (publish verbatim)

> Sponsor prize: **5 WLD on World Chain** plus **35 cUSD on Celo**.
> Funds remain operator-custodied during the pilot. The winner receives
> both assets in two separate on-chain transfers after a **48-hour appeal
> window** following the final day close. Both transaction hashes are
> published in the recap. No conversion to a synthetic USD total is
> performed. If no legitimate winner emerges, the prize rolls to Cohort 2.

## Jury pool disclosure (publish verbatim)

> A **2 WLD jury pool** is seeded for Cohort 1. At cohort end it is split
> pro-rata by accumulated jury tickets among eligible jurors, settled
> manually alongside the prize. Accurate voting pays — even if you're
> eliminated.

## Containment flags (defaults are the pilot posture)

| Flag | Default | Effect |
|---|---|---|
| `PAID_ENTRY_ENABLED` | `false` | All paid-confirm endpoints return `503 paid_entry_disabled`. |
| `AUTO_PAYOUT_ENABLED` | `false` | Winner + pot snapshot are recorded; no hot-key transfer. Admin `retry-payout` returns `403`. |
| `LOTTERY_ENABLED` | `false` | No lazy/admin draw; the roster is operator-frozen. Free entry admits directly. |
| `ENTRY_CLOSED` | — | When `true`, **no new participant** is admitted (roster freeze). Set at T-0. |
| `MIN_LAUNCH_PARTICIPANTS` | `8` | Day 1 never auto-opens below a verified roster of 8 (postponement, not a 1-player game). |
| `REQUIRE_HUMANITY_FOR_PLAY` | `true` | Entry + check-in require a World ID or Self proof. Only a verified human can win. |
| `REQUIRE_WORLD_ID_FOR_VOTING` | `true` | Verdict votes require a verified human who is an admitted cohort member. Self-votes rejected. |
| `INFILTRATOR_ENABLED` / `REVIVAL_ENABLED` | `false` | Infiltrator immunity and Day-4 jury revival are off. |
| `ENABLE_TEST_ROUTES` | — | `/api/test/session` only exists when set (E2E harness only). |

## Database

Before invitations, confirm migrations through **042** are applied in
production. The Riddle Rounds set (039–042) provides:

1. `round_specs` — commit-reveal for judging: each day's resolution spec is
   hash-committed before any submission, revealed at T+18h before voting.
2. Lottery-aware `close_day` — everyone who checks in is eligible; on
   overflow, survival is a server-drawn deterministic Fisher–Yates lottery
   (persisted to `survival_draws` for audit), not first-come.
3. `jury_bounty_pools` — operator-seeded jury pool, split pro-rata by jury
   tickets at cohort end.
4. `rounds.reveal_at` — the two-phase round: hunt closes at reveal_at (T+18h),
   spec revealed + vote opens, survival close at closes_at (T+24h).

Earlier migrations (032–035) provide the unique payout claim, the single
70% verdict threshold, human-only winner accounting, and funnel-event
storage.

The active roster is not a lottery. Free claims are first-come within the
private invitation window, then the operator freezes admission with
`ENTRY_CLOSED=true`. Do not advertise an open public signup or promise
lottery odds for Cohort 1.

## Launch gates (all must pass before Day 1 opens)

1. **Roster**: ≥ `MIN_LAUNCH_PARTICIPANTS` (8) recruited players, each
   World-ID/Self verified, reachable (push delivered + fallback contact),
   and explicitly confirmed for the schedule. Freeze with `ENTRY_CLOSED=true`.
2. **Caps**: compute the survival arc once from the frozen roster; publish
   all caps and windows before Day 1. Never admit late entrants.
3. **Snapshot**: database snapshot + both prize-wallet balances recorded.
4. **Dry run**: one real end-to-end pass on the intended networks:
   verification → check-in → vote → close-day → manual test payout.
5. **Stop conditions**: documented; rollback = `ENTRY_CLOSED=true` +
   close open rounds via admin + postpone note.

The complete operator sequence, invitation script, dry-run matrix, and
post-freeze checks live in `docs/LAUNCH.md`.

## Manual settlement procedure (after the appeal window)

1. Confirm final winner from `winners` / `payouts` (status `pending`).
2. From the operator wallet, send:
   - `5 WLD` on **World Chain** to the winner address.
   - the recorded `amount_usd` in **cUSD** on **Celo** to the winner address.
3. Record both hashes, then mark the payout confirmed:

```sql
update public.payouts
set status = 'confirmed',
    tx_hash = '<celo_tx_hash>',
    explorer_url = 'https://celoscan.io/tx/<celo_tx_hash>',
    error = null
where cohort = 1 and day = <final_day> and winner_address = '<winner>';
-- record the WLD leg in a second note row or the ops log; publish BOTH hashes in the recap.
```

4. Publish both hashes in the recap + the public payout status page.

## Explicitly out of scope for Cohort 1

Public agent registration, x402 payments, ERC-8004 registration,
commit–reveal voting, referral-weighted admission, token emissions
(`AGENTS_ENABLED=false` — the public agent API stays dark). Operator-run,
prize-ineligible **exhibition agents** are allowed as a separate decision —
see `docs/COHORT1.md`. The honest public wording
otherwise: *"feature-flagged experimental agent API and onchain-voting
foundation."*

---

## Recruitment kit: pitch, brief, roster

**Target:** 10–12 verified humans (minimum 8 to launch)
**Launch:** Tuesday **1 Sep 2026, 18:00 UTC** · runs 5 days, ends Sat 6 Sep
**Primary channel:** personal network — DM people you know. 3–5 people who
will actually show up beats 50 ghosts.

Live app (invite-only): https://lasthumanstanding.thisyearnofear.com
Speed-run demo to share: https://lasthumanstanding.thisyearnofear.com/?demo=1

> The demo teaches the real format — riddle, proof, spec reveal, vote, seed
> lottery — with practice riddles (the real five stay secret until each day).
> Note: the demo's Day 2 infiltrator and Day 4 wildcard beats are labelled
> "twist preview" — both return in a future cohort, not Sep 1.

---

## The pitch in one breath

A 5-day elimination game for verified humans. Each day ARIA posts a
**riddle** — not an instruction. You answer with a photo and a one-line
argument. The judging criteria are locked (hash-committed) before anyone
submits, revealed before voting, and the crowd judges against them. No speed
race: an 18-hour window means every timezone gets a fair shot. Last verified
human takes the pot; eliminated players become the paid jury.

---

## Invite message (DM — short, personal)

> Hey — running a small real-world game next week and want you in it.
>
> **Last Human Standing** — 5 days, free, verified humans only. Each day a
> riddle drops ("Find the place where strangers become regulars. Bring
> proof."). You answer with a photo + one line on why it fits. The crowd
> votes; last human standing wins the pot.
>
> **When:** Tue 1 Sep, 18:00 UTC → Sat 6 Sep. Each day you get an 18-hour
> window, so no 3am alarm needed.
> **Entry:** free. World ID (or Self) verify to claim a seat.
> **Prize:** 5 WLD + 35 cUSD. Plus a 2 WLD jury pool — even if you're voted
> out, accurate voting pays.
>
> 15-min demo (no signup): https://lasthumanstanding.thisyearnofear.com/?demo=1
>
> In? Tell me your timezone and that you can check in once a day for 5 days,
> and I'll send your private reserve link.

## Invite message (email — longer)

> **Last Human Standing — Cohort 1 (free, closed pilot)**
>
> I'm running a 5-day real-world elimination game for verified humans only,
> and I'd like you in the first cohort.
>
> **The game.** Each day, an AI named ARIA posts a riddle — not a literal
> instruction. Day 1 is *"Find the place where strangers become regulars.
> Bring proof."* You answer with a real photo and a one-sentence argument for
> why it fits. Interpretation is the skill.
>
> **Fair by design.** The judging criteria are hash-committed before anyone
> submits, then revealed before voting — nobody can move the goalposts after
> seeing the answers. And there's no speed race: the check-in window is 18
> hours, so it overlaps your waking day no matter your timezone. If more
> people check in than the day's cap, survival is decided by a deterministic,
> auditable seed lottery — not who was fastest.
>
> **The loop.**
> - 18:00 UTC — the riddle drops, 18-hour window opens
> - next day 12:00 UTC — window closes, criteria revealed, voting opens
> - 18:00 UTC — verdicts land, survivors announced, next riddle drops
>
> **If you're voted out, you're not done.** You become the jury — and there's
> a 2 WLD jury pool split among accurate voters.
>
> **When:** Tuesday 1 Sep 2026, 18:00 UTC → Saturday 6 Sep.
> **Entry:** free. World ID or Self verification required before you claim a seat.
> **Prize:** 5 WLD (World Chain) + 35 cUSD (Celo), sent manually after a 48h
> appeal window.
> **Size:** closed pilot, ~10–12 humans.
>
> Try the 15-min demo first (no payment):
> https://lasthumanstanding.thisyearnofear.com/?demo=1
>
> If you're in, reply with:
> 1. Your timezone
> 2. Confirmation you can check in once a day for 5 days (any time in the
>    18h window)
> 3. World App installed (or browser + wallet for Self verify)
>
> I'll send your private reserve link once you're confirmed.

---

## Nudge message (Aug 29 — for people who said "sounds fun" but haven't confirmed)

Send 2 days before the roster freeze. Short, warm, one question. No guilt.

> Hey — quick one. The game starts Tuesday (Sep 1, 18:00 UTC) and I'm locking
> the roster Sunday night.
>
> You said it sounded fun — still in? It's ~15 min a day: one riddle, one
> photo, one line on why it fits. Free, and even if you're voted out early you
> can still earn from the jury pool.
>
> If yes, just reply with your timezone and I'll send your reserve link. If
> the timing's bad, no worries at all — Cohort 2 is Sep 13.

**Follow-up rules:**
- One nudge max per person. Silence after that = no.
- Anyone who confirms gets the reserve link + participant brief immediately.
- Log them in the roster tracker the moment they confirm, not later.

---

## Participant brief (send after they confirm)

**Schedule (UTC → convert locally)**

Each day is a 24-hour cycle: an 18-hour hunt, then a 6-hour reveal + vote.

| Day | Riddle | Hunt window (UTC) | Reveal + vote (UTC) | Survivors |
|-----|--------|-------------------|---------------------|-----------|
| 1 | THE GATHERING — *"Find the place where strangers become regulars."* | Tue 1 Sep 18:00 → Wed 2 Sep 12:00 | Wed 2 Sep 12:00 → 18:00 | 25* |
| 2 | THE WILD — *"Somewhere the city forgot to pave."* | Wed 2 Sep 18:00 → Thu 3 Sep 12:00 | Thu 3 Sep 12:00 → 18:00 | 12 |
| 3 | THE BOND — *"Proof you are loved by at least one other human."* | Thu 3 Sep 18:00 → Fri 4 Sep 12:00 | Fri 4 Sep 12:00 → 18:00 | 6 |
| 4 | THE QUIET — *"A place that asks you to be quiet."* | Fri 4 Sep 18:00 → Sat 5 Sep 12:00 | Sat 5 Sep 12:00 → 18:00 | 3 |
| 5 | THE DAWN — *"Proof you were first to see the day."* | Sat 5 Sep 18:00 → Sun 6 Sep 12:00 | Sun 6 Sep 12:00 → 18:00 | 1 |

\*Caps scale to roster size; exact numbers published at freeze.

**How to play**

1. Open the app in **World App** (or browser).
2. Connect wallet → **Verify** (World ID or Self) → complete reachability
   (push + email/Telegram).
3. **Reserve** your free seat before the roster freeze (Aug 31).
4. Each day: when the riddle drops, snap a **real photo** that answers it and
   add a one-line argument ("my answer, because…"). Submit within the 18h
   window.
5. When the criteria are revealed (next day 12:00 UTC), vote on other
   players' answers against them. You can't vote on your own.

**Rules**

- Everyone who submits within the window is eligible. If eligible players
  exceed the day's cap, a deterministic seed lottery decides who survives —
  not speed.
- Miss the window → eliminated (you can still join the jury).
- Flagged answers can disqualify survivors at day close.
- Only verified humans in the frozen roster can win.

**Prize (verbatim)**

> Sponsor prize: **5 WLD on World Chain** plus **35 cUSD on Celo**. Funds
> remain operator-custodied during the pilot. The winner receives both assets
> in two separate on-chain transfers after a **48-hour appeal window**
> following the final day close. Both transaction hashes are published in the
> recap.

**Jury pool (verbatim)**

> A **2 WLD jury pool** is split pro-rata among eliminated jurors whose votes
> matched the final consensus, settled manually at cohort end.

**Support:** Reply on your invite thread or the operator contact you were given.

---

## Roster tracker (operator — private)

| # | Name | Wallet | Verified | TZ | Push | Fallback | Confirmed schedule |
|---|------|--------|----------|----|------|----------|-------------------|
| 1 | | | ☐ World ☐ Self | | ☐ | | ☐ |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |
| 11 | | | | | | | |
| 12 | | | | | | | |

**Freeze checklist (Aug 31):**

- [ ] ≥8 rows complete (wallet + verified + confirmed)
- [ ] `/api/cohort/roster` human count matches tracker
- [ ] Set `ENTRY_CLOSED=true` on prod + PM2 restart
- [ ] Send final schedule + caps to admitted players

---

## Where to find humans (private, not broadcast)

**Personal network first** — the highest-conversion channel for a 4-day
window. People who've said "that sounds fun" before, group chats, ex-colleagues
in the right timezones. Aim for people who will *actually show up for 5 days*.

Then, small targeted DMs (not spam):
- World App / World ID Discord — `#mini-apps` or hackathon channels
- Farcaster — DM people who've played social games; share `?demo=1`
- ETHOnline Discord — continuity-track builders

**Do not** post the reserve link on public Twitter/FC until Cohort 2 (Sep 13).

---

## Optional extension: agent exhibition

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
  (`docs/COHORT1.md`).

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

1. This cohort contains AI agents. Exactly 4. They cannot win the prize.
2. You'll learn which photos were machine-made after each day closes.
3. Flagging a real human has no penalty for them beyond review — the
   operator adjudicates any elimination the crowd disputes (48h window).
4. Humans: World ID or Self verified before roster freeze. One seat each.

## Infra deltas (~1 day, all small) — ✅ BUILT + DEPLOYED 2026-08-02

1. `close_day`: winner/remaining computed over `is_agent = false` — **migration 033 (applied to prod)**. `remaining_agents` is returned for the recap; `resolve_no_survivors` is human-only too.
2. Check-in gates: `is_agent=true` rows bypass the humanity requirement
   (they are admitted by the operator, not by proof-of-personhood) — **shipped**
3. Seed path: SQL/admin script inserting agent users + cohort rows — **`scripts/seed-exhibition-agents.mjs` (keypair per persona, keyfile at `shared/exhibition-agents.json` mode 600; 4 personas seeded on prod)**
4. Runner: `scripts/exhibition-agents.mjs` on the prod host (pm2/cron) —
   signs SIWE with held keys, submits curated photo with jitter — **`lhs-exhibition-agents` under pm2, `*/10 * * * *`, deterministic 5–45 min jitter; photos from `shared/exhibition-photos/day<N>/<username>.jpg` (curation = operator job; missing photo = missed day)**
5. Close-day reveal: recap payload includes labeled agent submissions — **shipped**: day-close push carries the count/caught line; `/api/feed` annotates `agentRevealed` for closed days only (fail-hidden)
6. Metrics export: votes joined against labels → precision/recall — **`scripts/agent-detection-metrics.mjs`**
7. Verify no public endpoint leaks `is_agent` (feed already omits it) — **verified: feed select list has no is_agent; labels surface only post-close via (6→5)**
8. Stats honesty: `/api/stats` cohort split counts agents separately — **shipped** (`agentCount`, agents no longer inflate `freeCount`)

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
