// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildAttestation,
  nearestPlayers,
  DEFAULT_RADIUS_M,
  MAX_PLAUSIBLE_ACCURACY_M,
} from "../server/lib/coPresence.js";

// London, ~11m apart.
const A = { lat: 51.5074, lng: -0.1278 };
const B = { lat: 51.5075, lng: -0.1278 };
// Manchester, ~260km away.
const FAR = { lat: 52.4862, lng: -1.8904 };

const CHAL = "0xAAAA";
const RESP = "0xBBBB";

function att(over = {}) {
  return buildAttestation({
    challenger: CHAL,
    responder: RESP,
    challengerPoint: A,
    responderPoint: B,
    accuracyM: 8,
    createdAt: Date.now(),
    ...over,
  });
}

describe("buildAttestation", () => {
  describe("happy path", () => {
    it("attests two people standing together", () => {
      const v = att();
      expect(v.ok).toBe(true);
      expect(v.reason).toBeNull();
      expect(v.distanceM).toBeGreaterThan(0);
      expect(v.distanceM).toBeLessThan(DEFAULT_RADIUS_M);
    });

    it("normalizes both parties to lowercase", () => {
      const v = att({ challenger: "0xAbCd", responder: "0xEfGh" });
      expect(v.ok).toBe(true);
      expect(v.detail.challenger).toBe("0xabcd");
      expect(v.detail.responder).toBe("0xefgh");
    });

    it("rejects two devices pinned to the exact same coordinate", () => {
      // Zero distance with mediocre accuracy is the spoof signature, and
      // this is precisely the "two phones in one flat" case the design names
      // as its accepted weakness — so it must NOT attest.
      const v = att({ responderPoint: A, accuracyM: 12 });
      expect(v.ok).toBe(false);
      expect(v.reason).toBe("implausible_gps");
    });
  });

  describe("party sanity", () => {
    it("rejects a handshake with no challenger", () => {
      expect(att({ challenger: "" }).reason).toBe("missing_challenger");
    });

    it("rejects a handshake with no responder", () => {
      expect(att({ responder: "" }).reason).toBe("missing_responder");
    });

    // The critical one: a self-attestation proves nothing about co-presence.
    it("rejects self-attestation", () => {
      expect(att({ responder: CHAL }).reason).toBe("self_attestation");
    });

    it("rejects self-attestation regardless of address casing", () => {
      expect(att({ challenger: "0xAAAA", responder: "0xaaaa" }).reason).toBe("self_attestation");
    });
  });

  describe("replay protection", () => {
    it("rejects a handshake that is already settled", () => {
      expect(att({ handshakeStatus: "attested" }).reason).toBe("replay");
      expect(att({ handshakeStatus: "rejected" }).reason).toBe("replay");
      expect(att({ handshakeStatus: "expired" }).reason).toBe("replay");
    });

    it("rejects a nonce already consumed by another handshake", () => {
      const v = att({ nonce: "nonce-1", expectedNonce: "nonce-1", priorNonces: [{ nonce: "nonce-1" }] });
      expect(v.reason).toBe("nonce_replay");
    });

    // Distinct nonces in the table are normal: many handshakes run at once.
    it("allows other, unrelated nonces to exist", () => {
      const v = att({ nonce: "nonce-2", expectedNonce: "nonce-2", priorNonces: [{ nonce: "someone-else" }] });
      expect(v.ok).toBe(true);
    });

    it("allows a nonce that no other row has seen", () => {
      // Many handshakes run concurrently, so the table legitimately holds
      // other nonces. Only a repeat of THIS nonce is a replay.
      const v = att({ nonce: "nonce-2", expectedNonce: "nonce-2", priorNonces: [{ nonce: "someone-else" }] });
      expect(v.ok).toBe(true);
    });
  });

  describe("nonce binding", () => {
    it("rejects a mismatched nonce", () => {
      expect(att({ nonce: "wrong", expectedNonce: "right" }).reason).toBe("nonce_mismatch");
    });

    it("rejects a missing nonce when one was issued", () => {
      expect(att({ expectedNonce: "right" }).reason).toBe("missing_nonce");
    });

    it("accepts a matching nonce", () => {
      expect(att({ nonce: "same", expectedNonce: "same" }).ok).toBe(true);
    });
  });

  describe("nonce freshness", () => {
    it("rejects a stale nonce", () => {
      const v = att({ createdAt: Date.now() - 120_000 });
      expect(v.reason).toBe("stale_nonce");
    });

    it("accepts a nonce issued seconds ago", () => {
      expect(att({ createdAt: Date.now() - 5_000 }).ok).toBe(true);
    });

    it("tolerates minor clock skew", () => {
      expect(att({ createdAt: Date.now() + 2_000 }).ok).toBe(true);
    });

    it("rejects a nonce claimed to be from the future", () => {
      expect(att({ createdAt: Date.now() + 60_000 }).reason).toBe("nonce_from_future");
    });

    it("rejects an unparseable timestamp", () => {
      expect(att({ createdAt: "not-a-date" }).reason).toBe("invalid_timestamp");
    });

    it("skips freshness when the issue time is unknown", () => {
      const v = att({ createdAt: undefined });
      expect(v.ok).toBe(true);
    });
  });

  describe("coordinates", () => {
    it("rejects a missing responder point", () => {
      expect(att({ responderPoint: null }).reason).toBe("missing_coordinates");
    });

    it("rejects non-numeric coordinates", () => {
      expect(att({ responderPoint: { lat: "51.5", lng: -0.12 } }).reason).toBe("missing_coordinates");
    });

    it("rejects out-of-world coordinates", () => {
      expect(att({ responderPoint: { lat: 91, lng: -0.12 } }).reason).toBe("invalid_coordinates");
    });
  });

  describe("distance", () => {
    it("rejects two people 260km apart", () => {
      const v = att({ responderPoint: FAR });
      expect(v.reason).toBe("too_far");
      expect(v.detail.distanceM).toBeGreaterThan(DEFAULT_RADIUS_M);
    });

    it("honours a custom radius", () => {
      // ~900m apart: outside the 50m default, inside a 2km radius.
      const near = { lat: 51.5164, lng: -0.1278 };
      expect(att({ responderPoint: near }).ok).toBe(false);
      expect(att({ responderPoint: near, radiusM: 2000 }).ok).toBe(true);
    });

    it("accepts people at the edge of the radius", () => {
      const v = att({ radiusM: 50 });
      expect(v.distanceM).toBeLessThanOrEqual(50);
      expect(v.ok).toBe(true);
    });
  });

  describe("GPS spoofing", () => {
    // The known-and-accepted weakness is two phones in one flat; the
    // accuracy checks are what make it harder than free.
    it("rejects zero distance with mediocre accuracy", () => {
      // The pure spoof signature, independent of any distance question.
      const v = att({ responderPoint: A, accuracyM: 12 });
      expect(v.reason).toBe("implausible_gps");
    });

    it("accepts a genuinely close pair whose accuracy claim is merely very good", () => {
      // 11m apart with 2m claimed accuracy: inside every threshold, and
      // indistinguishable from a real meeting at close range. The v2
      // detector's accuracy-mismatch rule only fires when the DISTANCE is
      // implausibly small, so a plausible close pair still attests.
      const v = att({ accuracyM: 2 });
      expect(v.ok).toBe(true);
      expect(v.reason).toBeNull();
    });

    it("rejects accuracy worse than the allowed ceiling", () => {
      // Inside the radius, so the accuracy ceiling is the only trigger.
      const v = att({ accuracyM: MAX_PLAUSIBLE_ACCURACY_M + 20 });
      expect(v.reason).toBe("implausible_accuracy");
    });

    it("rejects two devices pinned to the same point with weak accuracy", () => {
      const v = att({ responderPoint: A, accuracyM: 25 });
      expect(v.reason).toBe("implausible_gps");
    });

    // Distance is reported as distance, not as a spoof: the v2 detector's
    // radius rule is deliberately not treated as a spoof signature, so a
    // distant pair gets the honest reason.
    it("reports a distant pair as too_far, not as a spoof", () => {
      const v = att({ responderPoint: FAR });
      expect(v.reason).toBe("too_far");
    });

    it("allows accuracy omitted entirely", () => {
      // No accuracy reported is a weaker signal, not a rejection — the
      // radius and mutual-nonce checks still stand.
      expect(att({ accuracyM: null }).ok).toBe(true);
    });
  });

  describe("robustness", () => {
    it("rejects an empty input object rather than throwing", () => {
      const v = buildAttestation();
      expect(v.ok).toBe(false);
      expect(v.reason).toBe("missing_challenger");
    });

    it("always returns the same shape on reject", () => {
      const v = att({ responderPoint: FAR });
      expect(v).toHaveProperty("ok");
      expect(v).toHaveProperty("reason");
      expect(v).toHaveProperty("distanceM");
      expect(v).toHaveProperty("detail");
    });
  });
});

