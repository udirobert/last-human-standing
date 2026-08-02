# Cohort 1 — Closed Verified-Human Pilot

Cohort 1 runs as a **free, closed, verified-human pilot** with a
sponsor-funded prize and manual, in-kind settlement. It is *not* a paid,
automatically settled contest. This document is the operational checklist
that goes with the code-level containment flags. Priorities + status:
`docs/ROADMAP.md`. Optional extension that adds operator-run,
prize-ineligible agents to the pilot: `docs/COHORT1_AGENT_EXHIBITION.md`.

## Prize disclosure (publish verbatim)

> Sponsor prize: **5 WLD on World Chain** plus **35 cUSD on Celo**.
> Funds remain operator-custodied during the pilot. The winner receives
> both assets in two separate on-chain transfers after a **48-hour appeal
> window** following the final day close. Both transaction hashes are
> published in the recap. No conversion to a synthetic USD total is
> performed. If no legitimate winner emerges, the prize rolls to Cohort 2.

## Containment flags (defaults are the pilot posture)

| Flag | Default | Effect |
|---|---|---|
| `PAID_ENTRY_ENABLED` | `false` | All paid-confirm endpoints return `503 paid_entry_disabled`. |
| `AUTO_PAYOUT_ENABLED` | `false` | Winner + pot snapshot are recorded; no hot-key transfer. Admin `retry-payout` returns `403`. |
| `LOTTERY_ENABLED` | `false` | No lazy/admin draw; the roster is operator-frozen. Free entry admits directly. |
| `ENTRY_CLOSED` | — | When `true`, **no new participant** is admitted (roster freeze). Set at T-0. |
| `MIN_LAUNCH_PARTICIPANTS` | `8` | Day 1 never auto-opens below a verified roster of 8 (postponement, not a 1-player game). |
| `REQUIRE_HUMANITY_FOR_PLAY` | `true` | Entry + check-in require a World ID or Self proof. Only a verified human can win. |
| `REQUIRE_WORLD_ID_FOR_VOTING` | `true` | Verdict votes require a verified human who is an admitted cohort member. Self-votes rejected. |
| `INFILTRATOR_ENABLED` / `REVIVAL_ENABLED` | `false` | Infiltrator immunity and Day-4 jury revival are off. |
| `ENABLE_TEST_ROUTES` | — | `/api/test/session` only exists when set (E2E harness only). |

## Database

Apply `supabase/migrations/032_pilot_containment.sql`:

1. Unique `payouts (cohort, day)` claim — kills the check-then-insert
   double-payment race.
2. `close_day` now applies **one** verdict threshold everywhere
   (`REAL >= 70%` of weighted votes at quorum ⇒ verified, else flagged),
   identical to mid-day settlement. Previously a 70/30 tally could be
   verified mid-day but flagged at close.

## Launch gates (all must pass before Day 1 opens)

1. **Roster**: ≥ `MIN_LAUNCH_PARTICIPANTS` (8) recruited players, each
   World-ID/Self verified, reachable (push delivered + fallback contact),
   and explicitly confirmed for the schedule. Freeze with `ENTRY_CLOSED=true`.
2. **Caps**: compute the survival arc once from the frozen roster; publish
   all caps and windows before Day 1. Never admit late entrants.
3. **Snapshot**: database snapshot + both prize-wallet balances recorded.
4. **Dry run**: one real end-to-end pass on the intended networks:
   verification → check-in → vote → close-day → manual test payout.
5. **Stop conditions**: documented; rollback = `ENTRY_CLOSED=true` +
   close open rounds via admin + postpone note.

## Manual settlement procedure (after the appeal window)

1. Confirm final winner from `winners` / `payouts` (status `pending`).
2. From the operator wallet, send:
   - `5 WLD` on **World Chain** to the winner address.
   - the recorded `amount_usd` in **cUSD** on **Celo** to the winner address.
3. Record both hashes, then mark the payout confirmed:

```sql
update public.payouts
set status = 'confirmed',
    tx_hash = '<celo_tx_hash>',
    explorer_url = 'https://celoscan.io/tx/<celo_tx_hash>',
    error = null
where cohort = 1 and day = <final_day> and winner_address = '<winner>';
-- record the WLD leg in a second note row or the ops log; publish BOTH hashes in the recap.
```

4. Publish both hashes in the recap + the public payout status page.

## Explicitly out of scope for Cohort 1

Public agent registration, x402 payments, ERC-8004 registration,
commit–reveal voting, referral-weighted admission, token emissions
(`AGENTS_ENABLED=false` — the public agent API stays dark). Operator-run,
prize-ineligible **exhibition agents** are allowed as a separate decision —
see `docs/COHORT1_AGENT_EXHIBITION.md`. The honest public wording
otherwise: *"feature-flagged experimental agent API and onchain-voting
foundation."*
