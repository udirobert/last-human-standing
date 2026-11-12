# Pivot: Spectator-First (v3 design)

> Status: **PLANNED — not started.** Written 2026-11-12.
> Context: evaluated for the *world is flat* hackathon (Robinhood Chain,
> submissions closed 2026-11-12) and **deliberately not entered** — the
> redesign is real product work, not a 9-hour port. Onpoint was submitted
> there instead. This doc is the plan/experiment record for the next
> iteration on our existing chains (World Chain WLD + Celo cUSD).

## Why this doc exists

Two launches died on the same cause: **IRL friction.** The game asks
people to physically go places, and most people don't. Every comparable
product that survived did one of three things — fit inside existing
routines, made the competition digital, or offloaded content creation to
players. We did none of the three.

## Market evidence (2026-11-12 research pass)

| Comp | What happened | The lesson for us |
|---|---|---|
| **Crypto: The Game** (Base → Unichain) | Survivor-style onchain elimination. 0.1 ETH buy-in, tribes voted out over 10 days, $150–250K pots, S2 sold out in 13 min, acquired by Uniswap Labs | The winning elimination game was **100% digital** — challenges were arcade/digital scavenger hunts. Social drama *was* the game. Eliminated players decided the final winner (dead-vote); S3 added Resurrection Island — they engineered against elimination draining the audience. Spectators vastly outnumbered the 800 contestants: the product was a spectator sport, players were content |
| **Niantic post-GO** | Wizards Unite, Catan, NBA All-World, Marvel — all dead. Monster Hunter Now survives on micro-encounters ("play while waiting for coffee"). Games division sold to Scopely 2025 | Even mega-IP couldn't make location-*required* work again. GO worked because it fit walks people already took + collection (not elimination) + IP did acquisition. Location was never the retention engine |
| **BeReal** | One photo/day from wherever you are — minimal ask — still lost 61% of DAU in 5 months | Friction reduction alone doesn't retain. The *content* must stay novel. Our riddles are more varied than BeReal's feed, but the fatigue curve is real |
| **HQ Trivia** | Appointment gaming works then stops; "the prize was the reason to play and the payoff was a disappointment" ($2.17 wins) | Winner-takes-all (our model) avoids split disappointment. Appointment cadence needs a reason to return that isn't only the prize |
| **Geocaching** | 25 years, ~3.4M caches, small but fiercely loyal | Scale secret: **players create the content** (hiding + orchestrating). Money is a weak community motivator; stats/badges/craft carry it. Never tried to be mass-market — maybe that's our honest ceiling too, and that's fine |
| **2026 web3 game data** | ~12% monthly retention (vs 25% mobile benchmark), 93% of GameFi stalled, walletless onboarding + spectator/prediction layers are what's retaining | Spectator economy is the flywheel, not the prize pool |

## The pivot in one line

**The crowd is the player; the runners are the content.**

Every "back an AI agent" arena (and there were ~6 in the WIF field alone)
stakes on machines. We invert it: **AI referees, humans are the horses.**

## The five changes

### 1. Backer layer — the economy engine (NEW)

Non-players stake WLD/cUSD behind a runner they believe survives.
Backers of the winner share a pot (pro-rata on their stake).
- This is the volume engine and the daily-return flywheel — backers
  return every day to check their horse, not to do a task.
- Contract: new `BackerPool` (fresh, minimal) — entry window locks when
  the day's reveal opens; payouts read final standings at cohort close.
  Keeps `PrizePool`/entry flow untouched.
- Alternative cheaper v0: backers stake with no payout, leaderboard
  only — tests demand before real-money pool logic ships.

### 2. Elimination promotes to jury, never ejects (REDESIGN)

Eliminated runners become the voting jury with real weight — CTG's
dead-vote mechanic, generalized. Today the crowd already judges;
formalize it: **elimination = promotion to juror**, with jury verdicts
carrying defined weight in the Reckoning (and ideally a small stake
requirement so jury duty costs something). The audience *grows* through
elimination instead of draining.

### 3. IRL = edge, not requirement (REDESIGN)

Riddle answers stay interpretive: "find the place where strangers become
regulars" can be answered with what's around you (BeReal-level friction)
*or* verified GPS for an immunity token / vote-weight bonus —
Infiltrator Mode generalized into a standing mechanic. The physical
layer stays the differentiator; it stops being the toll booth.

### 4. Riddle UGC (NEW — Geocaching mechanic)

Players (esp. jurors) stake a small amount to submit riddles; the author
earns when their riddle runs. Second flywheel + the content-novelty fix
BeReal never had. ARIA curates/commits the spec; authors get attribution.

### 5. Commit-reveal judging stays — it's the flex

Every "convince the AI" game has a black-box referee. Ours is provably
locked before submissions. Keep it, name it in every pitch.

## What does NOT change

- Chains: World Chain (WLD entry + pot) and Celo (cUSD). No new chain.
- Entry model: 25+25 hybrid (paid reserve + free lottery) unchanged.
- The daily loop timing: T+0 ask → 18h hunt → reveal → reckon → close.
- Three-witness verification; World ID sybil resistance stays the moat.

## Experiment design (the honest part)

The hypothesis is unproven — treat it as an experiment with kill
criteria, not a relaunch.

**Cheapest possible test:** run the next cohort with spectator-backing
as a *no-payout* feature (v0 above): backers pick horses, get a public
leaderboard, no pool logic. Measures demand without contract work.

**KPIs that say "keep going":**
- Backer:runner ratio ≥ 3:1 (crowd is the player)
- Day-2 return rate of backers ≥ 50% (flywheel exists)
- % of eliminated runners who cast ≥1 jury vote ≥ 40% (promotion works)
- Non-GPS riddle answers ≥ 30% (IRL-optional is being used)
- ≥5 staked riddle submissions per cohort (UGC flywheel spins)

**Kill criteria:** backers < runners after day 2, or jury participation
< 20% — the spectator-first premise is wrong, write the retro and stop.

## Open questions

- Should backer stakes be pooled per-runner (pari-mutuel) or
  flat-stake-on-winner? Pari-mutuel is fairer, flat is simpler.
- Jury vote weight vs. verified-runner vote weight — needs a number.
- Does immunity-for-GPS create a rural/urban bias? (GPS-verified is
  easier in dense areas — the "flatness" problem cuts both ways.)
- Riddle UGC quality floor: does ARIA reject bad riddles, and does a
  rejected stake return?

## References

- CTG: blog.uniswap.org/acquiring-crypto-the-game + /ctg-season-3
- Niantic: techcrunch.com/2025/03/12 (games div → Scopely)
- BeReal: theverge.com/2023/4/26/bereal-losing-interest-missed-opportunity
- HQ: techcrunch.com/2020/02/14/hq-trivia-shuts-down + colemaninsights
  (prize-disappointment analysis)
- Geocaching scalability: clab.iat.sfu.ca/pubs/LessonsFromGeocachingPUC.pdf
- 2026 trends: games.gg/news/three-things-web3-games-get-right-in-2026
