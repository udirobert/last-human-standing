# Token Rounds — game design v3

Status: **design locked, foundation slice building.** Schema + pure logic +
API are landing behind `GAME_V3_ENABLED=false`. **No UI yet, and v2 keeps
running untouched.**
Decided 2026-10-01 after Cohort 1 post-mortem: players would not play IRL.

This document is the source of truth for the v3 strategic direction. It
supersedes `RIDDLE_ROUNDS.md` (v2) as the strategic design while v2 remains
the shipped game. v2 is not being dismantled — v3 is a parallel track until it
earns a cohort.

---

## 1. Why v2 failed to reach the physical world

Cohort 1 produced the same result across every recruitment attempt: people
would not show up IRL. That is not a mechanics bug, and it is not a marketing
bug. It is a **disinvestment** bug.

**Last Human Standing tells you on arrival that you will be ejected in 24
hours.** You enter, you play, you are eliminated on a schedule, and elimination
ends your participation. Nobody invests in a format whose stated goal is to
throw them out. Putting real money on the pot did not fix this — it made
people churn *faster* once they lost, because now there was something to lose.

v2 (`RIDDLE_ROUNDS.md`) correctly diagnosed two real problems: the speed race
was geographically unfair, and the daily decision space was too thin. Both
fixes were right. **Neither addressed the reason people stayed at their desks.**

### 1.1 The root cause, stated exactly

**v2 treated IRL as content, not as a constraint.**

A player submits a photo. The photo is evidence of presence. But evidence is
*replicable* — it can be produced from a desk, a hotel room, or a stock
library. Once presence is evidence rather than a requirement, **no incentive
in the design can make showing up matter.** You cannot incentive your way
around something that is genuinely optional.

**The fix is to invert the relationship.** Do not reward showing up. *Make
not-showing-up structurally unable to obtain the thing people want.*

Scarcity, not motivation, is what forces attendance. Motivation is unreliable
and decays; a physical constraint does not.

### 1.2 The decision that follows

**Decision (locked): the game's primary resource becomes an object that is
digital but whose transfer requires physical co-presence.**

The resource is a **Token**. It is not a physical object — you never ship it,
guard it, or hide it. But you cannot go from "I want it" to "I have it"
without being there. No amount of online grinding substitutes for presence.
Cheating requires physically faking co-presence, which is expensive and leaves
a trail.

Everything else in this document is downstream of that one inversion.

---

## 2. The co-present token

A Token exists in the world at any moment. It carries the game's primary
resource — possession is strategy, and possession is also the flash-moment
trigger.

**Transfer requires a mutual proximity attestation.** Both wallets confirm each
other within an R-meter radius inside a short window, GPS-corroborated, with
both devices actively participating in the handshake.

### 2.1 Why mutual, and why not server-side geofencing

