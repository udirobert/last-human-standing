# Demo guide (Last Human Standing)

## 0) Setup checklist (before judges)
- Open the mini app **inside World App** (for real MiniKit flows).
- Ensure the test wallet has enough balance to:
  - pay the entry fee (WLD)
  - optionally send a tiny “challenge” message in World Chat
- If using Supabase:
  - schema applied (see `supabase/schema.sql`)
  - storage bucket exists (`SUPABASE_BUCKET`, default `checkins`)

## 1) The 2‑minute “judge path” demo
**Goal:** show World-native identity + payment + social + verification loop.

1. **Onboarding**
   - Tap **Sign in (Wallet)** → SIWE via MiniKit → returns to app
   - Tap **Pay entry** → MiniKit Pay → show “verified receipt” state
   - (Optional) Tap **Verify World ID** (only if enabled + reliable)
2. **Home**
   - Show **Warmup vs Prize round active** indicator
   - Show today’s theme + countdown
3. **Check-in**
   - Capture/upload a photo
   - Submit → show **signed proof** and “finalizes at X votes”
4. **Feed**
   - Vote “REAL” on a submission
   - Highlight quorum progress: “X more votes to finalize”
   - Tap **Challenge** → opens **World Chat** prefilled message to submitter
5. **Leaderboard**
   - Show prize pool + “joined / quorum” progress

## 2) The 5‑minute “deep path” demo
**Goal:** prove production readiness + anti-bot design.

1. Show `.env` configuration and explain “Demo vs World App mode”
2. Show backend guarantees:
   - SIWE verified server-side
   - payments verified via World Dev Portal API
   - uploads are signed URLs (no public write access)
3. Show dynamic quorum:
   - low activity day reduces quorum (server decides)
   - per-submission quorum is persisted for fairness
4. Explain roadmap:
   - private bucket signed reads
   - RLS + rate limiting
   - reputation + staking for challenges

## 3) If something fails live (backup plan)
- If payment verification keys aren’t available, demo in “preview mode” and narrate the real verification path.
- If World ID verification is flaky, keep it optional and emphasize:
  - SIWE + paid entry + one-vote-per-user constraint + quorum.

