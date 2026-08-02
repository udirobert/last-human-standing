// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildJuryBoard } from "../server/lib/juryBoard.js";

function vote(voter, submissionId, vote) {
  return { voter_address: voter, submission_id: submissionId, vote };
}
function sub(id, status) {
  return { id, status };
}
function user(address, over = {}) {
  return { address, username: `@${address.slice(0, 4)}`, jury_tickets: 0, eliminated: true, eliminated_at_day: 2, is_agent: false, ...over };
}

const ADDR_A = "0xaaaa";
const ADDR_B = "0xbbbb";
const ADDR_C = "0xcccc";
const ALIVE = "0xdddd";

describe("buildJuryBoard", () => {
  it("returns an empty board with no votes", () => {
    expect(buildJuryBoard({ votes: [], submissions: [], users: [] })).toEqual([]);
  });

  it("counts only resolved votes and scores correctness against the verdict", () => {
    const votes = [
      vote(ADDR_A, 1, "real"), // verified + real  = correct
      vote(ADDR_A, 2, "real"), // flagged + real   = wrong
      vote(ADDR_A, 3, "fake"), // pending          = not resolved, ignored
      vote(ADDR_A, 4, "fake"), // flagged + fake   = correct
    ];
    const submissions = [sub(1, "verified"), sub(2, "flagged"), sub(3, "pending"), sub(4, "flagged")];
    const board = buildJuryBoard({ votes, submissions, users: [user(ADDR_A)], minResolved: 1 });
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ address: ADDR_A, total: 3, correct: 2, accuracy: 67, isJury: false, weight: 1 });
  });

  it("ranks by accuracy with more votes as the tiebreak", () => {
    const votes = [
      vote(ADDR_A, 1, "real"),
      vote(ADDR_B, 2, "real"),
      vote(ADDR_B, 3, "real"),
      vote(ADDR_B, 4, "real"),
      vote(ADDR_B, 5, "real"),
      vote(ADDR_B, 6, "real"),
    ];
    const submissions = [1, 2, 3, 4, 5, 6].map((id) => sub(id, "verified"));
    const board = buildJuryBoard({
      votes,
      submissions,
      users: [user(ADDR_A), user(ADDR_B)],
      minResolved: 1,
    });
    expect(board.map((b) => b.address)).toEqual([ADDR_B, ADDR_A]); // both 100%, B has more votes
  });

  it("marks jurors (>=80% accuracy) with the ×2 weight", () => {
    const votes = [
      vote(ADDR_A, 1, "real"), vote(ADDR_A, 2, "real"), vote(ADDR_A, 3, "real"),
      vote(ADDR_A, 4, "real"), vote(ADDR_A, 5, "real"), vote(ADDR_A, 6, "fake"),
    ];
    const submissions = [1, 2, 3, 4, 5, 6].map((id) => sub(id, "verified"));
    const board = buildJuryBoard({ votes, submissions, users: [user(ADDR_A)] });
    expect(board[0]).toMatchObject({ accuracy: 83, isJury: true, weight: 2 });
  });

  it("sorts by influence (tickets × weight) when asked, tickets first", () => {
    const votes = [
      vote(ADDR_A, 1, "real"), vote(ADDR_A, 2, "real"), vote(ADDR_A, 3, "real"),
      vote(ADDR_A, 4, "real"), vote(ADDR_A, 5, "real"),
      vote(ADDR_B, 6, "real"), vote(ADDR_B, 7, "real"), vote(ADDR_B, 8, "real"),
      vote(ADDR_B, 9, "real"), vote(ADDR_B, 10, "real"),
    ];
    const submissions = Array.from({ length: 10 }, (_, i) => sub(i + 1, "verified"));
    const board = buildJuryBoard({
      votes,
      submissions,
      users: [user(ADDR_A, { jury_tickets: 7 }), user(ADDR_B, { jury_tickets: 3 })],
      sort: "influence",
    });
    expect(board[0]).toMatchObject({ address: ADDR_A, juryTickets: 7 });
    expect(board[1]).toMatchObject({ address: ADDR_B, juryTickets: 3 });
  });

  it("influence counts tickets × vote weight (jurors' tickets sway double)", () => {
    // Non-juror: 60% accuracy, 10 tickets -> influence 10.
    // Juror: 100% accuracy, 6 tickets -> influence 12.
    const votes = [
      vote(ADDR_A, 1, "real"), vote(ADDR_A, 2, "real"), vote(ADDR_A, 3, "real"),
      vote(ADDR_A, 4, "fake"), vote(ADDR_A, 5, "fake"),
      vote(ADDR_B, 6, "real"), vote(ADDR_B, 7, "real"), vote(ADDR_B, 8, "real"),
      vote(ADDR_B, 9, "real"), vote(ADDR_B, 10, "real"),
    ];
    const submissions = Array.from({ length: 10 }, (_, i) => sub(i + 1, "verified"));
    const board = buildJuryBoard({
      votes,
      submissions,
      users: [user(ADDR_A, { jury_tickets: 10 }), user(ADDR_B, { jury_tickets: 6 })],
      sort: "influence",
    });
    expect(board[0]).toMatchObject({ address: ADDR_B, accuracy: 100, isJury: true, juryTickets: 6 });
    expect(board[1]).toMatchObject({ address: ADDR_A, accuracy: 60, isJury: false, juryTickets: 10 });
  });

  it("excludes alive players, agents, and voters under the resolved-vote bar", () => {
    const fiveReal = (addr, startId) =>
      [0, 1, 2, 3, 4].map((i) => vote(addr, startId + i, "real"));
    const votes = [
      ...fiveReal(ADDR_A, 1),
      ...fiveReal(ALIVE, 100), // alive player with 5 votes — excluded
      ...fiveReal(ADDR_B, 200), // agent with 5 votes — excluded
      ...fiveReal(ADDR_C, 300), // eliminated but only 4 votes — under the bar
    ];
    const submissions = [
      ...Array.from({ length: 5 }, (_, i) => sub(i + 1, "verified")),
      ...Array.from({ length: 5 }, (_, i) => sub(100 + i, "verified")),
      ...Array.from({ length: 5 }, (_, i) => sub(200 + i, "verified")),
      ...Array.from({ length: 4 }, (_, i) => sub(300 + i, "verified")),
    ];
    const board = buildJuryBoard({
      votes,
      submissions,
      users: [
        user(ADDR_A),
        user(ALIVE, { eliminated: false }),
        user(ADDR_B, { is_agent: true }),
        user(ADDR_C, { eliminated: true }),
      ],
    });
    expect(board.map((b) => b.address)).toEqual([ADDR_A]);
  });
});
