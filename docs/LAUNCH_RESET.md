# Launch reset — pre-flight SQL

Run before 2026-06-14 14:00 UTC. Idempotent. Safe to re-run.

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

## Verify the migration ran

```sql
-- entry_kind column must exist
select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'users'
   and column_name in ('entry_kind', 'entry_token', 'cohort');
```

Expected: 3 rows.

## Verify the lottery_results table exists

```sql
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name = 'lottery_results';
```

Expected: 1 row.

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
