// @vitest-environment node
import { describe, it, expect } from "vitest";
import { valeFiling, valeAlias, valeCaption, VALE_ADDRESS } from "../server/lib/vale.js";

describe("VALE — the live NPC", () => {
  it("uses a fixed well-formed exhibition address", () => {
    expect(VALE_ADDRESS).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it("aliases rotate deterministically by day — VALE never files as VALE", () => {
    expect(valeAlias(3)).toBe(valeAlias(3));
    expect(new Set([1, 2, 3, 4, 5].map(valeAlias)).size).toBeGreaterThan(1);
    expect(valeAlias(1)).not.toMatch(/vale/i);
  });

  it("files +0.003s after the riddle opens — the packet lie", () => {
    const opensAtMs = Date.parse("2026-09-01T18:00:00Z");
    const filing = valeFiling({ day: 2, theme: "THE WILD", opensAtMs, voteQuorum: 10 });
    expect(filing.address).toBe(VALE_ADDRESS);
    expect(Date.parse(filing.created_at) - opensAtMs).toBe(3);
    expect(filing.status).toBe("pending");
    expect(filing.day).toBe(2);
  });

  it("carries clean paper — plausible caption, no self-labeling fields", () => {
    const filing = valeFiling({ day: 1, theme: "THE GATHERING", opensAtMs: Date.parse("2026-09-01T18:00:00Z") });
    expect(filing.caption).toBe(valeCaption(1));
    expect(filing.caption).not.toMatch(/vale|machine|agent|bot/i);
    expect(filing.is_infiltrator).toBe(false);
  });

  it("captions rotate across days", () => {
    expect(new Set([1, 2, 3, 4, 5].map(valeCaption)).size).toBeGreaterThan(1);
  });
});
