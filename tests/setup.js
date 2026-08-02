// Vitest setup — explicitly unset feature-flag env vars so tests don't
// pick them up from the developer's local .env. Tests that need them
// set can do so explicitly via vi.stubEnv.
delete process.env.VITE_ENABLE_SELF;
delete process.env.VITE_ENABLE_IDKIT;
delete process.env.VITE_REQUIRE_WORLD_ID_FOR_VOTING;
delete process.env.VITE_FREE_ENTRY_MODE;
delete process.env.ENABLE_TEST_ROUTES;
delete process.env.ENTRY_CLOSED;
// Pilot containment defaults in server/routes/payment.js disable paid
// entry; legacy payment-verification tests exercise the ENABLED path.
process.env.PAID_ENTRY_ENABLED = "true";
