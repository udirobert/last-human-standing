-- Hybrid cohort model: 25 paid (guaranteed) + 25 free (lottery).
-- Adds the bookkeeping columns and the lottery_results table for
-- the deterministic draw at launch. Safe to re-run.
--
-- See docs/ENTRY_MODEL_PLAN.md for the design.

-- =============== Per-entry kind + token ===============
-- entry_kind: 'paid' | 'free' — which bucket the user falls into.
-- entry_token: 'wld' | 'cusd' | 'usdc' | null — which token they paid
--   in. Null for free entries.
-- Backfill: existing users (paid=true) default to 'paid' + 'wld'
--   since the only paid path before this migration was WLD.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name = 'users'
                   and column_name = 'entry_kind') then
    alter table public.users
      add column entry_kind text
      check (entry_kind in ('paid', 'free'));
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name = 'users'
                   and column_name = 'entry_token') then
    alter table public.users
      add column entry_token text
      check (entry_token in ('wld', 'cusd', 'usdc'));
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name = 'users'
                   and column_name = 'cohort') then
    alter table public.users
      add column cohort int;
  end if;
end$$;

-- Backfill: every existing paid user is 'paid' (WLD) in cohort 1.
update public.users
   set entry_kind = 'paid',
       entry_token = 'wld',
       cohort = 1
 where paid = true
   and entry_kind is null;

create index if not exists users_entry_kind_idx
  on public.users(entry_kind)
  where entry_kind is not null;

create index if not exists users_cohort_idx
  on public.users(cohort)
  where cohort is not null;

-- =============== Lottery results ===============
-- One row per cohort draw. The draw is deterministic and
-- replayable from the seed; the drawn array is the canonical
-- record. We store the seed + algorithm version so investors
-- and mentors can verify the draw after the fact.
create table if not exists public.lottery_results (
  id uuid primary key default gen_random_uuid(),
  cohort int not null unique,
  seed text not null,
  algorithm_version text not null,
  free_slots int not null,
  candidates int not null,
  drawn jsonb not null,           -- [{address, username, referral_count, rank}]
  drawn_at timestamptz not null default now(),
  drawn_by text,                  -- 'lazy' (first /api/game/state post-launch) or admin address
  created_at timestamptz not null default now()
);

alter table public.lottery_results enable row level security;

-- Public read so the result is verifiable from any client.
create policy "lottery_results_read"
  on public.lottery_results for select
  using (true);

-- Only the server (service role) writes. No client policy for insert/update/delete.
