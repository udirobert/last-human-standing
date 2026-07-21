// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getEliminationReason } from "../server/lib/eliminationReason.js";

function queryResult(data) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data }),
    maybeSingle: async () => ({ data }),
  };
  return chain;
}

describe("getEliminationReason", () => {
  it("returns no_checkin when player missed the day", async () => {
    const sb = {
      from(table) {
        if (table === "checkins") return queryResult(null);
        if (table === "submissions") return queryResult([]);
        if (table === "rounds") return queryResult({ survival_cap: 25, name: "AT A CAFÉ" });
        throw new Error(`unexpected ${table}`);
      },
    };
    const reason = await getEliminationReason(sb, "0xabc", 2);
    expect(reason?.code).toBe("no_checkin");
  });

  it("returns too_slow when rank exceeds cap", async () => {
    const sb = {
      from(table) {
        if (table === "checkins") return queryResult({ rank: 28, survived: false, dq: false });
        if (table === "submissions") return queryResult([{ status: "verified", is_infiltrator: false }]);
        if (table === "rounds") return queryResult({ survival_cap: 25, name: "AT A PARK" });
        throw new Error(`unexpected ${table}`);
      },
    };
    const reason = await getEliminationReason(sb, "0xabc", 1);
    expect(reason?.code).toBe("too_slow");
    expect(reason?.spotsAway).toBe(3);
  });

  it("returns audit_flagged when submission was flagged", async () => {
    const sb = {
      from(table) {
        if (table === "checkins") return queryResult({ rank: 5, survived: false, dq: true });
        if (table === "submissions") return queryResult([{ status: "flagged", is_infiltrator: false }]);
        if (table === "rounds") return queryResult({ survival_cap: 25, name: "WITH A FRIEND" });
        throw new Error(`unexpected ${table}`);
      },
    };
    const reason = await getEliminationReason(sb, "0xabc", 3);
    expect(reason?.code).toBe("audit_flagged");
  });
});
