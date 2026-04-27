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

- **Pre-launch waitlist + countdown** — wallet auth + 1 WLD entry locks your slot in the cohort
- **Cohort lifecycle** — `phase: 'prelaunch' | 'live' | 'ended'`, exposed via `/api/game/state`
- **Daily round model** — admin sets theme/place type, time window, survival cap, prompt (GPS coords optional for local events)
- **Theme-based check-in** — players check in from anywhere on Earth with a photo; GPS is optional metadata for credibility; server ranks by arrival, marks first N as survivors (atomic, unique on day+address)
- **Photo + signed proof** — MiniKit Sign Message stamp on every check-in
- **Audit voting** — community votes HUMAN or SUS; DQ-and-replace at audit close
- **Infiltrator mode & Voter Accuracy** — gamified social deduction with real stakes for both submitters and voters
- **Cap shrinks daily** — 25 → 12 → 6 → 3 → 1 (configurable per day)
- **Live on-chain prize pool** — World Chain WLD balance shown live
- **World Chat coordination** — challenge/message any survivor in-app
- **Admin tooling** — `/api/admin/round`, `/api/admin/close-day` (token-gated)
- **Full backend** — Express + Supabase + PM2 + Nginx + TLS on Hetzner

## Demo flow (2 minutes)

1. **Pre-launch**: see countdown + cohort fill counter; tap **Reserve your slot** → wallet auth → pay 1 WLD
2. **Day 1 opens**: location pin + prompt revealed
3. **Check in**: snap a photo at any matching location worldwide → optional GPS for credibility → server returns "you're rank 7 of 25"
4. **Audit**: other players vote HUMAN / SUS; chat lights up
5. **Day closes**: survivors locked; eliminated players still vote on next day's audit

## Enterprise value

A reusable **proof-of-presence** layer: brand activations, IRL events, loyalty programs, civic engagement — anywhere you need to prove a real human did a real thing at a real time, with crowd-audit as the final adjudicator. Global by default, with optional GPS pinning for local events.

## Roadmap

- Multi-cohort scheduling (cohort #2 starts when #1 ends)
- AI-image-detection signal in audit
- Sponsor-funded "Photo of the Day" bonus pool
- World Chain attestations for check-in receipts
- GeoGuesser-style "Guess the city" bonus vote on submissions
- Multi-city support with per-city cohorts
