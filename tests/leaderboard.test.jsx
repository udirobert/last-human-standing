// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { createElement as h } from "react";

// ---------------------------------------------------------------------------
// Shared mocks — framer-motion must produce real React elements, not objects.
// ---------------------------------------------------------------------------
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  const motionProxy = new Proxy(
    {},
    {
      get: (_t, tag) =>
        typeof tag === "string"
          ? ({ children, ...rest }) => {
              const {
                initial, animate, exit, transition, variants,
                whileHover, whileTap, whileFocus, layout, layoutId,
                drag, dragConstraints, dragElastic, dragMomentum,
                onDragStart, onDragEnd, onDrag,
                onAnimationStart, onAnimationComplete,
                ...safe
              } = rest;
              return h(tag, safe, children);
            }
          : null,
    },
  );
  return {
    ...actual,
    useReducedMotion: () => false,
    AnimatePresence: ({ children }) => h("div", null, children),
    motion: motionProxy,
  };
});

// Stub canvas-based helpers so any moment-card path can mount in jsdom.
vi.mock("../lib/momentCard.js", () => ({
  renderMomentCard: vi.fn().mockResolvedValue(null),
  canvasToPngBlob: vi.fn().mockResolvedValue(null),
}));
vi.mock("../lib/shareMoment.js", () => ({
  momentCardDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,stub"),
  shareMoment: vi.fn(),
}));

import { WorldContext } from "../src/world/WorldProvider.jsx";
import { RoundContext } from "../src/world/RoundProvider.jsx";
import { DelightProvider } from "../src/components/DelightProvider.jsx";
import Leaderboard from "../src/components/Leaderboard.jsx";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const JUROR_ROW = {
  address: "0xabc",
  username: "juror1",
  total: 5,
  correct: 5,
  accuracy: 100,
  juryTickets: 3,
  isJury: true,
  weight: 2,
  eliminatedAtDay: 2,
};

function mockFetch({ juryBoard = [JUROR_ROW] } = {}) {
  global.fetch = vi.fn((url) => {
    const u = String(url);
    const payload = u.includes("/api/checkins/today")
      ? { checkins: [{ address: "0xabc", rank: 1, survived: true, distance_m: 10 }] }
      : u.includes("/api/cohort/roster")
        ? { roster: [] }
        : u.includes("/api/referral-board")
          ? { board: [] }
          : u.includes("/api/detective-board")
            ? { board: [] }
            : u.includes("/api/jury-board")
              ? { board: juryBoard, sort: u.includes("sort=influence") ? "influence" : "accuracy" }
              : u.includes("/api/stats")
                ? { players: { total: 12, active: 7 }, prizePool: { balanceWld: 0 } }
                : {};
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
  });
}

function renderLeaderboard({ roundOverrides = {}, worldOverrides = {} } = {}) {
  const roundValue = {
    phase: "live",
    launchAt: null,
    currentDay: 2,
    round: {
      name: "AT A PARK",
      survivalCap: 12,
      status: "open",
      opensAt: null,
      closesAt: null,
      slotsRemaining: 7,
      prompt: "Prove it",
    },
    reservedCount: 12,
    cohortSize: 25,
    cohortFull: false,
    you: {
      isAuthed: true,
      isEliminated: false,
      checkedInToday: false,
      rankToday: null,
      survivedToday: null,
      juryTickets: 0,
      isJury: false,
      juryWeight: 1,
      voteAccuracy: null,
      votesResolved: 0,
      votesCorrect: 0,
    },
    ...roundOverrides,
  };
  const worldValue = {
    user: { address: "0xabc" },
    ...worldOverrides,
  };
  return render(
    <DelightProvider>
      <WorldContext.Provider value={worldValue}>
        <RoundContext.Provider value={roundValue}>
          <Leaderboard onBack={() => {}} onCheckIn={() => {}} onRouteToOnboarding={() => {}} />
        </RoundContext.Provider>
      </WorldContext.Provider>
    </DelightProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Renders the full Leaderboard shell (AppShell + backdrop + polls), so it's
// slower than a hook test. Generous timeouts keep the suite green under
// full parallel load.
const TEST_TIMEOUT = 20_000;

describe("Leaderboard jury bench", () => {
  it("auto-selects the Jurors tab for an eliminated live player and renders ranked rows", { timeout: TEST_TIMEOUT }, async () => {
    mockFetch();
    renderLeaderboard({
      roundOverrides: {
        you: {
          isAuthed: true,
          isEliminated: true,
          eliminatedAtDay: 2,
          checkedInToday: false,
          juryTickets: 3,
          isJury: true,
          juryWeight: 2,
          voteAccuracy: 1,
          votesResolved: 5,
          votesCorrect: 5,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText("The jury bench")).toBeTruthy();
    });
    // Ranked row from the mocked /api/jury-board payload.
    await waitFor(() => {
      expect(screen.getByText("juror1")).toBeTruthy();
    });
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("3 ⚖️")).toBeTruthy();
    // The ×2 badge marks a full juror.
    expect(screen.getByText("×2 ⚖️")).toBeTruthy();
    // Truthful how-it-works strip.
    expect(screen.getByText("How the bench works")).toBeTruthy();
  });

  it("keeps the Today tab for a live player who is still in the game", { timeout: TEST_TIMEOUT }, async () => {
    mockFetch();
    renderLeaderboard();

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeTruthy();
    });
    // Today's survivors are shown, the jury bench is not auto-selected.
    expect(screen.queryByText("The jury bench")).toBeNull();
  });

  it("switches the sort to influence and refetches with the sort param", { timeout: TEST_TIMEOUT }, async () => {
    mockFetch();
    renderLeaderboard({
      roundOverrides: {
        you: {
          isAuthed: true,
          isEliminated: true,
          eliminatedAtDay: 2,
          checkedInToday: false,
          juryTickets: 3,
          isJury: true,
          juryWeight: 2,
          voteAccuracy: 1,
          votesResolved: 5,
          votesCorrect: 5,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText("The jury bench")).toBeTruthy();
    });

    const influence = screen.getByRole("button", { name: "Influence" });
    expect(influence.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(influence);
    expect(influence.getAttribute("aria-pressed")).toBe("true");

    await waitFor(() => {
      const calls = global.fetch.mock.calls.map(([url]) => String(url));
      expect(calls.some((u) => u.includes("/api/jury-board?sort=influence"))).toBe(true);
    });
  });

  it("shows the empty state when no jurors have qualified yet", { timeout: TEST_TIMEOUT }, async () => {
    mockFetch({ juryBoard: [] });
    renderLeaderboard({
      roundOverrides: {
        you: { isAuthed: true, isEliminated: true, eliminatedAtDay: 2, checkedInToday: false },
      },
    });

    await waitFor(() => {
      expect(screen.getByText("The bench is empty")).toBeTruthy();
    });
    expect(screen.getByText(/voted on 5\+ proofs/i)).toBeTruthy();
  });
});
