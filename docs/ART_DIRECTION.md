# Art Direction — Last Human Standing

**The human-motif language.** This note exists because the app tests well on
mechanics but reads as *cold and robotic* — which directly contradicts the
title. This is the reference for fixing that. Design against it.

---

## The problem in one line

The current visual language — scanlines, terminal mono, blood-red, neon-on-black
— is the dialect of **machines** (surveillance, terminals, dystopia). We built
"Last Human Standing" in the aesthetic of the thing the humans are standing
*against*. The medium contradicts the message.

## The thesis: proof of presence

The fix is not "add cute stickers." It's a precise category:

> **Artefacts of a life being lived.** Flowers, coffee, a sleeping pet, a
> handwritten note — evidence that a *person* is here, showing up, caring.

This is almost literally the game's premise. Last human standing = who is still
*here*, still alive, still turning up each day. The motifs are the visual
argument for the title, not decoration.

## The organizing principle: cold system, warm human

Don't sand the machine away — **contrast is the art direction.**

- **The system stays machine** — rules, countdowns, the elimination engine,
  verdicts. Cold, brutalist, mono. This is the world the humans survive inside.
- **The human is warm** — everything the *player* brings: their check-in, their
  streak, their pet, their coffee, their handwriting. Rendered warm, tactile,
  hand-made, imperfect.

The tension between the two *is* the story. Render both; never blend them into
mush.

## What qualifies a motif as "human"

Use these to generate new motifs — the vocabulary below is a start, not a cap.

1. **Humble, not heroic.** Coffee, not a trophy. The mundane is where humanity
   lives.
2. **Worn / imperfect / alive.** A *wilting* flower, a *chipped* mug, a
   *sleeping* (not posed) pet. Perfection reads as manufactured.
3. **Implies care over time.** You water, you brew, you feed. Ongoing tenderness
   — maps onto the daily-ritual loop.
4. **Ownable.** *My* plant, *my* mug. Stable per-person, so it becomes identity.

## Starter vocabulary → where it lives

| Human register | Motifs | App moment |
|---|---|---|
| Growth / time / tending | flowers, houseplant, sprouting seed, ripening fruit | streaks, days survived, waiting |
| Comfort / morning ritual | coffee & steam, a ring stain, warm lamp, toast | daily check-in, morning push |
| Companionship | curled-up cat, dog at the door, a fish | idle / lonely waiting, spectator |
| Traces of a hand | handwriting, doodles, sticky notes, thumbprint, tape, folded corner | texture layer everywhere — the "designer's hand" |
| Small joys / play | bubbles, paper boat, balloon, marbles | transitions, delight |

## The one discipline: the material treatment is the glue

A bubble, a cat, and a coffee cup only feel like *one human made them* if they
share a single hand-made render. **Pick ONE treatment; that is what makes the
vocabulary cohere.** Subjects can vary wildly; the hand behind them must not.

Candidate hands (see next step): gouache-on-paper · soft clay/ceramic ·
crayon/colored-pencil · ink & wash.

**Restraint rule:** motifs live at *peak and dwell* moments — waiting, empty
states, milestones, ceremonies — not smeared across every pixel. The machine
still runs the routine screens.

---

## Decisions

- **DECIDED — Per-person identity, not per-render randomness.** Real human
  diversity is a *varied population of consistent individuals*. A person's
  artefact is stable (same seed → same result), so it becomes theirs. Randomising
  per-render reads as a glitch, not diversity.
- **OPEN — The material treatment (which hand).** The single most consequential
  choice; everything is drawn to match it. Prove it once before committing.

## Status / provenance

- **The shared hand** — `GouacheFilters.jsx` (brush + grain filters) and
  `gouachePalette.js` (the warm palette). Every motif imports these; this is the
  glue in code. Extend the palette here, never fork it.
- **Bubble loader** (`BubbleLoader.jsx`) — the first probe. A soft-body,
  physics-driven artefact that reads *alive*, not *processing*. Kept as a
  **single instance** (check-in submit, leaderboard load), **not** a franchise.
  Proved: physics + hand-made beats faked digital effects (scanlines, CSS noise).
- **CoffeeBrew** (`CoffeeBrew.jsx`) — calibration piece. Painted mug + steam,
  shown for the **AT A CAFÉ** theme on the check-in card. Defines the hand.
- **StreakBloom** (`StreakBloom.jsx`) — a potted plant that grows with the
  check-in streak (dormant → sprout → bud → bloom), in `ArsenalCard`. Growth =
  time = the daily loop. Its ceramic pot rhymes with the mug on purpose.
- **DozingCat** (`DozingCat.jsx`) — a sleeping cat for the lonely dwell moment
  (`SpectatorChip` cohort-2 priority state): *you're not alone*. Plain spectators
  are handled in `MissionBoard` so the cat isn't duplicated. New register
  (companionship / a living creature), new motion (a slow breath).
- **ThemeMotif** (`ThemeMotif.jsx`) — the full daily-theme wheel. A dispatcher
  keyed by each theme's emoji renders its hand-painted artefact on the check-in
  card (café→mug, park→tree, gym→dumbbell, friend→two mugs, sunrise→sun,
  bookstore→books, eating→ramen bowl, transit→bus, grocery→bag, beach→paper
  boat). All 10 themes covered; unpainted future themes fall back to the emoji.
- **MotifFrieze** (`MotifFrieze.jsx`) — the still-life shelf (sunrise · coffee ·
  cat · park · meal). Peak/dwell only: landing, speed-run intro + quiet beats,
  onboarding rules/reserve, post-reserve, mission board, empties (feed/chat/
  standings/history), day recap, finale.
- **AmbientBackdrop** (`AmbientBackdrop.jsx`) — shared warm room for every
  player shell (home, feed, chat, standings, history, onboarding stages,
  speed-run mid-arc): radial “lit room,” paper grain, EmberField ripple,
  phase-tinted pools. Transparent page shells so the room shows through.
- **AmbientMotifs** (`AmbientMotifs.jsx`) — soft corner flourishes (tree, cat,
  coffee, ramen) inside the backdrop so the hand doesn’t vanish after landing.
  Optional `flourishes={false}` when a ceremony already owns a large ThemeMotif
  (check-in). LandingHero / SpeedRunIntro keep their denser floating set.
- **Craft dialect (demo ↔ real)** — `CraftCta.jsx` (HumanCta / GameCta) +
  `src/lib/cuelume.js` interaction layer. Speed-run `beatUi.jsx` ceremonies
  (`DayReveal`, `CutCeremony`, `OutcomeCeremony`) share MotifFrieze / DozingCat
  with live overlays (`GameMoment`, `RuleReveal`) so `/?demo=1` and the cohort
  path speak one visual language.
- **Desktop environment** (`index.css`, ≥480px) — the 430px column was stranded
  in a black void; it now rests on a warm paper-textured surface, framed with a
  soft shadow, so desktop feels crafted too. Mobile stays edge-to-edge.

## Next step

Remaining opportunities, in order of visibility:

- **Emoji still lurking in chrome** — high-traffic leftovers in MissionBoard /
  Delight copy where a painted mark would beat a glyph.
- **Achievement / milestone artefacts** — day-3, day-7, day-30 moments deserve a
  peak-moment painted reward, not a generic badge.
- **New daily themes** — any theme added later just needs a `MOTIFS` entry;
  until then it falls back to its emoji automatically.

Restraint still holds: room motifs stay soft; MotifFrieze / ThemeMotif live at
peak and dwell; admin and error surfaces stay machine-flat on purpose.
