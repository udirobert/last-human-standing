# Server/index.js Audit (P0) — Critical Issues for Cohort 1 Pilot

**Date**: 2026-08-22
**File**: `server/index.js` (4027 lines)
**Status**: Pre-pilot review — findings prioritized by severity

## Critical

### 1. Admin Token in CORS Allowed Headers
**Location**: Line ~642
```js
allowedHeaders: ["Content-Type", "Cookie", "x-admin-token"],
```
**Issue**: The `x-admin-token` header is accepted in CORS preflight responses. While the origin is restricted via the `ALLOWED_ORIGINS` callback, an attacker could send this header to browsers that allow it from permitted origins. The admin token should only be accepted from specific origins or via non-CORS channels (e.g., direct server-to-server).

**Recommendation**: Remove `x-admin-token` from CORS allowed headers unless explicitly needed for browser-based admin UIs. If needed, add origin-specific filtering.

### 2. Double-Vote via Semaphore + Regular Vote
**Location**: `/api/vote` (line ~2050) and `/api/semaphore/signal` (line ~1900)
**Issue**: A player can vote via both the regular `/api/vote` endpoint and the semaphore `/api/semaphore/signal` endpoint for the same submission. The semaphore audit is meant to be an alternative, not additive, but the code doesn't enforce mutual exclusion.

**Recommendation**: Add a check in the semaphore signal handler to reject votes from players who have already voted via the regular `/api/vote` endpoint for the same submission.

## High

### 3. Checkin RPC Result Null Handling
**Location**: Line ~3420
```js
return res.json({ ok: true, rank: data.rank, survived: data.survived, ... });
```
**Issue**: The checkin endpoint accesses `data.rank`, `data.survived`, etc. from the RPC result, but if the RPC returns null or malformed data (e.g., due to a DB error or constraint violation), these accesses could throw a `TypeError: Cannot read properties of null`. While caught by the outer try/catch, the error message is generic.

**Recommendation**: Add explicit null-check:
```js
if (!data) return res.status(500).json({ error: "checkin_rpc_returned_null" });
```

### 4. Balance Cache Race Condition
**Location**: Lines ~184-185 and ~1466-1478
```js
let balanceCache = { value: 0, fetchedAt: 0 };
let celoBalanceCache = { value: null, fetchedAt: 0 };
```
**Issue**: These caches are plain objects updated from concurrent async handlers without any locking. Two concurrent requests could both miss the cache and both try to fetch simultaneously from the blockchain RPC. This wastes RPC bandwidth and could trigger rate limits on the RPC provider.

**Recommendation**: Add a simple in-flight lock:
```js
let balanceCacheFetch = null;
if (!balanceCacheFetch && Date.now() - balanceCache.fetchedAt > 60_000) {
  balanceCacheFetch = fetchWldBalance(...).then(v => { balanceCache.value = v; balanceCacheFetch = null; });
}
await balanceCacheFetch;
```

### 5. Semaphore Signal Race Condition
**Location**: Line ~1920-1940
**Issue**: The nullifier uniqueness check is a separate INSERT with a unique index constraint, but verification happens before insertion. An attacker could submit two signals with the same nullifier simultaneously — both would pass verification (nullifier not yet stored), and only one would fail the unique constraint. The other would be validly stored, effectively double-voting.

**Recommendation**: Use a database-level advisory lock or transaction to prevent concurrent nullifier verification for the same commitment.

## Medium

### 6. GPS Coordinates Logged to Console
**Location**: Line ~3416
```js
log("checkin_rpc", { address: req.user.address, day, gpsShared: hasUserGps, distanceM: distance != null ? Math.round(distance) : null });
```
**Issue**: GPS coordinates and distances are logged to unencrypted log storage (CloudWatch, etc.). While addresses are public keys (not PII), GPS data could be considered sensitive location data.

**Recommendation**: Hash or truncate GPS coordinates before logging, or add a privacy flag to suppress GPS data in logs.

### 7. Jury Board Loads All Votes Without Pagination
**Location**: Line ~2500-2550
**Issue**: The `/api/detective-board` endpoint loads ALL votes from the database without pagination. For a game with 50 players over 5 days with ~8 votes each, that's ~2000 votes — manageable, but if the game scales beyond this, it could be a performance issue.

**Recommendation**: Add pagination or limit the query to recent votes only.

### 8. Rate Limit Storage Can Be Null
**Location**: Line ~620-640
```js
const rateLimitStorage = supabaseAdmin ? { ... } : null;
```
**Issue**: If Supabase is unavailable, the rate limit storage is null. The `rateLimit` middleware may not handle null storage gracefully — could cause crashes under load when the middleware tries to call `.hit()` on null.

**Recommendation**: Add a fallback storage (e.g., in-memory Map) when Supabase is unavailable.

### 9. `/api/revive-vote` Lacks Input Validation
**Location**: Line ~2560
```js
const { candidateAddress, day } = req.body || {};
```
**Issue**: The day parameter is not validated with `ensureNumber`. If `day` is a string or null, `Number(day)` returns NaN, which could cause unexpected behavior in database queries.

**Recommendation**: Use `ensureNumber(body.day, { field: "day", required: true, integer: true })`.

## Low

### 10. Push Notification Failures Silently Swallowed
**Location**: Throughout (e.g., line ~3878)
```js
sendPushToAddress(supabaseAdmin, winnerAddr, {...}).catch(() => {});
```
**Issue**: All `sendPushToAddress` calls use `.catch(() => {})` with no operator visibility. If push delivery fails (invalid FCM token, provider outage), critical notifications (elimination, verdict, payout) are silently lost.

**Recommendation**: Add a failure counter to the log to detect patterns of push delivery failure.

### 11. Endgame Cache TTL 30s
**Location**: Line ~2770
```js
if (Date.now() - endgameCache.fetchedAt < 30_000) return endgameCache.value;
```
**Issue**: For a game that runs in 24-hour days, the 30-second cache means clients may show stale game state for up to 30 seconds after winner determination. Polling happens every 15 seconds, so clients get stale data for up to two polls.

**Recommendation**: Consider reducing to 10-15 seconds for better UX during endgame transitions.

### 12. No Audit Trail for Admin Actions
**Location**: `requireAdmin` function and admin routes
**Issue**: Admin actions (lottery draw, session creation, winner payout override) are logged but not persisted to an audit table. If the log is lost or tampered with, there's no tamper-evident record of admin actions.

**Recommendation**: Add an `admin_audit_log` table with rows written via a database trigger or RPC for all admin actions.
