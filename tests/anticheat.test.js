// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkGpsPlausibility,
  checkTimingAnomaly,
  checkVoteRing,
  checkVelocitySpoof,
  haversineMeters,
  flagSubmission,
} from "../server/anticheat.js";

describe("checkGpsPlausibility", () => {
  it("returns null when distance is null (no GPS data)", () => {
    expect(checkGpsPlausibility(null, 50, 100)).toBeNull();
  });

  it("flags zero distance with poor accuracy as suspicious", () => {
    expect(checkGpsPlausibility(0.5, 50, 100)).toBe("gps_zero_with_poor_accuracy");
  });

  it("does not flag accurate distance with good accuracy", () => {
    expect(checkGpsPlausibility(50, 5, 100)).toBeNull();
  });

  it("flags distance > radius * 1.2 as outside radius", () => {
    expect(checkGpsPlausibility(200, 5, 100)).toBe("gps_outside_radius");
  });

  it("does not flag distance just inside radius (with slack)", () => {
    // 100m radius, 110m distance — within 1.2x slack
    expect(checkGpsPlausibility(110, 5, 100)).toBeNull();
  });

  it("flags small distance with poor accuracy (accuracy mismatch)", () => {
    expect(checkGpsPlausibility(1, 100, 200)).toBe("gps_accuracy_mismatch");
  });

  it("does not flag when accuracy is unknown", () => {
    expect(checkGpsPlausibility(50, null, 100)).toBeNull();
  });

  it("treats radiusM <= 0 as no radius check", () => {
    expect(checkGpsPlausibility(500, 5, 0)).toBeNull();
  });
});

describe("checkTimingAnomaly", () => {
  it("returns null when fewer than 2 check-ins for this user", () => {
    const base = new Date("2026-06-04T12:00:00Z").toISOString();
    const recent = [{ address: "0xabc", day: 1, created_at: base }];
    expect(checkTimingAnomaly("0xabc", 1, recent)).toBeNull();
  });

  it("returns null when interval is healthy (>= 30s)", () => {
    const t1 = new Date("2026-06-04T12:00:00Z").toISOString();
    const t2 = new Date("2026-06-04T12:00:35Z").toISOString();
    const recent = [
      { address: "0xabc", day: 1, created_at: t1 },
      { address: "0xabc", day: 1, created_at: t2 },
    ];
    expect(checkTimingAnomaly("0xabc", 1, recent)).toBeNull();
  });

  it("flags rapid recheckin within 30 seconds", () => {
    const t1 = new Date("2026-06-04T12:00:00Z").toISOString();
    const t2 = new Date("2026-06-04T12:00:10Z").toISOString();
    const recent = [
      { address: "0xabc", day: 1, created_at: t1 },
      { address: "0xabc", day: 1, created_at: t2 },
    ];
    expect(checkTimingAnomaly("0xabc", 1, recent)).toBe("rapid_recheckin");
  });

  it("ignores other users' check-ins when computing intervals", () => {
    const t1 = new Date("2026-06-04T12:00:00Z").toISOString();
    const t2 = new Date("2026-06-04T12:00:05Z").toISOString();
    const recent = [
      { address: "0xabc", day: 1, created_at: t1 },
      { address: "0xdef", day: 1, created_at: t2 },
    ];
    expect(checkTimingAnomaly("0xabc", 1, recent)).toBeNull();
  });

  it("uses most recent two of multiple check-ins", () => {
    const t1 = new Date("2026-06-04T11:00:00Z").toISOString();
    const t2 = new Date("2026-06-04T12:00:00Z").toISOString();
    const t3 = new Date("2026-06-04T12:00:10Z").toISOString();
    const recent = [
      { address: "0xabc", day: 1, created_at: t1 },
      { address: "0xabc", day: 1, created_at: t2 },
      { address: "0xabc", day: 1, created_at: t3 },
    ];
    expect(checkTimingAnomaly("0xabc", 1, recent)).toBe("rapid_recheckin");
  });

  it("respects custom minIntervalMs threshold", () => {
    const t1 = new Date("2026-06-04T12:00:00Z").toISOString();
    const t2 = new Date("2026-06-04T12:00:25Z").toISOString();
    const recent = [
      { address: "0xabc", day: 1, created_at: t1 },
      { address: "0xabc", day: 1, created_at: t2 },
    ];
    // 25s interval: too fast for 30s/60s threshold, fast enough for 10s
    expect(checkTimingAnomaly("0xabc", 1, recent, 30_000)).toBe("rapid_recheckin");
    expect(checkTimingAnomaly("0xabc", 1, recent, 10_000)).toBeNull();
    expect(checkTimingAnomaly("0xabc", 1, recent, 60_000)).toBe("rapid_recheckin");

    // 90s interval: passes 30s/60s thresholds
    const t3 = new Date("2026-06-04T12:01:30Z").toISOString();
    const relaxed = [
      { address: "0xabc", day: 1, created_at: t1 },
      { address: "0xabc", day: 1, created_at: t3 },
    ];
    expect(checkTimingAnomaly("0xabc", 1, relaxed, 30_000)).toBeNull();
    expect(checkTimingAnomaly("0xabc", 1, relaxed, 60_000)).toBeNull();
    expect(checkTimingAnomaly("0xabc", 1, relaxed, 120_000)).toBe("rapid_recheckin");
  });
});

