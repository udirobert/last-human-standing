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

// This repo's jsdom resolves storage APIs to undefined (opaque origin),
// so persistence helpers (aiProviders config, returnState, commitReveal
// ballots) throw on any localStorage touch. Provide a minimal in-memory
// Web Storage stand-in for tests that need it — test-only, no prod impact.
class MemoryStorage {
  constructor() { this.store = new Map(); }
  get length() { return this.store.size; }
  key(i) { return [...this.store.keys()][i] ?? null; }
  getItem(k) {
    const v = this.store.get(String(k));
    return v === undefined ? null : v;
  }
  setItem(k, v) { this.store.set(String(k), String(v)); }
  removeItem(k) { this.store.delete(String(k)); }
  clear() { this.store.clear(); }
}
for (const storageKey of ["localStorage", "sessionStorage"]) {
  const existing = globalThis[storageKey];
  if (existing && typeof existing.getItem === "function") continue;
  const mem = new MemoryStorage();
  try {
    Object.defineProperty(globalThis, storageKey, {
      value: mem, writable: true, configurable: true,
    });
  } catch { globalThis[storageKey] = mem; }
  if (typeof window !== "undefined" && window !== globalThis) {
    try {
      Object.defineProperty(window, storageKey, {
        value: globalThis[storageKey], writable: true, configurable: true,
      });
    } catch { /* window keeps its own (broken) binding; globals still work */ }
  }
}
