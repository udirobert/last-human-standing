// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPushToAddress, broadcastPush, getVapidPublicKey } from "../server/lib/push.js";

describe("push lib", () => {
  beforeEach(() => {
    // Clean env
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_SECRET;
  });

  it("getVapidPublicKey returns null when VAPID_PUBLIC_KEY is not set", () => {
    expect(getVapidPublicKey()).toBeNull();
  });

  it("getVapidPublicKey returns the key when set", () => {
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    expect(getVapidPublicKey()).toBe("test-public-key");
  });

  it("sendPushToAddress is a no-op when VAPID keys are not configured", async () => {
    const result = await sendPushToAddress(
      { from: vi.fn() },
      "0xabc",
      { title: "Test", body: "Hello" },
    );
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("sendPushToAddress is a no-op when supabaseAdmin is null", async () => {
    process.env.VAPID_PUBLIC_KEY = "BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLeszoPShOUXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU";
    process.env.VAPID_SECRET = "sRNGc5XcO6d3tQqiDdsiM9GQsF_zBNVcp6Jsp42p-WQ";
    const result = await sendPushToAddress(null, "0xabc", { title: "Test", body: "Hello" });
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("broadcastPush is a no-op when VAPID keys are not configured", async () => {
    const result = await broadcastPush(
      { from: vi.fn() },
      { title: "Test", body: "Hello" },
    );
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("broadcastPush is a no-op when supabaseAdmin is null", async () => {
    process.env.VAPID_PUBLIC_KEY = "BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLeszoPShOUXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU";
    process.env.VAPID_SECRET = "sRNGc5XcO6d3tQqiDdsiM9GQsF_zBNVcp6Jsp42p-WQ";
    const result = await broadcastPush(null, { title: "Test", body: "Hello" });
    expect(result).toEqual({ sent: 0, failed: 0 });
  });
});

describe("push routes", () => {
  let app;
  let getSupabaseAdminSpy;

  beforeEach(async () => {
    // Reset module cache to pick up fresh env
    vi.resetModules();
    process.env.VAPID_PUBLIC_KEY = "BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLeszoPShOUXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU";
    process.env.VAPID_SECRET = "sRNGc5XcO6d3tQqiDdsiM9GQsF_zBNVcp6Jsp42p-WQ";
    delete process.env.ADMIN_TOKEN;
  });

  it("GET /api/push/vapid-key returns the public key", async () => {
    const { default: pushRoutes } = await import("../server/routes/push.js");
    const express = (await import("express")).default;
    const supertest = (await import("supertest")).default;

    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/push", pushRoutes({
      requireAuth: (req, res, next) => { req.user = { address: "0xtest" }; next(); },
      supabaseAdmin: { from: vi.fn() },
      log: vi.fn(),
    }));

    const resp = await supertest(testApp).get("/api/push/vapid-key");
    expect(resp.status).toBe(200);
    expect(resp.body.publicKey).toMatch(/^B/);
  });

  it("POST /api/push/test requires admin token", async () => {
    const { default: pushRoutes } = await import("../server/routes/push.js");
    const express = (await import("express")).default;
    const supertest = (await import("supertest")).default;

    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/push", pushRoutes({
      requireAuth: (req, res, next) => next(),
      supabaseAdmin: null,
      log: vi.fn(),
    }));

    const resp = await supertest(testApp).post("/api/push/test").send({});
    expect(resp.status).toBe(401);
  });

  it("POST /api/push/test with admin token returns counts", async () => {
    process.env.ADMIN_TOKEN = "secret";
    const { default: pushRoutes } = await import("../server/routes/push.js");
    const express = (await import("express")).default;
    const supertest = (await import("supertest")).default;

    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/push", pushRoutes({
      requireAuth: (req, res, next) => next(),
      supabaseAdmin: null, // no-op fallback
      log: vi.fn(),
    }));

    const resp = await supertest(testApp)
      .post("/api/push/test")
      .set("x-admin-token", "secret")
      .send({});
    expect(resp.status).toBe(200);
    expect(resp.body.ok).toBe(true);
    expect(resp.body.sent).toBe(0);
    expect(resp.body.failed).toBe(0);
  });

  it("POST /api/push/subscribe validates payload shape", async () => {
    const { default: pushRoutes } = await import("../server/routes/push.js");
    const express = (await import("express")).default;
    const supertest = (await import("supertest")).default;

    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/push", pushRoutes({
      requireAuth: (req, res, next) => { req.user = { address: "0xtest" }; next(); },
      supabaseAdmin: { from: vi.fn() },
      log: vi.fn(),
    }));

    // Missing keys
    const resp = await supertest(testApp)
      .post("/api/push/subscribe")
      .send({ endpoint: "https://example.com/push/abc" });
    expect(resp.status).toBe(400);
    expect(resp.body.error).toBe("invalid_subscription");
  });
});
