# Meshy Asset Pipeline

How AI-generated art enters Last Human Standing. **Meshy is a vendor, never a runtime dependency** — every asset is generated offline, downloaded, and committed (or mirrored to CDN). The sim stays deterministic; no generation call ever happens in the request path.

Auth: `MESHY_API_KEY` in `.env.local` (server-side only, never `VITE_`).
Agent path: the `meshy` MCP server (28 tools, same credit pool). Batch path: **`scripts/vendor-meshy.mjs`** — REST wrapper covering `text-to-image`, `image-to-image`, `image-to-3d`, `text-to-3d`, and `status`, with polling, format selection, and manifest append (`--manifest none` to skip).
Provenance: every generated file gets an entry in `docs/promo-assets/meshy/manifest.json` (task id, model, credits, notes). Meshy CDN URLs expire ~3 days after task completion — always download immediately.

## What exists today (~143 credits this project)

| Asset | Pipeline | Notes |
|---|---|---|
| `aria-concept-a-pose.png` | text-to-image `nano-banana-2-lite` | ARIA mascot concept, transparent bg |
| `aria-meshy-t2.5.glb` + base-color | image-to-3d `meshy-t2.5`+`meshy-n1`, 15k tris | 15,786 tris, textured |
| `aria-rigged.glb` / `aria-walk.glb` / `aria-run.glb` | `meshy_rig` (5cr incl. free walk+run) | 24 joints, skinned, GLB+FBX |
| `aria-emotions.glb` | `meshy_animate` bundle (18cr) | Idle, Alert, Angry_Stomp, Formal_Bow, Motivational_Cheer, Victory_Cheer |
| `trophy-meshy-t2.glb` | text-to-3d `meshy-t2` smart-topology | 4,304 tris, untextured |
| `aria-keychain.glb` | Creative Lab keychain (36cr) | Physical-product prototype, shield badge, "ARIA" name_text |
| `public/assets/meshy-days/<theme>/keyart.jpg` ×5 | text-to-image `nano-banana-2-lite` | Per-riddle gouache key visual (gathering/wild/bond/quiet/dawn) |
| `public/assets/meshy-days/<theme>/artifact.glb` ×5 | text-to-3d `meshy-t2.5`+`meshy-n1` | Per-riddle 3D specimen totem (~280KB each) |
| `demo-player-photo.png` → `demo-survivor-card-art.png` → `demo-survivor-card.png` | text-to-image → image-to-image `nano-banana-2` → PIL composite | Survivor-card pipeline proof |

Credit pool is account-wide (other keys share it) — treat `manifest.json` totals as this project's task-reported spend, not the account delta.

## Bet 1 — Ceremonial ARIA (character for hero moments)

The SVG `Mascot.jsx` stays for UI chrome (cursor-tracking, zero bundle cost). The rigged GLB is for ceremonies: `DayBriefing`, `GameMoment`, `DayRecap`, endgame, `ShareSheet`.

- Renderer: `<model-viewer>` or three.js in a lazily-loaded chunk; GLB lives in `public/assets/aria/` (vite-served).
- Phase variants: generate 3 painted states (ASKING curious / REVEAL stern / RECKONING theatrical) via image-to-image off `aria-concept` (~6cr each), swap texture or mesh per phase. Crossfade, don't animate between them.
- Motion: **done** — `aria-emotions.glb` bundles Idle / Alert / Angry_Stomp / Formal_Bow / Motivational_Cheer / Victory_Cheer (18cr). Intended mapping: Idle→ambient, Alert→briefing, Angry_Stomp→elimination/rejection, Formal_Bow→survival/deference, Motivational_Cheer→mid-game, Victory_Cheer→endgame. Runtime wiring pending a ceremony surface that hosts the GLB (see Bet 1 renderer note).
- Text stays in DOM — image models butcher typography.

## Bet 2 — Daily riddle world — v1 SHIPPED (5-day cycle)

Each of the five riddle days now has a vendored key visual + 3D artifact:

- `public/assets/meshy-days/<theme>/keyart.jpg` — gouache plate, shared house style ("deep navy, warm amber, film grain, no text").
- `public/assets/meshy-days/<theme>/artifact.glb` — small textured prop (the "specimen" ARIA wants proof of).

Wired surfaces:

- `AmbientBackdrop.jsx` — `DAY_KEYART` map renders the plate as a faint graded wash (opacity 0.16, darkened) under the room gradient for `phase==="live"` days 1–5; `onError` hides it, CSS room is the fallback.
- `RiddleArtifact.jsx` (mounted in `MissionBoard`) — "Today's specimen" card: lazy-loads `<model-viewer>` from CDN on intersection, keyart poster as offline fallback, auto-rotating GLB. Pure ceremony chrome; game logic untouched.

Still TODO for true "daily" generation: the five assets cover the fixed 5-day riddle cycle. For future/open-ended days, run `scripts/vendor-meshy.mjs text-to-image` + `text-to-3d` after the spec is hash-committed and drop files into `public/assets/meshy-days/<theme>/` (extend `DAY_KEYART`/`DAY_ARTIFACTS` maps).

