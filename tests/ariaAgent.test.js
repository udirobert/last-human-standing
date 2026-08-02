// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getAgentDid,
  getAgentHandle,
  ariaVerifyPhoto,
  ariaBuildPayoutTx,
  ariaSuggestNextRound,
  ariaBuildX402Request,
  ariaRegisterAgent,
} from "../server/lib/ariaAgent.js";

describe("ARIA agent identity", () => {
  it("returns a valid ERC-8004-style DID", () => {
    const did = getAgentDid();
    expect(did).toMatch(/^did:erc8004:/);
    expect(did).toContain("last-human-standing");
  });

  it("returns a non-empty handle", () => {
    expect(getAgentHandle()).toBe("aria-lhs-v1");
  });
});

describe("ARIA photo verification", () => {
  it("rejects when no photo is provided", async () => {
    const result = await ariaVerifyPhoto({});
    expect(result.action).toBe("reject");
    expect(result.suggested_vote).toBe("sus");
  });

  it("flags files smaller than 5KB as suspicious", async () => {
    const result = await ariaVerifyPhoto({
      mediaPath: "/checkins/test.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 3_000,
    });
    expect(result.action).toBe("flag");
    expect(result.reason).toBe("file_too_small");
  });

  it("flags non-image mime types", async () => {
    const result = await ariaVerifyPhoto({
      mediaPath: "/checkins/test.mp4",
      mimeType: "video/mp4",
      sizeBytes: 50_000,
    });
    expect(result.action).toBe("flag");
    expect(result.reason).toBe("invalid_mime");
  });

  it("defers to crowd when no strong signal", async () => {
    const result = await ariaVerifyPhoto({
      mediaPath: "/checkins/photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 200_000,
    });
    expect(result.action).toBe("defer_to_crowd");
    expect(result.suggested_vote).toBeNull();
  });
});

describe("ARIA payout transaction", () => {
  it("builds a valid cUSD payout tx", async () => {
    const tx = await ariaBuildPayoutTx({
      winnerAddress: "0x1234567890abcdef1234567890ABCDEF12345678",
      amountUsd: 4200,
      token: "cUSD",
    });
    expect(tx.to).toBe("0x765DE816845861e75A25fCA122bb6898B8B1282a"); // official mainnet cUSD
    expect(tx.chain).toBe("celo");
    expect(tx.token).toBe("cUSD");
    expect(tx.data).toMatch(/^0xa9059cbb/);
    expect(tx.agentDid).toMatch(/^did:erc8004:/);
  });

  it("throws on invalid winner address", async () => {
    await expect(ariaBuildPayoutTx({ winnerAddress: "not-an-address", amountUsd: 100 })).rejects.toThrow("invalid_winner_address");
  });

  it("throws on missing winner address", async () => {
    await expect(ariaBuildPayoutTx({ amountUsd: 100 })).rejects.toThrow("winner_address_required");
  });
});

describe("ARIA round suggestion", () => {
  it("returns a valid suggestion with day and theme", async () => {
    const suggestion = await ariaSuggestNextRound({ day: 1, previousThemes: [] });
    expect(suggestion.day).toBe(1);
    expect(suggestion.theme).toBeDefined();
    expect(suggestion.survival_cap).toBe(50);
    expect(suggestion.agentDid).toMatch(/^did:erc8004:/);
  });

  it("shrinks survival cap on later days", async () => {
    const d1 = await ariaSuggestNextRound({ day: 1 });
    const d3 = await ariaSuggestNextRound({ day: 3 });
    expect(d1.survival_cap).toBeGreaterThan(d3.survival_cap);
  });

  it("avoids themes used in recent days", async () => {
    const themes = ["AT A CAFÉ", "AT A PARK", "AT A GYM", "WITH A FRIEND", "OUTSIDE AT SUNRISE"];
    const suggestion = await ariaSuggestNextRound({ day: 6, previousThemes: themes });
    expect(themes).not.toContain(suggestion.theme);
  });
});

describe("ARIA x402 payment protocol", () => {
  it("builds a valid x402 request with HTTP 402 semantics", () => {
    const req = ariaBuildX402Request({
      resource: "/api/challenge/create",
      amountUsd: 0.5,
      token: "cUSD",
      recipientAddress: "0x1234567890abcdef1234567890ABCDEF12345678",
    });
    expect(req.x402Version).toBe(1);
    expect(req.scheme).toBe("exact");
    expect(req.network).toBe("celo");
    expect(req.maxAmountRequired).toBe("0.5");
    expect(req.asset).toBe("cUSD");
    expect(req.challengeId).toBeDefined();
    expect(req.resource).toBe("/api/challenge/create");
  });
});

describe("ARIA agent registration", () => {
  const ORIGINAL_KEY = process.env.ARIA_AGENT_KEY;

  afterEach(() => {
    // Restore the ambient ARIA_AGENT_KEY (may be set by the local .env).
    if (ORIGINAL_KEY) process.env.ARIA_AGENT_KEY = ORIGINAL_KEY;
    else delete process.env.ARIA_AGENT_KEY;
  });

  it("returns unconfigured when no agent key is set", async () => {
    delete process.env.ARIA_AGENT_KEY;
    vi.resetModules();
    // Re-import fresh so the module-scope AGENT_SIGNING_KEY is read without a key.
    const fresh = await import("../server/lib/ariaAgent.js");
    const { ariaRegisterAgent } = fresh;
    const result = await ariaRegisterAgent();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_agent_key_configured");
    expect(result.agentDid).toMatch(/^did:erc8004:/);
  });
});