describe("checkVoteRing", () => {
  const submissions = [
    { id: 1, status: "verified" },
    { id: 2, status: "verified" },
    { id: 3, status: "flagged" },
    { id: 4, status: "verified" },
    { id: 5, status: "flagged" },
    { id: 6, status: "verified" },
  ];

  it("returns null when fewer than minSamples evaluated", () => {
    const allVotes = [
      { submission_id: 1, voter_address: "0xring", vote: "real" },
      { submission_id: 2, voter_address: "0xring", vote: "real" },
    ];
    expect(checkVoteRing("0xring", 99, allVotes, submissions)).toBeNull();
  });

  it("flags voter who always votes real on finalized submissions", () => {
    const allVotes = [
      { submission_id: 1, voter_address: "0xring", vote: "real" },
      { submission_id: 2, voter_address: "0xring", vote: "real" },
      { submission_id: 4, voter_address: "0xring", vote: "real" },
      { submission_id: 6, voter_address: "0xring", vote: "real" },
      { submission_id: 3, voter_address: "0xring", vote: "real" },
    ];
    expect(checkVoteRing("0xring", 99, allVotes, submissions)).toBe("vote_ring_real_always");
  });

  it("flags voter who always votes fake on flagged submissions", () => {
    const flagged = [
      { id: 1, status: "flagged" },
      { id: 2, status: "flagged" },
      { id: 3, status: "flagged" },
      { id: 4, status: "flagged" },
      { id: 5, status: "flagged" },
    ];
    const allVotes = [
      { submission_id: 1, voter_address: "0xevil", vote: "fake" },
      { submission_id: 2, voter_address: "0xevil", vote: "fake" },
      { submission_id: 3, voter_address: "0xevil", vote: "fake" },
      { submission_id: 4, voter_address: "0xevil", vote: "fake" },
      { submission_id: 5, voter_address: "0xevil", vote: "fake" },
    ];
    expect(checkVoteRing("0xevil", 99, allVotes, flagged)).toBe("vote_ring_fake_always");
  });

  it("does not flag a balanced voter", () => {
    const subs = [
      { id: 1, status: "verified" },
      { id: 2, status: "verified" },
      { id: 3, status: "flagged" },
      { id: 4, status: "verified" },
      { id: 5, status: "flagged" },
    ];
    const allVotes = [
      { submission_id: 1, voter_address: "0xmix", vote: "real" },
      { submission_id: 2, voter_address: "0xmix", vote: "real" },
      { submission_id: 3, voter_address: "0xmix", vote: "fake" },
      { submission_id: 4, voter_address: "0xmix", vote: "real" },
      { submission_id: 5, voter_address: "0xmix", vote: "fake" },
    ];
    expect(checkVoteRing("0xmix", 99, allVotes, subs)).toBeNull();
  });

  it("ignores the submission being voted on (no self-leak)", () => {
    const subs = [
      { id: 1, status: "verified" },
      { id: 2, status: "verified" },
      { id: 3, status: "verified" },
      { id: 4, status: "verified" },
      { id: 5, status: "verified" },
    ];
    const allVotes = [
      { submission_id: 1, voter_address: "0xring", vote: "real" },
      { submission_id: 2, voter_address: "0xring", vote: "real" },
      { submission_id: 3, voter_address: "0xring", vote: "real" },
      { submission_id: 4, voter_address: "0xring", vote: "real" },
      { submission_id: 5, voter_address: "0xring", vote: "real" },
      { submission_id: 99, voter_address: "0xring", vote: "fake" },
    ];
    expect(checkVoteRing("0xring", 99, allVotes, subs)).toBe("vote_ring_real_always");
  });

  it("treats pending submissions as not-yet-evaluable (skipped)", () => {
    const subs = [
      { id: 1, status: "pending" },
      { id: 2, status: "pending" },
      { id: 3, status: "pending" },
      { id: 4, status: "pending" },
      { id: 5, status: "pending" },
    ];
    const allVotes = [
      { submission_id: 1, voter_address: "0xring", vote: "real" },
      { submission_id: 2, voter_address: "0xring", vote: "real" },
      { submission_id: 3, voter_address: "0xring", vote: "real" },
      { submission_id: 4, voter_address: "0xring", vote: "real" },
      { submission_id: 5, voter_address: "0xring", vote: "real" },
    ];
    expect(checkVoteRing("0xring", 99, allVotes, subs)).toBeNull();
  });
});

