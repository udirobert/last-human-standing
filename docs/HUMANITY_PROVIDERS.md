# Multi-provider proof of humanity

Last Human Standing uses a **pluggable humanity layer** so we are not locked to a single chain or identity vendor.

## Live today

| Provider | Chain / surface | Status | Notes |
|----------|-----------------|--------|-------|
| **World ID** | World App + browser (IDKit) | Live | Orb verification via `/api/idkit/verify`. Primary path for World cohort. |
| **Wallet + WLD entry** | World Chain | Live | Sybil *cost* signal only — not proof of unique human without PoH. |

## Planned

| Provider | Chain / surface | Status | Why add it |
|----------|-----------------|--------|------------|
| **[Self Protocol](https://docs.self.xyz/)** | Celo (+ multi-chain ZK passports) | Planned | Privacy-preserving proof-of-human; strong fit for Celo-native and “verify once, play anywhere” positioning. Self Pass supports passports/IDs from 60+ countries. |
| **Celo wallet path** | Celo | Planned | Lower-friction entry for users who already live on Celo; pair with Self verification instead of WLD-only browser path. |

## Trust tiers (product)

1. **Verified human** — World ID (or future Self nullifier) on file → full voting + highest trust in audit.
2. **Provisional** — paid entry, no PoH yet → can play; voting may be restricted (`VITE_REQUIRE_WORLD_ID_FOR_VOTING`).
3. **Unverified** — not enrolled.

UI surfaces this via `TrustBadge` and `useTrustTier()`.

## Recommended architecture (next sprint)

```
Client                    API                         DB
──────                    ───                         ──
WorldIdVerify  ──►  POST /api/idkit/verify     ──►  users.world_id_verified
SelfVerify     ──►  POST /api/self/verify      ──►  users.humanity_provider, humanity_nullifier
Browser pay    ──►  POST /api/pay/browser-confirm
```

### Self integration sketch

1. Register app in [Self developer docs](https://docs.self.xyz/self-pass/self-pass).
2. Client runs Self Pass flow → obtains ZK proof + nullifier.
3. Server verifies proof against Self verifier contract / API.
4. Store **one nullifier per cohort** (same pattern as World ID) in `users.humanity_nullifier` with `humanity_provider = 'self'`.
5. Reject duplicate nullifiers across paid cohort slots.

### Celo-specific notes

- Use **Celo Sepolia** for dev ([faucet](https://faucet.celo.org/celo-sepolia)).
- Prize pool could remain WLD on World Chain for cohort #1, or add a **Celo cUSD** side pool for Celo-only mini-cohorts.
- Self is explicitly positioned for sybil resistance, airdrops, and QF — same problem we solve.

## Env flags

| Variable | Purpose |
|----------|---------|
| `VITE_ENABLE_IDKIT` | World ID widget in onboarding |
| `VITE_REQUIRE_WORLD_ID_FOR_VOTING` | Gate `/api/vote` on verified PoH |
| `VITE_ENABLE_SELF` | Show Self verify UI in onboarding |
| `SELF_ENABLED` | Enable `POST /api/self/verify` on API |
| `SELF_VERIFY_ENDPOINT` | Public URL Self relayers call (defaults to `PUBLIC_API_URL`) |
| `SELF_MOCK_PASSPORT` | `true` for Celo Sepolia / mock passports |
| `VITE_USE_CELO_TESTNET` | Add Celo Alfajores to browser wagmi chains |

## Product stance

Widening to Celo + Self is **wise** if you want:

- More reachable TAM outside World App installs
- A credible “protocol-agnostic proof-of-presence” story for enterprise
- Redundancy if one verifier is down or distrusted

Keep **one slot per nullifier per cohort** regardless of provider — World nullifier and Self nullifier should not both reserve two slots for the same person (link via optional “upgrade path” if the same wallet verifies twice).
