# Demo guide (Last Human Standing)

**Live app: https://lasthumanstanding.thisyearnofear.com**

**Mechanic:** A real-world elimination game. Each day a **theme drops** (e.g. "AT A CAFÉ"); players anywhere on Earth snap a photo as proof. The community votes HUMAN or SUS. First 25 to check in survive; cap shrinks until one human takes the pot.

## Send-a-link path (primary)

**Speed run:** https://lasthumanstanding.thisyearnofear.com/?demo=1

Telegram-ready message:

> check this out — https://lasthumanstanding.thisyearnofear.com/?demo=1  
> 15 min speed run of the full 5-day cohort

Guided client demo (~8–10 min). No payment. Seeded NPCs. Ends with **Reserve for Cohort 1**.

**5-day compressed arc** (decoy themes — deliberately *not* the live drop order):

1. **Transit** — photo check-in → rank → audit (HUMAN/SUS) → cut + DQ-and-replace
2. **Gym** — infiltrator unlock → honest vs bluff → outcome → cut (skip-to-finale available)
3. **Grocery** — pressure + inherit-a-slot easter egg → cut
4. **Beach** — wildcard jury vote → revive an NPC
5. **Eating** — finale ceremony → share card → reserve

Also available from the landing CTA **Try the 15-min speed run**.

> Spoiler note: demo themes are chosen from outside the cohort schedule so partners and players can't reverse-engineer the real drop order from `/?demo=1`.

**Immersion:** Shared warm room (`AmbientBackdrop` + soft `AmbientMotifs`) + MotifFrieze / ThemeMotif / DozingCat on every beat — same dialect as the live app. Cuelume press/hover/success, Delight confetti on peak beats, mute toggle, **Built with World · Self · Celo** on intro + finale.

---

## 0) Pre-flight checks

```bash
# Backend healthy?
curl https://lasthumanstanding.thisyearnofear.com/api/health
#  → {"ok":true,"supabase":true}

# What phase is the game in?
curl https://lasthumanstanding.thisyearnofear.com/api/game/state
#  → { "phase": "prelaunch" | "live" | "ended", ... }
```

- For real flow: open inside World App with WLD balance ≥ 1.
- For browser demos: any browser — connect a wallet (MetaMask, WalletConnect, etc.) and pay the 1 WLD entry fee on World Chain.

## 1) The 2-minute "judge path" (real cohort)

### A) Pre-launch state (`phase = "prelaunch"`)

1. Open the app — see **countdown to launch** + **cohort fill counter** ("34 of 50 reserved")
2. Tap **RESERVE YOUR SLOT** → optional **verify first** card (World ID + Self) → wallet auth (SIWE) → pay 1 WLD
3. Confirmation: **"You're in. Day 1 starts in T-…"**

> **Verify-first tip**: in the Reserve step, the World ID + Self verify card
> renders *above* the paid card. Users can connect a wallet, prove identity,
> and only then pay — which promotes them straight to the `verified` tier
> instead of the `provisional` "paid but unverified" tier. If they skip
> verify, they can still play but voting may be restricted when
> `VITE_REQUIRE_WORLD_ID_FOR_VOTING=true`.

### B) Live state (`phase = "live"`)

For demos, set `GAME_LAUNCH_AT` to a past date so the game is already live.

4. **Home** — today's **theme card**: challenge name, slots remaining (e.g., "12 / 25"), prompt, time window
5. **Check in** → take a photo matching the theme → optionally share GPS for credibility → submit
6. Server response: **"#7 of 25 surviving today"**
7. **Audit feed** — vote HUMAN / SUS on photos; check voter accuracy (the feed is publicly viewable — spectators can watch, voting requires entry)
8. **Standings** — today's survivor list (rank, distance, photo thumb)
9. **Chat** — open World Chat with another survivor

### C) Eliminated state

10. After cap fills or window closes, eliminated players see a clear **"OUT"** screen with the day they fell + their final rank, and stay engaged via voting/chat for the rest of the cohort.

## 2) The 5-minute "deep path" — show the design

### Verification model

