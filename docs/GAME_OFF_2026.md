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
- **Audio: compose an original procedural noir score in WebAudio** (upright bass, brushed kit, piano, muted trumpet), phase-layered and event-reactive (catch sting, contested swell, duck under stamps, silence before CUT). Drops the 3.4MB `audio/` dir entirely — one score everywhere, file:// and embed parity, no AI-music credit. **Decision checkpoint 2026-11-21**: if the motif doesn't land, fall back to keep-current-tracks + mixing polish.
- **Owner split**: Droid owns W1–W8 (game + regenerated media kit, freeze Nov 25). The owner keeps: itch page, trailer, upload, human-stranger playtest, and ratings reciprocity during voting.

### Workstreams

- **W1 — Save/resume** (P0): snapshot state to `localStorage` after every phase transition (seed, day, score, strikes, flags, mute, reduced-motion). Title gains `RESUME SHIFT — Day N · Score S` when a save exists; a new shift clears it. Resumed runs keep their original seed even after the daily seed rolls over.
- **W2 — Cold open: teach by contrast** (P0): after stamping the human filing, a two-beat comparison strip aligns the two receipts side by side — "filed hours after the riddle" vs "filed 3 milliseconds after" — so the VALE judgment is a deduction, not a coin flip. Plain-word relabel everywhere in the jam build. ARIA teaches the contrast in one sentence; lore demoted. **Gate:** a fresh blind agent catches VALE *with stated reasons* on the cold open in ≥2 of 3 runs.
- **W3 — Art pipeline + integration** (P0, largest): `scripts/generate-art.mjs` (fal client) + committed prompt manifest (`scripts/art-manifest.mjs`). 36 assets in 5 groups: room×4 incl. cover-base, filer portraits×6 (VALE subtly uncanny), card vignettes×24, endings×2. WebP, 250KB/asset budget with ffmpeg recompress. Style anchor goes to the owner for review before the batch runs. Docs/credits updated honestly (painted key art: MiniMax H3 via fal.ai).
- **W4 — Make the shift visible** (P1): the lever pull becomes a perspective flip — the same painted room from the clerk's chair (day) crossfades to the same room from behind ARIA's desk (night), one-line beat: "You are the desk now." Gives Theme raters a screenshotable moment and upgrades the literal take with the role-reversal read. Full `prefers-reduced-motion` parity.
- **W5 — Original procedural score** (P1): see decision above. **Gate:** blind listeners describe it as "jazz noir", not "drone".
- **W6 — Copy, mobile, consistency**: one canonical tagline everywhere ("Deduce by day. Enforce by night. Catch the machine."), fix the "canvas" feature bullet and stale size claims (208KB/52KB), README + credits pass, 390px mobile audit (docket, portraits, vignette crops, night buttons), zip target < 8MB with art lazy-loaded behind the title.
- **W7 — Media kit regen** (~½ day, handoff): cover rebuilt from the painted hero + vector text; `catch.gif` + six screenshots re-captured headless into `docs/itch-assets/`; one-pager of final copy blocks for `ITCH_PAGE.md`.
- **W8 — Validation** (concentrated Nov 22–25): `test-logic.mjs` + `audit-deduction.mjs` untouched-pass; new asset smoke script (manifest completeness + size budget); save/resume round-trip test; `file://` vs http parity; 390px capture; three blind fresh-context playtests with measured gates (cold-open catch-with-reason, first-60s comprehension, full-week completion, feed gut-check on new screenshots).

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
