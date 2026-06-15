-- Vote queue for crash-safe onchain vote relaying.
--
-- Replaces the file-based queue (server/.relayer/queue.json) which
-- was not crash-safe: if the process died between readFileSync and
-- writeFileSync, queued votes were lost. With a DB-backed queue the
-- vote insert and queue insert can be atomic (same transaction), and
-- the relayer processes rows by updating a status column rather than
-- deleting them, so crash recovery is automatic.

create table if not exists public.vote_queue (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  submission_id bigint not null,
  voter_address text not null,
  vote text not null check (vote in ('real', 'fake')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  tx_hash text,
  error_message text,
  processed_at timestamptz
);

create index if not exists vote_queue_status_idx on public.vote_queue(status);
create index if not exists vote_queue_created_at_idx on public.vote_queue(created_at);

alter table public.vote_queue enable row level security;

-- Server-only access — no anon reads/writes
drop policy if exists "vote_queue_server_only" on public.vote_queue;
create policy "vote_queue_server_only" on public.vote_queue
  for all using (false) with check (false);

-- Atomic batch claim: updates N pending rows to 'processing' and returns them.
-- Safe for multiple relayer instances — the UPDATE locks rows via the
-- vote_queue_status_idx index and only rows still in 'pending' are claimed.
create or replace function public.claim_vote_queue_batch(p_batch_size int)
returns table (
  id bigint,
  submission_id bigint,
  voter_address text,
  vote text
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
      returning vq.id, vq.submission_id, vq.voter_address, vq.vote
  )
  select * from claimed;
end;
$$;
