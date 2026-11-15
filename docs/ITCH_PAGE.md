# NIGHT SHIFT — itch page copy + trailer shot list

> **2026-11-15:** the spine rebuild (see `SPOT_THE_MACHINE.md`) — the whole
> game is now "spot the machine on the postmark." The day rule-deduction is
> out of the core; the night postmark is the star. The copy below is
> rewritten to match. **Re-verify every block against the shipped build
> before publishing.** The old `amend.png` / `day.png` / `verdict.png`
> media are stale — the week no longer has amendments or a day docket;
> re-capture from the audit + finale instead. Canonical tagline:
> "One filing on the docket isn't human. The postmark gives it away.
> Spot the machine."

Game Off 2026 entry. This doc is the shippable source for the itch page and
the trailer. Copy sections verbatim; capture instructions at the bottom are
for whoever has the game open in a browser (record locally, upload to itch).

## Page title + tagline

**NIGHT SHIFT** — *One filing on the docket isn't human. The postmark gives
it away. Spot the machine.*

(One question, repeated on every screen. This line also opens the trailer.)

## Short description (itch "short description" field)

You work the night desk. Five filings a night, each stamped with a
postmark — and one filer is a machine wearing a human face. The paper can't
catch it; the postmark always can. *It reads too clean to be a person.*
Stamp it `SUS`, point at the tell, and the catch is yours. Miss three and
you're cut to jury duty. When the week ends, you read its final proof — and
you choose whether to cut it, or let it belong. A five-night deduction game
about the loneliest filing on the docket.

## Full description

**🌙 THE NIGHT DESK.** Every filing carries a postmark at the foot of the
card — LATENCY · ORIGIN · RELAYS · RECEIPT — printed the same for every
filer, nothing flagged. Humans file messy: a slow round-trip, a real gate,
a relay path, a receipt with a little human patience in it. A machine's
postmark reads too clean. **The only question, every night, is: is this
filer the machine?**

Stamp each filing `HUMAN` or `SUS` (`H`/`S`/`←`/`→`). `HUMAN` on a person is
upheld. `HUMAN` on the machine lets it through. `SUS` is an accusation — and
an accusation needs grounds: the desk asks which postmark field reads wrong.
Point at a **real tell** and the catch is yours (+100, circled in red grease
pencil). Point at a human's field, or name no grounds, and the hunch is a
wrong stamp — and a wrong stamp is a **strike**. Three strikes and the desk
closes your file: jury duty, the rest of the week read from the other side.

**The tells shift.** The machine wears the same face all week, but its
postmark changes with it — two obvious tells on night one, a single
impossible field by night five, while the humans' packets tidy up around
it. Nothing is hidden, and nothing is flagged for you. The postmark is the
only testimony.

**✒ LAST CALL — THE MACHINE'S FINAL PROOF.** After night five, the last
docket of the week arrives, postmarks and all. Sign the clause that cuts the
machine — and only the machine — or sign the one that cuts only the humans
and lets it belong. Three endings: **LAST HUMAN STANDING** (clean cut),
**COLLATERAL** (the clause cut the machine and people), or **THE DAY SHIFT
IS AUTOMATED** (it belongs — tomorrow the desk is its).

Everything is deterministic — no noise, no crowd votes, no luck. The same
docket deals the same way every time. Today's docket is seeded by date
(Wordle-style, one per day); share your grid and compare. `?seed=` replays
any docket.

## One game, three ways to read it (no menu — just play)

**📖 THE STORY.** Clock in and you're already on the night desk — the
outgoing clerk left a tray that teaches the whole game in ninety seconds —
then work all five nights: the tells degrade, the wire keeps score, the
machine's loneliness creeps in, and the final proof asks you what a rule
never could: *does it get to belong?* One button, one arc, one choice. This
is the game.

**📅 THE DAILY.** Every date deals a fresh docket — same spine, new face,
new tells. Come back tomorrow, or race today's seed against a friend
link-for-link. The share card is the multiplayer: no lobby, just grids.

**🏆 THE READERS.** Compare reads, not scores. Post your card in the jam
thread with one question ("night 4 — it wore TESS's face and the only tell
was the receipt. Did you get it?"). Best conversations get collected into
community collections.

## Controls (page section, keep short)

- Every filing carries its postmark (LATENCY · ORIGIN · RELAYS · RECEIPT)
  on the card. Stamp `SUS` and the desk asks which field reads wrong — point
  at a real tell for the catch (+100); a hunch is a strike.
- `S`/`H` or `←`/`→`: stamp · `Enter`: continue · `M`: mute audio
- Overtime and the Machine's Shift add `1–4` (select/patch), `Shift` (focus
  loupe), `O` (oath).
- Mobile: everything is 100% touch-operable.

## Feature bullets (for the page sidebar / trailer cards)

- One question on every screen: *which filing is the machine?* — legible in
  sixty seconds
- The postmark is the only testimony: four fields, the same muted strip for
  every filer, nothing flagged — the tell is "it reads too clean"
- The tells shift night to night: two obvious, down to a single impossible
  field, while the humans wear around them
- An escalating Turing mystery you discover, not a tutorial — and a loneliness
  you can't deduce, only feel
- The "belong" finale: you can catch the machine's final proof — but the
  ending is a *choice*, not a correct answer
