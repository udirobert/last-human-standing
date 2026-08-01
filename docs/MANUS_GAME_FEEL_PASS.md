# Manus game-feel + layered UX pass

## Decision

Spend remaining short-lived Manus credits on a second, focused design pass after
the first comprehension audit. Scope: **layered interaction, ritual cadence, and
emotional engagement** — not a visual redesign, and not a Manus runtime
integration.

Preserve **cold system, warm human** (`ART_DIRECTION.md`). No new type systems,
glass cards, purple gradients, or generic dashboard patterns.

## Objective

Produce implementable recommendations that make the product feel like a
world-class daily ritual game:

1. Landing → reserve still clear, but more *alive*.
2. Speed-run / practice path teaches the loop through play, not paragraphs.
3. Daily check-in feels like a ceremony, not a form.
4. Audit/vote feels tense and social without clutter.
5. Returning players get a layered “what’s next” without dashboard noise.

## Constraints

- One private Manus task; structured output required.
- No player PII, photos, wallets, or secrets uploaded.
- Prefer small, high-confidence repo changes over speculative redesigns.
- Manus remains out of production code paths.
- Prior pass (`WrhA39Cw6SpZCqctp5nJRZ`) already fixed comprehension blockers.
  Do **not** re-litigate those unless a regression is visible.

## Rubric

- ritual / emotional cadence;
- progressive disclosure of mechanics;
- interactive feedback (haptics, motion, mascot, sound cues) used with restraint;
- layering (ambient → system → human artefact → CTA) without clutter;
- mobile thumb-zone and reduced-motion resilience;
- consistency with art direction;
- expected impact on completion and return rate.

## Outcome

**Status:** complete (one private Manus task; no runtime integration)

| Field | Value |
| --- | --- |
| Task ID | `NxJFKwXta8jnceuTZomiyD` |
| Task URL | https://manus.im/app/NxJFKwXta8jnceuTZomiyD |
| Agent profile | `manus-1.6-max` |
| Structured review | `docs/manus-game-feel-pass-review.json` |
| Task metadata | `docs/manus-game-feel-pass-task.json` |
| Inputs | Mobile landing + speed-run beats (intro → theme → check-in → sealed proof → audit → survival), `ART_DIRECTION.md`, this brief, prior-pass review |

### Note on structured `top_five_changes`

The extracted `top_five_changes` largely restated Pass 1 titles. Acceptance
gated on the new `findings[]` (ritual / progressive disclosure / layering)
validated against the repo and screenshots.

### Accepted and implemented

| Finding | Change |
| --- | --- |
| Survival peak lacks next-day return anchor | `GameMoment` survival: “Tomorrow’s return” card + primary CTA `Continue to Day N+1`; share stays secondary; lighter overlay so the share card stays warm |
| Speed-run teaches sample shortcut over capture | Check-in beat: primary **Snap your proof**, secondary “Practice with a sample shot”; Retake / Lock in proof after capture |
| Verdict shown while “jury is voting” | Closing beat: sealed receipt → reveal tally → then Enter the audit |
| Day 1 reveal packs theme + twist at once | `DayReveal`: theme dwell → tap **Reveal the twist** → limits / fairness / CTA |
| Ambient dots invade CTA / tally zones | `PopulationField` bottom-fade mask (pointer-events already none) |
| Day recap continue points at current day | `DayRecap` survived path → Day N+1 / finale |

### Rejected or deferred

| Finding | Reason |
| --- | --- |
| Hide prelaunch theme deck | Product decision from Pass 1 — day↔theme mapping is secret; deck visibility stands |
| Re-bind round/cohort state / motion gating / profile sticky footer | Already shipped in Pass 1; not regressions in these captures |
| Motif budget / emoji glyph audit | Medium; needs a dedicated art pass, not a drive-by |
| Audit button spacing / AT decorative cleanup | Partially covered earlier; remaining polish deferred |

### Strengths to preserve (from Manus)

- Cold system / warm human, gouache, game shell, ceremony cadence
- Practice-entry threshold feel
- Day-theme motor motifs
- Audit binary choice in thumb zone
- Motif frieze as dwell
- Survive / share peak structure

### Guardrails confirmed

- `MANUS_API_KEY` remains local-only
- No Manus runtime dependency added
- No player PII uploaded
