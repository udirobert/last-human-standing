# NIGHT SHIFT — itch page copy + trailer shot list

Game Off 2026 entry. This doc is the shippable source for the itch page and
the trailer. Copy sections verbatim; capture instructions at the bottom are
for whoever has the game open in a browser (record locally, upload to itch).

## Page title + tagline

**NIGHT SHIFT** — *Deduce the rule by day. Enforce it by night. Catch the
filer who isn't human.*

(One sentence, verb + fantasy + twist. This line also opens the trailer.)

## Short description (itch "short description" field)

ARIA runs a secret rule. Read her rulings, file the card she'd pass — then
work the night shift, stamping everyone else's filings until one filer turns
out not to be human at all. A five-day deduction game about day shifts,
night shifts, and the shift in between.

## Full description

**☀ DAY SHIFT.** ARIA, the auditor, holds a secret rule — one to three
criteria over every filing's four facts (where · when · who · in/out). Her
earlier rulings are on the docket: two she passed, a few she struck. Read
them like a puzzle. File the one card she'd pass. A wrong filing is a
strike; three strikes and you're cut to nights for good.

**🌙 NIGHT SHIFT.** Now you're the auditor and the rule is in plain sight.
Five filings a night, one at a time — use the physical shift paddles to dispatch
each filing (`⇦ SHIFT TO SUS` / `SHIFT TO HUMAN ⇨`). But something is wrong: filer
VALE's packet arrived at +0.003s. Catch the machine with a forensic SUS stamp for
an anomaly bounty. One filing a night is **contested**: call it right for double pay (+100).
From day 3, head office **amends** the rule mid-shift — cases before the banner follow
the old rule, cases after follow the new one, and trap filings flip their verdicts.
Days 4–5 hide a **clerical error** on the docket: a SUS card stamped HUMAN. Find it.

**✒ LAST CALL.** After night five, you write the rule yourself. One filer
isn't human, and ARIA's rules can't catch it. Choose the criterion that
cuts it — and only it.

Everything is deterministic — no noise, no crowd votes, no luck. The same
docket deals the same way every time. Today's docket is seeded by date
(Wordle-style, one per day); share your grid and compare. `?seed=` replays
any docket.

## Three games in one (no menu — just play)

**📖 THE STORY.** Clock in and work all five nights: a curated rule curve
from two-criterion tutorials to the liar, the amendments, and the filer
who isn't human. One button, one arc, one ending. This is the game.

**📅 THE DAILY.** Every date deals a fresh docket — same rules, new reads.
Come back tomorrow, or race today's seed against a friend link-for-link.
The share grid is the multiplayer: no lobby, no lobby wait, just grids.

