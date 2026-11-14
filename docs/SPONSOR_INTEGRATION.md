# Sponsor Integration Plan — Game Off 2026

Prioritized by experience impact, not perk size. Deadline is close; order
is build-sequence, not value-ranking of the credits themselves.

## P0 — WeLoveIndies: licensed audio for the bookends

**Why:** the procedural score is adaptive and stays for gameplay, but the
title screen and dawn ending are cinematic moments a composed track can
carry. Judges form their "too simple" verdict in the first 10 seconds —
the title is where audio polish pays hardest.

**Build:**
1. Account at weloveindies.com/en/epicmegajam (user login via ego browser)
2. Find 1–2 noir/jazz-adjacent tracks (downtempo, minor, late-night feel)
3. `audio/title.mp3` + `audio/dawn.mp3` (or .ogg), wired as:
   - title: loop under attract mode, duck when game starts
   - dawn: play once over `sfx.dawn()`, stop procedural score
4. Keep `score.js` untouched for day/night/finale — licensed audio is
   bookend-only so it can't fight the adaptive mix
5. Fallback: if a track clashes, ship it title-only

**Risk:** low. Purely additive; mute button already covers it via master bus.

## P1 — Machine portraits: the face the fiction already promises

**Why:** "the machine wears a new face every docket" is currently a text
hook. Five generated portraits make the daily-seed comparison *visible* —
the single strongest thematic use of any sponsor perk. Also likely
qualifies for Hyper3D's Rodin prize pool if listed in Tools.

**The five faces** — each wrong in the way VALE's postmarks are wrong:
- Too smooth / poreless, eyes a half-beat late, too symmetrical
- Not horror — *almost* human, which is worse
- Consistent style across all five (same "mugshot" treatment)

**Pipeline (pick one):**
- **Hyper3D Rodin** (claim MEGAJAM2026, expires Nov 20) — 3D portrait →
  turntable render → webp. Best quality, prize-pool eligible.
- **Meshy** (1000 credits, already have MCP) — meshy image gen or
  image-to-3d → render. MCP tools available now.
- **fal** ($30) — nano-banana-class image gen, 2D painterly portraits
  matching the gouache style. Fastest path.

**Integration:**
- `art/face-{MARA,OKO,JUN,TESS,VALE}.webp` — static portraits
- Dossier/end screen: "the machine wore X's face" gets the actual face
- Case-file HTML: embed the portrait (it's already styled HTML now)
- Optional: subtle blink/turn CSS animation on the end-screen reveal

**Do NOT** put faces on every card — scarcity is the point. The face
appears only where the fiction names it.

## P2 — fal: complete the card-vignette set

**Why:** `smoke-art` fails on 9 missing `card-*.webp` vignettes —
`card-night-market`, `card-temple-dusk`, `card-offshift-couch`,
`card-feeding-three`, `card-last-route`, `card-the-scroll`,
`card-stockroom`, `card-microwave-fish`, `card-loading-screen`. Every
filing should have its photograph.

**Build:** generate in the established style (match 2–3 existing
vignettes as style refs), 400×300-ish webp, drop into `game-off/art/`,
re-run `scripts/smoke-art.mjs` until green.

## P3 — ARIA portrait + idle (only if P0–P2 land early)

Rokoko/iClone mocap could drive a blink/breathe on an ARIA portrait —
but that's an art-direction decision, not an integration. Only pursue
if a portrait earns its place on its own.

## Skip

PBRgen, NetApp/AWS, Diversion, SpaceXSI (claim credits anyway for dev
work, don't list as game feature), Reallusion (unless P3 happens).

## Status (2026-11-14)

- **WeLoveIndies: DONE** — title.mp3 ("Manhattan Lounge") loops on
  title/attract; dawn.mp3 ("Blue In Green") plays at endGame. F/demo
  license covers non-commercial jam use. Deeper pass (2026-11-14):
  licensed tracks now fade in over ~1.5s and fade out over ~0.9s on
  phase change instead of hard-cutting; a `music · WeLoveIndies`
  credit line sits on the title screen satisfying the license's
  "include our intro" attribution ask. Intro-tag check still pending
  a human listen (`afplay game-off/audio/title.mp3`).
- **Portraits: DONE (existing assets)** — mara/oko/jun/tess/vale.webp
  already existed; `faceImg()` now shows them at the dawn reveal and
  in the case-file HTML.
- **fal vignettes: DONE** — all 9 missing card-*.webp generated via
  the existing MiniMax H3 pipeline; smoke-art PASS (62→63 assets).
- **Hyper3D Rodin: DONE + animated** — Gen-2.5-Medium text-to-3D via
  official API v2 (key in .env.local as RODIN_API_KEY, gitignored):
  brass hand stamp → GLB archived in docs/promo-assets/rodin/.
  Rendered as a 12-frame turntable (192px animated WebP, 124KB,
  `art/rodin-stamp.webp`) via a local three.js viewer
  (turntable.html archived alongside the GLB + frames/) — the seal
  slowly rotates inside the exported case-file dossier. Manifest
  entry kind:"vendor" keeps smoke-art green and generate-art skips it.
- **Rokoko/iClone ARIA mocap:** skipped — no ARIA portrait moment
  justified it.

## Submission notes

- List every tool actually used in the Tools field — Hyper3D pool and
  sponsor goodwill depend on it.
- WeLoveIndies tracks: verify the license covers itch.io embedding.
