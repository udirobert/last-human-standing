# Last Human Standing

## Tagline
A daily real-world elimination game for verified humans: snap a photo matching today's theme from anywhere on Earth, survive the community vote, and split the prize pool — no bots allowed.

## Live app
**https://lasthumanstanding.thisyearnofear.com**
Prize pool wallet: `0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046` ([view on worldscan.org](https://worldscan.org/address/0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046))

## The problem
Online "community games" and IRL activations get botted instantly. Captchas fail; even World ID alone can't tell whether someone actually showed up to a place. Without a robust proof-of-presence layer, brand activations and civic engagement campaigns devolve into farms.

## The solution
**Last Human Standing** is a mobile-first elimination game built for World App. A cohort of N humans (default 50) competes over ~5 days. Each day:

1. **Theme reveal** — admin drops a theme/place type (e.g. "AT A CAFÉ") + time window + photo prompt
2. **Three-witness check-in** — players prove they did the challenge via:
   - **Photo** (required — camera capture matching the theme)
   - **GPS** (optional — adds location credibility metadata for voters)
   - **Crowd** (community votes HUMAN / SUS on the photo)
3. **First-N survive** — first 25 valid arrivals (by timestamp) survive; the rest are eliminated
4. **Audit & replace** — at audit close, any survivor whose photo is flagged as SUS by the crowd is disqualified and the next-ranked candidate is promoted
5. **Infiltrator Mode** — optionally submit borderline photos for immunity, gamifying the audit layer
6. **Cap shrinks** — 25 → 12 → 6 → 3 → 1 over the cohort
7. **Last human takes the on-chain pool**

Before Day 1, the app shows a **countdown + waitlist**: "RESERVE YOUR SLOT" = wallet auth + 1 WLD entry fee, locked into the prize pool.

## Why this needs World
This product only works at scale when:
- **Identity is sybil-resistant** — World ID + SIWE for one human, one slot
- **Payments are mobile-native** — World Wallet + MiniKit Pay (the user is on their phone, going to the spot)
- **Social is in-app and encrypted** — World Chat / XMTP turns the audit into a spectator sport

## Three-witness verification (the core innovation)

Photo + crowd voting is the primary trust layer. GPS is optional bonus credibility — shown as metadata on submission cards so voters can factor it in.

- AI image generators exist → but the crowd catches them
- Sybil voting exists → mitigated by World ID (one human, one vote)
- GPS spoofing exists → but it's just metadata, not a gate

The social deduction layer (HUMAN/SUS voting + Infiltrator mode) makes cheating costly.

## World Stack usage

| Capability | Implementation |
|---|---|
| Wallet Authentication | `MiniKit.walletAuth` → server `verifySiweMessage` → httpOnly session cookie |
| Pay | `MiniKit.pay` → server-verified against World Dev Portal API → on-chain pot on World Chain |
| World Chat | `MiniKit.chat` — Survivors Lobby (real-time broadcast chat in mini app), challenge DMs, infiltrator reveal announcements |
| Sign Message | `MiniKit.signMessage` — cryptographic stamp on every check-in payload |
| World ID | IDKit v4 Managed mode (RP-signature flow); optional gate for check-in & voting |

## Core user flow (demo script)

1. Open the Mini App → see **prelaunch countdown + cohort fill counter**
2. Tap **Reserve your slot** → SIWE → pay 1 WLD → "You're in. Day 1 starts in T-…"
3. **Day 1 opens** → Home shows the theme card (challenge, slots remaining, prompt, time window)
4. **Check in** → take a photo matching the theme → optionally share GPS → submit → "**#7 of 25 surviving today**"
5. **Audit feed** → vote on other players' photos
6. **Standings** → today's survivor list with ranks
7. **Chat** → message a fellow survivor via World Chat
8. **Day closes** → cap shrinks, next round revealed

## Backend (fully deployed)
- Express API on Hetzner: `https://lasthumanstanding.thisyearnofear.com/api/`
- Endpoints: `/api/game/state`, `/api/checkin/location`, `/api/admin/round`, `/api/admin/close-day`, `/api/stats`, `/api/feed`, `/api/chat`, `/api/chat/messages`, `/api/cohort/roster`, `/api/referral-board`, `/api/waitlist`, `/api/voter-stats/:address`, plus auth/pay/vote endpoints
- Supabase (Postgres + Storage): `users`, `rounds`, `checkins`, `submissions`, `votes`, `voter_stats`, `chat_messages`, `waitlist`
- PM2 + Nginx + Let's Encrypt TLS
- httpOnly session cookies, rate limiting on sensitive endpoints, secrets server-side only

## Tech stack
- Frontend: React + Vite + Tailwind + Framer Motion
- Mini App SDK: `@worldcoin/minikit-js` v2, `@worldcoin/idkit` v2
- Backend: Node.js + Express v5, `@supabase/supabase-js` v2, viem
- Geo: server-side haversine (optional GPS metadata); navigator.geolocation in client (opt-in)
- Infra: Hetzner VPS, PM2, Nginx, Let's Encrypt

## Enterprise value
A reusable **proof-of-presence** layer: brand activations, IRL events, retail loyalty, civic engagement, conferences — anywhere you need cryptographic evidence that a real human was at a real place at a real time, with a crowd-audit fallback.

## Key features built during hackathon
- **🤖 ARIA AI Companion (Character Chat)** — Integrated an interactive AI companion (ARIA) with multiple configurable personalities (Guide, Mentor, Rival, Ally) powered by unified Venice/AISA One/Featherless APIs to support and guide survivors.
- **🔊 Immersive Audio Layer (Sound Design)** — Fully custom, low-latency synthetic sound effects (clicks, success, milestone, errors, and mascot reactions) generated using the Web Audio API to deliver a premium gamey feel without network lag.
- **✨ Competitor-Optimized Onboarding Flow** — Expanded 9-stage onboarding flow building user investment: customized mascot responses, survival style profiling, tiered plans, 7-day free trial on annual subscriptions, and a 70%-off Exit Intent retention modal.
- **🛡️ Pluggable Multi-Provider Proof of Humanity** — Prepared a flexible, pluggable PoH architecture supporting World ID (live) and preparing Self Protocol (Celo Sepolia / Alfajores) with developer mock/verify endpoints and reusable database schema.
- **Blind voting** — tallies hidden until you vote, removing anchoring bias
- **🔥 Fire reactions** — non-binding style points on submissions
- **🎭 Infiltrator Mode** — opt-in social deduction: submit borderline photos for immunity or double elimination risk
- **Voter accuracy tracking** — `voter_stats` table tracks correct/incorrect votes, accuracy % displayed as badges
- **Email collection + referral leaderboard** — viral growth loop with priority check-in rewards for top referrers
- **Real lobby chat** — Survivors Lobby in World App with real messages (browser demo keeps fake bot messages)
- **PWA support** — manifest + install prompt for daily game retention
- **Error boundary + loading skeletons** — production-grade UX
- **Global theme-based check-ins** — GPS optional, photo + community voting is the trust layer

## Roadmap
- Audit DQ-and-replace turned ON in production (currently non-binding in pilot)
- Multi-cohort scheduling (cohort #2 spawns when #1 ends)
- AI-image-detection signal in the audit
- GeoGuesser-style "Guess the city" bonus vote on submissions
- Anti-spoof: EXIF stripping + perceptual photo hashing
- Sponsor-funded "Photo of the Day" bonus pool
- World Chain attestations for check-in receipts
- Multi-city cohorts
