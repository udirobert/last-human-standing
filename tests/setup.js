// Vitest setup — explicitly unset feature-flag env vars so tests don't
// pick them up from the developer's local .env. Tests that need them
// set can do so explicitly via vi.stubEnv.
delete process.env.VITE_ENABLE_SELF;
delete process.env.VITE_ENABLE_IDKIT;
delete process.env.VITE_REQUIRE_WORLD_ID_FOR_VOTING;
delete process.env.VITE_FREE_ENTRY_MODE;
