-- Waitlist signups (capture bounced visitors before they leave).
-- Safe to re-run. Tables are namespaced as `cohort_*` to avoid
-- collision with a legacy `waitlist` table from a previous project.

create table if not exists public.cohort_waitlist (
  id uuid primary key default gen_random_uuid(),
  x_handle text,
  email text,
  source text not null default 'welcome_screen',
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- At least one of x_handle or email must be present.
alter table public.cohort_waitlist
  drop constraint if exists cohort_waitlist_contact_required;
alter table public.cohort_waitlist
  add constraint cohort_waitlist_contact_required
  check (x_handle is not null or email is not null);

-- Light format check on email (we don't need to be perfect, just filter obvious garbage).
alter table public.cohort_waitlist
  drop constraint if exists cohort_waitlist_email_format;
alter table public.cohort_waitlist
  add constraint cohort_waitlist_email_format
  check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- X handle: 1-15 chars, alphanumeric + underscore. No @ prefix stored.
alter table public.cohort_waitlist
  drop constraint if exists cohort_waitlist_handle_format;
alter table public.cohort_waitlist
  add constraint cohort_waitlist_handle_format
  check (x_handle is null or x_handle ~* '^[a-z0-9_]{1,15}$');

create index if not exists idx_cohort_waitlist_created_at
  on public.cohort_waitlist(created_at desc);

-- Idempotency on the same X handle (case-insensitive).
create unique index if not exists uq_cohort_waitlist_x_handle
  on public.cohort_waitlist(lower(x_handle))
  where x_handle is not null;

-- Idempotency on the same email (case-insensitive).
create unique index if not exists uq_cohort_waitlist_email
  on public.cohort_waitlist(lower(email))
  where email is not null;

alter table public.cohort_waitlist enable row level security;

-- Only the server (service role) can read or write. We expose a
-- rate-limited /api/waitlist POST that handles this on the
-- user's behalf.
create policy "cohort_waitlist_server_only"
  on public.cohort_waitlist
  for all using (false) with check (false);

-- Lightweight page-view tracking. One row per /api/track ping.
-- Hashed IP only (sha256, truncated) so we can dedupe without
-- storing the address. No PII. Rate-limited at the API layer
-- (30/hour/IP) so the table doesn't fill with noise.
create table if not exists public.cohort_page_views (
  id uuid primary key default gen_random_uuid(),
  path text,
  referrer text,
  session_id text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cohort_page_views_created_at
  on public.cohort_page_views(created_at desc);
create index if not exists idx_cohort_page_views_path
  on public.cohort_page_views(path);

alter table public.cohort_page_views enable row level security;
create policy "cohort_page_views_server_only"
  on public.cohort_page_views
  for all using (false) with check (false);

