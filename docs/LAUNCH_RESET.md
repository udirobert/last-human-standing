# Launch reset — pre-flight SQL

Run before **2026-07-29 18:00 UTC**. Idempotent. Safe to re-run.

> **Re-launch context.**
> - **2026-06-15** — June 14 empty draw; bumped to Jun 17.
> - **2026-07-17** — Jul 18 prep; ghost profiles cleared.
> - **2026-07-22** — Jul 18 launch ran with 1 signup and 0
>   check-ins; lottery drew `[]` on Jul 19. Migrations **023**
>   (round bump) + **024** (cohort reset) + `GAME_LAUNCH_AT=
>   2026-07-29T18:00:00Z` restore prelaunch. Run:
>   `bash scripts/relaunch-prep.sh [--update-env]`

## Clear stale dev-session cohort data

The `users` table contains 5 dev-session entries from April/May
2026 with `paid=true, eliminated=true, referral_count=0`. These
were test wallets, not real signups, and they show up on the
welcome card as "5 of 50 humans joined" — which is misleading to
investors reviewing the launch.

```sql
-- Stale-data gate: only delete users who are paid AND eliminated
-- AND have been silent for 30+ days AND have no referral activity.
-- Anything else (live signups, recent reservations) is preserved.
delete from public.users
 where paid = true
   and eliminated = true
   and last_seen_at < now() - interval '30 days'
   and referral_count = 0;
```

Expected result: 5 rows deleted.

## Clear stale lottery draw (required on re-launch)

If a prior launch already drew (even with an empty cohort), delete
the row so the lazy draw can fire again with the new seed:

```sql
delete from public.lottery_results where cohort = 1;
```

Or apply migration `024_cohort1_relaunch_reset.sql` (includes this
plus check-in/vote cleanup and elimination reset).

## Reset game-progress state (between cohorts / re-launches)

The lethal-votes release (migration 008) added per-game state that
must be zeroed before a fresh cohort, or verdicts and immunity leak
across games:

```sql
update public.users
   set eliminated = false,
       eliminated_at_day = null,
       immunity_until_day = null
 where paid = true;
-- jury_tickets intentionally NOT reset: they are the cross-cohort
-- reward (lottery weight in the next draw). Zero them only on a
-- full wipe: update public.users set jury_tickets = 0;
```

### Also reset cohort_participations (migration 026+)

If the `cohort_participations` table exists (migration 026+), reset
per-cohort state there too. The trigger syncs `users.*` automatically:

```sql
update public.cohort_participations
   set eliminated = false,
       eliminated_at_day = null,
       immunity_until_day = null,
       checkin_streak = 0,
       last_checkin_day = null,
       revived = false
 where cohort = 1;
```

## Verify the migration ran

```sql
-- entry_kind column must exist
select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'users'
   and column_name in ('entry_kind', 'entry_token', 'cohort');

-- 008 columns must exist
select column_name
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'users' and column_name in ('immunity_until_day', 'jury_tickets'))
     or (table_name = 'votes' and column_name = 'weight')
     or (table_name = 'checkins' and column_name = 'dq')
     or (table_name = 'rounds' and column_name = 'closing_notified_at'));
```

Expected: 3 rows, then 5 rows.

## Verify the lottery_results table exists

```sql
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name = 'lottery_results';
```

Expected: 1 row.

## Verify the waitlist + page-view tables exist (005_waitlist)

```sql
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('cohort_waitlist', 'cohort_page_views');
```

Expected: 2 rows. Both are namespaced with `cohort_` to avoid
collision with a legacy `waitlist` table from a previous project.
The waitlist powers the "Notify me when cohort 1 launches"
card on the welcome screen; the page-views table records every
`/api/track` ping (hashed IP, no PII).

## Verify the lazy-draw gating is wired

The `/api/lottery/status` response should include:

```bash
curl -s https://lasthumanstanding.thisyearnofear.com/api/lottery/status
```

Look for:
- `minCandidates`: 10 (the floor before the draw fires)
- `maxDelayHours`: 6 (the max delay past T-0)
- `nextDrawAt`: ISO timestamp of the earlier of the two triggers
- `status: "scheduled"` (phase is still prelaunch)

If `nextDrawAt` is null but `status` is `"pending"`, you're
between T-0 and the gating fire — that's the normal held state.

## Sanity check the public roster before launch

```sql
select entry_kind, count(*)
  from public.users
 where paid = true
 group by entry_kind;
```

Expected before launch: a small number of `paid` rows (real
testnet entries), and ideally 0 `free` rows until launch.

## Roll back if needed

```sql
-- To undo the cohort reset (preserves real data):
-- 1. Restore from supabase backup
-- 2. Or re-insert manually from your own audit log
```
