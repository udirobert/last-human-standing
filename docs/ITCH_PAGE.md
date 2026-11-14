# NIGHT SHIFT — itch page copy + trailer shot list

> **2026-11-14:** the pivot-5 game-side overhaul (see `GAME_OFF_2026.md`) repaints the game and changes the copy below. W7 (freeze 2026-11-25) hands over a regenerated cover, GIF, six screenshots and a one-pager of final copy blocks — re-verify everything in this doc against that handoff before building the page. Canonical tagline from W6 onward: "Deduce by day. Enforce by night. Catch the machine."

Game Off 2026 entry. This doc is the shippable source for the itch page and
the trailer. Copy sections verbatim; capture instructions at the bottom are
for whoever has the game open in a browser (record locally, upload to itch).

## Page title + tagline

**NIGHT SHIFT** — *Deduce by day. Enforce by night. Catch the machine.*

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
Five filings a night, one at a time — stamp each `S`US or `H`UMAN (`S`/`H`/arrows).
But something is wrong: one filer on this docket isn't human, and the paper
can't catch it — every filing passes the rule. Every filing also carries its
packet postmark at the foot of the card — latency, origin, hops, receipt —
and the machine's reads wrong. Stamp `SUS` on clean paper and the desk asks
which field flagged it: point at the evidence for a +100 anomaly bounty —
a blind hunch is just a wrong stamp. One filing a night is **contested**:
call it right for double pay (+100).
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

**📖 THE STORY.** Clock in and you're already on the night desk — the
outgoing clerk left a tray — then work all five nights: a curated rule
curve from two-criterion tutorials to the liar, the amendments, and the
filer who isn't human. One button, one arc, one ending. This is the game.

**📅 THE DAILY.** Every date deals a fresh docket — same rules, new reads.
Come back tomorrow, or race today's seed against a friend link-for-link.
The share grid is the multiplayer: no lobby, no lobby wait, just grids.

**🏆 THE READERS.** Compare verdicts, not scores. Post your grid in the jam
thread with one question ("day 3's liar got me — did anyone spot it
blind?"). Best conversations get collected into community collections.

## Controls (page section, keep short)

- **Shift** *(Day)*: tap to walk a loupe across the fact columns (where → when → who → in/out) — it dims the rest, never hides them.
- Every night filing carries its packet postmark (latency · origin · hops · receipt) on the card. Stamp `SUS` on paper that passes and the desk asks which field flagged it — a pointed catch pays +100, a hunch is a wrong stamp.
- `1–4`: select a card · `Enter` / `Space`: file card (Day) / advance · `S`/`H` or `←`/`→`: stamp (Night)
- `O`: file under oath (pass clears a strike, miss costs two) · `M`: mute audio
- Mobile: everything is 100% touch-operable.

## Feature bullets (for the page sidebar / trailer cards)

- Every day opens on a shift brief — the riddle types itself, then the desk deals in
- A desk that feels the week: rain on the window each night, thunder under the audit, grease-pencil marks on the evidence you catch
- Filings with fingerprints: human cards land off-square with marginal notes — the machine's arrives dead straight, instantly printed
- Five staged days: pay-for-clues, oaths, mid-night rule amendments, a liar on the docket
- An escalating Turing mystery you discover, not a tutorial — catch the automated filer before dawn
- A composed noir score — upright bass, brushes, charleston piano, muted horn — arranged live per shift, no audio files
- Verdicts explained line by line — losses teach, never confuse
- Daily seeded docket + share grid
- Runs in the browser, no install; keyboard + touch
- Zero dependencies, responsive HTML5; save/resume mid-shift

## Credits

Painted key art generated with MiniMax H3 (fal.ai) · the score is composed WebAudio — no AI-music service, no audio files · paper UI is inline SVG. All proceedings fictional.

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
| 5 | ONE FILER ISN'T HUMAN                  | Finale ledger, the terminal's log over five packets, option select → rule sign |
| 6 | Montage (8s, quick cuts on the beat)   | contested ×2 stamp · clock under 3s · third-strike CUT (room goes dark) · COLLATERAL / LAST HUMAN STANDING titles |
| 7 | End slate (4s)                         | NIGHT SHIFT · Game Off 2026 · play in your browser · [itch URL] |

Capture notes: hide the cursor where possible, record at 1280×720+, cut on
the stamp thud. Keep every shot legible in 2 seconds — if a shot needs
explaining, it doesn't belong in the trailer.

## Cover + GIF

Assets in `docs/itch-assets/` — produced by scripted Chrome runs against
`?seed=capture` (deterministic frames via `--virtual-time-budget`):

- **Cover still:** `game-off/cover-630x500.png` — the desk, the anomaly
  packet, the red grease circle on `+0.003s`. Regenerate from the SVG:
  `rsvg-convert cover-630x500.svg -o cover-630x500.png`.
- **Animated cover (preferred):** `catch.gif` (~190KB, ~3s) — the SUS
  stamp, the accusation row, the grease circle drawing on the RCPT field,
  TRAY CLEARED. The game's signature moment, no strobing.
- **Screenshots:** `tray.png` (the cold-open desk + postmark stub),
  `flag.png` (the accusation row open), `day.png` (the deduction docket),
  `verdict.png` (a strike with the needed criterion named),
  `amend.png` (the amendment banner mid-hold), `finale.png` (the ledger +
  rule-writing decree).

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
- [ ] Music credit present (composed WebAudio score in credits)
- [ ] `?seed=` documented for replay/share threads
- [ ] Play + rate other entries during voting (reciprocity drives ratings)
