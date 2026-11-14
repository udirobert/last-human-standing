# UI Density Patterns — NIGHT SHIFT (and dense inspection games generally)

Research pass 2026-11-14, triggered by the cold-open readability report
("too much to squeeze into the viewport") and the duplicate-postmark fix.
Sources cited inline; this doc is the project's working pattern sheet.

## The phenomena, named

### 1. Cognitive overload — "the UI black hole"

When everything on screen competes at equal volume, players can't prioritize
and errors rise. Caliber's HUD team states it flatly: *"too many visuals in
the HUD is practically the same as having none."* Roblox's UI/UX guidance:
identify what the player needs *right now* and show only that — swap, don't
accumulate. Wayline's cognitive-load checklist: cut everything not essential
to the immediate loop.

**NIGHT SHIFT mapping:** the audit phase already follows "one verb per
screen" (stamp SUS/HUMAN). The violation was *content*, not verbs — the card
carried photo + name + argument + clerk note + 4 fact rows + 4 postmark rows
simultaneously. Fix direction: rank by decision-relevance and demote the
rest (note is `opacity:.8` texture; photo is scene, not evidence).

### 2. Duplicate information on the same surface

NN/g's duplicate-link research is the canonical statement: showing the same
content twice makes users stop and ask *"are these the same or different?"* —
it costs working memory, and users click/scan both copies. The same applies
to data fields, not just links. (ux.stackexchange consensus: duplicate
*commands across different pages* are fine and expected; duplicates *on the
same page* are the confusing kind.)

**NIGHT SHIFT mapping:** the cold-open `.rc-compare` table and the card's
`.case-stub` printed the same LATENCY/ORIGIN/RELAYS/RECEIPT twice — the
player had to reconcile two copies of the evidence that mattered most.
Fix shipped: the compare's right column IS the filing's postmark; the card
stub stands down (`data-tel` retargeting keeps ring/strike/peek working on
either surface).

**Rule:** one datum, one surface, per screen. If two presentations are both
needed (compare vs single), they must be *mutually exclusive* — never
stacked.

### 3. Viewport real estate — budget, don't shrink

- HUD guidance (gamedesign.gg, Partii): always-on chrome ≈ ≤1/5 of screen;
  anchor to edges, keep center clear; *"screen balance is not a goal —
  reading efficiency is."* Spreading elements to "balance" the composition
  is an art-review instinct that damages usability.
- Legibility floor: design for the smallest target device first, scale up —
  never the reverse (accessiblegamedesign.com HUD guidelines; Partii:
  smallest HUD text must be legible on the smallest target).
- When content exceeds the viewport, the fix is *restructure* (columns,
  merge, demote), not *compress* (smaller type, tighter leading). Shrinking
  type to fit is how you get unreadable 9px evidence — which is what the
  postmark stub was doing at `#7d8ba0`/10px.

**NIGHT SHIFT mapping:** `#frame` is a single 760px-max column — lots of
dead horizontal space while the audit stack overflowed vertically. The card
diet widened the card to 540px and went two-up on the postmark; stub drops
to one column under 620px rather than shrinking type.

### 4Progressive disclosure — show it when it's needed

