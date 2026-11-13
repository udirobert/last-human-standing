// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildPacket, formatLatency, packetTell } from "../server/lib/packet.js";

describe("formatLatency", () => {
  const open = Date.parse("2026-09-01T18:00:00Z");

  it("formats the signature sub-second machine latency", () => {
    expect(formatLatency(open + 3, open)).toBe("+0.003s");
  });

  it("formats human-plausible latencies", () => {
    expect(formatLatency(open + 47_000, open)).toBe("+47s");
    expect(formatLatency(open + 12 * 60_000, open)).toBe("+12m");
    expect(formatLatency(open + 3 * 3_600_000, open)).toBe("+3h");
  });

  it("marks pre-open filings", () => {
    expect(formatLatency(open - 1000, open)).toBe("pre-open");
  });

  it("degrades to — when the round never opened on record", () => {
    expect(formatLatency(open + 1000, null)).toBe("—");
    expect(formatLatency(NaN, open)).toBe("—");
  });
});

describe("buildPacket", () => {
  const open = Date.parse("2026-09-01T18:00:00Z");

  it("gives every filing the same four fields", () => {
    const p = buildPacket({ createdAtMs: open + 600_000, opensAtMs: open, hasGeo: true, subCount: 1 });
    expect(Object.keys(p).sort()).toEqual(["hops", "origin", "pkt", "rcpt"]);
    expect(p).toEqual({ pkt: "+10m", origin: "geo", hops: 1, rcpt: "clean" });
  });

  it("reads a no-checkin filing as origin none", () => {
    const p = buildPacket({ createdAtMs: open + 600_000, opensAtMs: open, hasGeo: null, subCount: 1 });
    expect(p.origin).toBe("none");
  });

  it("carries counter flags into rcpt", () => {
    const p = buildPacket({
      createdAtMs: open, opensAtMs: open, hasGeo: true, subCount: 1,
      flagReasons: ["vote_ring_real_always"],
    });
    expect(p.rcpt).toBe("vote_ring_real_always");
  });
});

describe("packetTell — values outside the human distribution", () => {
  const open = Date.parse("2026-09-01T18:00:00Z");
  const packet = (over) => ({
    ...buildPacket({ createdAtMs: open + 600_000, opensAtMs: open, hasGeo: true, subCount: 1 }),
    ...over,
  });

  it("flags the +0.003s filing — the VALE signature", () => {
    expect(packetTell(packet({ pkt: "+0.003s" }))).toContain("pkt");
  });

  it("flags pre-open filings", () => {
    expect(packetTell(packet({ pkt: "pre-open" }))).toContain("pkt");
  });

  it("flags no-checkin filings but not GPS-declined humans", () => {
    expect(packetTell(packet({ origin: "none" }))).toContain("origin");
    expect(packetTell(packet({ origin: "remote" }))).not.toContain("origin");
  });

  it("flags resubmission farming and counter receipts", () => {
    expect(packetTell(packet({ hops: 4 }))).toContain("hops");
    expect(packetTell(packet({ hops: 2 }))).not.toContain("hops");
    expect(packetTell(packet({ rcpt: "velocity_spoof" }))).toContain("rcpt");
  });

  it("returns no tells for an ordinary human filing", () => {
    expect(packetTell(packet({}))).toEqual([]);
  });
});
