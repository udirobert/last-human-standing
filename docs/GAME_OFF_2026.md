# Game Off 2026 — "SHIFT"

Annual GitHub game jam. Theme revealed Nov 1, submissions close **Dec 1, 2026, 13:37 PST**. Judged on Overall / Gameplay / Graphics / Audio / Innovation / Theme Interpretation (community vote, ends Jan 1, 2027).

- Jam: https://itch.io/jam/game-off-2026
- Rules: public GitHub repo with source pushed before deadline; submit via itch.io (HTML5 embed or download).
- Theme text: *"Shift gears. Shift perspectives. Shift dimensions. Shift bits. Work the night shift."*

## Why this event for Last Human Standing

LHS is already a game about shifts — daily riddles, shifting caps, eliminations, a pot that grows. Game Off forces the question *"what if the rules themselves shifted?"* in a form factor (a self-contained browser game) that doubles as a public demo of the LHS design language: riddles, verdicts, survival pressure, an oracle-ish presence.

Two ways to enter:

1. **Standalone jam game** (chosen): a small original game that carries LHS DNA — the night-shift audit fantasy, commit–reveal tension, daily survival streaks — without depending on LHS infra. Ships as its own public repo; reusable assets/art direction feed back into LHS.
2. LHS-derived prototype: a distilled version of the real game. Rejected for the jam — too much infra (Supabase, auth, World App) to make fair and fun in a month, and judges can't log in.

## Concept: NIGHT SHIFT

A five-day deduction game in the LHS universe:

- **Day shift (DEDUCE)**: ARIA holds a *secret rule* — 1–3 criteria over a card's four facts (where · when · who · in/out). Her earlier rulings sit on the docket: two HUMAN precedents and a few SUS near-misses, laid out as an aligned fact table so each criterion's edge is readable. You pick one of four evidence cards and file it.
- **Verdict**: the rule is unsealed in plain words ("ARIA's rule: at dawn") and your card's facts are checked line by line — ✓, ✗ with what was needed, dimmed when not checked. Verdicts are deterministic: a card passes iff it meets every criterion. The crowd tally is pure theatre and always agrees.
- **Strikes → dossier → jury duty**: a failing filing is a strike; three strikes cuts you — but you don't leave, you take the night shift and audit everyone else's cases against the now-visible rule. A flawless 5/5 night clears a strike while you're still a player.
- **Endings**: still a player after day five = LAST HUMAN STANDING; cut = dawn ending with a jury title earned from audit accuracy.

**Why SHIFT is literal here**: every day is a shift — manila-paper day shift, desk-lamp night shift — the rule *shifts* your reading of the docket each morning, and the player literally shifts roles: the one being judged by day becomes the judge by night — which is also the real game's spectator/jury path.

### Why this interpretation

- Every mechanic maps to a shipped LHS system: riddles, evidence + one-line argument, HUMAN/SUS rulings, dossier cards, jury duty. Judges who know LHS see their game; judges who don't still get a complete loop.
- Deduction keeps the hidden-rule tension but makes it *fair*: the docket is a logic puzzle with a guaranteed solution, so losses feel earned instead of arbitrary — exactly the tension LHS sells.
- Single-player, zero backend, runs from `file://` — judges can play instantly from itch.io.

## UX research — what itch.io playtests taught us

Sources: CrazyGames rejection criteria ("a new player has to work out the loop, see a goal, get feedback, and finish one win or loss inside 60 seconds **without reading anything**"), Zach Gage's "three reads" (first read = what do I do *right now*; goal/details come second), game-feel guides (every input gets same-frame feedback; juice has a ceiling — Medium/High band, biggest effects reserved for rarest moments).

**What the first build got wrong** (confirmed by playtest): cryptic icon language never explained; abstract spec text that didn't map onto card attributes → losses felt arbitrary; ~5s passive reveal with no skip; hidden tap-cycle gesture in audit; no phase labels.

**Fixes shipped (2026-11-09)**:

- **Spec drawn in the cards' own icons.** Spec rows are generated from `requires`/`forbid` — same glyphs, lit green vs struck red — so the reveal is self-explanatory and can't drift from the data.
- **One verb per screen, labeled phases.** HUD leads with ARGUE → VERDICT → AUDIT; title screen carries a one-line legend instead of rules.
- **ARIA teaches in one line** ("Every card shows four facts: where, when, who, inside or out. The spec is sealed — file blind.").
- **Nothing passive.** Crowd dots run ~2s and tapping anywhere skips the ceremony; stamp + per-icon pass/fail appear instantly.
- **Explicit audit controls.** Pinned spec rows, "KEEP N OF 5" badge, real HUMAN/SUS buttons (no hidden gestures), true verdicts tint each card's icons.
- **Commit is visible.** One tap files; unchosen cards grey out so the irreversible choice reads clearly.

**What the second build still got wrong** (second playtest, same verdict — "stages unclear, lost immediately with no rhyme or reason"): the spec was sealed so the day pick was a *blind guess*, not a deduction; one wrong pick meant permanent elimination on day 1; the crowd's noise band and the audit's noisy-score cap meant even correct reasoning lost; and pass/fail was signalled by CSS `color` on emoji glyphs, which doesn't render — plus unlabeled icons where 🏠 meant both "home" and "indoor".

**Fixes shipped (2026-11-10)**:

- **Precedent docket.** ARIA's earlier rulings — two HUMAN plus SUS near-misses engineered to each fail exactly one criterion — are the clues; the day pick becomes a solvable deduction.
- **Deterministic rule + line-by-line verdict.** `passes()` is the only verdict; the unsealed rule prints in words and each fact row shows ✓ / ✗ "needed: …" / "— not checked". Crowd noise is demoted to a cosmetic tally bar that always agrees with the stamp.
- **Three strikes with flawless-night redemption.** One bad filing no longer ends the run; a 5/5 audit clears a strike.
- **One-at-a-time night stamping with instant feedback.** Each case gets stamped, RIGHT/WRONG, and on a miss the failing fact is named ("needed: alone") — no more batch audit with a noisy cap.
- **Day/night theme shift.** `body[data-shift]` drives a manila-paper day and desk-lamp night with a brief shift banner — the loop's stages are now visually distinct.
- **Always-visible instruction line.** One bordered line under the HUD per screen says what to do right now; ARIA's quips are demoted to flavour.
- **Labeled facts everywhere.** Facts render as emoji + word in fixed WHERE/WHEN/WHO/IN-OUT order — docket columns, hand cards, verdict rows, night cases. Stamps are bordered text (HUMAN/SUS), never emoji tinting. 🚪 = indoors, 🌤️ = outdoors.

### Enrichment pass (2026-11-10)

Seven mechanics layered on the deduction loop, each introduced on a later day so day 1 stays simple:

