# Last Human Standing — 1-pager

**Live app: https://lasthumanstanding.thisyearnofear.com**

## What it is

A daily real-world elimination game for verified humans. Each day, a location pin drops; the **first 25 people physically there** with a photo + community audit survive. The cap shrinks each day until one human takes the on-chain pot.

## Three-witness verification

| Witness | What it proves | Cheat cost |
|---|---|---|
| **GPS** | You were at the pin during the window | GPS spoofing — easy alone |
| **Photo** | A real human did the prompt at the spot | AI image gen — easy alone |
| **Crowd** | Other humans confirm or flag | Sybil farming — World ID kills it |

Each one is weak alone. Combined, they form a tight gate.

## Why this needs World

- **One human, one slot** — World ID + SIWE for sybil resistance
- **Mobile-native wallet UX** — World Wallet / MiniKit, on the phone you carry to the location
- **In-app social** — World Chat / XMTP turns the audit into a spectator sport

## What's built today

- **Pre-launch waitlist + countdown** — wallet auth + 1 WLD entry locks your slot in the cohort
- **Cohort lifecycle** — `phase: 'prelaunch' | 'live' | 'ended'`, exposed via `/api/game/state`
- **Daily round model** — admin sets location (lat/lng), radius, time window, survival cap, prompt
- **Geo check-in** — server validates GPS within radius and time window, ranks by arrival, marks first N as survivors (atomic, unique on day+address)
- **Photo + signed proof** — MiniKit Sign Message stamp on every check-in
- **Audit voting** — community can flag survivors; DQ-and-replace at audit close
- **Cap shrinks daily** — 25 → 12 → 6 → 3 → 1 (configurable per day)
- **Live on-chain prize pool** — World Chain WLD balance shown live
- **World Chat coordination** — challenge/message any survivor in-app
- **Admin tooling** — `/api/admin/round`, `/api/admin/close-day` (token-gated)
- **Full backend** — Express + Supabase + PM2 + Nginx + TLS on Hetzner

## Demo flow (2 minutes)

1. **Pre-launch**: see countdown + cohort fill counter; tap **Reserve your slot** → wallet auth → pay 1 WLD
2. **Day 1 opens**: location pin + prompt revealed
3. **Check in**: app captures GPS + photo → server returns "you're rank 7 of 25"
4. **Audit**: other players vote real / fake; chat lights up
5. **Day closes**: survivors locked; eliminated players still vote on next day's audit

## Enterprise value

A reusable **proof-of-presence** layer: brand activations, IRL events, loyalty programs, civic engagement — anywhere you need to prove a real human was at a real place at a real time, with crowd-audit as the final adjudicator.

## Roadmap

- Multi-cohort scheduling (cohort #2 starts when #1 ends)
- AI-image-detection signal in audit
- Sponsor-funded "Photo of the Day" bonus pool
- World Chain attestations for check-in receipts
- Multi-city support with per-city cohorts
