# Cohort 1 Invitation Readiness

This is the operator checklist for the **free, closed, verified-human pilot**.
Do not begin broad invitations until the pre-invite gates pass.

## Current posture

- Provisional launch: **2026-08-10 18:00 UTC**. Reconfirm with
  `/api/game/state`; this date may be moved before roster freeze.
- Cohort size: 25.
- Minimum launch roster: 8 verified humans.
- Entry: free; paid entry and lottery disabled.
- Settlement: manual, in-kind, after a 48-hour appeal window.
- Prize: 5 WLD on World Chain plus 35 cUSD on Celo.
- Public agents: disabled. Existing operator-run exhibition agents are
  prize-ineligible and must not be counted as human invitees.

## Gate 0 — code and database

- [ ] Deploy the latest commit and verify PM2 is online.
- [ ] Confirm migrations 032, 033, 034, and 035 are applied.
- [ ] Confirm `PAID_ENTRY_ENABLED=false`.
- [ ] Confirm `FREE_ENTRY_MODE=true`.
- [ ] Confirm `LOTTERY_ENABLED=false`.
- [ ] Confirm `REQUIRE_HUMANITY_FOR_PLAY=true`.
- [ ] Confirm `REQUIRE_WORLD_ID_FOR_VOTING=true`.
- [ ] Confirm `AUTO_PAYOUT_ENABLED=false`.
- [ ] Confirm `INFILTRATOR_ENABLED=false` and `REVIVAL_ENABLED=false`.
- [ ] Confirm `ENABLE_TEST_ROUTES` is unset or false.
- [ ] Confirm the active cohort and launch date from `/api/game/state`.

## Gate 1 — operator dry run

Use a non-public test cohort or tightly controlled operator accounts. Do not
use test-route bypasses in the participant cohort.

1. Authenticate a wallet.
2. Complete World ID or Self verification.
3. Complete reachability: notifications plus email/Telegram fallback.
4. Claim a free seat and verify the user is in the current cohort.
5. Submit a check-in and proof.
6. Confirm an unverified user is rejected at claim/check-in/proof stages.
7. Cast a valid vote and confirm a self-vote is rejected.
8. Close a short test round through the admin path.
9. Verify the single 70% verdict rule, DQ/replacement, and human-only winner.
10. Verify a pending payout row is recorded and no transfer is attempted.
11. Walk through the manual WLD + cUSD settlement procedure using small
    operator-controlled test amounts, if the networks and wallets permit it.

Record the result, timestamp, commit, and any exceptions in the ops log.

## Gate 2 — private recruitment

Recruit 10–12 humans to create attrition capacity. For each person record,
privately and with consent:

- Wallet address
- Humanity provider/status
- Preferred timezone
- Push and fallback contact channel
- Explicit schedule confirmation

Invite in small batches. The product remains private; do not publish a broad
signup link while the roster is being assembled.

## Gate 3 — roster freeze

When at least 8 participants have completed verification and confirmed the
schedule:

1. Review `/api/game/state`, `/api/cohort/roster`, and `/api/stats`.
2. Remove duplicate or unverified rows before freezing.
3. Snapshot the database and both prize-wallet balances.
4. Publish the five daily windows and survival caps to participants.
5. Set `ENTRY_CLOSED=true` in the production shared environment.
6. Restart PM2 with `--update-env`.
7. Confirm new free claims return `entry_closed`.
8. Do not admit late entrants into the open cohort.

## Participant brief

Send each admitted player a short message covering:

- Daily check-in window and timezone conversion
- What makes a proof valid
- That humanity verification is required before admission
- How crowd audits and self-vote prevention work
- Missed-day and disqualification behavior
- Appeal/review process
- Public/private data handling
- Exact prize assets and 48-hour settlement timing
- The postponement conditions

Use the prize wording in `docs/COHORT1_PILOT.md` verbatim.

## Stop conditions

Pause admission or postpone the start if any of these occur:

- Fewer than 8 verified, reachable humans at freeze time
- Humanity provider outage or unverifiable proof
- Push and fallback delivery cannot be confirmed
- Check-in, upload, voting, or close-day dry run fails
- Roster counts disagree across state, roster, and stats endpoints
- A dispute could change a prize-affecting elimination and has no operator
  review path
- Either prize wallet cannot cover the published in-kind amounts

Rollback: set `ENTRY_CLOSED=true`, keep paid/lottery/automatic payout disabled,
close or postpone open rounds through the admin path, notify participants, and
record the reason in `docs/ops/`.

## Launch-day checks

Immediately before opening:

- [ ] `/api/health` is healthy.
- [ ] `/api/game/state` is `prelaunch` with the intended launch timestamp.
- [ ] At least 8 current-cohort verified humans are present.
- [ ] `ENTRY_CLOSED` is set and the roster is frozen.
- [ ] Both prize balances are visible and match the published amounts.
- [ ] PM2 logs are quiet aside from expected scheduler activity.
- [ ] A support contact is actively monitoring the first check-in window.

After launch, do not change admission, verdict, or payout flags mid-cohort.
