// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assessReachability, normalizeEmail, normalizeTelegramUsername } from "../server/lib/reachability.js";

describe("reachability", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  Foo@Bar.com ")).toBe("foo@bar.com");
    expect(normalizeEmail("bad")).toBeNull();
  });

  it("normalizes telegram username", () => {
    expect(normalizeTelegramUsername("@my_user")).toBe("my_user");
    expect(normalizeTelegramUsername("ab")).toBeNull();
  });

  it("requires notifications + contact for browser users", () => {
    const r = assessReachability(
      { contact_email: "a@b.com", platform: "browser" },
      { webPush: true, worldPush: false },
    );
    expect(r.eligible).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("rejects when notifications missing", () => {
    const r = assessReachability(
      { contact_email: "a@b.com", platform: "browser" },
      { webPush: false, worldPush: false },
    );
    expect(r.eligible).toBe(false);
    expect(r.missing).toContain("notifications");
  });

  it("rejects when contact missing on browser", () => {
    const r = assessReachability(
      { platform: "browser" },
      { webPush: true, worldPush: false },
    );
    expect(r.eligible).toBe(false);
    expect(r.missing).toContain("contact");
  });

  it("allows world push without email", () => {
    const r = assessReachability(
      { platform: "world" },
      { webPush: false, worldPush: true },
    );
    expect(r.eligible).toBe(true);
  });

  it("allows telegram bot link without email", () => {
    const r = assessReachability(
      { telegram_user_id: 12345, platform: "browser" },
      { webPush: false, worldPush: false },
    );
    expect(r.eligible).toBe(true);
  });

  it("allows farcaster fid with push as contact", () => {
    const r = assessReachability(
      { farcaster_fid: 99, platform: "farcaster" },
      { webPush: true, worldPush: false },
    );
    expect(r.eligible).toBe(true);
  });
});
