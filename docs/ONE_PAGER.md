# Last Human Standing — 1‑pager (judges)

**Live app: https://lasthumanstanding.thisyearnofear.com**

## What it is
A daily elimination game for **real humans**: check in with proof, the community verifies, the last verified human wins the prize pool.

## Why this wins on World
- **Proof of humanity**: World ID + sybil resistance for fair outcomes
- **Mobile-first wallet UX**: World Wallet / MiniKit keeps pay + signing frictionless
- **In-app social loop**: World Chat (XMTP) is the coordination + challenge layer

## What's built (today)
- Wallet login (SIWE) via **MiniKit.walletAuth** + server-side verification
- Entry fee payment via **MiniKit.pay** + server-side verification against World Dev Portal API
- Daily check-ins: photo upload + signed proof via **MiniKit.signMessage**
- Community verification: voting + **quorum-based** finalization + dynamic low-activity quorum
- World Chat integration: **challenge** and engagement actions via **MiniKit.chat**
- World ID 4.0 (Managed mode) RP-signature flow wired; optional voting gate
- Live prize pool balance on World Chain (`0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046`)
- Full backend: Express + Supabase + PM2 + Nginx + TLS

## Demo flow (2 minutes)
Onboarding → wallet auth → pay entry → (optional) World ID → check-in → vote → challenge via World Chat → leaderboard.

## Enterprise value / scalability
- A reusable **human-verified participation layer** for promotions, loyalty programs, IRL activations, and brand/community campaigns.
- Built-in defense against bots and sybil farms using World's stack (ID + wallet + messaging).

## Next milestones
- Private storage + signed reads, RLS locked down
- Rate limiting + reputation + staking for challenges
- World Chain attestation for check-in receipts and transparent elimination
