-- Last Human Standing (hackathon) schema
-- Apply this in Supabase SQL editor.

create table if not exists public.users (
  address text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  paid boolean not null default false,
  world_id_verified boolean not null default false
);

create table if not exists public.submissions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  address text not null,
  username text,
  day int not null,
  theme text not null,
  caption text not null default '',
  message text not null,
  signature text not null,
  media_path text,
  vote_quorum int,
  status text not null default 'pending'
);

create index if not exists submissions_day_idx on public.submissions(day);
create index if not exists submissions_created_at_idx on public.submissions(created_at desc);
create index if not exists submissions_address_idx on public.submissions(address);

create table if not exists public.votes (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  submission_id bigint not null references public.submissions(id) on delete cascade,
  voter_address text not null,
  vote text not null check (vote in ('real', 'fake'))
);

create unique index if not exists votes_unique_voter_per_submission
  on public.votes(submission_id, voter_address);

create index if not exists votes_submission_id_idx on public.votes(submission_id);

-- Optional: enable RLS later. For hackathon speed we keep it open and rely on server-side key.
-- alter table public.submissions enable row level security;
-- alter table public.votes enable row level security;
