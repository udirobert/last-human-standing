# NIGHT SHIFT

A five-day deduction thriller. **Game Off 2026** entry — theme: *SHIFT*.

Five days. Each day ARIA holds a **secret rule** — one to three criteria over
a card's four facts (where · when · who · in-or-out). By day you deduce the
rule from her earlier rulings and file the one card she'd pass. By night the rule
is in plain sight and you take the desk, stamping everyone else's filings. But
something is wrong: one filer's packets don't read human. Catch the machine.
Three strikes and you're cut to the night shift for good.

## Run it

No build step, no dependencies:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(index.html also works straight from disk — no modules, no fetches.)

## How to play

- **Day shift**: each morning opens with a **shift brief** — a memo card
  naming the day and typing out the riddle — then the desk deals in row by
  row. Study the docket: ARIA's already stamped two filings HUMAN and a
  few SUS. Those precedents *are* the clue.
  Tap `Shift` to walk a loupe across the fact columns (where → when → who →
  in/out) and dim the rest — it narrows where you look, never what you see.
  Tap a card to select it (keys `1`–`4`), then **File →** (or `Enter`).
  Every card shows four facts: where · when · who · in/out.
- **Verdict**: the rule is unsealed in plain words and your card's facts are
  marked line by line — ✓ meets the criterion, ✗ shows what was needed.
  A passing filing survives; a failing one is a strike. Tap anywhere to skip.
- **Night shift**: the rule is pinned on your desk. Five filings, one at a
  time — stamp each **SUS** or **HUMAN** (`S` / `H` / `←` / `→` / buttons).
  Wrong stamps explain the needed criterion. One filing a night is **contested** —
  call it right for double pay (+100). A flawless 5/5 night clears a strike.
  The paper checks facts — and every filing carries its packet postmark at
  the foot of the card: latency, origin, hops, receipt. Same muted strip
  for every filer, nothing flagged. Stamp **SUS** on paper that passes and
  the desk asks what flagged it — point at the field that read wrong. A
  field that holds is the catch (+100 bounty); anything else is a hunch,
  and a hunch is just a wrong stamp. Watch the cards themselves, too:
  human filings drop off-square with a clerk's marginal note, and the
  machine's arrives dead straight, instantly printed, with a faint servo
  whir. A caught flag is circled in red grease pencil; a hunch gets the
  field you named struck through.
- **From day 2**: you may *request one more ruling* per day (drops today's
  pay 300 → 200) and file *under oath* (pass: clears a strike or pays +200;
  miss: two strikes — `O` toggles).
- **From day 3**: head office **amends** the rule mid-night — cases before
  the banner follow the old rule, cases after follow the new one. Watch
  for trap filings that flip verdicts.
- **Days 4–5**: one docket ruling is a **clerical error** — a SUS card
  stamped HUMAN. Tap the row you suspect (optional, +100 if right).
- **Finale**: after night five you write the last rule yourself. One filer
  isn't human. The ledger lists every filing as filed — postmarks and all.
  Choose the criterion that cuts it — and only it.
- Still a player after day five (and the right finale) = LAST HUMAN
  STANDING. Three strikes = the counter goes dark, takes a red `CUT`, and
  the dossier lands — then it's jury duty.
- Keys: `1`–`4` select · `Enter` file/continue · `←`/`→` stamp · `Shift`
  focus loupe by day · `O` oath · `M` audio.

## Seeds & sharing

Every run is seeded, so a docket deals identically every time. **Clock in —
today's docket** uses the date as the seed (DOCKET #N, Wordle-style);
**Random shift** rolls a fresh one. `?seed=abc` in the URL plays that
docket. The ending screen prints a share grid — copy it with **Copy
result**.

## Tech

Vanilla JS + DOM + WebAudio, works from `file://`. Three plain scripts:
`riddles.js` (cards, days, secret rules), `logic.js` (pure rule-checking and
deal/audit generation — no DOM), `game.js` (screens, input, sound).
`test-logic.mjs` hammers `logic.js` with 2,000 seeded deals, audits and
clues per day and asserts the invariants (determinism included) — run
`node test-logic.mjs`. `audit-deduction.mjs` is the Golden Idol loop as
code: for 300 seeded dockets per day it checks what a perfect logician
could conclude — pinning rate, single-word harmful theories (wrong
one-word rules with full docket support that could bait a strike:
0% on all five days), and liar-day fog cover. Report-only; run
`node audit-deduction.mjs` after touching `deal()`. The day/night shift
is `body[data-shift]` + CSS variables; all art is inline SVG + CSS, and
there are no image assets. State changes are physical on purpose — cards
deal, docket rows cascade in, filings fly to the tray, the night stamp
swings and throws ink, the amendment is stapled on, the finale is a decree
you fill in and sign — and `prefers-reduced-motion` skips every flight,
leaving the state change visible and instant.
The score is four pre-rendered tracks in `audio/` (main-title noir, day
ambience, night tension, dawn resolve — generated with ElevenLabs Music),
crossfaded per phase by a small `score` module. If a file can't load —
`file://`, offline — it silently falls back to the procedural WebAudio
soundscape (sub-bass drone, tape noise, stamp clunks, reactive VALE
dissonance), so the game never depends on a network. A second procedural
layer runs under either score: rain on the office window that gets wetter
each night of the week, and the odd far-off thunder roll while the audit
desk is lit. `M` toggles audio.

## Credits

ElevenLabs Music (generated tracks), bespoke WebAudio sound design and
SVG artwork. All proceedings fictional.

## Status

Game Off 2026 jam build. Deadline: December 1, 2026, 13:37 PST.
