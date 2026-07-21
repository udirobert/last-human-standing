// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizePhotoHash, checkPhotoDuplicate } from "../server/lib/photoDedup.js";


describe("photoDedup", () => {
  it("normalizes valid sha256 hashes", () => {
    const hash = "a".repeat(64);
    expect(normalizePhotoHash(`  ${hash.toUpperCase()}  `)).toBe(hash);
  });

  it("rejects invalid hashes", () => {
    expect(normalizePhotoHash("not-a-hash")).toBeNull();
    expect(normalizePhotoHash("abc")).toBeNull();
  });

  it("detects duplicate photos from another player", async () => {
    let i = 0;
    const results = [null, { address: "0xother", day: 1 }];
    const chain = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: results[i++] ?? null }),
    };
    const sb = { from: () => chain };
    const result = await checkPhotoDuplicate(sb, {
      photoHash: "b".repeat(64),
      address: "0xplayer",
      day: 2,
    });
    expect(result.duplicate).toBe(true);
    expect(result.reason).toBe("photo_reused_other");
  });
});
