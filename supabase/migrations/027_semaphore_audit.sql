-- Anonymous Semaphore enrollment and replay protection. Applied only when
-- SEMAPHORE_AUDIT_ENABLED is turned on at the API.
create table if not exists public.semaphore_enrollments (
  cohort int not null,
  address text not null,
  identity_commitment text not null,
  enrolled_at timestamptz not null default now(),
  primary key (cohort, address),
  unique (cohort, identity_commitment)
);

create table if not exists public.semaphore_audit_nullifiers (
  cohort int not null,
  round_id bigint not null,
  submission_id bigint not null,
  nullifier text not null,
  commitment text not null,
  accepted_at timestamptz not null default now(),
  primary key (cohort, round_id, submission_id, nullifier)
);

alter table public.semaphore_enrollments enable row level security;
alter table public.semaphore_audit_nullifiers enable row level security;
