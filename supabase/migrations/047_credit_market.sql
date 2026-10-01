-- 047 — Closed credit economy and market (docs/TOKEN_ROUNDS.md §6).
--
-- Credits are CLOSED and NON-WITHDRAWABLE. Cash enters the game only at
-- season settlement for podium positions.
--
-- This is the exact boundary that keeps a photo-evidence game from being
-- gamed — applied to an economy instead. No cash-out ever means: no RMT,
-- no bots, no gold-economy death spiral. One rule kills all three.
--
-- Only IRL actions mint credits. The always-on market is the DEMAND side;
-- the co-presence layer is the FAUCET. That link is load-bearing — it is
-- the only reason the 24/7 layer deserves to exist (TOKEN_ROUNDS.md §3.1).

create table if not exists public.credit_ledger (
  id          bigserial primary key,
  address     text        not null,
  region_id   text        not null references public.regions(id) on delete cascade,
  season      integer     not null default 1,
  -- Signed delta. Positive = minted by an IRL action; negative = spent or
  -- escrowed into a market listing.
  amount      integer     not null,
  -- Why this entry exists. ONLY mintable reasons may be positive, and the
  -- award value lives in server/lib/creditLedger.js — one place decides
  -- what an event is worth.
  reason      text        not null check (reason in (
                 'transfer_delivered',   -- took a token in person
                 'transfer_intercepted',  -- completed a contested handoff
                 'sprint_participation',  -- showed up to a sprint
                 'crew_contribution',     -- credited at settlement
                 'season_podium',         -- the ONLY cash-adjacent reason
                 'market_spend',          -- bought a scarce good
                 'market_refund',         -- listing expired/cancelled
                 'market_escrow',         -- locked into a listing
                 'market_payout',         -- received for filling a listing
                 'adjustment'             -- operator correction, audited
               )),
  ref         text,        -- token_id / listing_id / sprint_id as applicable
  created_at  timestamptz not null default now()
);

comment on table public.credit_ledger is
  'Append-only signed credit ledger. Credits are non-withdrawable game '
  'currency; the only cash-adjacent reason is season_podium.';

create index if not exists credit_ledger_address_idx on public.credit_ledger (address, season);
create index if not exists credit_ledger_region_idx   on public.credit_ledger (region_id, created_at desc);
create index if not exists credit_ledger_ref_idx     on public.credit_ledger (ref);

create table if not exists public.market_listings (
  id           bigserial primary key,
  region_id    text        not null references public.regions(id) on delete cascade,
  seller       text        not null,
  -- What is being sold. Scarce goods are ONLY minted by IRL actions, which
  -- is what makes the market a demand channel for the physical game.
  item_kind    text        not null,
  item_ref     text,
  price        integer     not null check (price > 0),
  status       text        not null default 'open'
                 check (status in ('open', 'filled', 'cancelled', 'expired')),
  -- Listings EXPIRE. Time-limited listings create urgency and stop
  -- speculative accumulation of goods nobody will ever use.
  expires_at   timestamptz not null,
  buyer        text,
  filled_at    timestamptz,
  created_at   timestamptz not null default now(),
  check (seller <> buyer)
);

comment on table public.market_listings is
  'Open market for IRL-minted scarce goods. Escrows both sides on fill: the '
  'seller''s credits are locked at listing and moved to the buyer on fill.';

create index if not exists market_listings_open_idx
  on public.market_listings (region_id, price, created_at desc) where status = 'open';
create index if not exists market_listings_seller_idx on public.market_listings (seller, status);

create table if not exists public.season_standings (
  region_id    text    not null references public.regions(id) on delete cascade,
  season       integer not null,
  address      text    not null,
  crew_id      bigint  references public.crews(id) on delete set null,
  score        integer not null default 0,
  credits      integer not null default 0,
  transfers    integer not null default 0,
  sprints_played integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (region_id, season, address)
);

comment on table public.season_standings is
  'Per-region season standings. The cull is gone (TOKEN_ROUNDS.md §5.3), so '
  'this board replaces elimination as the thing people watch. If standings '
  'are invisible, the season board becomes the thing nobody looks at.';

create index if not exists season_standings_rank_idx
  on public.season_standings (region_id, season, score desc);

-- RLS: enabled with NO policies (service-role only), matching migration 041.
-- Public standings reads are served by /api/v3/*, not by direct access.
alter table public.credit_ledger     enable row level security;
alter table public.market_listings   enable row level security;
alter table public.season_standings  enable row level security;