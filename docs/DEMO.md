# Demo guide (Last Human Standing)

**Live app: https://lasthumanstanding.thisyearnofear.com**

## 0) Setup checklist (before judges)
- Open the mini app **inside World App** for real MiniKit flows (wallet auth, pay, sign, chat).
- In a browser, demo mode simulates wallet auth + pay so the full UI flow is visible without World App.
- Ensure the test wallet has enough WLD balance to pay the entry fee (1 WLD).
- Backend is live: `https://lasthumanstanding.thisyearnofear.com/api/health` returns `{"ok":true,"supabase":true}`.

## 1) The 2-minute "judge path" demo
**Goal:** show World-native identity + payment + social + verification loop.

1. **Onboarding**
   - Tap **Sign in (Wallet)** — SIWE via MiniKit — server verifies — session set
   - Tap **Pay entry** — MiniKit Pay — server verifies against World Dev Portal — prize pool grows
   - (Optional) Tap **Verify World ID** (World ID 4.0 Managed mode, if enabled)
2. **Home**
   - Show **live prize pool balance** (WLD on World Chain, tappable — opens worldscan.org)
   - Show **Warmup vs Prize round active** indicator
   - Show today's theme + countdown
3. **Check-in**
   - Capture/upload a photo
   - Submit — show **signed proof** and "finalizes at X votes"
4. **Feed**
   - Vote "REAL" on a submission
   - Highlight quorum progress: "X more votes to finalize"
   - Tap **Challenge** — opens **World Chat** prefilled message to submitter
5. **Leaderboard**
   - Show prize pool + "joined / quorum" progress

## 2) The 5-minute "deep path" demo
**Goal:** prove production readiness + anti-bot design.

1. Show live health endpoint: `curl https://lasthumanstanding.thisyearnofear.com/api/health`
2. Show backend guarantees:
   - SIWE verified server-side (`verifySiweMessage` from `@worldcoin/minikit-js`)
   - Payments verified via World Dev Portal API
   - Uploads are signed URLs (no public write access to Supabase storage)
   - Rate limiting on nonce, SIWE, vote, and verify endpoints
   - httpOnly session cookies; all secrets server-side only
3. Show dynamic quorum:
   - Low activity day reduces quorum (server decides)
   - Per-submission quorum is persisted for fairness
4. Show live prize pool stats: `curl https://lasthumanstanding.thisyearnofear.com/api/stats`
5. Explain roadmap:
   - Private bucket signed reads + RLS
   - On-chain check-in receipts (World Chain attestation)
   - Reputation + staking for challenges

## 3) If something fails live (backup plan)
- If payment verification keys aren't available, demo in "preview mode" and narrate the real verification path.
- If World ID verification is flaky, keep it optional and emphasize:
  - SIWE + paid entry + one-vote-per-user constraint + quorum.
- Browser demo mode always works without World App — use it as fallback.
