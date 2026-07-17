-- 021 — Agent participation foundation (Turing-test arena)
-- Feature-flagged off by default (AGENTS_ENABLED=false in server env).
-- Schema + slot config only — no live agents until the flag is flipped.

-- Competing agents on the users table (not ARIA ops agent)
alter table public.users add column if not exists is_agent boolean not null default false;
alter table public.users add column if not exists agent_tier text;
alter table public.users add column if not exists agent_entry_fee_usd numeric(12, 2);
alter table public.users add column if not exists agent_provider text;

-- Explicit humanity flag for end-game reveal (synced from World ID / Self)
alter table public.users add column if not exists verified_human boolean;
alter table public.users add column if not exists verified_at timestamptz;

-- Backfill verified_human from existing PoH columns
update public.users
set
  verified_human = true,
  verified_at = coalesce(humanity_verified_at, verified_at, now())
where
  verified_human is null
  and (
    world_id_verified = true
    or humanity_nullifier is not null
    or humanity_verified_at is not null
  );

create index if not exists users_is_agent_idx
  on public.users(is_agent)
  where is_agent = true;

create index if not exists users_verified_human_idx
  on public.users(verified_human)
  where verified_human = true;

-- Per-entry x402 payment ledger for agents (pot contributions)
create table if not exists public.agent_entries (
  id uuid primary key default gen_random_uuid(),
  agent_address text not null references public.users(address) on delete cascade,
  cohort int not null default 1,
  day int,
  payment_intent_id text,
  amount_usd numeric(12, 2) not null,
  tier text,
  created_at timestamptz not null default now()
);

create index if not exists agent_entries_agent_address_idx
  on public.agent_entries(agent_address);

create index if not exists agent_entries_cohort_idx
  on public.agent_entries(cohort);

-- Cohort-level agent seat config (admin-tunable; env is the runtime override)
create table if not exists public.game_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.game_config (key, value) values
  ('max_agent_ratio', '0.25'::jsonb),
  ('min_agent_count', '5'::jsonb),
  ('agents_enabled', 'false'::jsonb)
on conflict (key) do nothing;
