# Production readiness plan (Last Human Standing)

This document clarifies **modes** (demo vs real) and a concrete path to production-grade quality.

## 1) Modes (make them explicit)

### A) Demo / Browser mode
Goal: fast iteration and judge-friendly offline demo.

Behavior:
- MiniKit not installed → **simulate** wallet auth + pay.
- Feed/chat can still work in a mocked way.
- Check-in can still create a signed message *only when inside World App*, but the UI can progress without blocking.

Requirements:
- No credentials required.

### B) Real / World App mode (staging)
Goal: run inside World App with real MiniKit + optional World ID, plus persistence.

Behavior:
- SIWE wallet auth verified on backend.
- Pay verified on backend (World Dev Portal API).
- Check-ins persisted + vote tracking.
- Photo uploads via signed upload URL to Supabase Storage.

Requirements:
- Supabase (URL, anon key, service role)
- World Dev Portal API key + app id
- Optional: World ID app id + RP signing config

### C) Production mode
Goal: ship safely with real users.

Behavior:
- All “real mode” guarantees plus hardened security + observability.

Requirements:
- Everything from staging
- RLS/storage policies hardened
- Rate limiting + abuse prevention
- Monitoring/logging + alerts

## 2) System architecture (recommended)

**Client (Mini App)**
- React/Vite UI
- Calls:
  - MiniKit commands (walletAuth, pay, chat, signMessage)
  - Backend APIs for verification + persistence

**Backend (Express / API)**
- Auth:
  - Nonce generation
  - verifySiweMessage() on SIWE payload
  - httpOnly session cookie
- Verification:
  - Payment verification via World Dev Portal API
  - World ID proof verification via /api/v2/verify/{app_id}
- Storage:
  - Signed upload URLs for client media uploads
- Database:
  - submissions + votes + (later) user profile and streaks

**Supabase**
- Postgres tables: submissions, votes (+ later users, streaks)
- Storage bucket for images (checkins)

## 3) Production checklist (high impact)

### Security
- Move from in-memory sessions → DB-backed sessions or signed JWTs with rotation
- Add **rate limiting**:
  - per-IP and per-wallet address
  - stricter on /api/nonce, /api/idkit/*, /api/vote
- Harden cookie settings:
  - `secure: true` in prod
  - `sameSite: lax` (or strict depending on embed behavior)
- Validate inputs with a schema validator (zod) on all endpoints

### Supabase policies
- Storage:
  - Prefer **private bucket** + server-signed read URLs for feed
  - If public bucket: restrict writes via signed upload URLs only
- DB:
  - Turn on RLS and require server role for writes
  - Ensure unique constraints (already added for votes)

### Data model upgrades
- Add `users` table (address, world_id_verified, created_at)
- Add `streaks` (address, last_checkin_day, streak_count)
- Add `checkin_day` canonicalization (e.g., day number in UTC)

### Observability
- Structured logs (pino)
- Error tracking (Sentry)
- Basic metrics (request latency, error rates)

### Performance + UX
- Always include:
  - loading state
  - empty state
  - error state with recovery action
- Code split non-critical flows (IDKit already lazy-loaded)

## 4) UX clarity: “No confusion for judges”

Add a small persistent indicator:
- “Demo mode (browser)” OR “World App mode” OR “Production”
- If demo mode: show what is simulated (auth/pay) and what requires World App (chat/signing)

