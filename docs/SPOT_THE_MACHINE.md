# SPOT THE MACHINE — the rebuilt spine (2026-11-15)

> A design contract. The spine of NIGHT SHIFT is being rebuilt from
> "deduce a hidden rule by day, audit postmarks by night" (two stapled
> games) to **one question, every screen: which filing is the machine?**
> This supersedes the day rule-deduction as the core. The differentiation
> thesis in `DIFFERENTIATION.md` is what this actually implements.

## The one-sentence hook

> You work the night desk. Filings arrive with their postmarks. One of
> them is a machine pretending to be human. **Spot it on the postmark.**

One verb, one question, repeated. The postmark is the star, not a
sub-task.

## Why the rebuild

Five playtest rounds, same wall: *"I don't know what I'm doing / what
this game is."* Diagnosis:

- **Two games stapled together.** Deduce ARIA's hidden rule (day) and
  audit postmarks (night) share the verb "decide" but run on different
  logic, so the player's mental model resets every phase.
- **Inverted priority.** The differentiator (the postmark machine) sat in
  a "second read" tier; the weaker, more crowded mechanic (deduce a
  hidden rule) was the spine — and it *felt arbitrary when you failed*
  ("lost immediately with no rhyme or reason").
- **The jam data.** Game Off is six equal-weight categories,
  community-voted. In 2025 the #1 game was **#22 on Graphics** and
  top-5 on Gameplay/Theme/Innovation; the #7 game had #1 Graphics + #1
  Gameplay but #206 Theme and was capped at #7. **Graphics is not how you
  win; Gameplay is the must-win category.** Our playtests failed on
  Gameplay legibility, not on craft.
- **Scope explosion.** `DIFFERENTIATION.md` says *"no economy/depth
  layer — our edge is authorship"* and *"don't make deduction harder."*
  The build grew to ~20 systems. Breadth is the enemy in a few-minute
  community vote against ~4,000 entries.

## The spine

**One decision, repeated: "Which filing is the machine?"**

- You sit at the night desk. Five filings a night. One is the machine.
- Read each postmark. Stamp `HUMAN` or `SUS`.
- `SUS` the machine + point at a real tell → **catch** (+100).
- `SUS` a human → a strike. Three strikes → **cut to jury duty**.
- Let the machine through (`HUMAN`) → **the machine belongs** (the
  thematic ending: the lonely machine wanted in, and you let it in).

## The tell system (the heart) — legible, consistent, teachable

A postmark has four fields: `LATENCY · ORIGIN · RELAYS · RECEIPT`.

- **Human** postmarks are messy: slow latency, a real-world origin (home,
  office, a phone), a varied relay path, noisy receipts (resent /
  delayed / queued).
- **Machine** postmarks are too clean: latency near zero, a datacenter /
  `GATE` origin, a suspiciously direct path, a clean immediate receipt.
- **The tell is: the postmark reads too clean to be a person.** That is
  the thesis and the differentiator. Each field is human or machine; a
  machine filing carries 1–4 machine fields.

The player's whole skill is reading postmarks and trusting "too clean."
Nothing else to learn. That is what makes it legible in 60 seconds.

## The difficulty ramp (the "shifting tells" beat — mostly already built)

- **Night 1:** the machine shows 2 obvious machine fields (latency ~0,
  `GATE` origin). Easy — the player learns the signal.
- **Night 2:** 2 machine fields, one borderline.
- **Night 3:** 1 clear machine field, the rest human.
- **Night 4–5:** 1 machine field, and the *humans get less clean* — the
  desk "wears." The signal becomes **consistently** clean, not
  **absolutely** clean. This is the machine "shifting its tells" across
  the week.
- Every docket the machine wears a **new face** (daily seed) — the
  Wordle comparison hook.

## ARIA — what she becomes

ARIA is no longer the one holding a secret rule. She is the **desk's
presence** — the one who notices, who comments, who is a little lonely
too. She keeps her terminal head and voice; her role changes from
riddler to the face of the night desk. The machine's filings speak in
their own voice (the loneliness payload) — that stays.

