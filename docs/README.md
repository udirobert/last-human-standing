# Last Human Standing (World Mini App)

A mobile-first Mini App concept: **a daily survival game for verified humans**.

Players:
- authenticate via **World Wallet (SIWE via MiniKit)**
- pay a small **entry fee** into a prize pool (via **MiniKit Pay**)
- check in daily with proof (signed message via **MiniKit Sign Message**)
- trash talk / coordinate via **World Chat (MiniKit Chat)**

## Local development

```bash
npm i
npm run dev:all
```

In a normal browser, MiniKit commands will fall back and some actions will be simulated.
For the real flow, open the app **inside World App**.

## Configuration

Copy `.env.example` → `.env` and set:

```bash
VITE_PRIZE_POOL_ADDRESS=0xYourPrizePoolReceiverAddress

# -------- Modes --------
# DEMO MODE (Browser): no credentials needed.
# - Wallet auth + pay will be simulated for demo iteration.
# - Feed shows mock data unless you're signed in and paid.
#
# REAL MODE (World App): requires credentials below to truly verify + persist.

# -------- Supabase (Real Mode: persistence + photo uploads) --------
# Frontend uses anon key to upload using a signed upload URL from our backend.
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
#
# Backend uses service role to:
# - create signed upload URLs
# - write/read submissions + votes
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_BUCKET=checkins

# -------- World Developer Portal (Real Mode: verify payments + World ID proofs) --------
WORLD_APP_ID=app_xxxxx
WORLD_DEV_PORTAL_API_KEY=YOUR_DEV_PORTAL_API_KEY

# -------- World ID (Optional, Real Mode: Proof of Humanity) --------
# Turn on gating in the UI:
VITE_ENABLE_IDKIT=false
VITE_WORLD_ID_APP_ID=app_xxxxx
VITE_WORLD_ID_ACTION=last-human-standing
VITE_WORLD_ID_ENV=production

# Recommended: require World ID for voting power (anti-bot brigading)
VITE_REQUIRE_WORLD_ID_FOR_VOTING=false
#
# Server-side verification + RP signatures (NEVER expose signing key in frontend):
WORLD_ID_APP_ID=app_xxxxx
WORLD_ID_ACTION=last-human-standing
WORLD_ID_RP_ID=rp_xxxxx
WORLD_ID_SIGNING_KEY=0xYOUR_SIGNING_KEY

# Enforce the above gate in the backend as well
REQUIRE_WORLD_ID_FOR_VOTING=false

# -------- Local dev convenience --------
# ONLY for local demo/dev when you don't have World Dev Portal keys wired yet.
DEV_BYPASS_VERIFICATION=true
```

## Supabase setup (optional)

If you want persistence + uploads:
1. Create a Supabase project
2. Create a storage bucket named `checkins` (or change `SUPABASE_BUCKET`)
3. Run `supabase/schema.sql` in the SQL editor

## Hackathon submission

See `submission.md` for the write-up (problem, solution, World Stack usage, demo flow).
