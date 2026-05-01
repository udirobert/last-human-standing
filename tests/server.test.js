import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../server/supabase.js", () => ({
  getSupabaseAdmin: () => null,
}));

const { app } = await import("../server/index.js");

describe("server hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