describe("flagSubmission", () => {
  let supabaseMock;
  beforeEach(() => {
    supabaseMock = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  it("is a no-op when supabase is null", async () => {
    await expect(flagSubmission(null, 1, "reason", {})).resolves.toBeUndefined();
  });

  it("inserts a flag row when supabase is configured", async () => {
    await flagSubmission(supabaseMock, 42, "vote_ring", { voter: "0xabc" });
    expect(supabaseMock.from).toHaveBeenCalledWith("submission_flags");
    expect(supabaseMock.insert).toHaveBeenCalledWith({
      submission_id: 42,
      reason: "vote_ring",
      metadata: { voter: "0xabc" },
    });
  });

  it("defaults metadata to empty object", async () => {
    await flagSubmission(supabaseMock, 7, "gps_outside_radius");
    expect(supabaseMock.insert).toHaveBeenCalledWith({
      submission_id: 7,
      reason: "gps_outside_radius",
      metadata: {},
    });
  });
});

describe("haversineMeters", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineMeters(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it("computes distance between NYC and LA (~3935 km)", () => {
    const d = haversineMeters(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3_900_000);
    expect(d).toBeLessThan(4_000_000);
  });

  it("computes short distance correctly", () => {
    // ~111 km per degree of latitude
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe("checkVelocitySpoof", () => {
  const now = Date.parse("2026-07-29T18:00:00Z");

  it("returns null when prevLat or prevLng is null", () => {
    expect(checkVelocitySpoof(null, null, now, 40.7, -74.0, now + 3600_000)).toBeNull();
  });

  it("returns null when prev coords are not numbers", () => {
    expect(checkVelocitySpoof("abc", "def", now, 40.7, -74.0, now + 3600_000)).toBeNull();
  });

  it("returns null when prevTimeMs is invalid", () => {
    expect(checkVelocitySpoof(40.7, -74.0, "not-a-date", 40.7, -74.0, now + 3600_000)).toBeNull();
  });

  it("returns null when elapsed time is zero or negative (clock skew)", () => {
    expect(checkVelocitySpoof(40.7, -74.0, now, 40.7, -74.0, now)).toBeNull();
    expect(checkVelocitySpoof(40.7, -74.0, now + 1000, 40.7, -74.0, now)).toBeNull();
  });

  it("does not flag plausible travel (NYC to LA over 6 hours)", () => {
    // ~3935 km in 6 hours = ~655 km/h = ~182 m/s, under 300 m/s threshold
    const d = haversineMeters(40.7128, -74.006, 34.0522, -118.2437);
    const speedMs = d / (6 * 3600);
    expect(speedMs).toBeLessThan(300);
    expect(checkVelocitySpoof(40.7128, -74.006, now, 34.0522, -118.2437, now + 6 * 3600_000)).toBeNull();
  });

  it("flags impossible travel (NYC to LA in 1 minute)", () => {
    const result = checkVelocitySpoof(40.7128, -74.006, now, 34.0522, -118.2437, now + 60_000);
    expect(result).toBe("velocity_spoof");
  });

  it("flags impossible travel (NYC to Tokyo in 1 hour)", () => {
    // Tokyo: ~35.6762, 139.6503, distance ~10800 km
    // 10800 km/h = 3000 m/s, far above threshold
    const result = checkVelocitySpoof(40.7128, -74.006, now, 35.6762, 139.6503, now + 3600_000);
    expect(result).toBe("velocity_spoof");
  });

  it("does not flag short-distance movement (walking within a city)", () => {
    // ~1 km in 10 minutes = ~1.67 m/s
    const result = checkVelocitySpoof(40.7128, -74.006, now, 40.7210, -74.0010, now + 600_000);
    expect(result).toBeNull();
  });

  it("respects custom maxSpeedMs threshold", () => {
    // ~111 km in 1 hour = ~30.8 m/s
    // Default threshold (300 m/s) won't flag, but 10 m/s will
    expect(checkVelocitySpoof(0, 0, now, 1, 0, now + 3600_000)).toBeNull();
    expect(checkVelocitySpoof(0, 0, now, 1, 0, now + 3600_000, 10)).toBe("velocity_spoof");
  });

  it("accepts ISO string for prevTimeMs", () => {
    const iso = new Date(now).toISOString();
    expect(checkVelocitySpoof(40.7128, -74.006, iso, 34.0522, -118.2437, now + 60_000)).toBe("velocity_spoof");
  });
});
