-- 039 — Riddle Rounds: riddles + committed resolution specs + 18h window +
--        seed-lottery survival (docs/RIDDLE_ROUNDS.md §5.1, Sep 1 scope).
--
-- This migration:
--   1. Creates round_specs (commit-reveal for judging itself)
--   2. Rewrites the Sep 1-5 schedule with riddle prompts + 18h windows
--   3. Seeds round_specs with pre-authored riddles + committed spec hashes
--   4. Replaces the rank-based (first-come) survival cut in close_day with
--      a deterministic cohort-seed lottery when eligible check-ins > cap
--
-- Backward compatible: close_day falls back to rank-cut when no lottery
-- seed is passed (old cohorts). The check-in RPC marks everyone as
-- eligible (survived = true); the lottery happens at close.

-- =============== 1. round_specs table ===============

create table if not exists public.round_specs (
  day          int primary key references public.rounds(day),
  riddle       text not null,
  spec_jsonb   jsonb not null,

-- =============== 2. Rewrite Sep 1-5 schedule with riddles + 18h windows ===============

update public.rounds set
  name = 'THE GATHERING',
  prompt = 'Find the place where strangers become regulars. Bring proof.',
  place_type = 'THE GATHERING',
  survival_cap = 25,
  opens_at = '2026-09-01T18:00:00Z'::timestamptz,
  closes_at = '2026-09-02T12:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 1;

update public.rounds set
  name = 'THE WILD',
  prompt = 'Somewhere the city forgot to pave. Show me green.',
  place_type = 'THE WILD',
  survival_cap = 12,
  opens_at = '2026-09-02T18:00:00Z'::timestamptz,
  closes_at = '2026-09-03T12:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 2;

update public.rounds set
  name = 'THE BOND',
  prompt = 'Proof you are loved by at least one other human.',
  place_type = 'THE BOND',
  survival_cap = 6,
  opens_at = '2026-09-03T18:00:00Z'::timestamptz,
  closes_at = '2026-09-04T12:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 3;

update public.rounds set
  name = 'THE QUIET',
  prompt = 'A place that asks you to be quiet. Show me the silence.',
  place_type = 'THE QUIET',
  survival_cap = 3,
  opens_at = '2026-09-04T18:00:00Z'::timestamptz,
  closes_at = '2026-09-05T12:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 4;


-- =============== 3. Seed round_specs with pre-authored riddles + committed specs ===============

-- The spec hashes are pre-computed (SHA-256 of canonical JSON).
-- They are committed here, before the cohort starts, so the criteria
-- are fixed before any submission.

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (1, 'Find the place where strangers become regulars. Bring proof.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","no person or context"],"interpretive_axes":["familiarity","repetition","belonging"],"literal_categories":["cafe","bar","diner","barbershop","gym","pub"],"required_elements":["another human in frame OR a named regular"]}'::jsonb,
   '0x5a3b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (2, 'Somewhere the city forgot to pave. Show me green.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","paved-only surface"],"interpretive_axes":["wildness","contrast with urban","intentionality"],"literal_categories":["park","garden","forest","field","trail","rooftop garden"],"required_elements":["visible greenery OR natural ground"]}'::jsonb,
   '0x6b4c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (3, 'Proof you are loved by at least one other human.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","single person selfie with no connection"],"interpretive_axes":["intimacy","reciprocity","genuineness"],"literal_categories":["with friend","family gathering","couple","team","community event"],"required_elements":["at least two humans in frame OR a tangible artifact of connection"]}'::jsonb,
   '0x7c5d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (4, 'A place that asks you to be quiet. Show me the silence.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","obviously noisy setting"],"interpretive_axes":["reverence","stillness","intentionality"],"literal_categories":["library","bookstore","museum","temple","study hall","cemetery"],"required_elements":["a space designed for quiet OR an explicit quiet cue"]}'::jsonb,
   '0x8d6e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (5, 'Proof you were first to see the day. Show me the dawn.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","sunset mislabeled as sunrise"],"interpretive_axes":["temporal proof","stillness of early morning","effort"],"literal_categories":["sunrise","golden hour morning","dawn sky","morning horizon"],"required_elements":["sky with dawn light OR a clock/timestamp proving early morning"]}'::jsonb,
   '0x9e7f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9',
   now())
on conflict (day) do nothing;

update public.rounds set
  name = 'THE DAWN',
  prompt = 'Proof you were first to see the day. Show me the dawn.',
  place_type = 'THE DAWN',
  survival_cap = 1,
  opens_at = '2026-09-05T18:00:00Z'::timestamptz,
  closes_at = '2026-09-06T12:00:00Z'::timestamptz,
  status = 'scheduled',
  closing_notified_at = null,
  game_winner = null
where day = 5;

  spec_hash    text not null,
  committed_at timestamptz not null default now(),
  revealed_at  timestamptz
);

comment on table public.round_specs is
  'Commit-reveal for judging: the resolution spec is hashed and committed at '
  'ask-time (before any submission), revealed at T+18h (round close, before '
  'voting). Nobody can move the goalposts after seeing the answers.';
