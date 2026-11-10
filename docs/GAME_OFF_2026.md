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

## Scope for ~3 weeks solo

- **Tech**: vanilla JS + DOM + WebAudio, no build step, works from `file://`. `game-off/{index.html,style.css,game.js,logic.js,riddles.js,test-logic.mjs}` — extract to its own public repo before Dec 1. All "art" is typographic/icon-driven (hand-cut card corners, stamp animations, paper/desk-lamp shift themes). Night music is one vendored CC-BY-4.0 MP3 (`game-off/audio/bump-in-the-night.mp3` via `scripts/vendor-patch.mjs`, credit in `game-off/LICENSE-CREDITS.txt`, `M` toggles) on a plain `<audio>` element so `file://` keeps working. Case data lives in `riddles.js`, deal/verdict rules in `logic.js` (pure, node-testable) — adding days/cards/rules is data-only.
- **Milestones**:
  1. ~~Core~~ **done**: full loop playable — 5 days, docket → file → verdict → night audit, strikes, dossier, juror path.
  2. ~~UX pass~~ **done 2026-11-10 (pivot 3)**: rebuilt as a deduction game (see "Fixes shipped") — the spec-as-icons build was replaced.
  3. ~~Enrichment~~ **done 2026-11-10**: all seven mechanics shipped — seeded dockets + share grid, suspense verdict, clue + oath, clerical error, amendments, streak + shift clock, VALE finale.
  4. **Balance + fresh playtest (next)**: verify a fresh player understands each feature on its introduction day; tune oath/clue/flag economics and streak/clock pressure.
  5. **Juice + submit (by ~Nov 30)**: cover art, itch.io page (cover, description, tags), extract to public repo, playtest on mobile + itch iframe.
- **Explicit non-goals**: no multiplayer, no accounts, no backend, no Meshy/AI assets required.

## Submission checklist (Dec 1)

- [ ] Public GitHub repo, source pushed
- [ ] itch.io project created under GitHub login, HTML5 embed or downloadable build
- [ ] Cover image + description mentioning SHIFT interpretation
- [ ] Tested in a clean browser, mobile viewport, and itch iframe
- [ ] README with controls + how to run

## Status log

- **2026-11-09** — Doc created; concept locked as **NIGHT SHIFT**.
- **2026-11-09 (pivot 1)** — First build (spot-the-difference) rejected as too generic: LHS skin on a non-LHS mechanic. Rebuilt as a **distillation of the actual LHS loop**: 5 days mirroring the riddle cycle, evidence cards with hidden committed specs, crowd HUMAN/SUS verdicts, elimination → dossier → **jury duty** (the game's own spectator path). Player role: *both shifts* — argue by day, audit by night. Files: `game-off/{index.html,style.css,game.js,riddles.js}`, vanilla JS/DOM, works from `file://`.
- **2026-11-09 (pivot 2 — UX)** — Playtest feedback: "stages unclear, lost with no rhyme or reason." Researched itch.io onboarding/juice best practices (see UX research section), then rebuilt presentation: spec revealed as icon rows matching card glyphs, crowd as 24 verdict figures, stamp + per-icon pass/fail explanations, skippable ceremony, phase-labeled HUD, explicit HUMAN/SUS audit buttons. `riddles.js` chips removed — spec rows now generate from `requires`/`forbid` so display can't lie. Next: content depth pass → cover art → public repo + itch.io.
- **2026-11-10 (pivot 3 — deduction)** — Second playtest, same complaint ("lost immediately, so confusing"). Root causes: blind filing, one-miss elimination, noisy verdicts, emoji-colour verdict signalling that doesn't render. Rebuilt as a **deduction game**: secret 1–3-criterion rule per day, precedent docket (2 HUMAN + per-criterion SUS near-misses) as the day's clues, deterministic `passes()` verdict with per-fact ✓/✗ rows, strikes (3 = cut), one-at-a-time night audit with instant feedback, day/night theme shift, always-visible instruction line, labeled facts everywhere. New `logic.js` holds pure deal/verdict logic; `test-logic.mjs` fuzzes it 2,000 deals/day. Next: content depth → cover art → public repo + itch.io.
- **2026-11-10 (enrichment)** — Seven additions staged across the week so day 1 stays simple: seeded dockets + share grid (daily seed, `?seed=`), suspense fact-row verdict, clue-for-pay + filing under oath (day 2), clerical-error docket row (days 4–5), mid-night rule amendments (days 3–5), streak ×3 + 8s shift clock (nights 1–2), and a finale where you author the last rule to cut VALE — the filer who always passes and always files +0.003s. `test-logic.mjs` now fuzzes seeds/determinism, liar invariants, amended audit segments and the finale cut map.

## Open questions

- Title: NIGHT SHIFT vs SHIFT//CHANGE vs something ARIA-flavored ("The Auditor")?
- Content depth: how many more evidence cards / ARIA lines before diminishing returns? The deck is 23 cards across 4 tag axes; richer days may need cards that widen the tag space.
- Difficulty: do the streak/clock multipliers and amendment traps make night too easy or too punishing for fresh players? Needs a fresh-player playtest.
- Liar fairness: is the clerical error actually *findable* (two outvoting SUS rows) for a first-time player, or does it read as noise? Playtest.
- Does ARIA stay typographic, or does she get a face (e.g., the rigged `aria-emotions.glb` we already vendored for LHS)?
- Mobile: night stamp buttons are full-width and the hand is 2×2; verify the docket stays legible at 390px.