GPS is spoofable in seconds. A server-side geofence ("you must be inside this
circle to claim") is defeated by one app on a laptop. So:

- **Mutual** means you must spoof *two* devices *and* have both agree within a
  short nonce window. The cost of cheating rises from "toggle a setting" to
  "coordinate two fraudulent devices in the same place in real time."
- **Attested** means the evidence is a signed exchange between two verified
  humans, not a server assertion about one.

The known weakness is named rather than hidden: **two phones in one flat can
fake co-presence.** This is accepted for v1. The graduated mitigation is an
acoustic sonar challenge (mutual Web Audio nonce, each device must prove it
heard the other's) required once a Token or territory is high-value. See §4.

### 2.2 What this buys

| | v2 (evidence) | v3 (co-presence) |
|---|---|---|
| Obtaining the resource | submit a photo from anywhere | be there, with someone |
| Cheat cost | free (reusable stock photo) | coordinated multi-device fraud |
| Online grinding | sufficient | **structurally insufficient** |
| Why you show up | extrinsic reward | the only path to the thing |

---

## 3. The two clocks

v3 runs on two cadences deliberately. The always-on layer exists so players
learn the interface and build customisations *between* field sessions — but
only if it feeds the IRL layer.

| Clock | Cadence | Surface | Purpose |
|---|---|---|---|
| **Slow** | always on, asynchronous | desktop war room | economy, crew building, trade, scouting, planning |
| **Fast** | bounded sprint windows | mobile field | co-presence transfers, territorial capture, the scramble |

### 3.1 The mechanic that fuses them

**The online market consumes what the IRL layer produces.**

Only IRL mints scarce goods — verified-location badges, access tokens, intel.
Those trade on the open market. The flash moment stops being a scheduled push
notification you send on a timer, and becomes **market pressure from a live
player**:

> *"Someone is bidding 40 credits for your location badge. Accept?"*

That fires whenever a motivated human is online, generated by people who never
left their desks.

> **IRL is the faucet. The online market is the demand.**

**Guardrail — why this is the load-bearing decision.** The always-on layer
earns its place *only* by feeding the IRL layer. If that link is not real, do
not build the always-on layer. Otherwise it becomes the thing people check
*instead of* playing — which is precisely how v2 lost its players.

### 3.2 Surface split

- **Desktop = war room.** Map, player directory, crew management, market,
  history. Rich, keyboard-driven, long sessions. **Depth lives here.**
- **Mobile = field.** Camera, nearby alerts, one-tap co-presence handshake,
  push. Short, reactive sessions.
- **IRL = where they collide**, on a schedule.

### 3.3 Sprint structure

```
always-on        THE MARKET     plan, trade, scout, build crew (60s sessions)
   ↓
T-24h            THE BRIEF      commit intent: where you're going, what you carry
   ↓
T+0h   .. T+4h   THE FIELD      co-presence transfers, captures, flash windows
   ↓
T+4h             SETTLEMENT     tallied, world state updated, rewards paid
```

Two rules are load-bearing:

1. **Nothing mandatory lives only in the sprint.** If all progression is
   sprint-gated, low-population cities die and the cold-start problem returns
   at smaller scale. **The 24/7 layer is the floor; the sprint is the ceiling.**
2. **Queued intent.** Before the sprint you commit plans online. The sprint is
   execution of a prepared position. Players who never prepare are visibly
   underprepared in the field — **no streak penalty required.**

### 3.4 Regional windows, not a global clock

The 18h "timezone fair" window in v2 was itself the bug: it means everyone plays
at the wrong time. Co-presence requires **local density**, so sprints are
region-scoped.

- Regions are seeded with a centroid + radius (Americas / EMEA / APAC to start).
- Each region owns its sprint cadence.
- **Regional windows overlap partially.** Pure partition means each region
  plays an empty world alone; overlap keeps matches warm.
- A player competes with people within a few hundred km, not a global clock.

---

## 4. Flash moments

Not random. **Telegraphed scarcity windows** — a location activates for ~90
minutes and only N verified humans can be inside.

Push: *"Token is 200m away and someone is carrying it."* That is a heist
alert. It creates the reflex of movement, and the window is short and
non-repeatable, so missing it costs something real.

**Do not make the reward only cash.** Cash attracts coupon-clubbers who show
up once and churn — the exact failure already observed. Stack **intrinsic**
rewards that only exist IRL: territory claims that persist, a named title, an
item that unlocks something, standing in the local scene.

### 4.1 Sonar escalation (named, not scheduled)

Mutual attestation is sufficient for low-value transfers. At a defined
threshold of Token value or territory tier, mutual attestation stops being
enough and an **acoustic sonar challenge** is required: both devices play a
random mutual nonce over Web Audio and each must prove it received the other's.

This works on desktop and mobile web with no native BLE stack, at the cost of
failing on muted speakers and some browser autoplay policies. It is a
hardening step, not a v1 dependency.

---

## 5. Making people actually care

Three levers, ranked by impact.

### 5.1 Crews with identity, over individuals

Nobody roots for "player #4,821." They root for a crew with a name, a local
hangout, and a scoreboard rivalry with the crew down the street. **Scarcity
between factions generates narrative for free** — you do not have to write any
of it.

**Decision (locked): founder-led, open join.** Seed a few named crews per
active region at season start; anyone can found one up to a cap and anyone can
join any crew. Player-founded-only leaves a new city with zero factions and no
reason to meet. Auto-assignment has no agency and therefore no investment.

### 5.2 Make skipping cost other people

If your crew's score drops and your teammates notice you were not there,
people show up out of **obligation and reciprocity**. Motivation is unreliable
and decays; obligation compounds through social proof.

### 5.3 Eliminate as a status, never as exile

Knocked-out players keep full social and market standing and gain roles
(jury, scout, insider). Being out of the arena is not being out of the game.

### 5.4 Customisation must be recognised, not just visible

Cosmetics only *you* see are meaningless. Identity must be legible to **other
players in the marketplace** — a crew banner, a persistent title, a profile
read at transaction time. Recognition → trust → showing up IRL for strangers.
That is the pipeline, and it is the same thing v2's `jury_tickets` was
reaching for without the social layer to carry it.

---

## 6. Economy rules (non-negotiable)

**Credits are a closed, non-withdrawable system.** Cash enters *only* at season
settlement for podium positions.

- **Only IRL actions mint credits.** This is the faucet.
- Credits are earned by: valid transfers delivered, rival transfers
  intercepted, crew contribution, sprint participation.
- **No cash-out. Ever.** This is the exact boundary that keeps a
  photo-evidence game from being gamed — applied to an economy instead. It
  kills RMT, bots, and the gold-economy death spiral in one rule.
- **Market listings expire.** Time-limited listings create urgency and prevent
  speculative accumulation.

If credits ever become withdrawable, the game is over. The anti-Sybil work in
World ID / Self Protocol was built to verify *people*, not to police an
economy — those are different problems and the second one is not solvable by
the first.

---

## 7. Scope split

### 7.1 Foundation slice — building now

Behind `GAME_V3_ENABLED=false`. No existing route, table, or RPC is modified.

- **Migrations 044–047** — `regions` / `sprints` / `sprint_flashes`;
  `crews` / `crew_members`; `handshakes` / `tokens` / `token_transfers`;
  `credit_ledger` / `market_listings` / `season_standings`. All 12 tables
  apply clean; RLS enabled with no policies (service-role only).
- **The attestation is enforced in the database, not just the route.** A
  plain foreign key only proves a handshake row *exists* — it happily accepts
  a handshake that was rejected or expired, and the service role bypasses
  RLS. Migration 046 adds `trg_transfer_requires_attestation`, which rejects
  any transfer whose handshake is not `attested` or does not bind both
  parties. Verified against a live Postgres 14 scratch cluster: a rejected
  handshake cannot back a transfer even when written straight to the table.
- **Pure libs** — `server/lib/coPresence.js` (attestation validation),
  `seasonScore.js`, `market.js`, `creditLedger.js`. All pure, all unit-tested
  in isolation, matching the `juryBounty.js` shape.
- **Routes** — `server/routes/regions.js`, `crews.js`, `cocircle.js`,
  `market.js`, all DI-factory modules gated on the flag and mounted under
  `/api/v3` so they can never shadow a live v2 path.
- **Tests** — 119 new passing tests: pure-logic coverage for each lib plus
  route gating coverage (every v3 path returns 404 `v3_not_enabled` before
  `requireAuth` even runs, with the flag off).

**Exit gate:** met — migrations apply cleanly to a live Postgres 14 scratch
cluster; 119 new tests pass; v2 routes respond unchanged with the flag off;
v3 endpoints return 404 when the flag is off. Zero new lint errors and zero
test regressions (68 pre-existing `.jsx` failures are unrelated — React 19
removed `React.act`; they fail identically on a clean tree).

### 7.2 Next — playable vertical

Deliberately not in the foundation slice: UI (war room + field), territory
capture, sprint settlement, sonar escalation, seeded regions and crews,
market liquidity seeding.

---

## 8. Risks (named honestly)

- **Two phones in one flat can fake co-presence.** The known and accepted
  weakness of mutual attestation. Mitigation is graduated — sonar required once
  a Token or territory is high-value (§4.1). Named now so it is not a surprise
  later.
- **Crew seeding is operator work.** Founder-led crews need founders. A city
  with no seeded crew has no identity. Budget for seeding it or it will not
  happen.
- **Market liquidity is a cold-start problem.** An empty market makes the
  always-on layer feel dead, which is fatal given it must justify itself. Seed
  system sell-side orders per region at launch.
- **No-cull removes a tension source.** Some drama is lost by dropping the
  daily cull. It is replaced by standings and territory — but if standings are
  invisible, the season board becomes the thing nobody looks at.
- **Riddle quality was v2's single point of failure; in v3 it is co-location
  quality.** If attestation is trivially bypassed, the whole inversion fails.
- **Do not let this become Pokémon Go.** A pure location game has the identical
  retention cliff. All strategic depth must live online; IRL is the pressure
  valve that makes the online work matter.

---

## 9. Open questions (for the build)

1. **Token count per sprint.** Too few and the market has nothing to trade; too
   many and possession stops mattering.
2. **Sprint cadence per region.** 24h windows need a start time per region that
   overlaps neighbours. Fixed local time (e.g. 18:00 local) or UTC-anchored?
3. **What does a Token do when unheld?** Decay, return to a spawn point, or
   stay contested? This changes the meta significantly and is unresolved.
4. **Sonar escalation threshold.** At what Token value / territory tier does
   mutual attestation stop being sufficient?
5. **Does v3 replace v2 or run beside it?** This document assumes beside, flagged
   off. A parallel game doubles the operator surface — worth deciding before
   the playable vertical, not after.