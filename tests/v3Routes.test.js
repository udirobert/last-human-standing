// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// GAME_V3_ENABLED is read at module scope in server/index.js, so it must be
// set before the app is imported. v3 is OFF here: the point of this file is
// that the flag genuinely closes the surface.
process.env.GAME_V3_ENABLED = "false";

vi.mock("../server/supabase.js", () => ({
  getSupabaseAdmin: () => null,
}));

const { app } = await import("../server/index.js");

/**
 * The v3 track must be completely invisible while GAME_V3_ENABLED is false.
 * A half-mounted track is worse than an absent one: it would shadow v2 routes
 * and give operators a false picture of what is live.
 */
describe("v3 route gating (GAME_V3_ENABLED=false)", () => {
  const v3Paths = [
    "/api/v3/regions",
    "/api/v3/sprints/current",
    "/api/v3/standings?region=emea",
    "/api/v3/crews?region=emea",
    "/api/v3/market?region=emea",
  ];

  for (const path of v3Paths) {
    it(`hides GET ${path}`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("v3_not_enabled");
    });
  }

  const v3Writes = [
    ["/api/v3/cocircle/challenge", { regionId: "emea", lat: 51.5, lng: -0.12 }],
    ["/api/v3/cocircle/respond", { handshakeId: 1, nonce: "n", lat: 51.5, lng: -0.12 }],
    ["/api/v3/cocircle/transfer", { tokenId: 1, toAddress: "0xb", handshakeId: 1 }],
    ["/api/v3/crews", { regionId: "emea", name: "Test Crew" }],
    ["/api/v3/crews/1/join", {}],
    ["/api/v3/crews/1/leave", {}],
    ["/api/v3/market/listings", { regionId: "emea", itemKind: "badge", price: 5 }],
    ["/api/v3/market/listings/1/fill", {}],
    ["/api/v3/market/listings/1/cancel", {}],
  ];

  for (const [path, body] of v3Writes) {
    it(`blocks POST ${path} before auth even runs`, async () => {
      // 404 (not 401) proves the gate runs BEFORE requireAuth — the route
      // does not exist at all from the outside.
      const res = await request(app).post(path).send(body);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("v3_not_enabled");
    });
  }

  it("does not shadow v2 routes", async () => {
    // The v2 surface must be completely unaffected by the v3 mount.
    const nonce = await request(app).post("/api/nonce");
    expect(nonce.status).toBe(200);

    const removed = await request(app).post("/api/dev/login");
    expect(removed.status).toBe(404);
  });

  it("still serves the health endpoint", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});