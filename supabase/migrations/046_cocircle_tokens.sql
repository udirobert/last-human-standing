-- 046 — Co-presence handshakes and tokens (docs/TOKEN_ROUNDS.md §2).
--
-- The load-bearing table of the whole v3 track. A Token is DIGITAL — never
-- shipped, guarded, or hidden — but its transfer requires physical
-- co-presence: two wallets mutually attesting to each other within a radius,
-- inside a short nonce window, GPS-corroborated.
--
-- This is the inversion that fixes v2's failure. In v2, presence was
-- EVIDENCE (a photo, replicable from any desk), so no incentive could make
-- showing up matter. Here, not-showing-up is structurally unable to obtain
-- the thing people want.

create table if not exists public.handshakes (
  id           bigserial primary key,
  -- The challenger opens the attestation; the responder completes it.
  challenger   text        not null,
  responder    text,
  region_id    text        not null references public.regions(id) on delete cascade,
  sprint_id    bigint      references public.sprints(id) on delete cascade,
  -- Server-issued nonce. Both parties must present the same nonce, and it
  -- must be fresh: this is what makes the attestation mutual and
  -- single-use rather than a replayable "I was there" claim.
  nonce        text        not null,
  status       text        not null default 'pending'
                 check (status in ('pending', 'attested', 'rejected', 'expired')),
  -- Both coordinates are stored as submitted; the server computes distance
  -- and applies the plausibility checks in server/lib/coPresence.js.
  challenger_lat double precision,
  challenger_lng double precision,
  responder_lat  double precision,
  responder_lng  double precision,
  accuracy_m   integer,
  distance_m   integer,
  -- Failure code from buildAttestation (e.g. too_far, stale_nonce,
  -- replay, implausible_gps). Kept so attempts are auditable even on reject.
  reject_reason text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  attested_at  timestamptz
);

comment on table public.handshakes is
  'Mutual proximity attestation. GPS is spoofable in seconds, so this is '
  'MUTUAL: two verified humans must both participate in a fresh nonce '
  'exchange. Raises the cost of cheating from "toggle a setting" to '
  '"coordinate two fraudulent devices in place, in real time".';

create index if not exists handshakes_challenger_idx on public.handshakes (challenger, created_at desc);
create index if not exists handshakes_responder_idx  on public.handshakes (responder, created_at desc);
create index if not exists handshakes_nonce_idx      on public.handshakes (nonce);
-- Partial index for the live nonce-exchange window (see status).
create index if not exists handshakes_pending_idx
  on public.handshakes (expires_at) where status = 'pending';

create table if not exists public.tokens (
  id           bigserial primary key,
  region_id    text        not null references public.regions(id) on delete cascade,
  sprint_id    bigint      references public.sprints(id) on delete set null,
  -- 'live'      = in the world, unheld
  -- 'held'      = someone has it, proven by an attested handshake
  -- 'settled'   = sprint over, history only
  -- 'burned'    = consumed for a payout or unlock
  status       text        not null default 'live'
                 check (status in ('live', 'held', 'settled', 'burned')),
  kind         text        not null default 'primary',
  value_tier   integer     not null default 1,
  holder       text,
  -- Which handshake proved the current possession. Nullable for a live
  -- token that nobody has taken yet.
  held_via_handshake_id bigint references public.handshakes(id) on delete set null,
  created_at   timestamptz not null default now(),
  taken_at     timestamptz,
  -- Tokens are per-region, not global: possession is only meaningful
  -- against the people who could physically contest it.
  unique (region_id, sprint_id, kind)
);

comment on table public.tokens is
  'Digital tokens whose TRANSFER requires co-presence. Value tier is the '
  'future sonar-escalation hook (see TOKEN_ROUNDS.md §4.1).';

create index if not exists tokens_region_status_idx on public.tokens (region_id, status);
create index if not exists tokens_holder_idx on public.tokens (holder) where status = 'held';

create table if not exists public.token_transfers (
  id            bigserial primary key,
  token_id      bigint      not null references public.tokens(id) on delete cascade,
  from_address  text        not null,
  to_address    text        not null,
  region_id     text        not null references public.regions(id) on delete cascade,
  sprint_id     bigint      references public.sprints(id) on delete set null,
  -- The attestation that made this transfer legal. NOT NULL is the whole
  -- point: there is no code path that writes a transfer without a
  -- successfully attested handshake behind it.
  handshake_id  bigint      not null references public.handshakes(id) on delete restrict,
  distance_m    integer,
  created_at    timestamptz not null default now()
);

comment on table public.token_transfers is
  'Immutable transfer history. Every row is backed by an attested '
  'handshake — a transfer with no co-presence proof cannot be written.';

create index if not exists token_transfers_token_idx  on public.token_transfers (token_id, created_at desc);
create index if not exists token_transfers_region_idx on public.token_transfers (region_id, created_at desc);

-- A plain FK only proves a handshake row EXISTS — it would happily accept a
-- handshake that was rejected or expired. The service role bypasses RLS, so
-- without this trigger a bad code path could write a transfer backed by a
-- handshake that never attested. Enforce the STATUS here, in the database,
-- where it cannot be bypassed.
create or replace function public.assert_transfer_handshake_attested()
returns trigger
language plpgsql
as $$
declare
  hs_status text;
  hs_challenger text;
  hs_responder text;
begin
  select status, challenger, responder
    into hs_status, hs_challenger, hs_responder
    from public.handshakes
   where id = new.handshake_id;

  if hs_status is distinct from 'attested' then
    raise exception 'handshake % is not attested (status=%)', new.handshake_id, hs_status
      using errcode = 'check_violation';
  end if;

  -- The handshake must actually involve both parties in this transfer.
  if lower(coalesce(hs_challenger, '')) <> lower(new.from_address)
     or lower(coalesce(hs_responder, '')) <> lower(new.to_address) then
    raise exception 'handshake % does not bind % -> %', new.handshake_id, new.from_address, new.to_address
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transfer_requires_attestation on public.token_transfers;
create trigger trg_transfer_requires_attestation
  before insert on public.token_transfers
  for each row execute function public.assert_transfer_handshake_attested();

comment on function public.assert_transfer_handshake_attested() is
  'Enforces that every token transfer is backed by an ATTESTED handshake '
  'involving both parties. The FK alone only proves the row exists.';

-- RLS: enabled with NO policies (service-role only), matching migration 041.
alter table public.handshakes       enable row level security;
alter table public.tokens          enable row level security;
alter table public.token_transfers enable row level security;