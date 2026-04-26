# Last Human Standing

## Tagline
A daily survival game for real humans: check in, get verified by the crowd, and split a prize pool—no bots allowed.

## The problem
Online “community games” and raffles get botted instantly. Even when you add captchas, motivated attackers and sybil farms still dominate, killing engagement and fairness.

## The solution
**Last Human Standing** is a mobile-first elimination game built for World App:
1. **One human, one account**: players authenticate via World Wallet (SIWE) and we can add World ID (IDKit) to harden uniqueness.
2. **Daily check-ins**: each day has a theme (café, park, gym…). Players submit a proof-of-life post.
3. **Community verification**: other players vote real vs fake; suspicious patterns get flagged.
4. **Prize pool**: players pay a small entry fee that grows the pool; the last remaining verified human wins.
5. **World Chat-native social layer**: messaging is a core mechanic (trash talk, coordination, “verify me”, reminders).

## Why this needs World
This product only works at scale when:
- identity is **sybil-resistant** (World ID / World ecosystem)
- payments are **simple and mobile-native** (World Wallet + MiniKit)
- social interaction is **in-app and encrypted** (World Chat / XMTP)

## World Stack usage (what we integrated)
Implemented with MiniKit commands:
- **Wallet Authentication** (`MiniKit.walletAuth`) for login (SIWE)
- **Pay** (`MiniKit.pay`) for the entry fee → prize pool receiver
- **World Chat** (`MiniKit.chat`) for in-app messaging/engagement
- **Sign Message** (`MiniKit.signMessage`) to cryptographically “stamp” daily check-ins

Planned (next iteration):
- **World ID via IDKit** for stronger “one human” guarantees and better anti-bot enforcement

## Core user flow (demo script)
1. Open Mini App in World App
2. Tap **Enter the Game**
3. **Sign in (Wallet)** → SIWE
4. **Pay entry (1 WLD)** into the prize pool
5. Land on Home: see humans remaining + today’s theme
6. **Check in**: add caption → submit → sign check-in proof
7. Go to **Feed**: vote real vs fake
8. Go to **Chat**: send a message via **World Chat** to another username (e.g. invite them / call out a fake)
9. Go to **Leaderboard**: see standings + pool

## Tech notes
- Frontend: React + Vite + Tailwind
- Mini App plumbing: `@worldcoin/minikit-js`
- No heavy backend in this prototype; production version adds:
  - nonce + SIWE verification endpoint
  - Pay transaction verification endpoint
  - storage for submissions + votes

## What’s next
- Add IDKit verification (World ID) + server-side verification
- Add an on-chain contract (or World Chain attestation) to record daily check-ins + eliminate players transparently
- Push engagement loops: reminders, streak rewards, and chat-triggered re-engagement