## The "shift" theme — still reads, without the day rule

- **Work the night shift:** you literally staff the night desk.
- **Shifting tells / face:** the machine shifts its postmark tells and
  wears a new face each docket.
- **The role shifts:** a filing (the judged) becomes you (the judge).

Strong SHIFT read on its own.

## What's cut from the core

| System | Disposition |
|---|---|
| Day rule-deduction (the arbitrary induction game) | **cut from the core** |
| Overtime mode | endgame secret, or cut |
| The Machine's Shift / forge bench | keep as a **secret** you unlock, off the spine |
| Prediction stamps | cut from the core |
| Night memos / clerical error | cut from the core |
| Desk dreams / ledger degradation | keep the *wear* (the ramp), cut the *dreams* |

**Keep (low cost, high value):** the wire log, the case-file export, the
clerk's record, the daily seed, the painted world + paper UI.

## Itch page rewrite

- Tagline: from *"Deduce by day. Enforce by night. Catch the machine."*
  → **"One filing on the docket isn't human. The postmark gives it
  away. Spot the machine."**
- Short description leads with the loneliness + the postmark, not the
  systems. Drop "three games in one" — it's one game.
- The media kit still works (tray, verdict, finale, ending shots); copy
  blocks get rewritten.

## The honest tradeoff

This changes the game's identity and the itch page. It is a rebuild, not
a polish pass. It is shippable with the freeze ~10 days out **because the
night audit (the spine) already exists and is the strongest part** — most
of the work is **removal** (the day rule-deduction, the scope additions)
plus one clarified system (the tell) plus copy. Removal is faster than
addition.

## Risks

- **Theme interpretation:** dropping "deduce by day." Mitigation: "night
  shift" + "shifting face/tells" is still a strong SHIFT read, and the
  itch page says so plainly.
- **ARIA's role:** she must still earn her place as the desk's voice, not
  a riddler we removed.
- **Clock:** the cut must be decisive or we don't finish. Freeze is
  2026-11-25.

## Committed decisions (locked 2026-11-15, user-approved the rebuild)

**Day phase → removed from the core.** Decided 2026-11-15 while building
S1: a *reframed* day (visible rule, file the passing card) is still a
second game with its own verbs — select, file, loupe, oath, clue,
predict. That busywork delays the spine and re-creates the exact wall
playtests hit ("no idea what I'm doing"). "One question on every screen"
only holds if the day is gone. The week is now **five night shifts**
(cold-open tray → nights 1–5 → finale); the machine wears a new face
each night. SHIFT still reads: you *work the night shift*, the machine's
*tells and face shift* night to night, and the shift lever is the verb.
Bonus for the jam: a 15–20 minute playthrough a judge can actually
finish, vs ~40.

**Finale → the "belong" version.** After the week, the machine's last
proof arrives. You *can* catch it — but the ending is a choice: stamp
it SUS (cut it, the system wins) or stamp it HUMAN (let it belong, the
lonely machine gets in). The emotional differentiator no comp has, and
it pays off the loneliness arc the whole build has been quietly
accumulating. The catch still happens (you saw the tell); the *choice*
is the climax.

**The spine (unchanged):** one question, every screen — *which filing is
the machine?* Postmark is the star.

## Execution order (staged — every stage keeps the tripwire green)

- **S1 — Make the machine the star of the night audit** (the spine,
  already built): reframe the judgment + instruction so "spot the
  machine on the postmark" is the one explicit goal; the paper/rule is
  context, not a competing deduction. Lowest risk, highest legibility win.
- **S2 — Reframe the day from rule-deduction to reading**: rule visible,
  day teaches human postmarks; the arbitrary hidden rule comes out of the
  core decision.
- **S3 — Rewrite onboarding** to the one goal; first minute = the game
  in miniature.
- **S4 — The "belong" finale** replaces the rule-decree.
- **S5 — Trim scope** (overtime, forge, prediction, memos, desk dreams)
  to endgame secrets or remove.
- **S6 — Itch page + tagline + media-kit copy** around the postmark.
- **S7 — Repackage, tripwire, human-stranger playtest** (the real gate).