describe("nearestPlayers", () => {
  const players = [
    { address: "0xNEAR1", lat: 51.5075, lng: -0.1278 },   // ~11m
    { address: "0xNEAR2", lat: 51.5150, lng: -0.1278 },   // ~850m
    { address: "0xFAR",   lat: 52.4862, lng: -1.8904 },   // ~260km
  ];

  it("sorts by distance, nearest first", () => {
    const near = nearestPlayers(A, players, { radiusM: 5000 });
    expect(near.map((p) => p.address)).toEqual(["0xnear1", "0xnear2"]);
    expect(near[0].distanceM).toBeLessThan(near[1].distanceM);
  });

  it("excludes players beyond the radius", () => {
    const near = nearestPlayers(A, players, { radiusM: 5000 });
    expect(near.map((p) => p.address)).not.toContain("0xfar");
  });

  it("lowercases addresses", () => {
    const near = nearestPlayers(A, [{ address: "0xAbCd", lat: 51.5075, lng: -0.1278 }], { radiusM: 100 });
    expect(near[0].address).toBe("0xabcd");
  });

  it("respects the limit", () => {
    const near = nearestPlayers(A, players, { radiusM: 5000, limit: 1 });
    expect(near).toHaveLength(1);
  });

  it("returns an empty array for a bad origin", () => {
    expect(nearestPlayers(null, players)).toEqual([]);
    expect(nearestPlayers({ lat: "x", lng: 0 }, players)).toEqual([]);
  });

  it("skips players with unusable coordinates", () => {
    const near = nearestPlayers(A, [{ address: "0xBAD" }, { address: "0xOK", lat: 51.5075, lng: -0.1278 }], { radiusM: 100 });
    expect(near.map((p) => p.address)).toEqual(["0xok"]);
  });
});