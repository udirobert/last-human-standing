-- Multi-provider proof-of-humanity (World ID + Self Protocol)
-- Safe to re-run.

alter table public.users add column if not exists humanity_provider text;
alter table public.users add column if not exists humanity_nullifier text;
alter table public.users add column if not exists humanity_verified_at timestamptz;

-- One verified human per nullifier per cohort (global uniqueness on nullifier when set)
create unique index if not exists users_humanity_nullifier_uidx
  on public.users(humanity_nullifier)
  where humanity_nullifier is not null;

create index if not exists users_humanity_provider_idx
  on public.users(humanity_provider)
  where humanity_provider is not null;
