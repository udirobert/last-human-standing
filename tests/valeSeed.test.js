// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { seedVale, VALE_ADDRESS } from "../server/lib/vale.js";

/**
 * Chainable Supabase fake — records every call, returns canned rows per
 * (table, terminal) so the seed sequence can be asserted end-to-end.
 */
function makeFakeSupabase({ existing = [] } = {}) {
  const calls = [];
  const chain = (table) => {
    const state = { table, filters: [] };
    const api = {
      select: (cols) => { calls.push({ table, op: "select", cols }); return api; },
      eq: (col, val) => { state.filters.push([col, val]); return api; },
      in: (col, vals) => { state.filters.push([col, vals]); return api; },
      lte: (col, val) => { state.filters.push([col, val]); return api; },
      order: () => api,
      limit: () => api,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: undefined,
    };
    // select chains resolve at await time — make api thenable
    api.then = (resolve) => resolve({ data: table === "submissions" ? existing : [], error: null });
    api.insert = (row) => {
      calls.push({ table, op: "insert", row });
      return {
        select: () => ({
          single: async () => ({ data: { id: 42 }, error: null }),
        }),
      };
    };
    api.upsert = (row, opts) => {
      calls.push({ table, op: "upsert", row, opts });
      return Promise.resolve({ error: null });
    };
    return api;
  };
  return {
    calls,
    from: (table) => chain(table),
    rpc: (name, args) => {
      calls.push({ op: "rpc", name, args });
      return Promise.resolve({ data: null, error: null });
    },
  };
}

const ROUND = { day: 3, name: "THE WILD", opens_at: "2026-09-03T18:00:00Z", closes_at: "2026-09-04T18:00:00Z" };

describe("seedVale — live-DB interaction shape", () => {
  let sb;
  beforeEach(() => { sb = makeFakeSupabase(); });

  it("files once: user upsert → cohort seat → submission insert", async () => {
    const result = await seedVale(sb, { round: ROUND, day: 3, cohort: 1, voteQuorum: 10 });
    expect(result.seeded).toBe(true);
    expect(result.submissionId).toBe(42);

    const ops = sb.calls.map((c) => `${c.table ?? c.name}:${c.op}`);
    expect(ops).toContain("users:upsert");
    expect(ops).toContain("ensure_cohort_participation:rpc");
    expect(ops).toContain("submissions:insert");

    const upsert = sb.calls.find((c) => c.table === "users" && c.op === "upsert");
    expect(upsert.row.address).toBe(VALE_ADDRESS);
    expect(upsert.row.is_agent).toBe(true);
    expect(upsert.row.agent_provider).toBe("night-shift");
  });

  it("the inserted filing carries the packet lie: opens+3ms, pending", async () => {
    await seedVale(sb, { round: ROUND, day: 3, cohort: 1 });
    const insert = sb.calls.find((c) => c.table === "submissions" && c.op === "insert");
    expect(Date.parse(insert.row.created_at) - Date.parse(ROUND.opens_at)).toBe(3);
    expect(insert.row.status).toBe("pending");
    expect(insert.row.username).not.toMatch(/vale/i);
  });

  it("is idempotent — an existing filing for the day is a no-op", async () => {
    sb = makeFakeSupabase({ existing: [{ id: 7 }] });
    const result = await seedVale(sb, { round: ROUND, day: 3, cohort: 1 });
    expect(result.seeded).toBe(false);
    expect(result.reason).toBe("already_filed");
    expect(result.submissionId).toBe(7);
    expect(sb.calls.some((c) => c.op === "insert")).toBe(false);
    expect(sb.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("refuses rounds that never opened on record", async () => {
    await expect(seedVale(sb, { round: { day: 3 }, day: 3, cohort: 1 }))
      .rejects.toThrow("round_missing_opens_at");
  });
});
