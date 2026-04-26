# Last Human Standing — 1‑pager (judges)

## What it is
A daily elimination game for **real humans**: check in with proof, the community verifies, the last verified human wins the prize pool.

## Why this wins on World
- **Proof of humanity**: World ID + sybil resistance for fair outcomes
- **Mobile-first wallet UX**: World Wallet / MiniKit keeps pay + signing frictionless
- **In-app social loop**: World Chat (XMTP) is the coordination + challenge layer

## What’s built (today)
- Wallet login (SIWE) via **MiniKit.walletAuth** + backend verification
- Entry fee payment via **MiniKit.pay** + backend verification
- Daily check-ins: photo upload + signed proof via **MiniKit.signMessage**
- Community verification: voting + **quorum-based** finalization + dynamic low-activity quorum
- World Chat integration: **challenge** and engagement actions via **MiniKit.chat**

## Demo flow (2 minutes)
Onboarding → wallet auth → pay entry → (optional) World ID → check-in → vote → challenge via World Chat → leaderboard.

## Enterprise value / scalability
- A reusable **human-verified participation layer** for promotions, loyalty programs, IRL activations, and brand/community campaigns.
- Built-in defense against bots and sybil farms using World’s stack (ID + wallet + messaging).

## Next milestones
- Private storage + signed reads, RLS locked down
- Rate limiting + reputation + staking for challenges
- World Chain attestation for check-in receipts and transparent elimination

