-- Remove Gate 1 dry-run artifacts. Preserves exhibition agents and real signups.
delete from public.votes
 where lower(voter_address) in (
   lower('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
   lower('0x1563915e194D8CfBA1943570603F7606A3115508'),
   lower('0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB')
 )
    or submission_id in (
      select id from public.submissions
       where lower(address) in (
         lower('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
         lower('0x1563915e194D8CfBA1943570603F7606A3115508'),
         lower('0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB')
       )
    );

delete from public.submissions
 where lower(address) in (
   lower('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
   lower('0x1563915e194D8CfBA1943570603F7606A3115508'),
   lower('0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB')
 );

delete from public.checkins
 where lower(address) in (
   lower('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
   lower('0x1563915e194D8CfBA1943570603F7606A3115508'),
   lower('0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB')
 );

delete from public.payouts
 where lower(winner_address) in (
   lower('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
   lower('0x1563915e194D8CfBA1943570603F7606A3115508')
 );

delete from public.cohort_participations
 where lower(address) in (
   lower('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
   lower('0x1563915e194D8CfBA1943570603F7606A3115508'),
   lower('0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB')
 );

delete from public.users
 where lower(address) in (
   lower('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'),
   lower('0x1563915e194D8CfBA1943570603F7606A3115508'),
   lower('0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB')
 )
    or username like 'dryrun_%';

update public.rounds set
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 1;

-- Restore exhibition agents eliminated by accidental dry-run close-day
update public.users
   set eliminated = false,
       eliminated_at_day = null
 where is_agent = true
   and cohort = 1;

update public.cohort_participations
   set eliminated = false,
       eliminated_at_day = null
 where cohort = 1
   and lower(address) in (
     select lower(address) from public.users where is_agent = true and cohort = 1
   );