NN/g: defer secondary features to a secondary display; the initial display
should contain only what is frequently needed *now*. Papers, Please is the
reference implementation for inspection games: rules live in a separate
rulebook, documents are readable one at a time, and the *inspection mode*
(inspect/compare highlight) is itself a disclosed layer you invoke — the
game never shows every document field and every rule at once. Return of the
Obra Dinn goes further: the Logbook compiles clues into one stable surface,
and identity fields stay locked until enough evidence exists ("deduction
levels" tell you how hard a guess would be).

**NIGHT SHIFT mapping:** already aligned — the spec is sealed until verdict,
the postmark prints row-by-row on fresh filings (`stubprint` stagger), the
flag row only appears when SUS-on-clean-paper demands grounds, the
amendment waits for acknowledgment. The compare strip is the cold open's
inspection mode: invoked once, teaches the contrast, then never repeats.

### 5. One primary task per screen / positional constancy

Project rule (already in GAME_OFF_2026.md): if a player can't say what to
do next within 3 seconds, the screen is wrong. Corollary from HUD guidance:
*things stay where they are* — players learn positions and stop reading.
Health in the same corner every level; same color, same meaning.

**NIGHT SHIFT mapping — watch item:** the postmark now has two possible
surfaces (single stub vs compare strip). Both occupy the same zone
(bottom of the case presentation, directly above/inside the card), same
mono type, same four labels in the same order — that preserves positional
constancy. If a third surface ever appears, it must keep that grammar or
the player has to re-learn where testimony lives.

### 6. Comparison needs alignment, not proximity

The cold-open teach works because the two receipts share row labels in a
shared grid — the eye compares column-to-column, not memory-to-memory.
Obra Dinn/Golden Idol both use aligned table structures for exactly this
reason. Alignment is the mechanism; color-coding the difference would be a
shortcut that does the reading *for* the player (which this game
deliberately never does — "it aligns; it never accuses").

## Checklist for the next dense screen

Before shipping any audit/night/verdict layout:

- [ ] Every datum appears exactly once. If a second view exists, the first
      is suppressed (mutually exclusive surfaces).
- [ ] Vertical budget checked at 760px desktop AND 390px mobile; overflow
      is fixed by restructuring, never by shrinking below legibility floor.
- [ ] Evidence (postmark, fact rows) gets the brightest quiet color;
      texture (notes, flavor) stays dim.
- [ ] Whatever is needed *right now* is above the fold; everything else is
      one interaction away.
- [ ] Same datum keeps the same position, type, and labels across states.
- [ ] If two items must be compared, they share an aligned row structure.

## Delight & feel — the second research pass (2026-11-14)

Density fixes make the game *readable*; these patterns make it *pleasurable*.
Applied to NIGHT SHIFT the same day; the checklist below is the gate.

### 7. Juice must be success-dependent

World of Goo / the juice literature: amplified feedback only on *success* —
a correct stamp answers warmly, a wrong one answers dully. Blanket
celebration trains players to ignore feedback. NIGHT SHIFT already splits
`sfx.human()`/`sfx.sus()` and only the catch gets the horn sting + grease
ring + VALE dissonance. Rule: the rarest, biggest moment (catching the
machine) gets the most layers; routine correct stamps stay quiet-satisfying.

### 8. Anticipation is a reward multiplier

Ray Mazza's feedback trinity (visual + aural + verbal) plus anticipatory
feedback: the buildup to a reveal is itself fun (slot reels, Obra Dinn's
slow confirmations). NIGHT SHIFT's suspense verdict ("…" hold before the
last fact row) and the 300ms stamp fall are this pattern. When adding a
new reveal, budget a beat of anticipation *before* the answer — never
answer instantly.

### 9. The verb should invite itself

Prompts-over-panels extends to ambient invitation: a barely-visible breathe
on the enabled stamp buttons (3.6s lamp-glow, `vbbreathe`) marks the
primary action without a word of instruction. Amplitude discipline: if the
invite is noticeable, it's too loud.

### 10. Haptics are the fourth feedback channel

Mobile players can't feel screenshake. `navigator.vibrate` on stamp
contact (12ms) and on catch (24ms) gives the bite a body. Guarded, silent
on desktop, disabled under any future "reduce feedback" setting.

### 11. Entrances are choreography, not appearance

Elements that carry information should *arrive* in reading order —
the night summary rises line-by-line, the flag grounds cascade in one
button at a time, the compare receipt prints row-by-row like the stub it
replaced. Instant appearance reads as UI; staggered arrival reads as a
desk doing paperwork.

### 12. Payoffs should complete the pattern they taught

The catch rings the machine's field — and now lifts the human baseline
cell beside it (`[data-tel].ringed .rcc-a`). The player doesn't just learn
"that field was wrong"; they see *the contrast that proved it*. Every
teaching surface should have a payoff that echoes its own structure.

### Delight checklist (add to the density checklist)

- [ ] Correct vs wrong feedback is differentiated in intensity, not just valence.
- [ ] Big moments have an anticipation beat before the reveal.
- [ ] Primary verbs have a sub-perceptual ambient invite; nothing shouts.
- [ ] Mobile gets haptic confirmation on the two biggest impacts.
- [ ] Information-bearing elements arrive staggered, in reading order.
- [ ] Every catch/payoff echoes the structure that taught it.

