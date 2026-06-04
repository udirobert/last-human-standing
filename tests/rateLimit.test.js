// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "../server/rateLimit.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("rateLimit middleware (in-memory fallback)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  function makeReq(ip = "1.2.3.4") {
    return { ip };
  }

  it("allows requests under the limit", async () => {
    const mw = rateLimit({ keyFn: (r) => `under-test:${r.ip}`, limit: 3, windowMs: 60_000 });
    const next = vi.fn();
    for (let i = 0; i < 3; i++) {
      const req = makeReq();
      const res = mockRes();
      await mw(req, res, next);
    }
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("blocks the (limit+1)-th request with 429 and retryAfterMs", async () => {
    const mw = rateLimit({ keyFn: (r) => `block-test:${r.ip}`, limit: 2, windowMs: 60_000 });
    const next = vi.fn();
    for (let i = 0; i < 2; i++) {
      const req = makeReq();
      const res = mockRes();
      await mw(req, res, next);
    }
    const res4 = mockRes();
    await mw(makeReq(), res4, next);
    expect(res4.statusCode).toBe(429);
    expect(res4.body.error).toBe("rate_limited");
    expect(typeof res4.body.retryAfterMs).toBe("number");
    expect(res4.body.retryAfterMs).toBeGreaterThan(0);
    expect(next).toHaveBeenCalledTimes(2); // not called on the rejected one
  });

  it("uses distinct keys for different IP/address inputs", async () => {
    const keyFn = (r) => `dist-test:${r.address}-${r.ip}`;
    const mw = rateLimit({ keyFn, limit: 1, windowMs: 60_000 });
    const next = vi.fn();
    await mw({ address: "0xA", ip: "1.1.1.1" }, mockRes(), next);
    await mw({ address: "0xB", ip: "2.2.2.2" }, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    const resA = mockRes();
    await mw({ address: "0xA", ip: "1.1.1.1" }, resA, next);
    expect(resA.statusCode).toBe(429);
  });

  it("resets the count once the window expires", async () => {
    // Use a fresh key to avoid bleed from previous tests and module-level buckets
    const keyFn = (r) => `reset-test-${Date.now()}:${r.ip}`;
    const mw = rateLimit({ keyFn, limit: 2, windowMs: 1000 });
    const next = vi.fn();
    await mw(makeReq(), mockRes(), next);
    await mw(makeReq(), mockRes(), next);

    const resBlocked = mockRes();
    await mw(makeReq(), resBlocked, next);
    expect(resBlocked.statusCode).toBe(429);

    // advance past the window — use advanceTimersByTime which also moves Date.now()
    vi.advanceTimersByTime(1500);

    const resAfter = mockRes();
    await mw(makeReq(), resAfter, next);
    expect(resAfter.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(3);
  });
});

describe("rateLimit middleware (shared storage)", () => {
  it("uses storage.hit and falls back to memory on storage error", async () => {
    const failingStorage = {
      hit: vi.fn().mockRejectedValue(new Error("db down")),
    };
    const mw = rateLimit({
      keyFn: (r) => `ip:${r.ip}`,
      limit: 5,
      windowMs: 60_000,
      storage: failingStorage,
    });
    const next = vi.fn();
    // Falls through to in-memory, should still allow requests
    await mw({ ip: "9.9.9.9" }, mockRes(), next);
    await mw({ ip: "9.9.9.9" }, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(failingStorage.hit).toHaveBeenCalled();
  });

  it("uses storage.hit when it succeeds, returns allowed=true", async () => {
    const okStorage = {
      hit: vi.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0 }),
    };
    const mw = rateLimit({
      keyFn: (r) => `ip:${r.ip}`,
      limit: 5,
      windowMs: 60_000,
      storage: okStorage,
    });
    const next = vi.fn();
    await mw({ ip: "8.8.8.8" }, mockRes(), next);
    expect(okStorage.hit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "ip:8.8.8.8", limit: 5, windowMs: 60_000 }),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 429 with retryAfterMs when storage says not allowed", async () => {
    const blockedStorage = {
      hit: vi.fn().mockResolvedValue({ allowed: false, retryAfterMs: 1234 }),
    };
    const mw = rateLimit({
      keyFn: (r) => `ip:${r.ip}`,
      limit: 5,
      windowMs: 60_000,
      storage: blockedStorage,
    });
    const res = mockRes();
    const next = vi.fn();
    await mw({ ip: "7.7.7.7" }, res, next);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: "rate_limited", retryAfterMs: 1234 });
    expect(next).not.toHaveBeenCalled();
  });
});
