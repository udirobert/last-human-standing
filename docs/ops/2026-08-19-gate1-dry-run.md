# Ops log — 2026-08-19: Gate 0 + Gate 1 complete

## Gate 0 (pre-invite) — PASS

Automated via `bash scripts/pilot-gate0-check.sh`:

- Migration 037 applied
- PM2 online, release `20260819-225643` deployed
- Pilot containment flags verified on prod
- `phase=prelaunch`, `launchAt=2026-08-24T18:00:00Z`
- Prize pool: **5 WLD + 35 cUSD** (meets pilot minimum)
- 252 unit tests passing

## Gate 1 (operator dry run) — PASS 14/14

Automated via `bash scripts/pilot-dry-run.sh` against production:

| Step | Result |
|------|--------|
| Health + test/session | OK |
| Temporary live window | OK |
| Unverified user rejected at check-in | 403 |
| Verified users check-in + photo submit | 200 |
| Self-vote rejected | 403 |
| Cross-vote (beta → alpha) | 200 |
| close-day + human winner | OK |
| auto payout blocked | 403 |

Dry-run fixtures cleaned; prod restored to `prelaunch` / Aug 24 launch.

**Note:** Dry run briefly sets `ENABLE_TEST_ROUTES=true` and a past `GAME_LAUNCH_AT`; both are reverted automatically. Exhibition agents restored after cleanup.

## Recruitment — READY TO START

Kit: `docs/COHORT1_RECRUITMENT.md` (invite copy, participant brief, roster tracker).

**Operator action:** DM 10–12 humans by **Aug 23**; freeze roster `ENTRY_CLOSED=true` before Aug 24 18:00 UTC.

## Schedule

| Event | Date (UTC) |
|-------|------------|
| Cohort 1 Day 1 | 2026-08-24 18:00 |
| Roster freeze | 2026-08-23 |
| Cohort 2 Day 1 (ETHOnline) | 2026-09-13 18:00 |