- **Seeded runs + share grid** — `makeRng` per-purpose streams (`seed|day|purpose`) make every docket reproducible; daily seed = local date, `?seed=` override, Wordle-style result block + copy button. (Wordle dailies.)
- **Suspense verdict** — fact rows reveal one at a time, passes before fails, with an 800ms pulsing "…" hold before the last checked row. (Staged reveal / slot-machine pacing.)
- **Clue + oath** — pay-for-information (one extra truthful ruling, 300→200 pay) and a push-your-luck oath (kept: clear a strike or +200; broken: two strikes). (Papers, Please directives / push-your-luck.)
- **Clerical error on the docket** — days 4–5 hide a liar row (SUS stamped HUMAN) that's always outvoted by two true SUS rows on the same criterion, so it's provable, not guessable; flagging it pays +100. (Zendo-style contradiction.)
- **Mid-night amendments** — head office rewrites the rule after case 2–3; trap cards flip verdicts across the seam. (Papers, Please directive changes.)
- **Streak + shift clock** — ×1–×3 multiplier on consecutive right stamps; an 8-second clock pays speed bonus, overtime just forfeits it. (Arcade scoring.)
- **Recurring cast + player-authored finale** — five named filers (MARA, OKO, JUN, TESS, VALE) with timestamps; VALE files 0.003s after every riddle and always passes. After night five the player writes the last rule from four choices — only one cuts VALE and nothing else. (Recurrent-character payoff; the one deduction the rules couldn't make.)

Rule of thumb going forward: if a new player can't say what to do next within 3 seconds of any screen appearing, the screen is wrong — cut words, not meaning.

### Presentation passes (2026-11-10)

Third read of the build: the deduction was fair, but the game still *looked* like a text slideshow — one flat screen swapping for another while consequences were announced in copy. Ten presentation-only passes (no rules, pacing or scoring touched) rebuilt it on a single doctrine:

> **Everything here is paperwork, and paperwork has physics.** A card is dealt, a filing flies into the tray, a stamp swings and bites, a case is dropped on the desk, an amendment falls from head office, a decree is filled in and signed. If state changed, the player watched it change.

- **The title is a place, not a poster** — an illustrated night desk (lamp with motes in the beam, docket folder, steaming mug) that stamps `HUMAN`/`SUS` on itself, over a compact three-step legend. One primary CTA; `Random shift` is the only other button.
- **Clocking in is a time card** — the start button *is* a punched card: `WEEK 12`, today's docket number, five punch slots. Clicking punches the first hole and drops the card out of frame (`sfx.punch`), and the same gesture unlocks the audio, so the first sound is the first thing you do.
- **ARIA has a face without having a person** — a terminal head on a scanlined console (cyan eye, `LED`), `data-mood` driving the colour. Resolves the open question: she stays typographic, and the rigged `aria-emotions.glb` stays out of the jam build.
- **The paper is paper** — a full-screen grain of data-URI SVG noise (`body::before`, mix-blended, pointer-transparent), so the day shift reads as stock under daylight and the night shift as the same stock under a lamp. Still no image files.
- **There is a room behind the desk** — beams, lamp cone, flicker, dark window; no screen floats in a void. All of it inline SVG, no images.
- **The day shift is physical** — evidence deals into the hand, the chosen filing flies to the tray as a clone that outlives the phase change, the verdict is stamped onto a numbered slip, failed rows get struck, and the amendment is *stapled on* rather than redrawn. Flights animate a clone on `document.body` and only toggle classes/text on the real element — fixed positioning can't be clipped by `#frame` and `file://` keeps working.
- **The night stamp comes down** — a stamp arm swings, hits, and throws an ink splat with the verdict already pressed into it. A hitstop on contact — visual first, sound ~120ms later, so the desk answers the stamp. The desk takes the hit (a `transform` on `#frame`), except under the amendment banner, where the papers **recoil** instead: shaking the frame would drag its fixed overlay along for the ride.
- **Contest and amendment land hard** — the contested case is tagged and slammed; the mid-night amendment banner drops, strikes the replaced chips one at a time and leaves a ghost line of the old rule.
- **The finale is a decree, not a menu** — a numbered decree with a blank clause, a signature path that draws itself, and a `FILED` seal dropped on top. You author the last rule, then execute it.
- **Three strikes get the room** — the counter closes a `100vmax` vignette over the whole desk, lifts to 1.5× inside a red frame, and takes a stamped `CUT` half a second later; the dossier is held back until the stamp has been read, and the counter stays *spent* (red label, red pips) for the rest of the run.
- **Motion is opt-in** — `prefers-reduced-motion` skips every flight, swing, stamp and vignette and leaves the state change instantaneous and visible (`calmMotion()` in JS, mirrored by CSS media blocks). Nothing is conveyed by motion alone.

The rule of thumb now applies one layer up: if a player can't *see* what just happened without reading the line under it, the moment is wrong.

## Scope & Architecture

- **Tech**: vanilla JS + DOM + WebAudio, no build step, works from `file://`. `game-off/{index.html,style.css,game.js,logic.js,riddles.js,test-logic.mjs}` — extracted to standalone public repo via `scripts/package-game-off.sh`. The paper UI is inline SVG + CSS (night desk title, ARIA's terminal head, rubber stamps, seals); the room behind it is painted key art in `game-off/art/` (MiniMax H3 via fal.ai), crossfaded per shift with the SVG scene as fallback if an image fails.
- **Audio**: all composed at runtime in WebAudio — an eight-bar noir chart (76 bpm swung: upright bass, charleston piano, brushes, muted horn) with per-phase arrangements, a horn sting on a catch, plus the atmospheric bed (sub-bass drone, tape hiss, reactive VALE tritone dissonance) and the rain/thunder weather layer. No audio files; `file://` and the itch embed hear the same score. `M` toggles mute.
- **Data & Verification**: Case data lives in `riddles.js`, deal/verdict rules in `logic.js` (pure, node-testable). `test-logic.mjs` verifies 2,000 seeds per day with 100% determinism.

## Milestones (Updated 2026-11-12 — Jam-Winning Overhaul)

1. ~~Core~~ **done**: full loop playable — 5 days, docket → file → verdict → night audit, strikes, dossier, juror path.
2. ~~UX pass~~ **done 2026-11-10 (pivot 3)**: rebuilt as a deduction game.
3. ~~Enrichment pass~~ **done 2026-11-10**: seeded dockets, share grid, clerical error, amendments, finale decree.
4. ~~Pivot 4: Readability & Jam Overhaul~~ **done 2026-11-12**:
   - Fixed Day 1 spreadsheet bounce: grouped approved HUMAN precedents at top; added interactive cross-tag amber hover inspection; direct instruction line.
   - Front-loaded VALE anomaly: styled case badge on Night 1 (`⚡ FILED +0.003s`), ARIA diagnostic alarm ping, and reactive auditory dissonance.
   - De-arcaded the night shift: stripped 8s timer, streak multiplier, and cosmetic crowd tally; focused on forensic accuracy (50 pts / 100 pts contested).
   - Swapped audio: removed 4.46MB MacLeod loop for procedural WebAudio synthesizer.
   - Itch cover art: authored 630×500 vector cover (`cover-630x500.svg`) and HTML exporter (`export-cover.html`).
   - Standalone extraction: created `scripts/package-game-off.sh` producing 52KB `night-shift-itch.zip` and clean standalone repo at `dist/night-shift`.
5. ~~Fresh-Player Playtesting~~ **done (agent-side)**: persona harness + three blind fresh-context playtests — see "Playtest program" below. Human-stranger session still open.
6. **Submission & Itch Launch (by Nov 30)**: media kit ready (`docs/itch-assets/`); deploy to itch.io and configure the page — see `ITCH_PAGE.md` checklist. Push standalone repo before Dec 1 13:37 PST.
7. **Pivot 5 — game-side review overhaul (in flight, started 2026-11-14)**: lift the losing categories (Graphics, Audio, onboarding, theme, completion) without touching the frozen deduction design. Full plan in the "Pivot 5" section below. **Code freeze 2026-11-25**; itch page, trailer, upload, human playtest and ratings reciprocity stay with the owner.

## Pivot 5 — game-side review overhaul (2026-11-14 → freeze 2026-11-25)

A full review against the jam's six judged categories (community vote) found the losing causes: the build is provably fair but *presents* as a styled web page — dark text screens at thumbnail size (Graphics), an ambient score that ignores the player (Audio), the most literal theme reading on offer (Theme), no save state so raters bounce mid-run and never return (Gameplay/Overall), and a cold open whose first judgment is a coin flip for a fresh player. Presentation is changed; deduction design is **frozen** — `test-logic.mjs` + `audit-deduction.mjs` are the tripwire and must pass untouched.

Decisions locked 2026-11-14:

- **Art direction: painterly noir poster** (gouache/oil, warm lamp ambers, film grain) via MiniMax H3 on fal.ai (`FAL_KEY` in `.env.local`, free during jam window). Doctrine: painted world *behind*, crisp DOM/SVG paper UI *in front*; every generated `<img>` falls back to the existing inline SVG scene on error so `file://` and offline stay safe.
- **Postmark strip: plain words in the jam build** — `LATENCY · ORIGIN · RELAYS · RECEIPT`. The live LHS packet strip keeps `PKT/ORIGIN/HOPS/RCPT`; the itch page copy bridges the crossover.
- **Audio: compose an original procedural noir score in WebAudio** (upright bass, brushed kit, piano, muted trumpet), phase-layered and event-reactive (catch sting, contested swell, duck under stamps, silence before CUT). Drops the 3.4MB `audio/` dir entirely — one score everywhere, file:// and embed parity, no AI-music credit. **Decision checkpoint 2026-11-21**: if the motif doesn't land, the fallback is score.js polish (arrangement/gain/mix tuning) or a licensed loop — "keep current tracks" is dead, `game-off/audio/` was deleted and the packager never shipped it.
- **Owner split**: Droid owns W1–W8 (game + regenerated media kit, freeze Nov 25). The owner keeps: itch page, trailer, upload, human-stranger playtest, and ratings reciprocity during voting.

### Workstreams

- **W1 — Save/resume** (P0): snapshot state to `localStorage` after every phase transition (seed, day, score, strikes, flags, mute, reduced-motion). Title gains `RESUME SHIFT — Day N · Score S` when a save exists; a new shift clears it. Resumed runs keep their original seed even after the daily seed rolls over.
- **W2 — Cold open: teach by contrast** (P0): after stamping the human filing, a two-beat comparison strip aligns the two receipts side by side — "filed hours after the riddle" vs "filed 3 milliseconds after" — so the VALE judgment is a deduction, not a coin flip. Plain-word relabel everywhere in the jam build. ARIA teaches the contrast in one sentence; lore demoted. **Gate:** a fresh blind agent catches VALE *with stated reasons* on the cold open in ≥2 of 3 runs.
- **W3 — Art pipeline + integration** (P0, largest): `scripts/generate-art.mjs` (fal client) + committed prompt manifest (`scripts/art-manifest.mjs`). 36 assets in 5 groups: room×4 incl. cover-base, filer portraits×6 (VALE subtly uncanny), card vignettes×24, endings×2. WebP, 250KB/asset budget with ffmpeg recompress. Style anchor goes to the owner for review before the batch runs. Docs/credits updated honestly (painted key art: MiniMax H3 via fal.ai).
- **W4 — Make the shift visible** (P1): the lever pull becomes a perspective flip — the same painted room from the clerk's chair (day) crossfades to the same room from behind ARIA's desk (night), one-line beat: "You are the desk now." Gives Theme raters a screenshotable moment and upgrades the literal take with the role-reversal read. Full `prefers-reduced-motion` parity.
- **W5 — Original procedural score** (P1): see decision above. **Gate:** blind listeners describe it as "jazz noir", not "drone".
- **W6 — Copy, mobile, consistency**: one canonical tagline everywhere ("Deduce by day. Enforce by night. Catch the machine."), fix the "canvas" feature bullet and stale size claims (208KB/52KB), README + credits pass, 390px mobile audit (docket, portraits, vignette crops, night buttons), zip target < 8MB with all art shipping in the zip (3.3MB shipped; every painting falls back to the SVG scene if a file is missing).
- **W7 — Media kit regen** (~½ day, handoff): cover rebuilt from the painted hero + vector text; `catch.gif` + six screenshots re-captured headless into `docs/itch-assets/`; one-pager of final copy blocks for `ITCH_PAGE.md`.
- **W8 — Validation** (concentrated Nov 22–25; **human playtests pulled forward to Nov 22** so findings still have freeze runway): `test-logic.mjs` + `audit-deduction.mjs` untouched-pass; new asset smoke script (manifest completeness + size budget); save/resume round-trip test; `file://` vs http parity; 390px capture; three blind fresh-context playtests with measured gates (cold-open catch-with-reason, first-60s comprehension, full-week completion, feed gut-check on new screenshots).

### Timeline

| Dates | Work |
|---|---|
| Nov 14-15 | W1 + W2 |
| Nov 16-20 | W3 (style anchor to owner ~Nov 16, batch generation after the nod) |
| Nov 21-22 | W4 + W5 (score checkpoint Nov 21) |
| Nov 23-24 | W6 + W7 |
| Nov 25 | W8 full pass, code freeze, zip + media kit handed to owner |
| Nov 26-Dec 1 | Owner: itch page, trailer, upload, human playtest; Droid on standby for fixes |

### Expected scorecard + honest caveat

Graphics 2-3 → ~4 (painted world + crisp paper contrast), Audio ~3 → 4 with a story ("the score is code"), Gameplay retention up (save/resume) + a fair first minute (contrast teach), Theme upgraded by the flip. This raises the ceiling; it does not guarantee a win — community vote also needs early upload, ratings reciprocity, and a trailer that shows the flip moment. Those are the owner's and matter as much as anything in this plan.

## Status log

- **2026-11-14 (review-overhaul batch: design + jam-entry fixes)** — Review said design 8/10, jam entry 5/10; this batch hits both key points with the deduction tripwire green throughout (`test-logic.mjs` extended, not weakened; `audit-deduction.mjs` 0% ONE-WORD-HARMFUL on all five hand days with the bigger deck). **Seeded culprit rotation**: the machine is no longer always VALE — `LOGIC.pickCulprit` derives its face from the seed (`SEED|culprit`), every VALE hard-coding became `G.culprit`/`botTel`, the finale ledger is generated around whoever it turned out to be (`LOGIC.buildFinale` — exactly one clause cuts the machine alone, invariant-tested over 2000 seeds; save keys `valeCaught`/`valeEscapes` kept for compat). **Overtime mode**: after any week closes, `LOGIC.genDays` deals a fresh five-night run whose rules are sampled and validated through the same machinery the hand days are tested with (passer/failer floors, liar provable, bot seat available, amendment segments mixed; 300 generated weeks invariant-clean), daily seed `ot-<date>`, unlocked via `night-shift-ot-unlocked`, entered from dawn or title. **Deck 23 → 40 cards** (17 new in `riddles.js` filling dusk/night/pair/place gaps; audit still 0% one-word-harmful). **Pre-stamped cold open**: the outgoing clerk's first filing arrives already stamped HUMAN — the player's first active judgment is the machine's, taught against a clean baseline ("PREVIOUS SHIFT" verdict, neutral ink, updated ARIA copy; fixes the 3/3 playtester complaint about no case-1 baseline). **Score extracted to `game-off/score.js`** (own AudioContext; game.js only calls and reports mute policy) with synth upgrades: Karplus–Strong plucked upright bass, ±12ms brush jitter + per-bar swing drift + ghost brushes so the chart breathes; vinyl-crackle layer added to the ambient bed; `renderWav()` + `scripts/audio-lab.html` let the owner audition/download all four room arrangements before the Nov 21 ear checkpoint. **Presentation**: one LUT-style grade (saturate/sepia/contrast filter) unifies painted art with the paper UI on both shifts; SHIFT ledger on title + dawn names the theme's five verbs; `docs/itch-assets/tray.png` recaptured against the new cold open (seeded culprit JUN on the machine's case). **Invariants re-verified**: cold open, overtime generation, and mid-OT resume round-trip (identical regenerated week) all browser-checked from `file://`, zero console errors. Remaining: 17 new card vignettes generating (MiniMax H3), zip size re-check, itch README refresh below.

- **2026-11-14 (later — W3 batch + integration + W7 media kit)** — Owner approved the style anchor; the remaining 33 assets generated in one 625s run, zero failures (36 total: room×4 incl. cover-base, portraits×6, card vignettes×24, endings×2; 3038KB painted weight, every asset under the 250KB budget — `scripts/smoke-art.mjs` now gates manifest completeness, budget, strays, and every runtime-requestable portrait/vignette). **Integration**: the night case card carries a clipped painted photo of the filing's scene with the filer's ID shot pinned to its corner (same treatment for every filer — VALE's portrait reads human, per the no-fingerprints doctrine; missing files leave the paper untouched); endings crossfade to `dawn.webp` / `dawn-automated.webp` via `body[data-end]`; mobile slims the photo to 84px under 480px (390px audit: no horizontal overflow, postmark above the fold). **W7 media kit regenerated** by driving a full honest week (passing cards picked from the exposed rules, five nights, amendments, finale, ending): `docs/itch-assets/` now holds the painted cover, tray-with-compare, flag row, day desk, verdict, amendment, finale, ending shot, and a 5-frame catch GIF (299KB); `game-off/cover-630x500.png` is the painted poster (`export-cover-painted.html`). Ending verified live: the driven week resolved to THE DAY SHIFT IS AUTOMATED with the blue automated-office backdrop. Zip with full art: 3.3MB (target <8MB).

- **2026-11-14 (pivot 5 execution — W1/W2/W4/W5/W6 landed, ahead of schedule)** — Logic tripwire untouched-pass throughout (`test-logic.mjs` + `audit-deduction.mjs`). **W1 save/resume**: localStorage snapshot at every stable beat, `RESUME SHIFT` on the title with day/score labels, seed pinned to the saved run; browser-verified across mid-day, mid-verdict (pay posts exactly once), mid-night, resolved-case dismissal, cold-open end, repeated resumes. **W2 cold open**: both filings aligned in a comparison strip (CLAIM/LATENCY/ORIGIN/RELAYS/RECEIPT), plain-word labels everywhere; three blind fresh-context agents all caught VALE with valid stated reasons (3/3 — gate passed), all three flagged case-1-no-baseline → added the `coldFirst` ARIA line. **W3 anchor**: `scripts/art-manifest.mjs` (36 entries, 5 groups) + `scripts/generate-art.mjs` (fal.ai MiniMax H3, refs as base64, WebP, 250KB/asset budget); room anchor generated and visually reviewed — consistent noir room. Remaining batch (portraits, cards, endings, cover-base) gated on owner's style nod. **W4 flip**: `.stage-art` backdrop layer in `index.html`, crossfade per `body[data-phase]`, readability scrim, reduced-motion parity, onerror fallback to the SVG scene; verified in all three seats. **W5 score**: mp3 `score` module replaced with a composed WebAudio jazz-noir chart (76bpm swung, 8 bars Dm9·Gm9·B♭maj7·A7sus×2 — upright bass, charleston piano, brushes, muted horn), per-phase arrangements, horn sting on a catch, ducks under the amendment; the 72bpm ambient pulse removed (two tempi fight), room-tone bed kept at 0.22 with rain/VALE dissonance; `game-off/audio/` (3.4MB) deleted, packager no longer zips it; runtime-probed clean (scheduled node counts match the chart, zero JS errors) — ear checkpoint for the owner stands (Nov 21: does it read as "jazz noir"?). **W6 copy/mobile**: canonical tagline "Deduce by day. Enforce by night. Catch the machine." on the title + itch copy; stale claims fixed (canvas bullet, 208KB/52KB, ElevenLabs credits → MiniMax H3 + composed score); 390×844 mobile audit — title, cold open, night audit incl. postmark strip: no horizontal overflow, stamp buttons at thumb height (desktop verdict seat unchanged); zip 554KB with anchor art. Remaining: post-batch 390px re-check (portraits, vignettes), zip < 8MB after batch.

- **2026-11-14 (pivot 5 — review-driven overhaul)** — Full review against the six judged categories. Verdict: fair game, losing presentation. Plan above: save/resume, contrast-taught cold open, painted key-art overhaul (MiniMax H3 via fal.ai), perspective-flip shift seam, composed procedural score. Deduction design frozen; logic tests are the tripwire. Freeze 2026-11-25.

- **2026-11-09** — Doc created; concept locked as **NIGHT SHIFT**.
- **2026-11-09 (pivot 1)** — First build rejected as too generic. Rebuilt as 5-day deduction/audit cycle.
- **2026-11-09 (pivot 2 — UX)** — Playtest feedback: "stages unclear". Rebuilt icon presentation.
- **2026-11-10 (pivot 3 — deduction)** — Playtest feedback: "lost immediately". Added precedent docket, deterministic verdict, strikes.
- **2026-11-10 (enrichment & presentation)** — Added seed dockets, share grid, amendments, physical desk passes, and finale decree.
- **2026-11-12 (pivot 4 — Jam-Winning Overhaul)** — Addressed fatal critique: Day 1 spreadsheet bounce, prompt-literal theme interpretation, arcade clock mismatch, gated VALE twist, stock audio, and monorepo baggage. Shifting to visual evidence contrast, front-loaded VALE on Night 1, forensic pace, bespoke WebAudio soundscape, and standalone repo extraction.

## Open questions

- Content depth: how many more evidence cards / ARIA lines before diminishing returns? The deck is 23 cards across 4 tag axes; richer days may need cards that widen the tag space.
- Difficulty: do the streak/clock multipliers and amendment traps make night too easy or too punishing for fresh players? Needs a fresh-player playtest.
- Liar fairness: is the clerical error actually *findable* (two outvoting SUS rows) for a first-time player, or does it read as noise? Playtest.
- Mobile: night stamp buttons are full-width and the hand is 2×2; verify the docket stays legible at 390px, and that the third-strike vignette reads as "the room went dark" rather than "the screen broke".
- Presentation: does the paperwork read as *physical* on first sight, or does it merely animate? The one beat most likely to be tuned is the 82%-black third-strike vignette.

## Final design — shipped November pass (supersedes the pivot-4 VALE badge)

The pivot-4 plan front-loaded VALE with a styled `⚡ FILED +0.003s` badge — a banner telling the player the answer. The shipped design deleted the badge and made the anomaly *load-bearing evidence* instead:

- **Cold-open tray.** Clock-in lands on the night desk, not the day grid: two filings the outgoing clerk left, judged under last week's standing order — a clean human pass, then a VALE filing. Stamp, verdict, flag row, and catch-or-miss all happen in the first ~90 seconds; then the day crew signs in. A rater's first minute is the game's identity.
- **The postmark stub rides on every filing.** PKT · ORIGIN · HOPS · RCPT printed at the foot of every case card, same muted strip for every filer. Human stubs carry human noise (`resent ×2`, `rcpt delayed 40s`, `queued +2h10m`).
- **SUS on clean paper demands grounds.** The flag row asks which field read wrong; a pointed field that holds is the catch (+100, red grease circle drawn on the evidence), a clean field or no grounds is a hunch — a wrong stamp like any other, with the named field struck through in pencil.
- **The disguise is honest.** VALE's clean fields come from the same generator as humans (a flag pointed at one is a hunch, not a boundary case). Nights 1–2 leak two of four fields (seeded); nights 3+ carry one residual impossible field in human clothing.
- **No machine fingerprints.** The servo chirp and the VALE-only "no wet signature" note are gone — all filers draw the shared note pool, and straight landings/clean drops are seeded human variance. The verdict names one missed field, not the whole key. The postmark is the only testimony.
- **Consequence teaches, not text.** HUMAN on VALE is a wrong stamp; the verdict names the evidence skipped. Persona playtests confirmed a literal player adapts the next night after one punished wave-through.
- **The amendment is acknowledged, not glimpsed** — it holds for a key/tap with a grace window, chips striking and restamping while it waits.
- **Weather.** Procedural rain under every night (wetter each night), far-off thunder at the audit desk — routed beside the score so it plays under the generated tracks.

## Playtest program — shipped evidence

- **Persona harness** (`/tmp` drivers + real Chrome): four rater archetypes run the full week per design pass. Results: literal instruction-follower eliminated on day-phase strikes only (paper-stamping never kills); careful reader wins with a 5/5 catch night; adaptive player learns the postmark from one wrong stamp; button-masher's hunches never hold.
- **Blind raters** (fresh-context agents, real browser, no design knowledge): three full playtests — 4/5, 4/5, 4/5 (opening-focused). All finished the week; all named the postmark layer the soul of the game. Real defects found and fixed: stale verdict line, disguise outside the human distribution, phantom-looking flawless bonus, amendment auto-dismiss gaslight, score-tween residue.
- **Itch media kit**: `docs/itch-assets/` — six deterministic screenshots + `catch.gif` animated cover (grease-circle catch), captured headless at staged virtual-time budgets. Cover still regenerated with the grease circle on `+0.003s`.
- **Bridge to the live game**: the dawn screen carries a quiet post-credits link to `lasthumanstanding.thisyearnofear.com` — one-way funnel, zero dependency; the jam build works entirely alone.
- **Remaining gate**: itch.io upload + page setup (checklist in `ITCH_PAGE.md`) and one human-stranger playtest — both outside the repo.

## Live-game crossovers — shipped (all loose coupling, either direction optional)

The jam is a standalone spin-off; these are synergies, not dependencies:

- **The packet is now a real anti-bot surface.** `/api/feed` attaches a `packet` to every submission — same four fields as the stub (PKT latency after round open · ORIGIN geo fix · HOPS same-day attempts · RCPT counter flags), computed from `rounds`, `checkins`, per-day filing counts, `submission_flags`, and persisted `checkins.flags` (migration 048 — the GPS/timing/velocity detections, previously log-only). `PacketStrip.jsx` renders it on every Feed card. Anchoring guard: values print for everyone but tells only light *after* you commit a vote (or once the filing resolves) — the strip can never pre-highlight a field for a vote not yet cast.
- **VALE is a live NPC.** `server/lib/vale.js` + `POST /api/admin/vale` seeds an exhibition filing into a day: clean caption, `created_at = opens + 3ms` (the signature `+0.003s`), no check-in record. Aliases rotate from the jam's human filer pool; day-close reveal unmasks it like any agent. "Spot the non-human filing" becomes a recurring community event on demand.
- **Shared daily docket convention.** Both sides derive the day's seed as `YYYY-MM-DD` local date. `src/config/nightShift.js` (`nightShiftDocketUrl()`) builds `?seed=` links; TomorrowPostcard carries a quiet "the night desk runs this docket too →" link — renders only once `NIGHT_SHIFT_URL` points at the live itch page.
- **Shared corpus + audio vocabulary.** The jam's five days already mirror cohort 1's round names (THE DAWN · THE BOND · THE WILD · THE GATHERING · THE QUIET). The rain went the other way: `night-rain` is a registered BGM station for live/audit phases — a procedurally generated two-layer rain bed (`server/data/bgm/night-rain.mp3`, ffmpeg noise, no ElevenLabs call needed) that rotates into the audit screen playlist beside audit-pulse.

## Lesson pass — itch craft articles applied (Nov 14)

Read the four most-referenced craft articles behind the itch game-design/tutorial indexes (Jump Jolt GIF-thumbnail tutorial, The Sapling visual-style breakdown, Coffee Talk devlog #4, Pico Checkmate design log) plus the Quality Guidelines. What each changed here:

- **Cover GIF frame-1 rule (Jump Jolt):** browse grids render the GIF's first frame as a static still — `catch.gif` opened on a dark mid-transition frame, i.e. a broken thumbnail. Rebuilt `docs/itch-assets/catch.gif` (630×500, ~285KB): the painted poster now leads, held ~1.5s, before the catch sequence; frames padded with the poster's desk tone (`srgb(10,12,16)`) so there is no letterbox seam. Capture scripts note: any future re-export must prepend the poster frame or frame 1 reverts to a transition still.
- **Unified grade (The Sapling):** the LUT filter now also runs over the SVG fallback room (`#stage .stage-day` / `.stage-night`, day variant brighter) — painted art, case photos, and the SVG room share one color world even when the gouache files fail to load. Verified in real Chrome from `file://`: title, night cold open, and forced day phase all render clean, zero console errors.
- **One alarm color (Pico Checkmate):** palette audit — already compliant; amber `--accent` is selection/pay, `--red` is reserved for anomalies/strikes/SUS/amendment/CUT, `--green` means the paper passed. The rule is now documented in the header of `style.css` so it survives future edits. The clock fill stays amber (activity, not alarm) — correct.
- **No failed drinks (Coffee Talk):** verdict copy audited instead of changed — misses already name the failed criteria (`fails ${keys}` / `lastMissKeys`), near-misses get dedicated ARIA lines, and the ARIA voice normalizes missing ("Someone on this docket has never missed. Humans miss."). The lesson was already implemented; nothing to patch.
- **Quality Guidelines → hard checklist gate:** `ITCH_PAGE.md` gains a "Platform + disclosure metadata" section — AI disclosure filled (art: MiniMax H3 generative, tag AI-assisted; WebAudio score: exempt, say so), Web/HTML5 platform only, English, no tag stuffing, and "don't publish until the page is complete" (the Most Recent boost is one-shot). Upload checklist also gains the frame-1 cover check.

Tripwire after the batch: `test-logic.mjs` ALL PASS (300 OT weeks, 2000 finale seeds) · `audit-deduction.mjs` ONE-WORD-HARMFUL 0% on all five days. Repackaged `dist/night-shift-itch.zip` — 4.8MB.

## Resonance pass — relatable-layer enhancements (Nov 14, pm)

A design brainstorm on making the game land for more people turned into shipped changes. The through-line: the game was already about *proof of humanity as paperwork* — these changes name the real-world rituals it rhymes with and give the machine a inner life.

- **Nine new cards** (`riddles.js`, deck now 49): night market, temple bell at dusk, off-shift nurse, 3am feeding, last delivery route, the 2am scroll, stockroom inventory — plus two tonal-range outliers: *Microwave fish, 1am* ("No further questions.") and the fourth-wall *loading screen, day 4*. Same four-fact schema; no new art needed (vignette fallback covers missing `card-*.webp`).
- **The machine wants in** (`logic.js` `MACHINE_ARGS`): the finale culprit's filing now speaks in the machine's own voice some of the time — "I have never been cold. I believe this is what warmth is for." — instead of the borrowed card's argument. OT nights occasionally draw `MACHINE_CONFESSIONS` valeLines ("If the proof is a life, mine is the smallest one on the docket. File it anyway.", ~18%).
- **"Stayed up late" finale clause**: lateness is now a first-class criterion — finale rows carry a `late` pseudo-tag (human postmarks are all ≥51min; the machine's is +0.003s). ~35% of seeds the winning clause is *stayed up late* instead of the shared-fact clause; when it isn't the answer it can't appear (would be a second right answer). "You win by being gloriously inefficient" is now literally a rule you can write.
- **THE VERIFICATION**: new OT theme — its riddle is filed like a captcha ("Select all filings that prove…", "Human check — prove that…").
- **Humor vectors**: failed day filings append a bureaucratic rejection couplet ("Your filing has been received and rejected. Please refile, or don't." — seeded per docket); ARIA's dayOpen gained the recipe quirk ("I once answered a riddle with a recipe. Nobody asks about it."); share text now ends with a taunt ("I out-read the machine. You?" / machine mode: "I almost fooled the wire. You?").
- **THE MACHINE'S SHIFT** (new mode, `game.js`): clear overtime → title unlocks a third button. Three generated nights (`mach-<date>` seed) where you file proofs *as* the machine — same deal/rule machinery, no strikes, stamp text becomes "FILED — PASSED AS HUMAN" / "FLAGGED — THE WIRE NOTICED", ledger always reads +0.003s. Ends at REVIEWED in the blue automated-office room. Resume-safe; day phase only, no audit/finale.

Verified: `test-logic.mjs` ALL PASS (finale rotation still exactly-4-options/one-cuts-culprit with the late clause) · real-Chrome smoke of machine mode end-to-end (day → verdict → 3 nights → REVIEWED, correct stamp/ledger/share text).

## THE MACHINE'S SHIFT — forgery bench redesign (Nov 14, late)

Playtest feedback rightly called the first machine mode a reskin: same deal, same docket, same stamp — new labels only. Rebuilt it as a mechanically distinct mode instead of a cosmetic one.

- **New phase**: filing a proof no longer routes to the verdict/audit loop — `fileSelected` sends machine mode to `forgePhase`. The deduction verb stays (you still have to satisfy the sealed rule), but the night audit is replaced by a **forgery bench**: your own packet stub — latency, origin, relays, receipt — arrives fully machine-flavored (`3ms` / `GATE 0` / `0` / `+0.003s after post`).
- **Cover economy** (`logic.js`): each night grants cover (5/4/3, bankable up to 7 — spend it all and the wire catches up). Clicking a field cycles its tier: machine → clean human (1 cover) → lived-in human (2 cover — retried, delayed, VPN exit, the noise real filings have). Downgrades are free.
- **Deterministic wire** (`forgeJudge`): suspicion = 2·machine + 1·clean + 0·lived-in fields vs a tightening tolerance (4/3/2). Two tripwires: a proof that fails the day's spec is flagged regardless of the postmark, and an all-clean stub is flagged as *overrehearsed* — humans don't polish every field. The mode's thesis: you win by being convincingly imperfect.
- **Endings**: UNVERIFIED (slipped all three — the wire filed you as human), REVIEWED (≤2 flags), CAUGHT. Share text upgrades on a clean sweep ("I fooled the wire. All three nights.").
- Resume-safe: cover, tiers, flags, forge log and sent state all persist through the existing save path (`phase: "forge"`).

Verified: `forgeJudge` unit-checked across tier combinations; `test-logic.mjs` ALL PASS (forge additions don't touch deal/audit/finale invariants); real-Chrome smoke — filed proof → patched fields (cover 5→1, suspicion 8→4) → SLIPPED → three nights → REVIEWED ending with correct title.

## Delight pass + forge juice (Nov 14, late)

A second research pass (`docs/UI_DENSITY_PATTERNS.md` — juice must be success-dependent, anticipation is a reward multiplier, the verb should invite itself, haptics as fourth channel, choreographed entrances, payoffs echoing their teachers) landed as ambient upgrades, then got extended to the forge bench so machine mode feels as finished as the week it inverts.

- **Desk tension drives the kit** (`score.js` `setIntensity`): drum voices scale, ghost-brush rate climbs, and past 0.6 an extra kick + low brush answer on the off-off-beat. Audit intensity escalates per case and per hit; finale sits at 0.55; forge climbs its own ramp 0.45 → 0.81 across the three nights.
- **Catch payoff completes its pattern**: the machine's field rings *and* the human baseline cell beside it lifts — the player sees the contrast that proved it, not just the answer.
- **Ambient invite**: enabled stamp buttons, all `.shift-lever-btn` primary verbs (TRANSMIT, CLOCK OUT, overtime), and `#signBtn` share the 3.6s `vbbreathe` lamp-glow.
- **Haptics**: `navigator.vibrate` 12ms on stamp contact, 24ms on catch — guarded, desktop-silent.
- **Forge bench wired into the same system**: TRANSMIT earns an 850ms "THE WIRE IS READING THE STUB" anticipation beat (intensity +0.12, slide whoosh, 12ms haptic) before SLIPPED/FLAGGED; slip floats "+150 · UNREAD", flag vibrates 24ms + thunder rolls; the verdict now shows the wire's per-field suspicion tally (the ringed-baseline pattern — show what it counted, not just the total). Stub fields ink in staggered reading order; oath/clue controls hidden in machine mode (the bench has its own verbs).

Verified: real-Chrome smoke — forge fields stagger in, oath/clue hidden, READING state during anticipation, SLIPPED with correct tally (LATENCY +1 · ORIGIN +1 · RELAYS +2 · RECEIPT +0), zero console errors.

## Forge accessibility + share grid + polish audit (Nov 14, late)

Closed the two gaps flagged after the juice pass, then ran a full-repo consistency audit over everything shipped this session.

- **Forge keyboard path**: `1`–`4` cycle stub fields, `Enter`/`Space` transmits then advances — same number-row verb grammar as the day phase. Verified in real Chrome: keys patch tiers correctly, transmit → FLAGGED with correct tally, Enter advances to the next night, zero console errors.
- **Cover banking is now legible**: `forgeMeta` shows "unspent banks overnight" whenever cover remains, and `INSTR.forge` teaches the keys + the banking rule up front.
- **Share grid tells the two-axis story**: machine mode previously rendered 🌙 as five blank squares (nightResults never populates). Now ☀️ = did the proof satisfy the spec (`forgeProof`), 🌙 = did the stub survive the wire (`forgeLog`) — three nights plus two blank squares, persisted through save/resume.
- **Audit findings fixed**: `vbbreathe` reduced-motion coverage extended to `.shift-lever-btn`/`#signBtn` (the breathe selector had outgrown its motion-off twin); `forgeBusy` added to the base state literal; `forgeMeta` is `aria-live="polite"`.
- **Audit findings accepted as-is**: machine-mode verdict/audit copy branches are unreachable dead code (forge intercepts before verdict) — harmless, kept for clarity; a silent `sfx.slide` on unaffordable patches is enough feedback at this density; `tray-test.tmp.mjs` left alone (not ours).

Verified: `test-logic.mjs` ALL PASS · keyboard smoke clean · repackaged `dist/night-shift-itch.zip` 4.6MB.

## Shipped-games UI study — judge feedback "too simple" (Nov 14, late)

Judge called the UI/UX too simple to win. Diagnosis: the mechanics aren't simple — the *visibility* is. Events are ephemeral (ariaSay, toasts, instant phase swaps), so players see answers but never the systems producing them. Studied OpenTTD (`src/` news/message + window/tooltip code), godot-demo-projects (`gui/` control_gallery, accessibility, theming_override, multiple_resolutions; `2d/`), and phaserjs/examples (`public/examples` particles/camera/tweens/filters). Five adoptions written up as patterns 13–17 in `docs/UI_DENSITY_PATTERNS.md`: persistent desk wire log, tooltip-on-everything, full control state matrix, DOM particle bursts, phase fades + counting numbers. Ship order: wire log → tooltips → state matrix → particles → transitions.

## Visibility pass — wire log, tooltips, state matrix, particles, transitions (Nov 14, late)

Implemented all five adoptions from the shipped-games study (patterns 13–17 in UI_DENSITY_PATTERNS.md). Judge feedback was "UI/UX too simple to win" — the fix is making the systems visible and physical.

- **The wire** (`#wireLog` under the HUD): every stamp, flag, filing, verdict, forge transmit and shift close lands as a dated `N·event` line — last four visible, 60-entry cap, persisted through save/resume. Catches the resolution paths the first pass missed: SUS-pending-flag resolutions, machine walk-throughs, failed flag grounds.
- **Tooltips** (`data-tip` + one delegated handler, `#uiTip`): tel rows and compare rows explain what the wire sees ("LATENCY 3ms — machines answer before the lamp warms"), docket rows read their ruling on hover, forge fields show tier cost + affordability, cover chips explain banking. Keyboard users get tips on focus.
- **State matrix**: `:focus-visible` accent rings on all controls, universal `:active` press-down, forge fields that can't afford their next tier render `.cant` (dimmed + "can't reach" + not-allowed cursor) *before* the click.
- **Particles** (`#fxLayer` + `burst()`): ink spatter on stamp impact, paper flecks on anomaly catch, dust off the stub on transmit — ~40 divs, CSS keyframes, `calmMotion`-gated.
- **Transitions**: every phase section arrives with a 240ms `phasein` (fade + 8px rise), all killed under reduced-motion; score already tweened — now the whole UI moves like a desk, not a webpage.

Verified: real-Chrome playthrough — cold open → day → verdict → audit, wire accumulating correctly (`DAY 1 — THE DAWN | proof filed | proof failed | HUMAN on VALE — wrong`), tel tooltip live, zero console errors.

## Differentiation pass — lessons from DIFFERENTIATION.md (Nov 14, late)

Implemented the priced leans from the comp research (`docs/DIFFERENTIATION.md`).

- **Title tease**: THE MACHINE'S SHIFT is now visible-but-locked on the title (`#machineTitleBtn.locked`, dashed border) — clicking it answers with the terms ("clear overtime — then become the thing you hunt") instead of silence. Once unlocked it also appears on the end screen (`#machineEndBtn`). The inversion is part of the week's endgame, not a hidden bonus.
- **Daily-docket hook**: share text and the epilogue now name the costume — "today's machine wore MARA's face — it wears a new one every docket." The daily comparison is the Wordle hook, finally on the surface.
- **The wire remembers you**: anomaly catches note repeated tells ("same tell as before — the wire remembers"); forge nights cross-reference identical stubs ("same stub as NIGHT 1"). `tellHistory`/`forgeHistory` persist through save/resume.
- **Case file export**: end screen gains "Case file (.txt)" — a downloadable dossier with per-day results, night audit totals, forge proofs/wire outcomes, score, the culprit's face, and the full wire log. The archive persists; the Golden Idol replay instinct, productized.
- **Pitch copy**: itch short description and README now lead with the loneliness thesis ("the only admissible evidence is a life… the saddest filing on the docket is the one trying to belong") per the pitch sentence in DIFFERENTIATION.md.

Not done (priced higher): haunted-paperwork ledger degradation and machine-recognition filings — medium-cost ambience pass, candidate for next session. User-side WIP (`prediction`, `nightMemo`, `predictRow`) left untouched.

Verified: locked-title click-through in real Chrome, zero console errors.

## Depth pass — five systems made playable (Nov 15)

Second judge-facing pass after the visibility work: not more legibility, more *systems the player owns*. All five verified in jsdom drive-throughs incl. a full bot-played run to dawn, zero JS errors.

- **Attract mode**: 20s idle on the title runs a self-playing reel — real card data, stamps, postmarks, wire lines, including a VALE catch. Any input dismisses; `calmMotion()` skips it. Pure vignette: borrows the game's materials, never touches `G`/save/score. *Known limit: demos the stamp verb, not the deduction — see deduction-attract plan.*
- **Prediction stamp** (`#predictRow`): before filing, the clerk calls the rule — WHERE / WHEN / WHO / IN·OUT. Resolved at verdict against the unsealed rule's keys: hit +25, shown as `YOU CALLED WHERE — the seal keys on WHEN + WHO`. Optional, no penalty for abstaining or missing. Persisted via save. Machine mode exempt (it computes, doesn't guess).
- **Clerk's permanent record** (`night-shift-record-v1`): career ledger separate from the run save — shifts, filings judged, anomalies caught, flawless nights, score, prediction record, flawless-night streak. Ranks FILE CLERK → NIGHT AUDITOR → VALE'S MATCH. Filed once in `endGame` (againBtn reloads → no double-count), shown on title, dawn screen, and share text.
- **Clerk's handbook** (`#handbook`): manila reference card, `?` toggles anywhere incl. title, Esc/✕/`?` dismisses. Day loop, night stamping + flag grounds, all four postmark fields, controls, modes. (`H` rejected — already the HUMAN stamp in audit.)
- **Head office memo**: seeded per night via `stream("memo")` — same seed, same memo, same behavior. Early amendment (`amendAfter=1`), quiet wire (amendment suppressed, amended cases re-judged under base rule), or contested-first (`contestedIdx=0`, double bounty). Announced as `✉ MEMO ·` line + wire entry; persisted through resume.

Verified: `node --check` clean; `test-logic.mjs` ALL PASS; jsdom full-run to dawn — memo fired on a real night, record filed `{weeks:1, filings:26, predTotal:1}`, share carries career line. `smoke-art.mjs` still fails on 9 missing card-vignette webps (pre-existing, art pipeline).

Watch-items: quiet-wire nights can have lopsided pass/fail mixes (dealt for amended rule, re-judged under base) — playable, worth a feel-check. Attract reel is verb-demo, not deduction-demo — judges asked to see deduction; plan drafted.

## Attract v2 — the reel now performs the deduction (Nov 15)

Judges wanted to see *deduction*, not just stamping. The attract reel is now a two-act ~35s cycle: **THE DAY** deals a real docket via `LOGIC.deal` headlessly (rulings stamp in staggered), the rule bar holds "SEALED" then unseals to the real rule text, a hand deals, the filed card lifts, and the verdict replays the real ceremony — `factRows()` output with the same `.pre` stagger, ending in SURVIVED or STRIKE (even cycles file passers, odd cycles failures — both stamps seen). **THE NIGHT** keeps the stamp/postmark vignettes incl. the VALE catch. Rotates through all five days, so each loop shows a different rule. Still zero writes to G/save/audio; input aborts; `calmMotion()` skips.

Verified in jsdom: full cycle sampled — docket→unseal→hand→verdict→night vignettes→next day, dismiss on input, zero JS errors.

## Differentiation pass 2 — the medium/high-cost leans (Nov 14, late)

Completed the remaining priced items from `docs/DIFFERENTIATION.md`.

- **The desk dreams (haunted paperwork, ambitious version)**: from night 3 on,
  ~50% of nights the audit resurfaces a proof *you* filed earlier in the run —
  same argument, someone else's name on it. `deskDream()` swaps a human filing's
  card for a past `filedIds` entry (seeded via `stream("echo")`), recomputes
  truth against that case's rule, and tags `echoDay`. Reveal is layered: a faint
  `† your hand` marginal tag with tooltip pre-stamp, an aria beat on first
  encounter ("The desk keeps copies — of everything."), and a wire cross-ref on
  stamping. Verified across 10 seeds: fires ~30-50%, never on the culprit's slot.
- **Ledger degradation**: `humanTel(rng, filed, day)` now drifts cleaner as the
  week wears on — lower latency floor, fewer resends/delays, shorter relay
  chains. Humans stay human (no tells), the whole wire just runs *too* clean.
  `botTel`'s disguise inherits the same degraded distribution. Visually,
  `body[data-wear]` thins the paper grain from .05 → .015 opacity across days —
  the desk literally gets cleaner as it gets wrong.
- **Wire memory deepened**: anomaly tells now escalate — second sighting says
  "same tell as before," third+ says "N× this run, the wire keeps score."
  Forge mode tracks `forgePatchCounts` per field; any field patched 2+ times
  surfaces in the transmit wire line as `habit: RELAYS ×3 — the wire counts
  patterns`. Both persist through save/resume.
- **Case file → styled dossier**: the .txt export is now a self-contained HTML
  dossier — serif ledger styling, per-shift table, stamped title, full wire log,
  `@media print` rules so it prints to PDF as a physical case folder. Still one
  click, still named `night-shift-<seed>-casefile.html`.

Verified: `test-logic.mjs` ALL PASS · `deskDream` exercised across 10 seeds in
real Chrome (correct slots, correct card ids, truth recomputed) · dossier HTML
validated · wear dataset confirmed · zero console errors · browser session closed.

## Sponsor pass — WeLoveIndies audio + fal vignette completion (2026-11-14)

- **WeLoveIndies (F/demo license, non-commercial):** "Manhattan Lounge" now
  loops under the title/attract (`audio/title.mp3`, loudnorm −16 LUFS,
  edge fades); "Blue In Green" plays once at dawn (`audio/dawn.mp3`).
  `playLicensed()`/`stopLicensed()` in game.js ride the first user
  gesture (autoplay policy), respect the M-mute, and fail silently if
  the file is absent — the procedural score still carries gameplay.
- **Machine faces:** `faceImg()` renders the existing painted portraits
  (`art/{mara,oko,jun,tess,vale}.webp`) on the dawn "the machine wore
  X's face" line and in the exported case-file HTML. The face only
  appears where the fiction names it.
- **fal (MiniMax H3, existing pipeline):** the 9 missing card vignettes
  generated via `scripts/generate-art.mjs` + new scenes in
  `art-manifest.mjs` — `card-night-market`, `card-temple-dusk`,
  `card-offshift-couch`, `card-feeding-three`, `card-last-route`,
  `card-the-scroll`, `card-stockroom`, `card-microwave-fish`,
  `card-loading-screen`. `smoke-art.mjs` now PASSes: 62 assets, all
  in budget.
- Pending: Rodin emblem (Hyper3D credits claimed; generation queued
  manually), WeLoveIndies intro-tag check on the two tracks.

## Elevation pass — payoffs, attribution, packaging (2026-11-14, later)

- **Dawn mugshot:** the culprit's portrait now gets a framed reveal block
  on the end screen (`#endMug` — manila card, name, "the face the
  machine wore tonight") instead of a 56px footnote; absent files hide
  the whole block via img onerror.
- **Rank promotion:** `endGame` compares `clerkRank` before/after
  `fileRecord()` — a promotion lands as a gold `PROMOTED — <rank>`
  endline plus a wire entry. First-shift FILE CLERK doesn't self-promote.
- **Attract mode completes the loop:** the day act now performs the
  clerk's call — four attribute chips, one picked (even days hit a real
  rule key, odd days whiff), resolved at verdict as
  `YOU CALLED X — the seal keys on Y · +25`. The reel demos every verb
  the day phase has, including the prediction stamp.
- **Clerk's call is visible live:** picking a prediction chip writes
  `clerk's call — WHERE` to the wire immediately; handbook's THE DAY
  section documents the chips; title screen hints `?` opens it.
- **Licensed-audio polish:** bookend tracks fade in (~1.5s) and out
  (~0.9s, `__fadeOut` race-guarded) instead of hard-cutting; a
  `music · WeLoveIndies` credit line sits on the title and the shipped
  `LICENSE-CREDITS.txt` names both tracks + the F/demo license.
- **Rodin seal goes cinematic:** `art/rodin-stamp.webp` is now a
  12-frame turntable (192px animated WebP, 124KB) rendered from the
  archived GLB via a local three.js viewer — the brass seal slowly
  rotates inside the exported case-file dossier. Viewer + frames
  archived in `docs/promo-assets/rodin/`.
- **Packaging fix (real bug):** `scripts/package-game-off.sh` zipped an
  explicit file list that predated `audio/` — the licensed tracks would
  have silently not shipped to itch.io. `audio` added to the zip; the
  standalone repo export already copies the whole dir.
