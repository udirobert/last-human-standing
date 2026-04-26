# Last Human Standing

## Tagline
A daily survival game for real humans: check in, get verified by the crowd, and split a prize pool—no bots allowed.

## Live app
**https://lasthumanstanding.thisyearnofear.com**
Prize pool wallet: `0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046` ([view on worldscan.org](https://worldscan.org/address/0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046))

## The problem
Online "community games" and raffles get botted instantly. Even when you add captchas, motivated attackers and sybil farms still dominate, killing engagement and fairness.

## The solution
**Last Human Standing** is a mobile-first elimination game built for World App:
1. **One human, one account**: players authenticate via World Wallet (SIWE via MiniKit) — verified server-side.
2. **Daily check-ins**: each day has a theme (café, park, gym…). Players submit a proof-of-life post with a signed message.
3. **Community verification**: other players vote real vs fake; quorum-based finalization with dynamic low-activity fallback.
4. **Live prize pool**: players pay a 1 WLD entry fee that grows the on-chain pool; the last remaining verified human wins.
5. **World Chat-native social layer**: messaging is a core mechanic (trash talk, coordination, "verify me", reminders).

## Why this needs World
This product only works at scale when:
- identity is **sybil-resistant** (World ID / World ecosystem)
- payments are **simple and mobile-native** (World Wallet + MiniKit)
- social interaction is **in-app and encrypted** (World Chat / XMTP)

## World Stack usage (what we integrated)
All implemented with MiniKit commands + server-side verification:
- **Wallet Authentication** (`MiniKit.walletAuth`) — SIWE verified server-side via `verifySiweMessage`
- **Pay** (`MiniKit.pay`) — entry fee verified against World Dev Portal API; funds go to dedicated prize pool wallet on World Chain
- **World Chat** (`MiniKit.chat`) — in-app messaging/engagement; "Challenge" action in Feed opens prefilled chat to submitter
- **Sign Message** (`MiniKit.signMessage`) — cryptographically stamps daily check-ins; signature stored + verifiable
- **World ID via IDKit** — backend RP-signature flow wired (World ID 4.0 Managed mode); optional gate for voting

## Core user flow (demo script)
1. Open Mini App in World App (or browser for demo mode)
2. Tap **Enter the Game**
3. **Sign in (Wallet)** — SIWE — server verifies — session cookie set
4. **Pay entry (1 WLD)** — MiniKit Pay — server verifies with World Dev Portal — prize pool grows
5. Land on Home: see live prize pool balance + humans remaining + today's theme
6. **Check in**: add caption, submit, sign check-in proof via MiniKit
7. Go to **Feed**: vote real vs fake; quorum progress shown
8. Go to **Chat**: send a message via **World Chat** to another player
9. Go to **Leaderboard**: see standings + live pool balance

## Backend (fully deployed)
- Express API on Hetzner, served at `https://lasthumanstanding.thisyearnofear.com/api/`
- Supabase (Postgres + Storage) for persistence: submissions, votes, users, signed upload URLs
- PM2 process manager + Nginx reverse proxy + Let's Encrypt TLS
- Rate limiting on all sensitive endpoints; httpOnly session cookies; secrets never exposed client-side

## Tech stack
- Frontend: React + Vite + Tailwind, deployed as static files via Nginx
- Mini App plumbing: `@worldcoin/minikit-js` v2, `@worldcoin/idkit` v2
- Backend: Node.js + Express v5, Supabase JS v2, viem
- Infrastructure: Hetzner VPS, PM2, Nginx, Let's Encrypt

## What's next
- Private Supabase storage bucket + signed read URLs for feed images
- On-chain contract (World Chain) for transparent check-in receipts and elimination
- Streak rewards, reputation staking for challenges, push reminders
