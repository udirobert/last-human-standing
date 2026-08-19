# Ops log — 2026-08-19: ETHOnline cohort schedule reset

## Context
ETHGlobal Continuity Track accepted. Cohort 1 = closed test pilot; Cohort 2 =
public iteration during ETHOnline (Sep 4–16). Aug 10 launch had advanced to
`phase=live` / `currentDay=10` with 0 human players.

## Applied
1. Migration **037_launch_date_bump_aug24.sql** — rounds rescheduled Aug 24–28;
   game artifacts cleared; user/cohort participation state reset (users preserved).
2. Prod env (`snel-bot:/opt/last-human-standing/shared/.env`):
   - `GAME_LAUNCH_AT=2026-08-24T18:00:00Z`
   - `COHORT_2_LAUNCH_AT=2026-09-13T18:00:00Z`
   - `ENTRY_CLOSED=false` (recruitment open through Aug 23)
   - `LOTTERY_ENABLED=false`, `FREE_ENTRY_MODE=true`
3. PM2 restart `last-human-standing --update-env`.

## Verified
- `/api/game/state`: `phase=prelaunch`, `launchAt=2026-08-24T18:00:00Z`,
  `nextCohort.launchAt=2026-09-13T18:00:00Z`, `currentDay=null`
- `reservedCount=4` (exhibition agents only; 0 humans)

## Still required before Aug 24
- Recruit 8–12 verified humans (Aug 19–23)
- Operator dry run (Gate 1 in `docs/PILOT_INVITATION_READINESS.md`)
- Roster freeze Aug 23: `ENTRY_CLOSED=true`
- Prize wallet balances confirmed (5 WLD + 35 cUSD per pilot spec)
