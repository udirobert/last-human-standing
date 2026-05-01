# Demo guide (Last Human Standing)

**Live app: https://lasthumanstanding.thisyearnofear.com**

**Mechanic:** A real-world elimination game. Each day a **theme drops** (e.g. "AT A CAFÉ"); players anywhere on Earth snap a photo as proof. The community votes HUMAN or SUS. First 25 to check in survive; cap shrinks until one human takes the pot.

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

## 1) The 2-minute "judge path"

### A) Pre-launch state (`phase = "prelaunch"`)

1. Open the app — see **countdown to launch** + **cohort fill counter** ("34 of 50 reserved")
2. Tap **RESERVE YOUR SLOT** → wallet auth (SIWE) → pay 1 WLD
3. Confirmation: **"You're in. Day 1 starts in T-…"**

### B) Live state (`phase = "live"`)

For demos, set `GAME_LAUNCH_AT` to a past date so the game is already live.

4. **Home** — today's **theme card**: challenge name, slots remaining (e.g., "12 / 25"), prompt, time window
5. **Check in** → take a photo matching the theme → optionally share GPS for credibility → submit
6. Server response: **"#7 of 25 surviving today"**
7. **Audit feed** — vote HUMAN / SUS on photos; check voter accuracy and infiltrator reveals
8. **Standings** — today's survivor list (rank, distance, photo thumb)
9. **Chat** — open World Chat with another survivor

### C) Eliminated state

10. After cap fills or window closes, eliminated players see a clear **"OUT"** screen with the day they fell + their final rank, and stay engaged via voting/chat for the rest of the cohort.

## 2) The 5-minute "deep path" — show the design

### Verification model

- **Photo proof** (required) — primary verification; MiniKit Sign Message wraps the check-in payload; signature stored
- **GPS metadata** (optional) — shown on submission cards as credibility signal; not a gate
- **Rank assignment** — atomic on insert, unique constraint on `(day, address)`, ordered by `created_at`
- **Crowd audit** — community votes HUMAN / SUS; DQ-and-replace at audit close (any top-N photo crossing the SUS-vote threshold is flagged and the next-ranked candidate is promoted)
- **Infiltrator mode** — gamified social deduction where players can opt-in to submit borderline photos for immunity
- **World ID** — optional gate for both check-in and voting

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
4. After window closes: `POST /api/admin/close-day { day: 1 }`
5. Repeat with shrinking caps: 25 → 12 → 6 → 3 → 1
6. Final survivor takes the pool; announce in chat
