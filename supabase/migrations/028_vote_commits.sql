-- Privacy v1: commit–reveal audit ballots.
-- Salts remain client-held; this table stores the commitment + vote for
-- reveal verification and game finalization. No public RLS policies.

alter table public.rounds
  add column if not exists commit_deadline timestamptz,
  add column if not exists reveal_deadline timestamptz;

create table if not exists public.vote_commits (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cohort int not null,
  round_id bigint not null,
  submission_id bigint not null,
  voter_address text not null,
  vote text not null check (vote in ('real', 'fake')),
  commitment text not null check (commitment ~ '^0x[0-9a-fA-F]{64}$'),
  phase text not null default 'committed' check (phase in ('committed', 'revealed', 'expired')),
  revealed_at timestamptz,
  unique (submission_id, voter_address)
);

create index if not exists vote_commits_round_idx
  on public.vote_commits (cohort, round_id, phase);
create index if not exists vote_commits_submission_idx
  on public.vote_commits (submission_id);

alter table public.vote_commits enable row level security;

-- Server/service-role only — deny anon/authenticated direct access.
drop policy if exists "vote_commits_server_only" on public.vote_commits;
create policy "vote_commits_server_only" on public.vote_commits
  for all using (false) with check (false);

-- Extend onchain queue for commit / reveal jobs.
alter table public.vote_queue
  add column if not exists job_type text not null default 'legacy'
    check (job_type in ('legacy', 'commit', 'reveal')),
  add column if not exists round_id bigint,
  add column if not exists commitment text,
  add column if not exists salt text;

-- claim_vote_queue_batch must return the new columns for the relayer.
-- Postgres forbids CREATE OR REPLACE when OUT/RETURNS TABLE shape changes.
drop function if exists public.claim_vote_queue_batch(int);

create function public.claim_vote_queue_batch(p_batch_size int)
returns table (
  id bigint,
  submission_id bigint,
  voter_address text,
  vote text,
  job_type text,
  round_id bigint,
  commitment text,
  salt text
)
language plpgsql
security definer
as $$
begin
  return query
  with claimed as (
    update public.vote_queue vq
      set status = 'processing'
      where vq.id in (
        select id from public.vote_queue
          where status = 'pending'
          order by id asc
          limit p_batch_size
        for update skip locked
      )
      returning
        vq.id,
        vq.submission_id,
        vq.voter_address,
        vq.vote,
        vq.job_type,
        vq.round_id,
        vq.commitment,
        vq.salt
  )
  select * from claimed;
end;
$$;
