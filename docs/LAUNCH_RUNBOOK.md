# Launch runbook — 2026-07-14 18:00 UTC

This is the step-by-step for going live. The launch is the
moment the `phase: "prelaunch"` flag flips to `phase: "live"`
and the lottery draws.

> **Re-launch context.** Three prior launches have been missed:
> - **June 14** ran with zero signups; the lazy draw fired on
>   an empty cohort and produced an empty result. State was
>   reset, lazy-draw gating added, and the date bumped.
> - **June 17** the second attempt also landed with zero
>   signups — the app was still landing in a broken state for
>   new users (World ID verify was a dead end, the post-payment
>   placement was wrong, the empty states were text-only, and
>   the offline / photo-upload / verify-success paths were
>   silent). All of those are now fixed in release
>   `20260619-094447` (see Post-launch release history).
> - **July 1** was missed with the production API down (nginx
>   502 — the PM2 process was not serving). Detected 2026-07-07.
>
> The new target is **Tuesday 2026-07-14 18:00 UTC**, giving a
> week of signup runway. This launch also ships the engagement
> mechanics release: lethal votes (DQ-and-replace), real
> infiltrator stakes, the jury system, weighted lottery v2,
> working push notifications, the public spectator feed, and
> the ended-phase winner ceremony.

## Pre-launch status (updated 2026-07-07)

### Done — code-complete, tested, deployed

- ✅ **Cap decay** (migration 009): `survival_cap_for_day()` — 25→12→6→3→1
- ✅ **Round schedule** (migration 010): 5 daily rounds for July 14–19
- ✅ **Streak tracking** (migration 011): `checkin_streak`, `award_streak_bonuses()`
- ✅ **Wildcard revival** (migration 011): `revive_votes` table, `revive_player()`, UI (`WildcardPanel.jsx`)
- ✅ **Winner payout** (migration 012): `payouts` table, automatic onchain payout via `ariaBroadcastPayoutTx()`, `/api/payout/status`, `/api/admin/retry-payout`
- ✅ **End-game edge cases** (migration 012): `resolve_no_survivors()` tiebreaker
- ✅ **Referral cap raised**: `TICKET_CAP_REFERRALS=50`, `TICKET_CAP_JURY=10`
- ✅ **Voting hints**: "What to look for" guide above the feed
- ✅ **Mid-day verdict moment**: "Verdicts are landing" banner in final hour
- ✅ **Elimination ceremony**: survival summary, jury CTA, share copy
- ✅ **Jury UI**: MissionBoard shows jury status, accuracy, tickets
- ✅ **Onboarding pot display**: prize pot prominent on welcome + reserve
- ✅ **All 133 tests passing**, lint clean, build succeeds
- ✅ **Migrations 009–012 applied** to remote Supabase
- ✅ **Deployed to production** (release `20260707-203843`)

### Remaining — requires human action

- ⬜ **Seed the prize pool**: transfer cUSD/WLD to the prize wallet before launch. With 25 paid entries at 1 WLD, the pot is ~$25 — insufficient for a 5-day engagement. Recommended: $500–1000 minimum, or raise the entry fee to 5 WLD.
- ⬜ **Run the reset SQL** (`docs/LAUNCH_RESET.md`) to clear stale dev data
- ⬜ **Dry-run the full game loop**: create a test round that opens/closes in minutes, submit check-ins, cast votes, trigger `close_day`, verify cap decay + verdicts + DQ-and-replace + streak bonuses + elimination + winner detection + payout
- ⬜ **Set World ID env vars** if enabling PoH (see T-24h section)
- ⬜ **Smoke-test the build** on a phone

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

