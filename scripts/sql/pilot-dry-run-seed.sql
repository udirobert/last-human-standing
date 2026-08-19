-- Operator dry-run fixtures (Gate 1). Idempotent upsert; cleaned by pilot-dry-run-cleanup.sql
-- Addresses are EIP-55 checksummed (must match viem session addresses).
insert into public.users (
  address, username, paid, cohort, entry_kind, world_id_verified,
  humanity_verified_at, verified_human, reserved_at
) values
  (
    '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
    'dryrun_alpha', true, 1, 'free', true,
    now(), true, now()
  ),
  (
    '0x1563915e194D8CfBA1943570603F7606A3115508',
    'dryrun_beta', true, 1, 'free', true,
    now(), true, now()
  ),
  (
    '0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB',
    'dryrun_unverified', true, 1, 'free', false,
    null, false, now()
  )
on conflict (address) do update set
  username = excluded.username,
  paid = excluded.paid,
  cohort = excluded.cohort,
  entry_kind = excluded.entry_kind,
  world_id_verified = excluded.world_id_verified,
  humanity_verified_at = excluded.humanity_verified_at,
  verified_human = excluded.verified_human,
  eliminated = false,
  eliminated_at_day = null,
  immunity_until_day = null,
  reserved_at = coalesce(public.users.reserved_at, excluded.reserved_at);

insert into public.cohort_participations (cohort, address)
values
  (1, '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
  (1, '0x1563915e194D8CfBA1943570603F7606A3115508'),
  (1, '0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB')
on conflict (cohort, address) do update set
  eliminated = false,
  eliminated_at_day = null,
  immunity_until_day = null,
  checkin_streak = 0,
  last_checkin_day = null,
  revived = false;
