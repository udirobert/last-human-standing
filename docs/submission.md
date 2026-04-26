# Last Human Standing

## Tagline
A daily real-world elimination game for verified humans: be one of the first 25 at the location, prove it three ways, and split the prize pool — no bots allowed.

## Live app
**https://lasthumanstanding.thisyearnofear.com**
Prize pool wallet: `0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046` ([view on worldscan.org](https://worldscan.org/address/0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046))

## The problem
Online "community games" and IRL activations get botted instantly. Captchas fail; even World ID alone can't tell whether someone actually showed up to a place. Without a robust proof-of-presence layer, brand activations and civic engagement campaigns devolve into farms.

## The solution
**Last Human Standing** is a mobile-first elimination game built for World App. A cohort of N humans (default 50) competes over ~5 days. Each day:

1. **Location reveal** — admin drops a GPS pin + radius + time window + photo prompt
2. **Three-witness check-in** — players prove they're there via:
   - **GPS** (server-validated proximity in window)
   - **Photo** (camera capture matching the prompt)
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

Each witness is weak alone:
- GPS spoofers exist
- AI image generators exist
- Sybil voting exists (mitigated by World ID)

Combined, the cheating cost is high — you'd have to spoof location **and** generate a photo matching a live, never-seen-before prompt **and** survive the crowd vote.

## World Stack usage

| Capability | Implementation |
|---|---|
| Wallet Authentication | `MiniKit.walletAuth` → server `verifySiweMessage` → httpOnly session cookie |
| Pay | `MiniKit.pay` → server-verified against World Dev Portal API → on-chain pot on World Chain |
| World Chat | `MiniKit.chat` — challenge / coordinate / trash-talk in-app |
| Sign Message | `MiniKit.signMessage` — cryptographic stamp on every check-in payload |
| World ID | IDKit v4 Managed mode (RP-signature flow); optional gate for check-in & voting |

## Core user flow (demo script)

1. Open the Mini App → see **prelaunch countdown + cohort fill counter**
2. Tap **Reserve your slot** → SIWE → pay 1 WLD → "You're in. Day 1 starts in T-…"
3. **Day 1 opens** → Home shows the location card (name, distance, slots remaining, prompt, time window)
4. **Check in** → grant geolocation → take photo → submit → "**#7 of 25 surviving today**"
5. **Audit feed** → vote on other players' photos
6. **Standings** → today's survivor list with ranks and distances
7. **Chat** → message a fellow survivor via World Chat
8. **Day closes** → cap shrinks, next round revealed

## Backend (fully deployed)
- Express API on Hetzner: `https://lasthumanstanding.thisyearnofear.com/api/`
- Endpoints: `/api/game/state`, `/api/checkin/location`, `/api/admin/round`, `/api/admin/close-day`, `/api/stats`, plus auth/pay/vote endpoints
- Supabase (Postgres + Storage): `users`, `rounds`, `checkins`, `submissions`, `votes`
- PM2 + Nginx + Let's Encrypt TLS
- httpOnly session cookies, rate limiting on sensitive endpoints, secrets server-side only

## Tech stack
- Frontend: React + Vite + Tailwind + Framer Motion
- Mini App SDK: `@worldcoin/minikit-js` v2, `@worldcoin/idkit` v2
- Backend: Node.js + Express v5, `@supabase/supabase-js` v2, viem
- Geo: server-side haversine; navigator.geolocation in client
- Infra: Hetzner VPS, PM2, Nginx, Let's Encrypt

## Enterprise value
A reusable **proof-of-presence** layer: brand activations, IRL events, retail loyalty, civic engagement, conferences — anywhere you need cryptographic evidence that a real human was at a real place at a real time, with a crowd-audit fallback.

## Roadmap
- Audit DQ-and-replace turned ON in production (currently non-binding in pilot)
- Multi-cohort scheduling (cohort #2 spawns when #1 ends)
- AI-image-detection signal in the audit
- Anti-spoof: reject low-accuracy GPS, detect impossible velocity, EXIF stripping + perceptual photo hashing
- Sponsor-funded "Photo of the Day" bonus pool
- World Chain attestations for check-in receipts
- Multi-city cohorts
