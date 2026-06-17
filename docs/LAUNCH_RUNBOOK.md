# Launch runbook — 2026-06-17 18:00 UTC

This is the step-by-step for going live. The launch is the
moment the `phase: "prelaunch"` flag flips to `phase: "live"`
and the lottery draws.

> **Re-launch context.** The original June 14 launch ran with
> zero signups. The lazy draw fired on an empty cohort and
> produced an empty result. We've reset state, bumped
> `GAME_LAUNCH_AT=2026-06-17T18:00:00Z`, and added lazy-draw
> gating (see T-0 below) so the same thing can't happen
> twice. The June 17 18:00 UTC timing targets Tuesday-evening
> Europe / morning-US — peak crypto-twitter reach.

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

- [ ] **Apply the migrations** in Supabase. The `supabase` CLI
  is the working path now (see "Migrations" section below):
  ```bash
  supabase login                            # one-time
  supabase link --project-ref emumokebsahapnqnstlr
  supabase db push                          # applies 002..005
  ```
  The chain is idempotent end-to-end. If a `create policy`
  fails, wrap it in `drop policy if exists` first (the
  Postgres `create policy` form has no native `if not exists`).
- [ ] **Run the reset SQL** in `docs/LAUNCH_RESET.md` to clear
  stale dev-session data from the cohort.
- [ ] **Build on the server, not locally.** The `VITE_FREE_ENTRY_MODE`
  flag is baked into the client bundle at build time. Local `.env`
  must match the server `.env` or the UI will lie. Easiest path:
  rsync `.env` to the server, then build in `/opt/last-human-standing/current`.
- [ ] **World ID env vars (if enabling PoH on production)**:
  ```bash
  VITE_ENABLE_IDKIT=true
  VITE_WORLD_ID_APP_ID=app_xxx             # from World Dev Portal
  VITE_WORLD_ID_ACTION=last-human-standing
  WORLD_ID_RP_ID=rp_xxx                    # server-only
  WORLD_ID_SIGNING_KEY=0x...               # server-only, secp256k1
  ```
  All five must be set or users see the "World ID disabled"
  message and can only verify via Self Protocol. The Orb
  proof's `signal` is bound to the connected wallet, so
  the client also refuses to open the widget until a wallet
  is connected — a misconfiguration here manifests as users
  seeing "Connect wallet to verify" with no obvious next step.
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

## T-0 (18:00 UTC exactly)

The first call to `/api/game/state` after `GAME_LAUNCH_AT`
may trigger the **lazy lottery draw** — but only if the
gating conditions are met (see below).

### Lazy-draw gating (new in this re-launch)

The draw is **held** until EITHER:

- `LOTTERY_MIN_CANDIDATES` (default 10) free-registered
  humans have signed up, OR
- `LOTTERY_MAX_DELAY_HOURS` (default 6) have passed since
  `GAME_LAUNCH_AT`.

The earlier of the two fires the draw. This is the fix for
the June 14 launch's empty-draw failure mode. The
`/api/lottery/status` response carries `minCandidates`,
`maxDelayHours`, and `nextDrawAt` so the client can show a
"lottery draws in N minutes" countdown once we're past T-0
and the draw is still being held.

While the draw is held, the pm2 logs will emit
`lottery_lazy_held` events with `freeCandidates` and
`hoursPastLaunch` so the operator can see why. When the
draw fires, the trigger reason is logged as `min`, `delay`,
or `min+delay`.

### When the draw fires

The draw is:

- Deterministic (seed = `${GAME_LAUNCH_AT}:cohort-1:lottery`).
- Replayable — anyone can re-run with the same seed.
- Idempotent — concurrent calls return the stored result.

Steps to monitor the draw:

1. Curl `/api/lottery/status` — first call after T-0 will see
   `status: "pending"` (draw held) or `status: "drawn"` (draw
   already fired from an earlier `/api/game/state` call).
2. Inspect the result in Supabase:
   ```sql
   select * from public.lottery_results where cohort = 1;
   ```
   The `drawn` JSONB array lists winners in selection order
   (rank 1, 2, 3, ...). The losers were moved to `cohort = 2`.
3. If the draw didn't run by `T-0 + 6h` (Supabase outage or
   nobody called `/api/game/state`), trigger it manually:
   ```bash
   curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" \
        https://lasthumanstanding.thisyearnofear.com/api/lottery/draw
   ```

## T+5min

- [ ] **Push notification** to "Day 1 is live" — the `push`
  service is already wired, just trigger from
  `AdminDashboard → Push → Broadcast`. See
  `docs/PUSH_NOTIFICATIONS.md` for the template.
- [ ] **Cohort-2 waitlist ping** to the free lottery losers,
  AND to the bounced visitors on the `cohort_waitlist` table.
  The query is:
  ```sql
  -- Free lottery losers (now in cohort 2)
  select address, username
    from public.users
   where cohort = 2 and entry_kind = 'free' and paid = true;

  -- Bounced visitors (captured on the welcome screen)
  select x_handle, email, source, created_at
    from public.cohort_waitlist
   order by created_at desc;
  ```
  The `cohort_waitlist` table is namespaced with a `cohort_`
  prefix to avoid collision with a legacy `waitlist` table
  from a previous project. Send via your transactional email
  provider; for the X handles, a Twitter DM or a public tag
  from the project's account both work.
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
    launchAtIso: '2026-06-17T18:00:00Z',
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

### Direct DB connection (verified 2026-06-15)

The Supabase project is in `aws-0-eu-west-1`. The direct endpoint
(port 5432) is connection-refused; the **pooler** is the working
entry point. The service role JWT is **rejected** as the
postgres password on the pooler (the project was created with
a separate DB password).

For ad-hoc queries, the working path is the `supabase` CLI
(see T-24h above). For direct psql:

```bash
PGPASSWORD=<password-from-supabase-dashboard> \
  psql -h aws-0-eu-west-1.pooler.supabase.com -p 6543 \
       -U postgres.emumokebsahapnqnstlr -d postgres
```

Other regions return `tenant/user not found` (misleading Supabase
error — the project isn't there).

If the `supabase` CLI is set up (it is, after
`supabase login` + `supabase link`), the migration runner is
the same `supabase db push` — that's how 005_waitlist was
applied for the June 17 re-launch.

For migrations in a hurry (e.g. emergency ALTER while supabase
CLI is broken), fall back to psql with the DB password:

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