## Sources (delight pass)

- arXiv 2011.09201, *Designing Game Feel: A Survey* — physicality /
  amplification / support; juice = amplification of interactivity
- astrocade.com juice lesson — juice heightens the core mechanic, test it
- mechanicsofmagic.com, *Juiciness and World of Goo* — success-dependent
  feedback; curiosity-evoking payoff > raw amplification
- raymazza.com, *The Holy Trinity of Feedback* — visual/aural/verbal +
  anticipatory feedback as multiplier
- powerupready.substack.com, *Designing for Surprise and Delight* —
  micro-moments, anticipation pacing, player-triggered delight
- gamedeveloper.com, *Methods of Creating Invisible Tutorials* +
  *Playful Teaching* — affordances, one mechanic at a time, teach in context
- simonsanchez.art, *Teaching the Player* — kishōtenketsu structure,
  safe observation before consequence
- gamedesign.gg / wayline.io (carried from density pass)

## Sources (density pass)

- NN/g, *Progressive Disclosure* — nngroup.com/articles/progressive-disclosure/
- NN/g, *Reduce Redundancy* / *The Same Link Twice* — duplicate content costs
  working memory and slows scanning
- gamedesign.gg, *HUD Design Principles* — edge anchoring, reading efficiency
  over screen balance, aspect-ratio anchoring
- partii.games game-UI docs — HUD ≤ ~1/5 screen, legibility floor on smallest
  device, prompts over panels
- playcaliber.com HUD approach — prioritize; less important = smaller/dimmer
- Roblox UI/UX docs — hierarchy of information, contextual display
- wayline.io, *17 Ways to Minimize Cognitive Load in Game UI*
- Papers, Please teardown (mechanicsofmagic.com; firstpersonscholar.com) —
  documents one at a time, rules in a separate book, inspection mode as
  disclosed layer
- Obra Dinn UI analysis (playxix documentary writeup; intermittentmechanism)
  — stable logbook surface, evidence-gated fields

## Visibility & systems legibility — the shipped-games pass (2026-11-14)

Judge feedback: "the UI/UX was too simple to win." Reading the code, the
mechanics are not simple — the *visibility* is. Every event in NIGHT SHIFT
is ephemeral (ariaSay quips, toasts, phase swaps), so players and judges
see answers but never the systems producing them. This pass studies how
three shipped-game codebases make systems legible and physical, and what
to adopt. References are to the repos as browsed:

- `github.com/OpenTTD/OpenTTD` — `src/` (news/message system, window +
  tooltip code), 33k commits of a game whose UI is purely informational
- `github.com/godotengine/godot-demo-projects` — `gui/` (control_gallery,
  accessibility, theming_override, multiple_resolutions, drag_and_drop),
  `2d/` (glow, particles-adjacent demos)
- `github.com/phaserjs/examples` — `public/examples` categories (particles,
  camera, tweens, filters), indexed at labs.phaser.io

### 13. OpenTTD's news wire → a persistent desk log

OpenTTD never lets an event be ephemeral: every delivery, disaster, and
milestone lands in a dated, categorized message feed that persists all
game (`src/` news/message code + the news GUI). NIGHT SHIFT does the
opposite — `ariaSay` quips and toasts vanish, so the deduction, the cover
economy, and the wire's reasoning are invisible while they happen.

**Adopt:** a slim "wire" strip under the HUD accumulating tonight's events
in monospace — `02:14 · SUS stamp upheld · +25`, `02:31 · ANOMALY
quarantined · +100`, forge: `stub transmitted · suspicion 4/4 · SLIPPED`.
Persists across phases, feeds the end screen. One array + one render
function; the largest perceived-depth gain per line of code available.

### 14. OpenTTD's tooltip-on-everything → hover/focus inspection

OpenTTD makes every map tile, vehicle, and station inspectable on hover —
the world explains itself on demand. Our cards show four facts with no
interpretation; tel fields show raw values; the day rule stays sealed
until verdict. A judge hovering should learn the game.

