# NIGHT SHIFT — devlog drafts for voting month

Post in this order, ~4–5 days apart. Each is written to be postable as-is;
bracketed bits are the only fill-in before publishing. Voice: builder's
notebook, numbers included, no hype words. itch feeds reward process posts —
these double as design documentation.

---

## D1 — "I proved my deduction game fair with code" (post any time)

> A deduction game lives or dies on one promise: that a sound reader never
> strikes. Playtesters can tell you when a puzzle feels unfair, but they
> can't tell you whether it's unfair — so I built the playtester as code
> first, humans second.
>
> `audit-deduction.mjs` deals 300 seeded dockets per day and asks what a
> perfect logician could conclude from the stamps alone. It checks every
> plausible wrong theory — every single-criterion rule, every pair — and
> reports three numbers per day: how often the truth is uniquely pinned,
> how often a *harmful one-word* wrong rule has full docket support, and
> whether the liar day's fog actually covers anything.
>
> The headline: HARMFUL ONE-WORD theories: 0% on all five days, across 1,500
> deals. No docket I've generated supports a wrong one-word rule that could
> bait a strike. What remains is honest fog — refinements of the truth that
> always file safe, and widenings onto values the docket never shows you
> (you'd have to invent them unprompted).
>
> The audit also changed the game. Early runs showed the SUS picker ignoring
> rows that kill the docket's own suggested theories, so `deal()` now scores
> SUS candidates kills-first: rows carrying the precedents' shared
> incidental tags get picked first, because a truth-failing row *with* the
> tag is what kills the wrong theory. Day-2 bait rate went 12% → 5% with
> zero invariant changes (`test-logic`, 2,000 seeds per day, still ALL PASS).
>
> Two things I tried that failed, so you don't have to: exact-profile
> "mirror" rows (my 24-card pool almost never contains twins, and forcing
> them displaced broad coverage — bait rate got *worse*), and dealing the
> hand before the docket (starved the liar pools and turned the test suite
> red). The audit caught both within minutes. That's the real argument for
> this workflow: the loop from hypothesis to verdict is seconds, not
> playtest sessions.
>
> Next: the human half. A perfect logician isn't the player — I'm running
> one observed fresh-player session this week ([link to D3]), because the
> audit can't tell me whether the *riddle* teaches what the docket proves.

---

## D2 — "The amendment is the trailer" (post ~5 days after D1)

> The brief for NIGHT SHIFT's mid-game twist was one sentence: the rule can
> change mid-shift. The implementation took an evening. Making it *land*
> took a week, and the whole thing is DOM, CSS, and WebAudio — no assets,
> works from `file://`.
>
> The sequence, beat by beat: a two-tone klaxon (square waves at 440/330Hz,
> six hits), the desk lamp flickers (a 120ms stepped brightness pulse on the
> frame), the night music ducks to near-silence, the old rule chips get
> struck through **one at a time** (350ms apart, a tick each), the new chips
> flash in — and then the gut-punch: the case you *just judged* replayed
> under the new rule. "Park bench would now FAIL — you stamped it HUMAN."
> The drama isn't the new rule. It's watching your read of the earlier cases
> die.
>
> Three rules I kept coming back to, all stolen fair and square:
>
> 1. **Vlambeer: feel is built one small decision at a time.** The stamp
>    lands with a screen-shake, a low sine-drop thud, and a 120ms hitstop —
>    visual first, sound 120ms later, so the desk *answers* the stamp. Zero
>    mechanical changes, completely different weight.
> 2. **GameDesign.gg's juice glossary warning: juice is an amplifier, and
>    past a threshold it's noise.** My fact rows carry the actual puzzle
>    information, so the shake, the red/green room wash, and the flicker
>    never touch them. Feedback lives on the frame and the stamp; data
>    stays still.
> 3. **Obra Dinn's lesson about verifiers:** players optimize the verifier,
>    not the mystery. So the verifier performs. The crowd tally is honestly
>    derived from the docket (it believes the clerical error too), and ARIA
>    overrules it. The staged line-by-line reveal, the ledger sentence
>    under the stamp — the ceremony *is* the anti-fishing design.
>
> The whole amendment is skippable (click/key), because ceremony without
> consent is a cutscene. Total added weight: ~60 lines of game code, ~15 of
> CSS, one `<span>` for the ghost line.

---

## D3 — "One fresh player, pre-registered" (post before the session)

> The audit proves the dockets are fair. It can't prove they're *readable*.
> So: one observed fresh-player session, thinking aloud, and I'm writing
> down what would change my mind before it happens.
>
> **The protocol** (full version in `docs/PLAYTEST.md`): 60 minutes, days
> 1–2 blind, no hints unless stuck 5+ minutes. I'm watching for four
> things, in order:
>
> 1. **Day-1 filing time and cited row.** If they file in under a minute
>    citing a precedent row, the tutorial teaches. If they file fast on a
>    *vibe*, the riddle is doing the work and the docket is decoration —
>    that's a redesign flag.
> 2. **The liar day.** Do they spot the odd row unprompted, or file past
>    it? Spotted = the outvoted-by-two structure works. Filed-past = the
>    clerical-error surfacing needs help (flag pulse? ARIA aside?).
> 3. **The amendment.** Surprise is failure; dread is success. If the
>    banner reads as a gotcha, the telegraph line needs to move earlier.
> 4. **The contested stamp.** Can they paraphrase the double-or-nothing
>    rule after one night? If not, the inline tag is decoration.
>
> **What changes on what evidence:** a wrong-theory filing caused by a
> docket row (not a guess) → that row's shape goes into the audit as a new
> confuser family and the deal gets a killer for it. Confusion about the
> night clock or oath → copy fix, same day. Anything else → voting-month
> patch notes, post-jam milestone.
>
> Results in the next devlog, whatever they are. If the player breezes it,
> I'll say so — a test you can't fail isn't a test.