- **Photo proof** (required) — primary verification; MiniKit Sign Message wraps the check-in payload; signature stored
- **GPS metadata** (optional) — shown on submission cards as credibility signal; not a gate
- **Rank assignment** — atomic on insert, unique constraint on `(day, address)`, ordered by `created_at`
- **Crowd audit with consequences** — at day close, every pending submission is finalized (weighted votes; ≥30% SUS with 3+ votes = flagged); flagged survivors are DISQUALIFIED and the highest-ranked "too late" check-ins inherit their slots (DQ-and-replace)
- **Infiltrator mode** — opt-in social deduction with real stakes: crowd votes you HUMAN → immunity through the next day's cut; crowd flags you → DQ'd and any held immunity is burned. Infiltrator status is hidden from the audit feed
- **Jury system** — eliminated players keep playing as the jury: their votes count double once their audit accuracy is ≥80% (min 5 resolved votes), and every correct verdict vote earns a jury ticket that weights the next cohort's free-entry lottery
- **Lottery v2** — entry tickets are weighted by referral count and jury tickets (deterministic, replayable)
- **Endgame** — when one human remains, the game enters the `ended` phase and the app announces the winner
- **Push notifications** — round open, 1-hour-left warning, you survived, audit verdict summary, eliminated, winner announced
- **World ID** — optional gate for both check-in and voting

### Interactive Layer

- **Onboarding** — a tight 4-step flow: Welcome → Rules → Reserve/pay 1 WLD → celebration. No subscriptions, no upsells.
- **Dynamic Web Audio Soundscape** — Tap through the UI (onboarding steps, check-in, votes) to experience zero-latency custom-synthesized SFX generated programmatically via Web Audio.
- **Extensible PoH (Self Protocol)** — Toggle the `VITE_ENABLE_SELF` flag to show the Celo/Self Protocol onboarding block, illustrating how the codebase supports pluggable humanity providers beyond World ID.

### Admin tooling

```bash
# Reveal Day 1 (global theme — no GPS pin)
curl -X POST https://lasthumanstanding.thisyearnofear.com/api/admin/round \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "day": 1,
    "name": "AT A CAFÉ",
    "place_type": "AT A CAFÉ",
    "survival_cap": 25,
    "opens_at": "2026-05-02T15:00:00Z",
    "closes_at": "2026-05-02T19:00:00Z",
    "prompt": "Show us your café — anywhere in the world"
  }'

# Close a day → marks non-survivors as eliminated
curl -X POST https://lasthumanstanding.thisyearnofear.com/api/admin/close-day \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"day": 1}'
```

### Backend guarantees

- SIWE verified server-side (`verifySiweMessage` from `@worldcoin/minikit-js`)
- Payments verified via World Dev Portal API
- Photo uploads via signed URLs (no public write to Supabase)
- httpOnly session cookies; secrets never client-side
- Rate limiting on `/api/nonce`, `/api/complete-siwe`, `/api/vote`, `/api/checkin/location`
- Per-day uniqueness enforced at DB layer

## 3) If something fails live (backup plan)

- **GPS denied** → no problem — GPS is optional; photo + community voting is the primary trust layer
- **World App keys missing** → browser wallet flow still works; no demo bypass exists
- **Wallet not connected** → prompt to connect via MetaMask or WalletConnect before the entry fee step

## 4) Pilot script (50-user test)

1. Day 0: open reservations (`GAME_LAUNCH_AT` ~3 days out)
2. Share the URL; reach `COHORT_SIZE` reservations OR wait for countdown
3. Day 1: `POST /api/admin/round` with the day's theme/window/cap=25 (GPS coords optional for local events)
4. After window closes: `POST /api/admin/close-day { day: 1 }` — finalizes pending audit verdicts and runs DQ-and-replace
5. Repeat with shrinking caps: 25 → 12 → 6 → 3 → 1
6. When one human remains, the game enters the `ended` phase and the app announces the winner (push notification included)
---

## Celo Integration (for Onchain Agents Hackathon)

This app now supports Celo-native payments and Self Protocol verification.

### Celo payment flows

| Endpoint | Description |
|----------|-------------|
| `/api/pay/browser-celo-confirm` | Verifies cUSD/USDC payments on Celo mainnet (RPC: forno.celo.org) |
| `/api/self/verify` | Self Protocol proof-of-humanity on Celo |
| `/api/aria/agent` | ARIA agent identity (ERC-8004 DID) |
| `/api/aria/verify` | Autonomous photo verification |
| `/api/aria/suggest` | Round theme suggestions |
| `/api/aria/x402` | x402 payment protocol challenges |

### Setup for Celo demo

```bash
VITE_CELO_PRIZE_POOL_ADDRESS=<celo-address-to-receive-entry-fees>
CELO_RPC=https://forno.celo.org
SELF_ENABLED=true
SELF_SCOPE=last-human-standing
SELF_MOCK_PASSPORT=true
VITE_ENABLE_SELF=true
VITE_USE_CELO_TESTNET=false
```

### ARIA agent registration

```bash
curl -X POST https://lasthumanstanding.thisyearnofear.com/api/aria/register \
  -H "x-admin-token: $ADMIN_TOKEN"

curl https://lasthumanstanding.thisyearnofear.com/api/aria/agent
```
