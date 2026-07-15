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
  speed-run mid-arc). Layer stack: warm radial gradient → topographic contour
  texture → paper grain → phase-tinted color pools → **population field**
  (warm dots representing the surviving field) → EmberField ripple → optional
  AmbientMotifs. The population field is the brand essence: you see the crowd,
  you feel them thin. In prelaunch, dots appear as players reserve. In live,
  eliminated dots fade. In ended, one bright dot remains. Population data flows
  from `useRound` + `useStats` through `AppShell`.
- **TopographicTexture** (`ui/TopographicTexture.jsx`) — faint contour lines
  under the warm gradient. The game's premise is proving you're somewhere real;
  the topo pattern grounds the backdrop in physical geography. Deterministic
  seeded shapes (per-phase seed) with a gentle breathing animation on the
  innermost rings. 3-4.5% opacity — structural, not decorative. Day markers
  (D1-D5) placed at ascending contour elevations like waypoints on a trail;
  the current day brightens, past days dim to ghosts, future days are faint.
- **PopulationField** (`ui/PopulationField.jsx`) — warm dots scattered across
  the backdrop, each representing a player. Deterministic positions (seeded,
  min-distance constraint) so dots don't jump when count changes. Eliminated
  dots leave a **persistent ghost ring** — a faint echo where a player used
  to be. By game end, 49 ghost rings scatter the backdrop with one bright
  dot remaining: the entire game narrative in a single image. Winner dot
  gets a crown glow. rAF drift for organic motion. Reduced-motion: static.
  Max 50 dots (cohort size).
- **CoordinateGrid** (`ui/CoordinateGrid.jsx`) — faint map grid (A-H, 1-8)
  for the desktop backdrop. Reinforces the map identity. 3.5% opacity —
  structural character, not decoration. Desktop only.
- **CompassRose** (`ui/CompassRose.jsx`) — a small hand-painted compass in
  the desktop gutters. Classic map element that says "this is a map, and
  you're on it." Painted in the same gouache hand via GouacheFilters. The
  needle has a gentle wobble (6s ease-in-out), like a compass at rest.
  Reduced-motion: static. Desktop only.
- **DesktopBackdrop** (`DesktopBackdrop.jsx`) — the cultivated environment
  OUTSIDE the 430px game column on desktop. Portal-based (renders on
  document.body, outside #root's stacking context). Layer stack: coordinate
  grid → topographic texture + day markers → population field + ghost rings →
  large hand-painted motifs (DozingCat 140px, CoffeeBrew 120px, tree, ramen,
  sunrise at 25-32% opacity) → compass rose. The contrast between cold topo
  lines and warm painted motifs IS the art direction thesis. Responsive:
  more motifs appear as the viewport widens (480px → 640px → 768px). Hidden
  during landing mode and on mobile.
- **AmbientMotifs** (`AmbientMotifs.jsx`) — soft corner flourishes (tree, cat,
  coffee, ramen). Off by default now — the population dots and topo texture
  carry the character. Enable with `flourishes` on ceremony screens that want
  extra warmth. LandingHero / SpeedRunIntro keep their denser floating set.
- **Craft dialect (demo ↔ real)** — `CraftCta.jsx` (HumanCta / GameCta) +
  `src/lib/cuelume.js` interaction layer. Speed-run `beatUi.jsx` ceremonies
  (`DayReveal`, `CutCeremony`, `OutcomeCeremony`) share MotifFrieze / DozingCat
  with live overlays (`GameMoment`, `RuleReveal`) so `/?demo=1` and the cohort
  path speak one visual language.
- **Desktop environment** (`index.css`, ≥480px) — the 430px column was stranded
  in a black void; it now rests on a warm paper-textured surface, framed with a
  soft shadow, so desktop feels crafted too. Mobile stays edge-to-edge.
- **Mascot** (`Mascot.jsx`) — the Survivor, rebuilt in gouache-on-paper. Body in
  terracotta, head in petal amber, limbs in crema brown — same `GOUACHE` palette
  as every other warm component. Brush-wobbled via `GouacheFilters`, paper grain
  clipped onto body and head. 11 expression variants (idle, excited, sad,
  sleeping, shocked, determined, proud, thinking, worried, celebrating, winner)
  all painted in espresso/foam — no pure black or white. Headband stays blood
  red (the one cold accent that ties the mascot to the system). Cursor-tracking
  pupils and blink animation preserved from the original.
- **MascotGuide** (`ui/MascotGuide.jsx`) — speech-bubble wrapper for the Mascot.
  Positions the bubble top/bottom relative to the mascot, fades in/out on
  message change. Used in SpeedRunIntro, D1AuditBeat (reactive to votes),
  GameMoment (survival/elimination), FinaleBeat, Onboarding profile step.
- **ProofScene** (`ui/ProofScene.jsx` + `ui/proofSceneData.js`) — hand-painted
  gouache scenes replacing all Unsplash stock photos. 8 scene types (transit,
  gym, grocery, beach, eating, cafe, park, default) rendered as self-contained
  SVG data URIs with the same brush wobble + grain as `GouacheFilters`. Per-scene
  seed variation so submissions look distinct. The `.js` file is split out for
  fast-refresh compliance (data utilities separate from the component).
- **GameplayLoopDemo** (`ui/GameplayLoopDemo.jsx`) — auto-playing animated
  sequence in a phone-frame mockup showing the core loop: theme drops → check
  in → crowd votes → survive. 4 phases cycle on a timer with progress dots.
  Placed in onboarding step 0 between "How it works" and the stakes, so users
  see the game in motion before the paywall.
- **ExitIntentPrompt** (`ui/ExitIntentPrompt.jsx`) — soft exit-intent overlay
  for the paywall. When a user taps back on the Reserve step, this overlay
  appears with a softer alternative (practice run) instead of immediately
  going back. Mascot says "Not ready? That's fair." — dry, not pushy.

## Next step

Remaining opportunities, in order of visibility:

- **Emoji still lurking in chrome** — high-traffic leftovers in MissionBoard /
  Delight copy where a painted mark would beat a glyph.
- **Achievement / milestone artefacts** — day-3, day-7, day-30 moments deserve a
  peak-moment painted reward, not a generic badge.
- **New daily themes** — any theme added later just needs a `MOTIFS` entry;
  until then it falls back to its emoji automatically.
- **Richer proof scenes** — the current `ProofScene` scenes are minimal painted
  shapes. If they read as too sparse, add figures (a person at the gym, a hand
  on the coffee mug), more environmental detail, and texture variation. The
  system supports it — just extend the scene paths in `proofSceneData.js`.

Restraint still holds: room motifs stay soft; MotifFrieze / ThemeMotif live at
peak and dwell; admin and error surfaces stay machine-flat on purpose.
