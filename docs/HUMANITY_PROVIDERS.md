# Multi-provider proof of humanity

Last Human Standing uses a **pluggable humanity layer** so we are not locked to a single chain or identity vendor.

## Live today

| Provider | Chain / surface | Status | Notes |
|----------|-----------------|--------|-------|
| **World ID** | World App + browser (IDKit v4) | Live | Orb verification via `/api/idkit/verify`. RP-signature flow: client fetches `/api/idkit/rp-context` (server signs with `@worldcoin/idkit-server`), widget renders with `IDKitRequestWidget` + `orbLegacy({ signal: wallet })`. Server forwards proof to `https://developer.world.org/api/v4/verify/{rp_id}`. |
| **[Self Protocol](https://docs.self.xyz/)** | Celo + multi-chain ZK passports | Live (Celo Sepolia, mock passport) | Privacy-preserving proof-of-human. Production mainnet flips in via `SELF_MOCK_PASSPORT=false`. Self Pass supports passports/IDs from 60+ countries. |
| **Wallet + WLD entry** | World Chain | Live | Sybil *cost* signal only — not proof of unique human without PoH. |
| **Celo wallet path** | Celo | Live | cUSD/USDC entry on Celo (browser path). Pair with Self verification instead of WLD-only browser path. |

## Trust tiers (product)

1. **Verified human** — World ID (or Self) nullifier on file → full voting + highest trust in audit. `TrustBadge` reads `humanityProvider` and shows "Verified · Self" vs "Verified · World ID".
2. **Provisional** — wallet signed in, no PoH yet → can play; voting may be restricted (`VITE_REQUIRE_WORLD_ID_FOR_VOTING`).
3. **Observer** — not enrolled (free entry still available; reserve a slot to play).

UI surfaces this via `TrustBadge` and `useTrustTier()`. `ModeBanner` shows the provider name on the verified tier so you can tell Self and World ID users apart at a glance.

## Recommended architecture (next sprint)

```
Client                              API                                 DB
──────                              ───                                 ──
WorldIdVerify  ──►  POST /api/idkit/rp-context  (server signs rp_context)
WorldIdVerify  ──►  POST /api/idkit/verify      ──►  users.world_id_verified
SelfVerify     ──►  POST /api/self/verify       ──►  users.humanity_provider, humanity_nullifier
Browser pay    ──►  POST /api/pay/browser-confirm
```

### Self integration (live)

1. Packages installed: `@selfxyz/core@1.2.0-beta.1`, `@selfxyz/qrcode@1.0.24`. Legacy Self Pass SDK — still fully supported per Self docs; Self Enterprise is the future but a bigger refactor.
2. Client builds a `SelfApp` via `SelfAppBuilder` with the connected wallet as `userId` and `endpointType: "staging_https"`. Renders a `<SelfQRcodeWrapper />`. User scans with the Self app.
3. Self relayer POSTs `{attestationId, proof, publicSignals, userContextData}` to `POST /api/self/verify`. The endpoint is **public** (no `requireAuth`) — the ZK proof is the auth, cryptographically bound to the wallet.
4. Server runs `SelfBackendVerifier.verify(...)` and recovers the wallet from `result.userData.userIdentifier`. Upserts `users.humanity_nullifier` + `humanity_provider = "self"` and promotes the user to `tier = "verified"`.
5. Duplicate nullifiers are rejected — one Self proof per cohort slot, same pattern as World ID.
6. **To go from staging to mainnet:** set `SELF_MOCK_PASSPORT=false` and the verifier switches to the Celo mainnet hub automatically. No code change.
7. **Forbidden countries list:** `SELF_EXCLUDED_COUNTRIES` can be set to a comma-separated list of ISO country codes (e.g. `IRN,PRK,RUS,SYR`) to reject passports from those countries. Default is empty — accepted on all origins. The circuit's embedded list must be a superset of the config list, otherwise `InvalidForbiddenCountriesList` is thrown. Mock passports (staging) do not embed a countries list, so this should be left empty in dev.

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
| `SELF_EXCLUDED_COUNTRIES` | Comma-sep ISO codes to reject (e.g. `IRN,PRK,RUS,SYR`). Keep empty for dev with mock passports. |
| `VITE_USE_CELO_TESTNET` | Add Celo Alfajores to browser wagmi chains |

## Product stance

Widening to Celo + Self is **wise** if you want:

- More reachable TAM outside World App installs
- A credible “protocol-agnostic proof-of-presence” story for enterprise
- Redundancy if one verifier is down or distrusted

Keep **one slot per nullifier per cohort** regardless of provider — World nullifier and Self nullifier should not both reserve two slots for the same person (link via optional “upgrade path” if the same wallet verifies twice).
