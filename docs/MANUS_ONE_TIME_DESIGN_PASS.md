# Manus one-time product design pass

## Decision

Use the available Manus API credits for one concentrated product-design and
UI/UX review. Manus is a temporary design/research tool for this pass, not a
runtime dependency, production service, or permanent repository integration.

The product already has a defined visual thesis: **cold system, warm human**.
The pass must preserve the hand-painted gouache language, the contrast between
system chrome and human artefacts, and the mobile-first game shell described in
`ART_DIRECTION.md`. Generic visual redesigns, stock imagery, glassmorphism, and
new design systems are out of scope.

## Objective

Find and implement the smallest high-confidence changes that improve a new
player's ability to understand and complete the core journeys:

1. Visitor → understands the game → starts reservation.
2. Player → understands today's mission → completes a check-in.
3. Spectator or eliminated player → understands the audit → casts a vote.
4. Returning player → immediately knows the next required action.

## Inputs supplied to Manus

- Current public product URL and representative screenshots.
- `ART_DIRECTION.md` as the binding visual constraint.
- `README.md` for mechanics and product context.
- `BETA_ROADMAP.md` for current launch priorities and known limitations.
- This brief, including the review rubric and prohibited directions.

No production player photos, wallet-linked identities, precise locations,
private analytics, secrets, or other personal data may be uploaded.

## Review rubric

Every finding must be tied to visible evidence and scored against:

- first-visit comprehension;
- primary-action clarity;
- trust and risk explanation;
- progressive disclosure of complex mechanics;
- mobile ergonomics and readability;
- accessibility and reduced-motion resilience;
- loading, empty, error, and recovery states;
- emotional engagement without obscuring utility;
- consistency with the existing art direction;
- expected impact on beta completion.

## Required output

Manus must return structured findings with:

- journey and screen;
- severity (`blocker`, `high`, `medium`, or `low`);
- category;
- visible evidence;
- user consequence;
- recommended change;
- rationale;
- confidence;
- whether user testing is required before implementation.

It must also return:

- the five highest-leverage changes in priority order;
- strengths that must not be lost;
- unresolved questions or assumptions;
- a short mobile test script for validating the recommendations.

## Execution

1. Capture representative mobile and desktop states from the current product.
2. Create one private Manus task using the standard agent profile and structured
   output. Use best-effort, non-interactive execution so credits are spent on
   the review rather than a prolonged conversation.
3. Retrieve the final structured output and generated artifacts.
4. Validate each recommendation against the actual repository and reject any
   generic, contradictory, unsafe, or unsupported suggestion.
5. Implement only high-confidence changes that are local, testable, and aligned
   with the beta objective. Record larger experiments as follow-up work rather
   than expanding this pass.
6. Run targeted tests plus lint/build checks appropriate to the affected files.
7. Record the task ID, reviewed inputs, accepted/rejected recommendations,
   changes made, and verification results in the outcome section below.

## Guardrails

- `MANUS_API_KEY` stays local and is never sent to the browser or committed.
- Manus is not called by the application, server, CI, or deployment after this
  pass.
- Manus does not decide player eligibility, vote outcomes, elimination, or
  payouts.
- Findings are advisory; repository inspection and human judgment remain the
  acceptance gate.
- Keep the Manus task private.
- Prefer one comprehensive task over repeated speculative tasks to conserve
  short-lived credits.

## Definition of done

- One evidence-based Manus review is complete.
- Findings are preserved locally in a review artifact.
- Accepted recommendations are implemented or explicitly deferred with reason.
- No Manus runtime code or package dependency is added.
- Relevant checks pass, or any existing/unrelated failures are documented.

## Outcome

**Status:** complete (one private Manus task; no runtime integration)

| Field | Value |
| --- | --- |
| Task ID | `WrhA39Cw6SpZCqctp5nJRZ` |
| Task URL | https://manus.im/app/WrhA39Cw6SpZCqctp5nJRZ |
| Structured review | `docs/manus-one-time-pass-review.json` |
| Inputs | Public landing screenshots (mobile + desktop), art direction, README, beta roadmap, this brief |

### Accepted and implemented

1. **Essential content must not depend on opacity animation** — `DayTimeline`, `ShrinkingPot`, and `StageSection` now use offset-only entrances (or skip motion under `prefers-reduced-motion`), so How it works / Stakes never render as blank regions.
2. **Single primary CTA on first visit** — Landing hero keeps **Reserve your slot** as the only filled primary; “See how it works” and “Free 15-min practice” are secondary outline actions.
3. **Profile progression visibility** — Sticky in-shell footer shows `N of 3 answered` and destination label **Continue to reserve**.
4. **Cohort-aligned stakes copy** — `ShrinkingPot` takes live `cohortSize` and mirrors server survival caps (40→20→8→3→1), clipped to cohort.
5. **Theme-deck fairness copy** — DailyProofs copy clarifies the grid is the *possible* theme set; day assignment stays secret (matches product rules; does not hide the deck).
6. **Glitch title accessibility** — Final title exposed via `aria-label`; scramble characters are `aria-hidden`; reduced-motion skips scramble.

### Rejected or deferred

| Finding | Decision |
| --- | --- |
| Hide prelaunch theme names entirely | **Rejected.** Product rule hides day↔theme *mapping*, not the 10-theme vocabulary (`docs/README.md`, `LAUNCH_RUNBOOK.md`). |
| Full round/cohort state reconciliation rewrite | **Deferred.** Needs broader game-state audit; not a one-pass UI patch. |
| Spectator audit modal / empty-state / reward-copy alignment | **Deferred.** Outside the three landing journeys captured for this credit pass. |
| Returning-player destination labels | **Deferred.** Same — follow-up after live-day flows are re-captured. |

### Strengths to preserve (from Manus)

Cold system / warm human contrast, gouache motifs, central game shell, hand-painted theme language, ceremonial cadence.

### Verification

- No Manus SDK, webhook, or server route added.
- `MANUS_API_KEY` remains local-only.
- Targeted lint/tests run on touched UI after implementation.
