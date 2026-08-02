# Ops log — 2026-08-02: pilot containment executed

Launch review → containment patches → production rollout. All times UTC.

## Production state before
- `phase=prelaunch`, launch `2026-08-03T18:00Z`, roster 0/25, agents +
  commit–reveal disabled, prize wallets 5 WLD + 35 cUSD.
- `REQUIRE_WORLD_ID_FOR_VOTING=false` explicitly set in prod env.
- Rounds 1–5 scheduled 2026-08-03 → 2026-08-08.

## Changes applied (code)
- Containment flags + hardening in `server/` (see `docs/COHORT1_PILOT.md`):
  `PAID_ENTRY_ENABLED=false`, `AUTO_PAYOUT_ENABLED=false`,
  `LOTTERY_ENABLED=false`, `MIN_LAUNCH_PARTICIPANTS=8`,
  `REQUIRE_HUMANITY_FOR_PLAY=true`, `INFILTRATOR_ENABLED=false`,
  `REVIVAL_ENABLED=false`, `ENTRY_CLOSED` (unset until roster freeze),
  `REQUIRE_WORLD_ID_FOR_VOTING` now defaults ON; voting additionally
  requires cohort membership; self-votes rejected; check-in rejects
  non-admitted/unverified users; launch gate in `autoAdvanceRounds`.
- Celo: official cUSD contract `0x765D…1282a` in payment verifier **and**
  payout builder; canonical token-symbol resolution (was `CUSD` mismatch).
- Payout: reads `pot.cusd` (was undefined `totalUsd ?? usd`); records only;
  manual settlement by default; admin retry locked to recorded payout row
  and gated by `AUTO_PAYOUT_ENABLED`.
- Route leak: `/api/test/session` registers once at startup, only with
  `ENABLE_TEST_ROUTES=true` (e2e harness asserts this in preflight).
- `supabase/migrations/032_pilot_containment.sql`: unique
  `payouts(cohort, day)` claim + single verdict threshold
  (`REAL ≥ 70%` at quorum ⇒ verified, else flagged) in `close_day`,
  matching mid-day settlement.
- `031_adaptive_day1_cut.sql`: Day-1 arc now sizes from the frozen,
  verified, cohort-1 admitted roster (was: all-time global `users.paid`).

## Rollout executed
1. Snapshots: API state → `docs/ops/2026-08-02-pre-pilot.*.json`; full
   table dump → prod host `shared/backups/pre-pilot-20260802-120524.json`;
   prod env → `shared/backups/env-pre-pilot-20260802-120628`.
2. `supabase db push` applied **030, 031, 032** to `emumokebsahapnqnstlr`
   (eu-west-1). Confirmed via `supabase migration list`.
3. Prod env (`snel-bot:/opt/last-human-standing/shared/.env`):
   `GAME_LAUNCH_AT=2026-08-10T18:00:00Z` (**provisional**),
   `COHORT_2_LAUNCH_AT=2026-08-24T18:00:00Z`,
   `REQUIRE_WORLD_ID_FOR_VOTING=true` (client `VITE_` too), pilot flags
   appended explicitly.
4. Rounds 1–5 shifted +7d → Day 1 opens `2026-08-10T18:00Z`,
   Day 5 closes `2026-08-15T18:00Z` (guard refused double-shift).
5. Release `20260802-120644` built + deployed (`scripts/package-release.sh`),
   pm2 `last-human-standing` restarted.

## Post-deploy verification (live)
- `/api/health` ok; `/api/game/state` → `prelaunch`, launchAt Aug 10.
- Paid entry: `/api/pay/browser-confirm` + `/api/pay/browser-celo-confirm`
  → `paid_entry_disabled`; World-App `/api/pay/confirm` requires session.
- Route-leak soak: 25× `GET /api/game/state`, then `POST /api/test/session`
  → `404` (register-once confirmed).
- Prize pools visible via `/api/stats`: **5 WLD + 35 cUSD**.
- Test suite: **233/233 passing**.

## Notes / data quality
- `users` has 2 rows for ONE address (checksummed + lowercase duplicates),
  both unpaid — address casing inconsistency; harmless for an empty pilot
  roster but should be cleaned or normalized before multi-cohort.
- `/api/vote` with a configured DB now returns `404 submission_not_found`
  for unknown IDs before insert (was `db_vote_failed` 400) — intentional.
- The provisional Aug 10 launch is self-holding: `autoAdvanceRounds` refuses
  to open Day 1 while verified roster < 8 (`launch_held` log event).

## Still owed (needs the operator)
1. Confirm/adjust the launch date (Aug 10 18:00Z is provisional).
2. Recruit ≥8 players → World ID/Self verify → confirm schedule → freeze:
   set `ENTRY_CLOSED=true`, publish caps/windows, `pm2 restart
   last-human-standing --update-env`.
3. T-24h dry run on prod: verify → free entry → check-in → vote →
   admin close-day → manual test payout (small amounts, both chains).
4. At settlement: follow `docs/COHORT1_PILOT.md` § Manual settlement.
5. Communicate postponement publicly (site copy/landing still advertises
   the old timeline — landing countdown reads `GAME_LAUNCH_AT` from the
   API so it self-updates; check any baked copy).