**Adopt:** styled tooltips (`data-tip` + one delegated handler) on docket
rows ("ruled: passes · filed by MARA"), tel fields ("LATENCY 3ms — faster
than humanly possible"), cover chips ("spent on RELAYS → lived-in"), and
forge fields (tier cost/buy). Keyboard path via `aria-describedby`.

### 15. Godot's `gui/control_gallery` → a complete state matrix

`godot-demo-projects/gui/control_gallery` exists because every control
must look *considered* in default/hover/pressed/disabled/focused — that
matrix is what "polished" is judged against. Our `vbbreathe` covers the
happy path only; pressed states, `:focus-visible` rings, and
disabled-with-reason are thin or absent.

**Adopt:** audit every interactive element against the matrix. The forge
fields especially: an unaffordable patch should *look* unaffordable
before the click, not just fail silently on `sfx.slide`. Same for
`gui/accessibility` (focus order, live regions) and `gui/theming_override`
(one accent system, no ad-hoc colors — already our palette rule, now with
a checklist).

### 16. Phaser's `public/examples` particles → ink and paper physics

Phaser's example library is a catalog of "one emitter sells the impact" —
the `particles/` category alone demonstrates a dozen ways to make a
button feel physical. We have `deskShake` and `catchflash` but nothing
particulate: stamps hit paper with no debris.

**Adopt:** tiny DOM particle bursts — no engine, ~40 divs + CSS keyframes.
Ink spatter on stamp impact, paper flecks on catch, dust drifting off the
stub on transmit. Three emitters behind one helper; cheapest game-feel
per line of code that exists.

### 17. Phaser's camera/tween vocabulary → transitions and counting numbers

Phaser treats every state change as a camera or tween event — fades,
flashes, count-ups. Our phase changes are instant `hidden`-class swaps
and the score/cover numbers jump discretely. The verdict already proved
the pattern (the 300ms stamp fall, the suspense "…" hold); it just isn't
applied systematically. `gui/multiple_resolutions` is the same lesson on
the layout axis — check the HUD at 315px and 1080p, not just the dev
window.

**Adopt:** a ~200ms fade/iris on phase transitions (`wipeShift` already
does this for shift changes — extend the vocabulary), tween the score
counter and cover chips on change (numbers that count feel like a
ledger; numbers that jump feel like a webpage), and a one-time pass over
HUD anchoring at small widths.

### The meta-lesson

NIGHT SHIFT's systems are good but invisible — the judge isn't wrong that
it reads simple; they can't *see* the deduction, the cover economy, or the
wire's reasoning because the UI only ever shows the answer, never the
work. Items 13–14 fix legibility; 15–17 fix feel. Ship order suggestion:
wire log → tooltips → state matrix → particles → transitions/counters.

## Depth pass — systems the player owns (Nov 15)

Third research pass: arcade/ metagame patterns applied to NIGHT SHIFT's
remaining "static title, amnesiac run" gaps.

18. **Attract mode** (arcade cabinets, Phaser state examples): the title
    never sits still — after idle, a self-playing reel demos the core verb
    using real game materials. Any input aborts. Constraint that made it
    safe: pure vignette, never touches game state — a simulated run would
    need save/audio/persist quarantine and isn't worth the risk for a jam.
19. **The prediction stamp** (Zachtronics' visible-model doctrine, TTRPG
    skill calls): the player's hypothesis is content, not chrome. One
    optional call per day, resolved publicly at verdict. Makes the
    *reasoning* a verb — the thing judges said was invisible.
20. **The permanent record** (OpenTTD company history, Godot persistent
    state as first-class screen): the run save dies; the career ledger
    doesn't. Ranks earned from catches/calls, not chosen. Meta-progression
    is what turns "same week, new seed" into "raise my catch rate."
21. **The clerk's handbook** (manual-as-game inverted): reference UI that
    feels like part of the fiction — manila card, one keypress, never
    modal. Signals honest depth: "there's more here than fits on screen."
22. **The head-office memo** (OpenTTD scenario modifiers): the daily seed
    deals not just the docket but tonight's weather — announced up front,
    backed by real behavioral changes (early amend, suppressed amend,
    contested-first). Same seed = same memo = the daily challenge is
    legible *before* you play, not discovered after.
