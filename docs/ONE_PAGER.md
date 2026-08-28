# Last Human Standing — 1-pager

**Live app: https://lasthumanstanding.thisyearnofear.com**

## What it is

A daily real-world elimination game for verified humans. Each day, an AI
named ARIA posts a **riddle** — not a literal instruction. *"Find the place
where strangers become regulars. Bring proof."* Players anywhere on Earth
answer with a photo and a one-line argument. The judging criteria are
**hash-committed before anyone submits**, revealed before voting, and the
crowd judges against them. An 18-hour window makes it fair in every timezone;
when check-ins exceed the day's cap, a deterministic seed lottery — not speed
— decides who survives. The cap shrinks each day until one human takes the
on-chain pot.

## The daily loop (24-hour cycle)

```
T+0h     THE ASKING      ARIA posts a riddle + commits a hidden resolution spec
T+0..18  THE HUNT        18-hour window: photo + one-sentence argument
T+18h    THE REVEAL      committed spec revealed, voting opens
T+18..24 THE RECKONING   players vote against the revealed criteria
T+24h    CLOSE           survival decided (seed lottery on overflow)
```

## Why it's fair

- **No speed race.** The 18-hour window overlaps every player's waking hours
  by ≥10h regardless of timezone. Survival is never "who was awake at 3am."
- **Locked criteria.** The resolution spec is SHA-256 committed before the
  first submission and revealed before voting. Nobody — not the agent, not
  the operator — can move the goalposts after seeing the answers.
- **Auditable lottery.** When eligible check-ins exceed the cap, survival is
  a deterministic Fisher–Yates draw seeded from the public cohort seed.
  Anyone can replay it.

## Three-witness verification

| Witness | What it proves | Cheat cost |
|---|---|---|
| **Photo** (required) | A real human answered the riddle | AI image gen — caught by the authenticity gate |
| **GPS** (optional) | Adds location credibility metadata | GPS spoofing — easy alone |
| **Crowd** | Other humans vote against the revealed spec | Sybil farming — World ID kills it |

## Why this needs World

- **One human, one slot** — World ID + SIWE for sybil resistance
- **Mobile-native wallet UX** — World Wallet / MiniKit, on the phone you carry to the location
- **In-app social** — World Chat / XMTP turns the audit into a spectator sport

## What's built today

- **🧩 Riddle Rounds** — interpretive riddles replace literal themes; the
  caption is the player's argument ("my answer, because…"). Interpretation is
  the skill.
- **🔒 Commit-reveal judging** — resolution specs hash-committed at ask-time,
  revealed at T+18h before voting. The voting feed shows the revealed
  criteria so jurors judge against them.
- **⏱️ 18-hour timezone-fair window** — hunt T+0..18, reveal + vote T+18..24,
  close T+24.
- **🎲 Deterministic survival lottery** — on overflow, a seeded Fisher–Yates
  draw decides survivors; every draw persisted to a public audit table.
- **⚖️ Paid jury** — eliminated players become the jury; a jury pool is split
  pro-rata among accurate voters at cohort end.
- **🔊 Immersive audio layer** — synthetic Web Audio engine for zero-latency
  game feel.
- **✨ Focused onboarding** — Welcome → Rules → Reserve → celebration; twists
  unlock per day via `RuleReveal`.
- **🃏 Shareable moment cards** — Canvas PNG cards for survive / jury / win.
- **⚡ Speed-run demo** — `/?demo=1`: full 5-day arc → proof → audit → finale
  → reserve. No payment.
- **🛡️ Multi-provider proof of humanity** — World ID and Self Protocol.
- **🔒 Commit–reveal audit voting** (foundation) — hash-commit votes during
  the window, reveal after close; see [Privacy architecture](./PRIVACY_ARCHITECTURE.md).
- **Cohort lifecycle** — `phase: 'prelaunch' | 'live' | 'ended'` via `/api/game/state`.
- **Photo + signed proof** — MiniKit Sign Message stamp on every check-in.
- **Audit voting with consequences** — flagged survivors are disqualified;
  the highest-ranked too-late check-ins inherit their slots.
- **Jury system** — eliminated players keep playing; accurate jurors' votes
  count double and earn jury tickets.
- **Endgame** — when one human remains, the app announces the winner.
- **Push notifications** — riddle drop, final hour, spec revealed, you
  survived, verdict summary, eliminated, winner announced.
- **Cap shrinks daily** — 25 → 12 → 6 → 3 → 1 (configurable per day).
- **Live on-chain prize pool** — World Chain WLD balance shown live.
- **World Chat coordination** — challenge/message any survivor in-app.
- **Admin tooling** — `/api/admin/round`, `/api/admin/close-day` (token-gated).
- **Full backend** — Express + Supabase + PM2 + Nginx + TLS on Hetzner.

## Demo flow

**Send a link (preferred):** `https://lasthumanstanding.thisyearnofear.com/?demo=1`
— speed run, then reserve.

**Real cohort (2 minutes):**

1. **Pre-launch**: countdown + cohort fill counter; tap **Reserve your slot**
   → wallet auth → verify (World ID / Self)
2. **Day 1 opens**: the riddle drops, 18-hour window opens
3. **Answer**: snap a photo that answers the riddle → add your one-line
   argument → optional GPS for credibility
4. **Reveal + audit**: criteria revealed; other players vote against them
5. **Day closes**: verdicts finalized (DQ-and-replace); eliminated players
   join the paid jury

## Enterprise value

A reusable **proof-of-presence** layer: brand activations, IRL events,
loyalty programs, civic engagement — anywhere you need to prove a real human
did a real thing at a real time, with crowd-audit as the final adjudicator.
Global by default, with optional GPS pinning for local events.

## Roadmap

- **Cohort 2 (Sep 13)** — full scoring engine: ARIA vision verifier + scorer
  against the committed spec, conviction-mark voting (3 marks per voter),
  survival formula `w1·spec_match + w2·peer_conviction`, ties by cohort seed.
- **Soulbound proof-of-survival** — non-transferable "verified survivor"
  token on World Chain.
- AI-image-detection signal in audit
- Sponsor-funded bounty riddles via x402
- World Chain attestations for check-in receipts
- Multi-city support with per-city cohorts

**Hidden Verification & Agent Participation (foundation live, activation flagged off):**

Schema + 20–30% agent seat reservation + admin registration +
silent-verification plumbing ship now (`AGENTS_ENABLED=false` by default).
Flip the flag when ready to run a Turing-test cohort.

The vision: humans prove they're human with authentic photos; agents try to
pass as human; the crowd votes.
