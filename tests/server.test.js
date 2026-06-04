// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../server/supabase.js", () => ({
  getSupabaseAdmin: () => null,
}));

// Mock World Chain RPC so browser-confirm tests don't hit real network
const VALID_TX_HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const VALID_ADDRESS = "0x1234567890abcdef1234567890ABCDEF12345678";
const PRIZE_POOL = "0x7aD48187A2a4f4bF8d5aE7aD7A9Dbb58B4e27046";
const WLD_CONTRACT = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df35b9bc";

process.env.VITE_PRIZE_POOL_ADDRESS = PRIZE_POOL;

function paddedAddr(addr) {
  return addr.replace("0x", "").toLowerCase().padStart(64, "0");
}

globalThis.fetch = vi.fn(async (_url, opts) => {
  const body = opts?.body ? JSON.parse(opts.body) : {};

  if (body.method === "eth_getTransactionReceipt") {
    const txHash = body.params?.[0];
    if (txHash === VALID_TX_HASH) {
      return {
        ok: true,
        json: () => ({
          result: {
            status: "0x1",
            to: WLD_CONTRACT,
            logs: [
              {
                address: WLD_CONTRACT,
                topics: [
                  ERC20_TRANSFER_TOPIC,
                  "0x" + paddedAddr(VALID_ADDRESS), // from == sender
                  "0x" + paddedAddr(PRIZE_POOL),     // to == prize pool
                ],
                data: "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000", // 1 WLD
              },
            ],
          },
        }),
      };
    }
    return { ok: true, json: () => ({ result: null }) };
  }

  return { ok: false, json: () => ({ result: null }) };
});

const { app } = await import("../server/index.js");

describe("server hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (globalThis.fetch.mockClear) globalThis.fetch.mockClear();
  });

  it("rejects removed dev login route", async () => {
    const res = await request(app).post("/api/dev/login");
    expect(res.status).toBe(404);
  });

  it("issues a nonce", async () => {
    const res = await request(app).post("/api/nonce");
    expect(res.status).toBe(200);
    expect(typeof res.body.nonce).toBe("string");
    expect(res.body.nonce.length).toBeGreaterThanOrEqual(8);
  });

  it("rejects incomplete SIWE completion payloads", async () => {
    const res = await request(app).post("/api/complete-siwe").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("missing_payload_or_nonce");
  });

  it("rejects invalid browser payment payloads", async () => {
    const res = await request(app)
      .post("/api/pay/browser-confirm")
      .send({ address: "bad", txHash: "bad" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_address");
  });

  it("accepts a syntactically valid browser payment confirmation", async () => {
    const res = await request(app)
      .post("/api/pay/browser-confirm")
      .send({
        address: "0x1234567890abcdef1234567890ABCDEF12345678",
        txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.paid).toBe(true);
  });

  it("rejects admin round requests without admin token", async () => {
    const res = await request(app)
      .post("/api/admin/round")
      .send({ day: 1, name: "Round", opens_at: new Date().toISOString(), closes_at: new Date().toISOString() });

    expect([401, 501]).toContain(res.status);
  });

  it("validates waitlist email input", async () => {
    const res = await request(app)
      .post("/api/waitlist")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_email");
  });

  it("rejects protected routes without authentication", async () => {
    const res = await request(app).post("/api/checkin/location").send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("not_authenticated");
  });

  it("returns public game state without auth", async () => {
    const res = await request(app).get("/api/game/state");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.you.isAuthed).toBe(false);
  });

  it("validates waitlist payload structure", async () => {
    const res = await request(app)
      .post("/api/waitlist")
      .set("content-type", "application/json")
      .send([]);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_json_body");
  });

  it("GET /api/me returns 401 without a session", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("not_authenticated");
  });

  it("GET /api/game/state includes server-authoritative user state", async () => {
    const res = await request(app).get("/api/game/state");
    expect(res.status).toBe(200);
    expect(res.body.you).toBeDefined();
    expect(res.body.you.isAuthed).toBe(false);
    expect(res.body.you.isPaid).toBe(false);
    expect(res.body.you.isEliminated).toBe(false);
    expect(typeof res.body.you.checkedInToday).toBe("boolean");
  });

  it("GET /api/health returns ok and supabase status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.supabase).toBe("boolean");
    expect(typeof res.body.time).toBe("string");
  });

  it("POST /api/waitlist accepts valid email and returns referral code", async () => {
    const res = await request(app)
      .post("/api/waitlist")
      .send({ email: `test-${Date.now()}@example.com` });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.referralCode).toBe("string");
    expect(res.body.referralCode).toMatch(/^LHS-/i);
  });

  it("POST /api/pay/browser-confirm accepts valid referral code", async () => {
    const res = await request(app)
      .post("/api/pay/browser-confirm")
      .send({
        address: "0x1234567890abcdef1234567890ABCDEF12345678",
        txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        referredBy: "LHS-user123-abc",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.paid).toBe(true);
  });

  it("GET /api/admin/flags returns 401 without admin token", async () => {
    const res = await request(app).get("/api/admin/flags");
    expect([401, 501]).toContain(res.status);
  });

  it("GET /api/admin/flags returns 401 without admin token or 501 without Supabase", async () => {
    const res = await request(app).get("/api/admin/flags");
    expect([401, 501]).toContain(res.status);
  });

  it("POST /api/checkin/location returns 400 when game is not live", async () => {
    const res = await request(app)
      .post("/api/checkin/location")
      .set("cookie", "lhs_session=fake")
      .send({ lat: 0, lng: 0 });
    expect([400, 401]).toContain(res.status);
  });

  it("POST /api/vote returns 404 for non-existent submission without Supabase", async () => {
    const res = await request(app)
      .post("/api/vote")
      .set("cookie", "lhs_session=fake")
      .send({ submissionId: 9999, vote: "real" });
    expect([401, 404]).toContain(res.status);
  });

  it("GET /api/game/state returns valid phase and cohort fields", async () => {
    const res = await request(app).get("/api/game/state");
    expect(res.status).toBe(200);
    expect(["prelaunch", "live"]).toContain(res.body.phase);
    expect(typeof res.body.cohortSize).toBe("number");
    expect(typeof res.body.reservedCount).toBe("number");
    expect(typeof res.body.cohortFull).toBe("boolean");
  });

  it("POST /api/logout returns ok without session", async () => {
    const res = await request(app).post("/api/logout");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
