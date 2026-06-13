# Launch runbook — 2026-06-14 14:00 UTC

This is the step-by-step for going live. The launch is the
moment the `phase: "prelaunch"` flag flips to `phase: "live"`
and the lottery draws.

## Cohort model (recap)

25 paid (guaranteed) + 25 free (lottery), capped at 50. The
free lottery's slot count is dynamic: unfilled paid slots
promote into the lottery, so the cohort always fills to 50
unless the free pool itself is too small.

| Paid by T-0 | Free lottery draws | Total cohort |
|---:|---:|---:|
| 0 | 50 | 50 |
| 10 | 40 | 50 |
| 25 | 25 | 50 |
| 30 | 20 | 50 |
| 50 | 0 | 50 |

The math lives in `server/lib/lottery.js → freeSlotsFor(paidCount)`
and is called at draw time (not at request time) so a paid
signup between the lazy trigger and the actual draw is honoured.

## T-24h (now-ish)

- [ ] **Apply the migration** in Supabase SQL editor:
  `supabase/migrations/004_hybrid_cohort.sql`
  This adds `entry_kind`, `entry_token`, `cohort` columns and the
  `lottery_results` table.
- [ ] **Run the reset SQL** in `docs/LAUNCH_RESET.md` to clear
  stale dev-session data from the cohort.
- [ ] **Build on the server, not locally.** The `VITE_FREE_ENTRY_MODE`
  flag is baked into the client bundle at build time. Local `.env`
  must match the server `.env` or the UI will lie. Easiest path:
  rsync `.env` to the server, then build in `/opt/last-human-standing/current`.
- [ ] **Smoke-test the build**: load `/`, see the splash, see
  the FREE ENTRY button on step 2 of Onboarding, see the two-bar
  cohort card on GameHome.

## T-1h

- [ ] **Final deploy**: rebuild + scp tarball + `pm2 restart
  last-human-standing --update-env`. Verify the new index bundle
  is served.
- [ ] **Curl `/api/lottery/status`** — should return
  `status: "scheduled"`, `freeSlots: 25`, `freeRegistered: N`
  where N is the number of free entries so far.
- [ ] **Curl `/api/cohort/roster`** — should return a `split`
  object with `paidCount` and `freeCount` summing to the total
  paid users.
- [ ] **Curl `/api/stats`** — should now return
  `prizePool.wld` AND `prizePool.celo`.

## T-0 (14:00 UTC exactly)

The first call to `/api/game/state` after `GAME_LAUNCH_AT`
triggers the **lazy lottery draw**. The draw is:

- Deterministic (seed = `${GAME_LAUNCH_AT}:cohort-1:lottery`).
- Replayable — anyone can re-run with the same seed.
- Idempotent — concurrent calls return the stored result.

Steps to monitor the draw:

1. Curl `/api/lottery/status` — first call after T-0 will see
   `status: "pending"`, then the next call sees `status: "drawn"`
   with a non-null `drawn` array.
2. Inspect the result in Supabase:
   ```sql
   select * from public.lottery_results where cohort = 1;
   ```
   The `drawn` JSONB array lists winners in selection order
   (rank 1, 2, 3, ...). The losers were moved to `cohort = 2`.
3. If the draw didn't run (Supabase outage during T-0), trigger
   it manually:
   ```bash
   curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" \
        https://lasthumanstanding.thisyearnofear.com/api/lottery/draw
   ```

## T+5min

- [ ] **Push notification** to "Day 1 is live" — the `push`
  service is already wired, just trigger from
  `AdminDashboard → Push → Broadcast`. See
  `docs/PUSH_NOTIFICATIONS.md` for the template.
- [ ] **Cohort-2 waitlist email** to the free lottery losers.
  Easiest: query the `users` table for `cohort = 2 AND entry_kind = 'free'`
  and send via your transactional email provider. (No automation
  yet — pull the list, paste into your provider.)
- [ ] **Smoke test**: open the page on a phone, sign in, check
  in at a place. The `phase: "live"` flag is now on.

## Verifying the draw was fair

Anyone — investor, mentor, journalist — can re-run the draw with
the same seed and confirm the same winners. From any machine
with node:

```bash
node -e "
import('./server/lib/lottery.js').then(({ drawLottery, lotterySeed, ALGORITHM_VERSION }) => {
  // The candidate list is the free-registered users, ordered by reserved_at.
  // For a re-run, export the candidate list from Supabase and pass it in.
  const candidates = [/* ...from supabase, ordered by reserved_at asc... */];
  const result = drawLottery(candidates, {
    launchAtIso: '2026-06-14T14:00:00Z',
    cohort: 1,
    slots: 25,
  });
  console.log('seed:', result.seed);
  console.log('algorithm:', result.algorithmVersion);
  console.log('winners:', result.drawn.map(d => d.address));
  console.log('rolled to cohort 2:', result.rolledToCohort2.map(u => u.address));
});
"
```

Compare the output's `winners` list to the one in
`lottery_results.drawn` — they must match.

## If something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| `phase` still `prelaunch` after T-0 | `GAME_LAUNCH_AT` env not set or wrong | `ssh snel-bot` → `grep GAME_LAUNCH_AT /opt/last-human-standing/shared/.env` → `pm2 restart last-human-standing --update-env` |
| `/api/lottery/status` returns `drawn: null` after T-0 | No one called `/api/game/state` yet, or RPC error | Hit `/api/game/state` from a browser; check `pm2 logs` for `lottery_lazy_error` |
| Free users showing as `cohort: 1` after T-0 | `lottery_rollover_error` in pm2 logs | The draw ran but the cohort update failed; manually update: `update public.users set cohort = 2 where address in (...)` |
| Paid users showing as `entry_kind: null` | Migration backfill missed them | `update public.users set entry_kind = 'paid', entry_token = 'wld' where paid = true and entry_kind is null` |
| Celo pot reads 0 forever | `CELO_RPC` rate-limited or unreachable | Set `CELO_RPC` to a paid provider (e.g. `https://celo-mainnet.g.alchemy.com/v2/...`); restart PM2 |
| `/api/lottery/draw` returns 401 | `VITE_ADMIN_TOKEN` not set or wrong | Set it in the server env, restart PM2 |

### Direct DB connection (verified 2026-06-13)

The Supabase project is in `aws-0-eu-west-1`. The direct endpoint
(port 5432) is connection-refused; the **pooler** is the working
entry point.

```bash
PGPASSWORD='<DB_PASSWORD>' \
  psql -h aws-0-eu-west-1.pooler.supabase.com -p 6543 \
       -U postgres.emumokebsahapnqnstlr -d postgres
```

Other regions return `tenant/user not found` (misleading Supabase
error — the project isn't there).

For migrations in a hurry, use the bundled runner:

```bash
DATABASE_URL='postgresql://postgres.emumokebsahapnqnstlr:<DB_PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' \
  node scripts/migrate.mjs --reset
```

## Post-launch

- [ ] Update `docs/PRODUCTION_READY.md` with the actual cohort 1
  outcome.
- [ ] Add a "Cohort 1 winners" link to the landing page.
- [ ] Plan cohort 2 with the same model — same SQL, same algorithm
  version (unless we change it; the version is in
  `lottery_results.algorithm_version` so the history is
  preserved).
