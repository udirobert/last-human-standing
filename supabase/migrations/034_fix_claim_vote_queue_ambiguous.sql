-- 034 — Fix ambiguous column in claim_vote_queue_batch.
--
-- The function's RETURNS TABLE OUT params (id, submission_id, …) are in
-- scope as plpgsql variables, so the bare `id` / `order by id` in the
-- inner candidate subquery is ambiguous with public.vote_queue.id:
-- every claim fails with 'column reference "id" is ambiguous' and the
-- onchain vote queue stalls (spammed prod logs every ~15s).
--
-- Fix: alias the inner subquery and qualify every reference. OUT param
-- names are unchanged (they ARE the JSON keys PostgREST returns).
-- Idempotent — safe to re-run.

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
        select cand.id from public.vote_queue cand
          where cand.status = 'pending'
          order by cand.id asc
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
  select claimed.id, claimed.submission_id, claimed.voter_address,
         claimed.vote, claimed.job_type, claimed.round_id,
         claimed.commitment, claimed.salt from claimed;
end;
$$;