- A desk that feels the week: rain on the window each night, thunder under
  the audit, grease-pencil marks on the evidence you catch
- A composed noir score — upright bass, brushes, charleston piano, muted
  horn — arranged live per shift, with licensed WeLoveIndies bookend tracks
  on the title and dawn
- Verdicts explained line by line — losses teach, never confuse
- Daily seeded docket + share card + printable case file
- Runs in the browser, no install; keyboard + touch
- Zero dependencies, responsive HTML5; save/resume mid-shift

## Credits

Painted key art and card vignettes generated with MiniMax H3 (fal.ai) · brass
seal render generated with Hyper3D Rodin · the score is composed WebAudio —
no AI-music service · title/dawn music licensed from WeLoveIndies (F/demo) ·
paper UI is inline SVG. All proceedings fictional.

## Tags (itch)

puzzle, mystery, deduction, detective, singleplayer, browser, atmospheric,
story-rich, noir, game-off-2026

## Trailer — "The Flip" (~50 seconds)

Template: state the one question → prove it on the postmark → the choice.
Music: the in-game loop. End on the grease-circle catch, then the end slate.
No voiceover; let the stamp SFX punctuate. The whole trailer is the flip
moment — the stamp lands, the grounds row appears, the tell is named, the
circle bites.

| # | Card (3s)                              | Footage (5–6s)                                              |
|---|----------------------------------------|-------------------------------------------------------------|
| 1 | ONE FILING ISN'T HUMAN                 | Title card, then the night desk: a filing lands, postmark strip visible at the foot |
| 2 | THE POSTMARK GIVES IT AWAY             | Read the postmark: a human's messy receipt, then the machine's `0.0ms` / `GATE 0` field — the contrast, side by side |
| 3 | SPOT THE MACHINE                       | The flip: `SUS` stamp bites down → the grounds row opens → the tell field is named → the red grease circle draws on it, +100 bounces up |
| 4 | THE TELLS SHIFT                        | Quick cuts night → night: two tells, one tell, a single impossible field — the machine wearing the humans' clothing tighter |
| 5 | DOES IT GET TO BELONG?                 | The finale docket, the machine's final proof, the clause chosen, the pen signs — then the ending title |
| 6 | Montage (6s, quick cuts on the beat)   | contested ×2 stamp · third-strike CUT (room goes dark, red CUT) · LAST HUMAN STANDING / THE DAY SHIFT IS AUTOMATED titles |
| 7 | End slate (4s)                         | NIGHT SHIFT · Game Off 2026 · play in your browser · [itch URL] |

Capture notes: hide the cursor where possible, record at 1280×720+, cut on
the stamp thud. The catch (card 3) is the hero shot — hold it long enough
that a viewer who's never played it understands the game from that one beat.
Keep every shot legible in 2 seconds — if a shot needs explaining, it
doesn't belong in the trailer.

## Cover + GIF

Assets in `docs/itch-assets/` — produced by scripted Chrome runs against
`?seed=capture` (deterministic frames via `--virtual-time-budget`):

- **Cover still:** `game-off/cover-630x500.png` — the desk, the anomaly
  packet, the red grease circle on `+0.003s`. Regenerate from the SVG:
  `rsvg-convert cover-630x500.svg -o cover-630x500.png`.
- **Animated cover (preferred):** `catch.gif` (~285KB, ~5s, 630×500) —
  opens on the painted poster held ~1.5s (the browse grid shows frame 1
  as a static still until hover, so frame 1 must be the strongest
  read), then the SUS stamp, the grounds row, the grease circle drawing
  on the tell field, the +100. The game's signature moment, no strobing.
- **Screenshots (re-capture for the rebuilt spine):** `tray.png` (the
  cold-open desk + postmark stub), `flag.png` (the grounds row open on a
  SUS), `night.png` (a night case mid-stamp, postmark legible),
  `finale.png` (the machine's final proof docket + the signed decree).
  The old `day.png` / `verdict.png` / `amend.png` are stale — the week has
  no day docket, verdict, or amendment anymore.

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
- [ ] Cover GIF uploaded — **frame 1 is the poster still** (browse grids
      render the first frame until hover; check it at 315×250 too)
- [ ] Trailer embedded at top of description
- [ ] Controls section states mobile-tappable
- [ ] Music credit present (composed WebAudio score in credits)
- [ ] `?seed=` documented for replay/share threads
- [ ] Play + rate other entries during voting (reciprocity drives ratings)

## Platform + disclosure metadata (Quality Guidelines — delisting risk)

- [ ] **AI Disclosure section filled:** key art / card vignettes are
      generative (MiniMax H3 via fal.ai; Rodin via Hyper3D for the case-file
      seal) — tag AI-assisted art. The procedural WebAudio score is composed
      code and the WeLoveIndies tracks are licensed stock, not AI music —
      exempt, say so in the disclosure note.
- [ ] **Platform metadata: Web/HTML5 only.** Don't check Windows/macOS/Linux
      (the build targets the browser). Language: English. Tags limited to
      the list above — no tag stuffing.
- [ ] **Don't publish until the page is complete** — the "Most Recent"
      browse boost is one-shot; thumbnail + screenshots + description all
      finished before the page goes live.