- [x] **Apply the migrations** in Supabase. The `supabase` CLI
  is the working path now (see "Migrations" section below):
  ```bash
  supabase login                            # one-time
  supabase link --project-ref emumokebsahapnqnstlr
  supabase db push                          # applies 002..012
  ```
  The chain is idempotent end-to-end. If a `create policy`
  fails, wrap it in `drop policy if exists` first (the
  Postgres `create policy` form has no native `if not exists`).

  **⚠️ Ordering: migration 008 MUST land before the new server
  release is deployed.** 008 changes the `cast_vote` and
  `close_day` function signatures (adds `p_weight` /
  `p_flag_pct`) and the new server code calls them with the new
  named params — old DB + new server means every vote and
  close-day RPC fails. (Old server + new DB is fine: the new
  params have defaults.)

  **Migrations 009–012 (applied 2026-07-07):**
  - 009: Cap decay — `survival_cap_for_day(day)` SQL function
    (Day 1→25, Day 2→12, Day 3→6, Day 4→3, Day 5+→1).
  - 010: Round schedule — 5 daily rounds created for July 14–19.
    Themes: Café → Park → Friend → Bookstore → Sunrise.
  - 011: Streaks + wildcard — `checkin_streak` column,
    `award_streak_bonuses()`, `revive_votes` table,
    `revive_player()` function, `close_day` updated to call
    streak bonuses.
  - 012: Winner payout — `payouts` table, `resolve_no_survivors()`
    tiebreaker, `record_winner()`, `game_winner` column on rounds.
- [ ] **Run the reset SQL** in `docs/LAUNCH_RESET.md` to clear
  stale dev-session data from the cohort.
- [x] **Deploy with `scripts/package-release.sh`** (the canonical
  build + ship path). Latest release: `20260707-203843`.
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

- [ ] **Final deploy**: `bash scripts/package-release.sh` —
  builds + ships + restarts pm2 in one step. Verify the new index
  bundle is served.
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
    launchAtIso: '2026-07-14T18:00:00Z',
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
| World ID verify hangs or `verify_failed` in pm2 logs | Mismatch between server `WORLD_ID_RP_ID` + `WORLD_ID_SIGNING_KEY` and the `app_id` registered in the World Dev Portal | Re-pull the rp_id / signing key from the Dev Portal and update `shared/.env`; rebuild and redeploy |
| "World ID disabled" in the Onboarding verify card | `VITE_ENABLE_IDKIT=false` (or unset) on server, OR the client bundle was built without that flag | `sed -i 's/^VITE_ENABLE_IDKIT=.*/VITE_ENABLE_IDKIT=true/' /opt/last-human-standing/shared/.env`, then rebuild + redeploy — the VITE_ vars are baked at build time, not read at runtime |
| Orb opens in World App but the resulting nullifier isn't bound to a wallet | Client was using an empty `signal` (no wallet address); known cause: `WorldIdVerify` rendered before the user had a wallet | Fixed in `22b8a9b` — the widget now gates on `user?.address` and renders "Connect wallet to verify" otherwise |

## Post-deploy smoke test (World ID)

After flipping `VITE_ENABLE_IDKIT=true` and rebuilding, the fastest way to
confirm the fix is end-to-end:

```bash
# 1. Confirm the new bundle has the flag baked in (chunk hash may change
#    between builds — match the pattern, not the exact hash):
curl -s https://lasthumanstanding.thisyearnofear.com/ \
  | grep -oE 'assets/humanityProviders-[^"]*\.js' \
  | xargs -I {} curl -s https://lasthumanstanding.thisyearnofear.com/{} \
  | grep -oE 'VITE_ENABLE_IDKIT:[^,}]{1,15}'
# → expect: VITE_ENABLE_IDKIT:`true`
```

Then on a phone with World App installed:

1. Open the mini app → RESERVE
2. Tap the new "VERIFY WORLD ID" card (now sits **above** the paid card,
   no longer gated on `entryPaid`)
3. Tap "VERIFY WORLD ID" → orb opens in World App → completes
4. Back in the app, the trust badge should read "Verified · World ID"
5. Confirm server-side: `curl -b "<session-cookie>" https://lasthumanstanding.thisyearnofear.com/api/me | jq '{humanityVerified, humanityProvider}'`
   should return `{ "humanityVerified": true, "humanityProvider": "worldcoin" }`

## Known noisy log lines (not actionable)

These appear in `pm2 logs last-human-standing` and are **not caused by
deploys or the World ID fix** — they are pre-existing Supabase connection
timeouts that the round scheduler and vote relayer recover from
automatically:

