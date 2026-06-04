-- Push notification subscriptions
-- Safe to re-run.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  address text not null references public.users(address) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_address
  on public.push_subscriptions(address);

alter table public.push_subscriptions enable row level security;

-- Only the server (service role) can write; users can read their own
create policy "push_subscriptions_server_only"
  on public.push_subscriptions
  for all using (false) with check (false);
