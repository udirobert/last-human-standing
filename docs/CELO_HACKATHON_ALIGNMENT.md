# Celo Agents at Work Hackathon — Strategy & Registration

## 1. Overview & Strategic Timeline

Last Human Standing is competing in the **Celo Agents at Work Hackathon** (August 28 – September 14, 2026) alongside the **ETHOnline 2026** build window (September 4 – 16, 2026).

```
[ Sept 1 - 5 ]               [ Sept 4 - 8 ]               [ Sept 9 - 14 ]            [ Sept 14 @ 9am GMT ]     [ Sept 16 ]
      │                            │                            │                             │                    │
Alpha Test Run             ETHGlobal Sprint              Main Live Cohort          Celo Hackathon Deadline     ETHGlobal Wrap
(Curated 25-seat      (Integrate Self ZK &          (5-day public run with        (Final telemetry, winner      (Finale wrap)
 playtest + feedback)   AgentKit primitives)          cUSD/USDC on-chain pot)       payout & track reviews)
```

* **Alpha Test Run (Curated)**: September 1 – 5, 2026 (stress-testing daily rituals and ZK proof mechanics).
* **ETHGlobal Build Window Opens**: September 4, 2026.
* **Main Live Cohort Launch**: September 9, 2026 @ 18:00 UTC (runs 5 days: Sept 9 → 14).
* **cPay (x402) Workshop**: September 9, 2026 @ 15:00 GMT.
* **Mid-Point Hackathon Snapshot**: September 11, 2026 @ 12:00 GMT.
* **Celo Hackathon Submission Deadline**: September 14, 2026 @ 09:00 GMT (live winner crowned + on-chain prize volume).
* **ETHGlobal Finale**: September 16, 2026.

---

## 2. Playtest Funnel & Pioneer Pass (Free Mint)

To maximize quality feedback while minimizing friction, developers and community testers are directed into the **2-minute interactive speedrun simulator** (`/?demo=1`):

1. **2-Minute Simulation**: Testers experience all 5 days of riddles, proofs, commit-reveal voting, and jury cuts without schedule lock-in.
2. **Surprise Pioneer Pass (Free Mint)**:
   * Completing the speedrun unlocks an exclusive on-chain / inventory collectible: **`Pioneer Pass`**.
   * **In-Game Utility**:
     * 🎟️ **+1 Starting Jury Ticket on Day 1** in the live cohort.
     * ⚡ **Guaranteed Priority Seat** in Cohort #2 (Sept 9th).
     * 🛡️ **Exclusive "Pioneer" Aura** on their Personal Shelf.
3. **1-Click Feedback Channel**: Embedded feedback prompt at the end of the speedrun to capture UX confusion before live deployment.

---

## 3. Official Registration Record

* **Hackathon Slug**: `agents-at-work`
* **Hackathon ID**: `9c9c1bff-8e24-4193-bd57-a91d0c963368`
* **Participant ID**: `82cc79d5-d4c1-4a44-bfe5-33caafb94471`
* **Submission ID**: `b01750d5-c554-4839-a12c-8b523df07469`
* **Assigned Attribution Tag**: `celo_431e6208414d`
* **PioneerPass Smart Contract (Celo Mainnet)**: `0xc5883e6400d6a21ba380f91bb0a74cc54d7cfa44` ([Celoscan ↗](https://celoscan.io/address/0xc5883e6400d6a21ba380f91bb0a74cc54d7cfa44))
* **PioneerPass Smart Contract (World Chain Mainnet)**: `0x5ae66f26ea17ff6499a9fad4bdb299e73cec59e1` ([Worldscan ↗](https://worldscan.org/address/0x5ae66f26ea17ff6499a9fad4bdb299e73cec59e1))
* **Live Leaderboard**: [Dune Dashboard](https://dune.com/celo/agents-at-work-hackathon)

---

## 4. Registered Tracks & Strategic Alignment

| Track / Bounty | Target Prize | Rationale & Primitives |
| :--- | :---: | :--- |
| **Track 4: Judges' Favorite** *(Primary)* | **$500** | Zero-knowledge proof-of-human presence using **Self (`@selfxyz/core`)** and **World ID** on Celo vs. AI agent impersonation. |
| **Track 2: Real World Adoption** | **$1,000** | Multi-channel adoption across Mobile Web, MiniKit, and Farcaster frames with verified returning players. |
| **Track 2: Best Stablecoin Adoption** | **$750** | Daily prize pool and entry fee settlement in `cUSD` and `USDC` on Celo. |
| **Track 1: Value Moved** | **$1,500 / $500** | Real on-chain value escrowed in prize contracts (`/api/pay/browser-celo-confirm`) and automated winner payouts (`server/lib/ariaAgent.js`). |
| **Track 5: cPay / "buy" Beta** | **$250** *(5 × $50)* | Closed-beta opt-in for HTTP 402 payment flows for AI agent tasks and validation. |

---

## 5. On-Chain Attribution Rules

All Celo mainnet transactions (entry fees, relayer votes, winner payouts) must include the assigned attribution tag:
```
Tag: celo_431e6208414d
Hex Suffix: 63656c6f5f343331653632303834313464
```
Transactions carry this suffix in their `data` payload so Dune queries automatically attribute volume, users, and transactions to the project on the live leaderboard.

---

## 6. Dual-Rail Architecture (World Chain & Celo Mainnet)

The collectible and identity infrastructure operates symmetrically across both supported ecosystems:

| Dimension | **Celo Mainnet Rail** | **World Chain / World ID Rail** |
| :--- | :--- | :--- |
| **Smart Contract** | `PioneerPass.sol` at `0xc5883e6400d6a21ba380f91bb0a74cc54d7cfa44` | `PioneerPass.sol` deployable via `CHAIN=worldchain scripts/deploy-pioneer-pass.js` |
| **Identity / Sybil Proof** | **Self (`@selfxyz/core`)** ZK Passport / Selfie | **World ID** Orb / Device Zero-Knowledge Nullifiers |
| **Gasless Model** | Server Relayer with `celo_431e6208414d` tag suffix | World App Native Paymaster / Server Relayer |
| **Edition Allocation** | **#051 to #100** (50 Celo / Self Playtesters) | **#001 to #050** (50 World ID Playtesters) |
| **Visual Theme** | Antique Brass Compass & Sunlit Gold Hearth (`/motifs/pioneer-artifact-celo.jpg`) | Luminous Celestial Emerald Orb & Platinum Iris (`/motifs/pioneer-artifact-world.jpg`) |
| **Explorer Verification** | [Celoscan ↗](https://celoscan.io/address/0xc5883e6400d6a21ba380f91bb0a74cc54d7cfa44) | [Worldscan ↗](https://worldscan.org) |
| **Token Standard** | **Soulbound ERC-721** (Non-transferable to prevent secondary exploitation) | **Soulbound ERC-721** / Verified Credential Receipt |
| **In-Game Perks** | +1 Starting Jury Ticket on Day 1 · Guaranteed Priority Seat · Pioneer Shelf Aura | Same universal perks unlocked across all platforms |

