# NIGHT SHIFT

A Last Human Standing vignette. **Game Off 2026** entry — theme: *SHIFT*.

Five days. Each day ARIA holds a **secret rule** — one to three criteria over
a card's four facts (where · when · who · in-or-out). By day you deduce the
rule from her earlier rulings and file one card she'd pass. By night the rule
is in plain sight and you stamp everyone else's filings. Three strikes and
you're cut to the night shift for good — jury duty until dawn.

## Run it

No build step, no dependencies:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(index.html also works straight from disk — no modules, no fetches.)

## How to play

- **Day shift**: read the riddle, then study the docket — ARIA's already
  stamped two filings HUMAN and a few SUS. Those precedents *are* the clue.
  Tap a card to select it (keys `1`–`4`), then **File →** (or `Enter`).
  Every card shows four facts in fixed order: where · when · who · in/out.
- **Verdict**: the rule is unsealed in plain words and your card's facts are
  marked line by line — ✓ meets the criterion, ✗ shows what was needed,
  dimmed rows weren't checked. A passing filing survives; a failing one is a
  strike. Tap anywhere to skip the ceremony.
- **Night shift**: the rule is pinned as text chips. Five filings, one at a
  time — stamp each **SUS** (`←`) or **HUMAN** (`→`). Instant feedback, and
  wrong stamps show the fact that failed. Correct stamps build a ×1–×3
  streak; from night 2 an 8-second clock pays a speed bonus. A flawless
  5/5 night clears a strike.
- **From day 2**: you may *request one more ruling* per day (drops today's
  pay 300 → 200) and file *under oath* (pass: clears a strike or pays +200;
  miss: two strikes — `O` toggles).
- **From day 3**: head office **amends** the rule mid-night — cases before
  the banner follow the old rule, cases after follow the new one. Watch
  for trap filings that flip verdicts.
- **Days 4–5**: one docket ruling is a **clerical error** — a SUS card
  stamped HUMAN. Tap the row you suspect (optional, +100 if right).
- **Finale**: after night five you write the last rule yourself. One filer
  isn't human. Choose the criterion that cuts it — and only it.
- Still a player after day five (and the right finale) = LAST HUMAN
  STANDING. Three strikes = dossier + jury duty.
- Keys: `1`–`4` select · `Enter` file/continue · `←`/`→` stamp · `O` oath ·
  `M` — music on/off.

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
`node test-logic.mjs`. The day/night shift
is `body[data-shift]` + CSS variables; all "art" is typographic.
The night music is a vendored MP3 (`audio/bump-in-the-night.mp3`, fetched
via `scripts/vendor-patch.mjs` — see `audio/manifest.json`) played through
a plain `<audio>` element so it also works on `file://`; full attribution
lives in `LICENSE-CREDITS.txt`.

## Credits

- Night music: "Bump in the Night" by Kevin MacLeod (incompetech.com,
  https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100789),
  licensed Creative Commons Attribution 4.0 International
  (https://creativecommons.org/licenses/by/4.0/). Changed by Patch:
  converted from MP3 to Ogg Vorbis, credit added to the Ogg comments.
  (This game vendors the original MP3; `M` toggles it.)

## Status

Game Off 2026 jam build. Deadline: December 1, 2026, 13:37 PST.
