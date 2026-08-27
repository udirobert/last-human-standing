-- 039 — Riddle Rounds: riddles + committed resolution specs + 18h window
--        (docs/RIDDLE_ROUNDS.md §2, §5.1, Sep 1 scope).
--
-- This migration:
--   1. Creates round_specs (commit-reveal for judging itself)
--   2. Rewrites the Sep 1-5 schedule with riddle prompts + 18h windows
--   3. Seeds round_specs with pre-authored riddles + committed spec hashes
--
-- The survival lottery lives in 040_lottery_close_day.sql.
--
-- Spec hashes are the SHA-256 of the canonical JSON of each spec, computed
-- by server/lib/riddleSpecs.js computeSpecHash() (recursive key-sorted
-- canonical form). They are committed here, before the cohort starts, so
-- the criteria are fixed before any submission exists. Anyone can verify a
-- revealed spec against its committed hash with verifySpecHash().

-- =============== 1. round_specs table ===============

create table if not exists public.round_specs (
  day          int primary key references public.rounds(day),
  riddle       text not null,
  spec_jsonb   jsonb not null,
  spec_hash    text not null,
  committed_at timestamptz not null default now(),
  revealed_at  timestamptz
);

comment on table public.round_specs is
  'Commit-reveal for judging: the resolution spec is hashed and committed at '
  'ask-time (before any submission), revealed at T+18h (round close, before '
  'voting). Nobody can move the goalposts after seeing the answers.';

-- RLS: enabled with NO policies. The server reads via the service role
-- (bypasses RLS) and exposes only the riddle + spec_hash before reveal,
-- and the full spec after reveal, through /api/game/state. Anon/auth
-- clients cannot read spec_jsonb directly — that is what keeps the
-- commit-reveal honest.
alter table public.round_specs enable row level security;

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

-- =============== 3. Seed round_specs with pre-authored riddles + committed specs ===============

-- spec_jsonb is stored in canonical (key-sorted) form so the committed
-- hash matches computeSpecHash() exactly.

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (1, 'Find the place where strangers become regulars. Bring proof.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","no person or context"],"interpretive_axes":["familiarity","repetition","belonging"],"literal_categories":["cafe","bar","diner","barbershop","gym","pub"],"required_elements":["another human in frame OR a named regular"]}'::jsonb,
   '0x0238fbfb3f72ab5d5502253abc95b12b63c0223fb3144e26a3fa2d803353d31e',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (2, 'Somewhere the city forgot to pave. Show me green.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","paved-only surface"],"interpretive_axes":["wildness","contrast with urban","intentionality"],"literal_categories":["park","garden","forest","field","trail","rooftop garden"],"required_elements":["visible greenery OR natural ground"]}'::jsonb,
   '0x84f93b3147a4e7f6f95314cb59e20b4b7047a57f8c3ea54e45ed89e25aab56e8',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (3, 'Proof you are loved by at least one other human.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","single person selfie with no connection"],"interpretive_axes":["intimacy","reciprocity","genuineness"],"literal_categories":["with friend","family gathering","couple","team","community event"],"required_elements":["at least two humans in frame OR a tangible artifact of connection"]}'::jsonb,
   '0x78aa4fc54c37ca40bfc4eb18fab3e6533964cb69e15a608bc5eb444df2cc3c4a',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (4, 'A place that asks you to be quiet. Show me the silence.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","obviously noisy setting"],"interpretive_axes":["reverence","stillness","intentionality"],"literal_categories":["library","bookstore","museum","temple","study hall","cemetery"],"required_elements":["a space designed for quiet OR an explicit quiet cue"]}'::jsonb,
   '0x75c6985004090c264bf373f714fb61669ed70c590365d0cc76d0e518a9787889',
   now())
on conflict (day) do nothing;

insert into public.round_specs (day, riddle, spec_jsonb, spec_hash, committed_at)
values
  (5, 'Proof you were first to see the day. Show me the dawn.',
   '{"hard_rejects":["stock photo","screenshot","AI-generated","sunset mislabeled as sunrise"],"interpretive_axes":["temporal proof","stillness of early morning","effort"],"literal_categories":["sunrise","golden hour morning","dawn sky","morning horizon"],"required_elements":["sky with dawn light OR a clock/timestamp proving early morning"]}'::jsonb,
   '0x653bf2163bbeea6d4ccd0774235ee4dcb4989f47f960e827ff34bedf6d56046e',
   now())
on conflict (day) do nothing;
