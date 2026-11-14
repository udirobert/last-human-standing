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

## Sources

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
