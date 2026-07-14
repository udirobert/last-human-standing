-- World App native notification subscriptions
-- Separate from VAPID web-push because World App uses the Developer Portal
-- send-notification API and MiniKit.requestPermission(), not PushManager.
-- Safe to re-run.

create table if not exists public.world_push_subscriptions (
  address text not null primary key references public.users(address) on delete cascade,
  created_at timestamptz not null default now()
);

-- Only the server (service role) can write; users can read their own
alter table public.world_push_subscriptions enable row level security;

-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS, so drop first.
drop policy if exists "world_push_subscriptions_server_only" on public.world_push_subscriptions;

create policy "world_push_subscriptions_server_only"
  on public.world_push_subscriptions
  for all using (false) with check (false);
