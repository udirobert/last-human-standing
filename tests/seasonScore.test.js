// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  SCORE_WEIGHTS,
  seasonScoreFor,
  rankStandings,
  rankCrews,
  crewContributions,
} from "../server/lib/seasonScore.js";

const A = "0xaaaa";
const B = "0xbbbb";

describe("seasonScoreFor", () => {
  it("weights a delivered transfer highest", () => {
    const { score } = seasonScoreFor(A, [{ address: A, reason: "transfer_delivered" }]);
    expect(score).toBe(SCORE_WEIGHTS.transfer_delivered);
  });

  it("sums a mixed season", () => {
    const { score } = seasonScoreFor(A, [
      { address: A, reason: "transfer_delivered" },
      { address: A, reason: "transfer_delivered" },
      { address: A, reason: "sprint_participation" },
    ]);
    expect(score).toBe(SCORE_WEIGHTS.transfer_delivered * 2 + SCORE_WEIGHTS.sprint_participation);
  });

  it("counts transfers and sprints separately", () => {
    const r = seasonScoreFor(A, [
      { address: A, reason: "transfer_delivered" },
      { address: A, reason: "transfer_delivered" },
      { address: A, reason: "sprint_participation" },
    ]);
    expect(r.transfers).toBe(2);
    expect(r.sprints).toBe(1);
  });

  it("ignores economy reasons — they move credits, not score", () => {
    const { score } = seasonScoreFor(A, [
      { address: A, reason: "market_payout" },
      { address: A, reason: "season_podium" },
      { address: A, reason: "crew_contribution" },
    ]);
    expect(score).toBe(0);
  });

  it("ignores other players' events", () => {
    expect(seasonScoreFor(A, [{ address: B, reason: "transfer_delivered" }]).score).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(seasonScoreFor("0xAAAA", [{ address: A, reason: "transfer_delivered" }]).score)
      .toBe(SCORE_WEIGHTS.transfer_delivered);
  });

  it("handles no events", () => {
    expect(seasonScoreFor(A, [])).toMatchObject({ score: 0, transfers: 0, sprints: 0 });
  });
});

describe("rankStandings", () => {
  it("ranks highest score first", () => {
    const board = rankStandings([
      { address: A, score: 4 },
      { address: B, score: 20 },
    ]);
    expect(board.map((r) => r.rank)).toEqual([1, 2]);
    expect(board[0].address).toBe(B);
  });

  // Deterministic ties matter: players on equal score must never swap ranks
  // between renders.
  it("breaks score ties by credits", () => {
    const board = rankStandings([
      { address: A, score: 10, credits: 2 },
      { address: B, score: 10, credits: 9 },
    ]);
    expect(board.map((r) => r.address)).toEqual([B, A]);
  });

  it("breaks a full tie deterministically by address", () => {
    const board = rankStandings([
      { address: "0xcccc", score: 10, credits: 1, transfers: 1 },
      { address: "0xaaaa", score: 10, credits: 1, transfers: 1 },
      { address: "0xbbbb", score: 10, credits: 1, transfers: 1 },
    ]);
    expect(board.map((r) => r.address)).toEqual(["0xaaaa", "0xbbbb", "0xcccc"]);
  });

  it("is stable across repeated calls", () => {
    const rows = [
      { address: "0xdddd", score: 5 },
      { address: "0xaaaa", score: 5 },
    ];
    expect(rankStandings(rows).map((r) => r.address)).toEqual(rankStandings(rows).map((r) => r.address));
  });

  it("clamps negative and junk numbers to zero", () => {
    const board = rankStandings([{ address: A, score: -50, credits: "abc", transfers: null }]);
    expect(board[0]).toMatchObject({ score: 0, credits: 0, transfers: 0 });
  });

  it("respects the limit", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ address: `0x${String(i).padStart(4, "0")}`, score: i }));
    expect(rankStandings(rows, { limit: 5 })).toHaveLength(5);
  });

  it("carries crew identity through", () => {
    const board = rankStandings([{ address: A, score: 5, crew_id: 3, crew_name: "Northgate" }]);
    expect(board[0]).toMatchObject({ crew_id: 3, crew_name: "Northgate" });
  });

  it("handles no entries", () => {
    expect(rankStandings([])).toEqual([]);
    expect(rankStandings(null)).toEqual([]);
  });
});

describe("rankCrews", () => {
  it("aggregates member scores per crew", () => {
    const ranked = rankStandings([
      { address: A, score: 10, credits: 1, crew_id: 1, crew_name: "Northgate" },
      { address: B, score: 4, credits: 1, crew_id: 1, crew_name: "Northgate" },
      { address: "0xcccc", score: 6, credits: 1, crew_id: 2, crew_name: "Riverside" },
    ]);
    const crews = rankCrews(ranked);
    expect(crews[0]).toMatchObject({ crew_id: 1, crew_name: "Northgate", members: 2, score: 14 });
    expect(crews[1]).toMatchObject({ crew_id: 2, members: 1, score: 6 });
  });

  it("ranks the strongest crew first", () => {
    const crews = rankCrews(rankStandings([
      { address: A, score: 1, crew_id: 2, crew_name: "Weak" },
      { address: B, score: 99, crew_id: 1, crew_name: "Strong" },
    ]));
    expect(crews.map((c) => c.crew_name)).toEqual(["Strong", "Weak"]);
  });

  it("excludes unaffiliated players", () => {
    const crews = rankCrews(rankStandings([{ address: A, score: 10, crew_id: null }]));
    expect(crews).toEqual([]);
  });
});

describe("crewContributions", () => {
  const members = [
    { address: A, crew_id: 1 },
    { address: B, crew_id: 1 },
    { address: "0xcccc", crew_id: 2 },
  ];

  it("sums IRL earnings per crew", () => {
    const totals = crewContributions(members, [
      { address: A, reason: "transfer_delivered" },
      { address: B, reason: "sprint_participation" },
      { address: "0xcccc", reason: "sprint_participation" },
    ]);
    expect(totals.get(1)).toBe(SCORE_WEIGHTS.transfer_delivered + SCORE_WEIGHTS.sprint_participation);
    expect(totals.get(2)).toBe(SCORE_WEIGHTS.sprint_participation);
  });

  it("excludes players with no crew", () => {
    const totals = crewContributions(
      [{ address: A, crew_id: null }],
      [{ address: A, reason: "transfer_delivered" }],
    );
    expect(totals.size).toBe(0);
  });

  it("omits crews with no contributing events", () => {
    const totals = crewContributions(members, []);
    expect(totals.size).toBe(0);
  });
});