- `vote_claim_error` / `round_scheduler_error` with
  `upstream connect error or disconnect/reset before headers. retried
  and the latest reset reason: connection timeout` — Supabase pooler
  blips, retried by the next tick. Ignore unless they appear in a
  continuous stream (then check `CELO_RPC` rate limits and the Supabase
  project status page).

If a new deploy produces errors **other** than the above, the deploy is
the likely cause — roll back with `bash scripts/deploy-rollback.sh`.

## Operational notes

- **API port**: production runs on `PORT=5300` (set in `shared/.env`).
  The default in the code is 8787, so don't `curl localhost:8787` to
  health-check prod — it's `localhost:5300`. The reverse proxy on
  `lasthumanstanding.thisyearnofear.com` terminates TLS and forwards
  to 5300.
- **Deploy user**: pm2 processes run as the `deploy` user; the release
  layout is owned by `deploy:root`. Don't `chown` the release dirs to
  your own user or pm2 will fail to read the shared `node_modules`
  symlink on the next restart.

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

## Release history

| Date (UTC) | Release tag | Notes |
|---|---|---|
| 2026-06-17 | `20260617-163036` | World ID verify-first placement (signal bound to wallet, no-wallet guard, surfaced above paid card). |
| 2026-06-18 | `20260618-202401` | Animation pass (a11y `prefers-reduced-motion`, eased `cubic-bezier(0.23,1,0.32,1)`, GPU `translateX/Y/scale` strings, capped mascot loops). |
| 2026-06-19 | `20260619-094447` | Dead-end sweep: SpectatorChip `onReserve` wired, Feed/Leaderboard empty-state CTAs, Leaderboard "Today"/"Roster" aliasing removed, Feed retry (3× × 5s n backoff), ErrorBoundary Discord link, photo-upload failure surfaced, queued check-in chip on home, WorldIdVerify/SelfVerify celebrate trust upgrade, wallet auth error cause, SelfVerify 60s polling timeout, PushOptIn "Subscribed" beat, Onboarding lastError recovery, Chat [Lobby \| DM] mode toggle, `markQueuedCheckin`/`clearQueuedCheckin` exposed on `useWorld`. |
| 2026-06-19 | (env-only) | `GAME_LAUNCH_AT` bumped from `2026-06-17T18:00:00Z` (missed) to `2026-07-01T18:00:00Z`. No code change. New seed: `2026-07-01T18:00:00Z:cohort-1:lottery`. |
| 2026-06-19 | `20260619-120552` | World ID custom QR + deep-link card (matches Self visual parity) via `useIDKitRequest`; Onboarding copy tightening (drop contradictory unverified line, "Verify before paying (recommended)" label); Self verify dev copy hidden in production; redundant "I already verified" button removed; cohort count UI rewrites when `reservedCount=0` ("be the first" instead of "0 / 50"); DB cleared of 25 stale free entries that were inflating `reservedCount`. **Deploy note:** tarball must include the `scripts/` directory (not just `dist/`, `src/`, etc.) — `deploy.sh` lives there and the next deploy reads it via the `current` symlink. If you forget, manually `tar -xzf scripts.tar.gz -C /opt/last-human-standing/current` from your local copy before re-running `deploy.sh`. |
| 2026-07-07 | `20260707-191141` | **Engagement mechanics release** + `GAME_LAUNCH_AT` → `2026-07-14T18:00:00Z` (July 1 missed — API was 502ing). Migration 008 (apply FIRST): lethal votes — `close_day()` finalizes verdicts (weighted votes, ≥30% SUS with 3+ votes = flagged), DQs flagged survivors, promotes next-ranked check-ins, settles infiltrator immunity/burn, awards jury tickets, detects the winner; `advance_rounds()` now delegates to it (DRY). Server: jury votes count ×2 for accurate eliminated voters; `/api/feed` public read (infiltrator flag hidden); `ended` phase + `winner` in game state; pushes for survived/verdict/DQ/closing-soon/winner; free-entry rate-limited (3/h/IP); lottery v2 weighted by referrals + jury tickets. Client: `sw.js` finally renders pushes (`push`/`notificationclick` handlers); share-everywhere at the rank reveal (World App `navigator.share` + emoji strip); winner ceremony; Feed polls 30s + spectator reads; Chat de-theatered (no fake E2E/XMTP/verified chips) + browser chat fixed; RoundProvider now actually exposes `isLive` (MissionBoard was rendering null in live phase). Deleted: ExitIntentModal, SurvivalProfile, AIChatbot, AISettingsModal, CelebrationAnimation, useSocial, legacy shadowed `/api/waitlist`. Docs aligned with real mechanics. **Ops:** pm2 process was missing (502 root cause) — restored via `ecosystem.config.cjs` (fork mode); new canonical deploy script `scripts/package-release.sh` (builds locally with server VITE_ vars, ships source-free allowlisted tarball, invokes `deploy.sh`); vote relayer ABI (`contracts/VoteRegistry.json`) now shipped (was missing since June 19 — relayer was silently offline). New seed: `2026-07-14T18:00:00Z:cohort-1:lottery`, algorithm `mulberry32-fy-weighted/v2`. |
| 2026-07-07 | `20260707-195013` | **Pre-launch polish release.** Migrations 009–011 applied. (1) Cap decay: `survival_cap_for_day()` SQL function (25→12→6→3→1) integrated into `advance_rounds()` and server logic — the marketing claim is now real. (2) Round schedule: 5 daily rounds created for July 14–19 with escalating themes (Café → Park → Friend → Bookstore → Sunrise). (3) Streak tracking: `checkin_streak` column, `award_streak_bonuses()` — 3-day streak = +1 jury ticket, 5-day = +3. (4) Wildcard revival: `revive_votes` table + `revive_player()` SQL function + `/api/revive-vote` + `/api/revive-votes` endpoints; triggered automatically after `close_day` on Day 4. (5) Referral cap raised: `TICKET_CAP=5` → `TICKET_CAP_REFERRALS=50` + `TICKET_CAP_JURY=10` — the viral loop is no longer kneecapped. (6) Voting hints: "What to look for" guide above the feed (GPS mismatch, stock/AI photos, no context, generic posts). (7) Mid-day verdict moment: pulsing "Verdicts are landing" banner in the final hour with CTA to the audit feed. (8) Elimination ceremony: survival summary ("You survived X days, Rank #Y of Z"), jury call-to-action card, better share copy. (9) Jury UI: MissionBoard shows jury status, vote accuracy, correct votes, jury ticket count. (10) Onboarding pot display: prize pot prominent on welcome + reserve screens. |
| 2026-07-07 | `20260707-203843` | **Launch-critical fixes release.** Migration 012 applied. (1) Wildcard revival UI (`WildcardPanel.jsx`): jury members see a voting panel on Day 4 with live tallies, one vote per juror, auto-refreshes every 15s. (2) Automatic winner payout: when `close_day` detects a winner, server records the winner, checks for double-payout, fetches Celo prize pool balance, records a pending payout, and attempts the onchain transfer via `ariaBroadcastPayoutTx()`. On success: winner gets push notification with tx hash + broadcast announcement. On failure: payout marked failed, admin notified. New endpoints: `GET /api/payout/status` (public), `POST /api/admin/retry-payout` (admin). Payout status shown in winner ceremony UI with Celoscan link. (3) End-game edge cases: `resolve_no_survivors()` — if everyone gets eliminated (both finalists miss a day), picks the player with the longest check-in streak, then most jury tickets, then earliest reservation. `payouts` table for audit trail. `game_winner` column on rounds. (4) Survival summary in MissionBoard: eliminated players see a 3-stat grid (days survived, streak, top percentile) above the jury card. |
| 2026-07-10 | (pending deploy) | **Focus + mythmaking + spectacle.** Progressive `RuleReveal`; mission-first home; shareable moment cards. **Audit feed spectacle** (full-bleed photos, live tally, big HUMAN/SUS). **Cohort 2 handoff** (`Cohort2Handoff` + `COHORT_2_LAUNCH_AT` in game state). **Theme fairness** notes per theme. |
