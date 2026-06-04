# Testing Guide — Last Human Standing

## Running tests

```bash
# Run all tests once
npm run test:run

# Run with coverage report
npm run test:coverage

# Run a single test file
npx vitest run tests/anticheat.test.js
npx vitest run tests/components.test.jsx
npx vitest run tests/config.test.js
npx vitest run tests/onlineStatus.test.jsx
npx vitest run tests/push.test.js
npx vitest run tests/rateLimit.test.js
npx vitest run tests/server.test.js

# Run in watch mode during development
npx vitest
```

## Test files overview

| File | Tests | Focus | Environment |
|------|-------|-------|-------------|
| `tests/server.test.js` | 21 | Express endpoints, payment verification, auth flow, waitlist | `node` |
| `tests/anticheat.test.js` | 23 | Anti-cheat: GPS plausibility, timing anomalies, vote ring detection | `node` |
| `tests/rateLimit.test.js` | 7 | Rate limiter: in-memory fallback, DB-backed storage, window expiry | `node` |
| `tests/components.test.jsx` | 11 | React components: BottomNav (tabs, badges), Countdown (timers, formatting) | `jsdom` |
| `tests/config.test.js` | 11 | AI provider config, humanity provider config, localStorage persistence | `jsdom` |
| `tests/onlineStatus.test.jsx` | 4 | Offline/online tracking, SW queue helper | `jsdom` |
| `tests/push.test.js` | 10 | VAPID push lib (sendToAddress, broadcastPush) + push routes | `node` |

**Total: 87 tests across 7 files**

## Adding a new test

1. Create a file in `tests/` matching the module being tested
2. Add the environment directive on line 1:
   - `// @vitest-environment node` for server-side code (no DOM)
   - `// @vitest-environment jsdom` for React components (needs DOM)
3. Follow vitest conventions:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { myModule } from "../src/path/to/module.js";

describe("myModule", () => {
  it("does the thing", () => {
    expect(myModule()).toBe(expected);
  });
});
```

## Mocking tips

- **Supabase**: Mock at `../server/supabase.js` returning `null` for the admin client
- **RPC/network calls**: Stub `globalThis.fetch` directly (see `tests/server.test.js`)
- **localStorage**: Available in jsdom; use `beforeEach` to reset state
- **Service Worker**: Not available in jsdom — `queueCheckin` rejects when SW absent

## Coverage thresholds

Configured in `vite.config.js` (embedded test config):

- Lines: 50%
- Functions: 50%
- Statements: 50%
- Branches: 40%

To check coverage: `npm run test:coverage` (requires `@vitest/coverage-v8` installed)

## Architecture notes for testing

The server routes use a **dependency-injection pattern**: each route module
(e.g. `server/routes/auth.js`) exports a factory function that takes its dependencies
as an object. This makes it trivial to inject mocks for tests without mocking
entire modules:

```js
const router = authRoutes({
  supabaseAdmin: null,
  requireAuth: (req, res, next) => { req.user = { address: "0xtest" }; next(); },
  log: vi.fn(),
  // ...other deps
});
```
