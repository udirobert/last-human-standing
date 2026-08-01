# Last Human Standing — 1-pager

**Live app: https://lasthumanstanding.thisyearnofear.com**

## What it is

A daily real-world elimination game for verified humans. Each day, a **theme drops** (e.g. "AT A CAFÉ", "AT A PARK") — players anywhere on Earth snap a photo as proof. The community votes HUMAN or SUS on every submission. The **first 25 to check in** survive. The cap shrinks each day until one human takes the on-chain pot.

## Three-witness verification

| Witness | What it proves | Cheat cost |
|---|---|---|
| **Photo** (required) | A real human did the theme challenge | AI image gen — easy alone |
| **GPS** (optional) | Adds location credibility metadata | GPS spoofing — easy alone |
| **Crowd** | Other humans vote HUMAN or SUS | Sybil farming — World ID kills it |

Photo + crowd voting is the primary trust layer. GPS is optional bonus credibility — shown as metadata on submission cards so voters can factor it in.

## Why this needs World

- **One human, one slot** — World ID + SIWE for sybil resistance
- **Mobile-native wallet UX** — World Wallet / MiniKit, on the phone you carry to the location
- **In-app social** — World Chat / XMTP turns the audit into a spectator sport

## What's built today

- **🔊 Immersive Audio Layer (Sound Design)** — Synthetic Web Audio sound engine (button click, success, milestone, errors, and custom mascot soundscapes) for zero-latency game audio.
- **✨ Focused Onboarding Flow** — Welcome → Rules → Reserve → celebration. Core loop only; twists unlock per day via `RuleReveal` (Day 2 infiltrator, Day 4 wildcard, Day 5 finale).
- **🎯 Live home focus** — Mission mantra + check-in first; arsenal (earned-through-play only) and prize pots below the feed.
- **🃏 Shareable moment cards** — Canvas PNG cards for survive / jury / win; native share prefers the image; `/api/share/winner` for link unfurls.
- **⚡ Speed-run demo** — `/?demo=1` (~8–10 min): full 5-day arc (decoy themes) → proof → audit → infiltrator → wildcard → finale → reserve. Same warm room + motifs + craft CTAs as the live path. No payment.
- **🛡️ Pluggable Multi-Provider Proof of Humanity** — Extensible PoH architecture supporting World ID and Self Protocol (both live). Self is on Celo Sepolia staging with mock passports; flip `SELF_MOCK_PASSPORT=false` to verify real passports on Celo mainnet.
- **🔒 Privacy v1 plan: commit–reveal audit voting** — new cohorts will hash-commit HUMAN/SUS choices during the audit window, then reveal after voting closes. This prevents live-vote anchoring without adding a third chain; see [Privacy architecture](./PRIVACY_ARCHITECTURE.md).
- **Pre-launch waitlist + countdown** — wallet auth + 1 WLD entry locks your slot in the cohort
- **Cohort lifecycle** — `phase: 'prelaunch' | 'live' | 'ended'`, exposed via `/api/game/state`
- **Daily round model** — admin sets theme/place type, time window, survival cap, prompt (GPS coords optional for local events)
- **Theme-based check-in** — players check in from anywhere on Earth with a photo; GPS is optional metadata for credibility; server ranks by arrival, marks first N as survivors (atomic, unique on day+address)
- **Photo + signed proof** — MiniKit Sign Message stamp on every check-in
- **Audit voting with consequences** — community votes HUMAN or SUS; at day close every pending submission is finalized (weighted votes; ≥30% SUS with 3+ votes = flagged), flagged survivors are disqualified, and the highest-ranked "too late" check-ins inherit their slots (DQ-and-replace). The feed is publicly viewable — spectators can watch; voting requires entry.
- **Infiltrator mode** — opt-in social deduction with real stakes: voted HUMAN → immunity through the next day's cut; flagged → DQ'd and any held immunity burned. Infiltrator status is hidden from the audit feed.
- **Jury system** — eliminated players keep playing as the jury: votes count double once audit accuracy is ≥80% (min 5 resolved votes), and every correct verdict vote earns a jury ticket that weights the next cohort's free-entry lottery.
- **Lottery v2** — free-entry tickets weighted by referral count and jury tickets (deterministic, replayable draw).
- **Endgame** — `ended` phase: when one human remains, the app announces the winner.
- **Push notifications** — round open, 1-hour-left warning, you survived, audit verdict summary, eliminated, winner announced.
- **Cap shrinks daily** — 25 → 12 → 6 → 3 → 1 (configurable per day)
- **Live on-chain prize pool** — World Chain WLD balance shown live
- **World Chat coordination** — challenge/message any survivor in-app
- **Admin tooling** — `/api/admin/round`, `/api/admin/close-day` (token-gated)
- **Full backend** — Express + Supabase + PM2 + Nginx + TLS on Hetzner

## Demo flow

**Send a link (preferred):** `https://lasthumanstanding.thisyearnofear.com/?demo=1` — 15-min speed run, then reserve.

**Real cohort (2 minutes):**

1. **Pre-launch**: see countdown + cohort fill counter; tap **Reserve your slot** → wallet auth → pay 1 WLD
2. **Day 1 opens**: location pin + prompt revealed
3. **Check in**: snap a photo at any matching location worldwide → optional GPS for credibility → server returns "you're rank 7 of 25"
4. **Audit**: other players vote HUMAN / SUS; chat lights up
5. **Day closes**: audit verdicts finalized (DQ-and-replace); eliminated players join the jury — accurate jurors' votes count double and correct verdicts earn lottery tickets

## Enterprise value

A reusable **proof-of-presence** layer: brand activations, IRL events, loyalty programs, civic engagement — anywhere you need to prove a real human did a real thing at a real time, with crowd-audit as the final adjudicator. Global by default, with optional GPS pinning for local events.

## Roadmap

- Multi-cohort scheduling (cohort #2 starts when #1 ends)
- AI-image-detection signal in audit
- Sponsor-funded "Photo of the Day" bonus pool
- World Chain attestations for check-in receipts
- GeoGuesser-style "Guess the city" bonus vote on submissions
- Multi-city support with per-city cohorts
- Roll out commit–reveal voting on the canonical chain for each new cohort (World Chain for World cohorts; Celo for Self/Celo cohorts)

**Hidden Verification & Agent Participation (foundation live, activation flagged off):**

Schema + 20–30% agent seat reservation + admin registration + silent-verification plumbing ship now (`AGENTS_ENABLED=false` by default). Flip the flag when ready to run a Turing-test cohort.

Verification can run silently (`SILENT_VERIFICATION=true`) — no badges during play; end-game `breakdown` reveals aggregate human/agent stats. Agents pay x402 per entry into the pot. Tiers: Basic / Standard / Premium.

The vision: humans prove they're human with authentic photos; agents try to pass as human; the crowd votes.