## Bet 3 — The Pot as a growing trophy

`trophy-meshy-t2.glb` is the base. Prize pool is on-chain (`CELO_RPC`, `VITE_*_PRIZE_POOL_ADDRESS`):

- Tier ladder via image-to-image variants (3cr each): brass → silver → gold → diamond at pool milestones.
- Surfaces: `prelaunch/PrizePots`, `Countdown`, `GameHome` pot displays, endgame ceremony.
- Win-day "claimed" render: winner name set in DOM over the GLB — never ask the image model to render text.

## Bet 4 — Survivor cards (personalized artifacts) — v1 SHIPPED

Prototype proved the chain: player photo → image-to-image house style → styled portrait → existing `renderMomentCard(kind, { photoUrl })` in `src/lib/momentCard.js` already composites `photoUrl` as card background. The Meshy layer is a *styled* `photoUrl`.

**Implemented:**

- `server/lib/meshy.js` — REST client (`/openapi/v1/image-to-image`, data-URI references, `nano-banana-2`, prompt locked server-side).
- `POST /api/survivor-card` + `GET /api/survivor-card/:taskId` in `server/index.js` — requireAuth, 4/hr rate limit, ≤2 pending jobs/user, sha256 cache at `{address}/cards/{hash}.png` in the private bucket, derivative reuses `/api/media-url` signing.
- `src/lib/survivorCard.js` — client downscales to ≤1024px JPEG, POSTs data URL, polls ~150s, falls back to raw photo on any failure.
- `CheckIn.jsx` — "Style my share card" opt-in checkbox (default off, persisted `lhs.cardStyleOptIn`), wired into `shareResult`.
- REST path verified end-to-end against live Meshy API (create → poll → download).

Known v1 limits: pending-job map is in-memory (single-instance OK; restart loses in-flight tasks — client just retries), styled art applies to the share PNG only (not the GameMoment preview), no `fallen` eulogy variant yet.

Privacy guardrails: opt-in only, server-side processing, no training on user photos (Meshy API terms — verify), delete derivative on request, never send photos for minors' cohorts without review. World App context raises the bar; treat styled faces as personal data.

## Bet 5 — Spectator broadcast layer — dossier v1 SHIPPED (own history)

- `DossierCard.jsx` + `GET /api/checkins/mine` (requireAuth, address-scoped merge of `submissions` + `checkins`) — Player History now renders each of YOUR check-ins as a noir "ARIA dossier": proof-photo thumbnail (signed via `/api/media-url`), your argument (caption), rank/verdict stamp. Own data only — no other players' photos or captions are exposed, so no extra consent surface.
- Still open: dossiers for *other* eliminated players (needs explicit consent + vote-tally plumbing), ARIA anchor bust for `SpectatorPanel`/`ActivityFeed`.

## Bet 6 — Market catalog plates — SHIPPED (v3-gated)

- `POST /api/v3/market/art` + `GET /api/v3/market/art/:taskId` in `server/routes/market.js` — text-to-image `nano-banana-2-lite`, museum-specimen style prompt locked server-side, sha256 content-hash cache at `_market/<hash>.png` in the private bucket (shared art, no per-user prefix), 20/hr rate limit, ≤3 pending/user.
- `src/lib/marketArt.js` — client helper: create → poll → signed URL, null on any failure.
- Wired into listing UI lazily on first view (client calls `getMarketArtUrl({ itemKind, itemRef })`); listing/fill logic never blocks on generation. Whole router stays behind `GAME_V3_ENABLED`.

## Bet 7 — Creative Lab physical merch — PROTOTYPE

- `aria-keychain.glb` (Creative Lab keychain, shield badge, "ARIA" name_text, 36cr) proves the photo→physical-product path. 13.7MB GLB — prototype grade.
- Product thesis: survivor-card styled portraits → chibi figures/keychains as premium commemoratives. Requires fulfillment partner + pricing before any user-facing offer; treat as rewards/perks, not automatic per-player spend.

## Cost model

- ARIA rig: done (5cr). Phase variants ~18cr one-time.
- Daily riddle art ~10cr/day.
- Survivor cards 6cr/player, opt-in, capped (e.g. first N per day or premium cohort perk).
- Monthly credit pool 1,090 refreshes 2026-11-20; permanent 200 never expire. Track spend in `manifest.json`.

## Open questions

- Does `meshy-n1` texture hold up under dramatic rim-light art direction, or do hero assets need `meshy-7` PBR (10–15cr texture)?
- Bone names on `aria-rigged.glb` (24 joints, Mixamo-style `Armature|clip0`) vs. any future animation retargeting — dump joint names before committing to custom clips.
- WebGL budget: GLB is 4.4MB / 15.8k tris — fine for one hero character, lazy-load it; never ship to low-end cohort phones eagerly.
- Player-photo consent wording + privacy policy update (`docs/PRIVACY_ARCHITECTURE.md`) before Bet 4 ships.
