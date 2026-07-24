# Future Roadmap — Last Human Standing

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

## Phase 3: The Turing Test Arena

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