**🏆 THE READERS.** Compare verdicts, not scores. Post your grid in the jam
thread with one question ("day 3's liar got me — did anyone spot it
blind?"). Best conversations get collected into community collections.

## Controls (page section, keep short)

- **Shift**:
  - *Day Shift*: Hold `Shift` (or click `💡 SHIFT LENS`) for Forensic UV Light — reveals shared criteria across approved precedents and your hand.
  - *Night Shift*: Press `Shift` to flip the rotary stamp between `HUMAN` and `SUS`.
- `1–4`: select a card · `Enter` / `Space`: file card (Day) / slam stamp (Night) / advance
- `S` / `←`: stamp SUS · `H` / `→`: stamp HUMAN
- `O`: file under oath (pass clears a strike, miss costs two) · `M`: mute audio
- Mobile: everything is 100% touch-operable with tactile paddles and switches.

## Feature bullets (for the page sidebar / trailer cards)

- Five staged days: pay-for-clues, oaths, mid-night rule amendments, a liar on the docket
- An escalating Turing mystery: catch the automated filer before dawn
- Verdicts explained line by line — losses teach, never confuse
- Daily seeded docket + share grid
- Runs in the browser, no install; keyboard + touch
- Zero dependencies, responsive HTML5 canvas & SVG

## Credits

Bespoke WebAudio soundscape & tactile foley. All proceedings fictional.

## Tags (itch)

puzzle, mystery, deduction, detective, singleplayer, browser, atmospheric,
story-rich, game-off-2026

## Trailer — "Tell, Show, Repeat" (~50 seconds)

Template: title card stating one idea → gameplay proving it → repeat.
Music: the in-game loop. End on the amendment + stamp montage (the two
trailer beats), then the end slate. No voiceover; let the stamp SFX punctuate.

| # | Card (3s)                              | Footage (5–6s)                                              |
|---|----------------------------------------|-------------------------------------------------------------|
| 1 | ARIA HAS A SECRET RULE                 | Day 1: riddle + docket, cursor hovering precedent rows      |
| 2 | READ HER RULINGS. FILE WHAT SHE'D PASS | Select card → file (flight to the tray) → staged fact-row reveal → SURVIVED stamp biting down, card recoil |
| 3 | AT NIGHT, YOU ARE THE AUDITOR          | Night stamping: SUS/HUMAN stamps, streak ×3 popping         |
| 4 | THE RULE CAN CHANGE MID-SHIFT          | **Amendment banner firing**: klaxon, chips struck one by one, ghost line visible |
| 5 | ONE FILER ISN'T HUMAN                  | Finale table, timestamps column, option select → rule sign  |
| 6 | Montage (8s, quick cuts on the beat)   | contested ×2 stamp · clock under 3s · third-strike CUT (room goes dark) · COLLATERAL / LAST HUMAN STANDING titles |
| 7 | End slate (4s)                         | NIGHT SHIFT · Game Off 2026 · play in your browser · [itch URL] |

Capture notes: hide the cursor where possible, record at 1280×720+, cut on
the stamp thud. Keep every shot legible in 2 seconds — if a shot needs
explaining, it doesn't belong in the trailer.

## Cover + GIF

- **Cover:** 630×500-ish still — dark desk-lamp background, one stamped
  SUS case card, tagline text. Must read at thumbnail size: big stamp,
  three words max besides the title.
- **Animated cover (preferred):** 2–4s GIF loop of the amendment banner
  firing, the SURVIVED stamp biting down, or the third-strike `CUT`
  (that one has the strongest thumbnail silhouette: dark desk, one red
  stamp). No strobing — itch rejects seizure-inducing covers and ours is
  palette-safe anyway.
- Record with OBS/QuickTime → trim → export GIF (≤ a few MB), upload as
  the project cover image.

## PWYW ladder (post-jam, in order — dashboard ops, not code)

1. **Voting end:** flip secret playtest page public, enable tip jar
   (Pricing → pay-what-you-want, minimum $0). Jam build stays free forever.
2. **Case Files edition (PWYW, $3 suggested):** the print-and-play bonus —
   a printable-HTML bonus docket ("THE ARCHIVE": 3 condensed days remixed
   from the existing card pool, audited with `audit-deduction.mjs` before
   release) + design-notes PDF (the three devlogs + audit numbers).
   Spec only until the fresh-player session lands — new content ships on
   proven-fair mechanics or not at all.
3. **Deluxe ($5+):** Case Files + the Game Off postmortem + name-in-ledger
   (backer filers appear on a bonus night docket). Never paywall the jam
   build or the daily docket — the free game is the funnel, not the demo.

## Upload checklist (voting month)

- [ ] Web build plays from the itch page with zero setup (test in a clean
      profile; the game runs from `file://`, so the browser build is safe)
- [ ] Cover GIF uploaded, tagline in short description
- [ ] Trailer embedded at top of description
- [ ] Controls section states mobile-tappable
- [ ] Music credit present (CC-BY requirement)
- [ ] `?seed=` documented for replay/share threads
- [ ] Play + rate other entries during voting (reciprocity drives ratings)
