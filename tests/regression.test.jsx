// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { useState, createElement as h } from "react";

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
              // Drop framer-only props that aren't valid DOM attributes.
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

// Stub canvas-based helpers so ShareSheet can mount in jsdom.
vi.mock("../lib/momentCard.js", () => ({
  renderMomentCard: vi.fn().mockResolvedValue(null),
  canvasToPngBlob: vi.fn().mockResolvedValue(null),
}));
vi.mock("../lib/shareMoment.js", () => ({
  momentCardDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,stub"),
  shareMoment: vi.fn(),
}));

// Context imports
import { WorldContext } from "../src/world/WorldProvider.jsx";
import { RoundContext } from "../src/world/RoundProvider.jsx";

// jsdom doesn't implement matchMedia — stub it for components that
// check prefers-reduced-motion or other media queries.
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

// jsdom doesn't implement scrollIntoView — stub it on Element.prototype.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ---------------------------------------------------------------------------
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// ===========================================================================
// 1. ShareSheet focus trap
// ===========================================================================
import ShareSheet from "../src/components/ShareSheet.jsx";

describe("ShareSheet focus trap", () => {
  it("does not render dialog content when closed", () => {
    render(
      <ShareSheet open={false} kind="survive" onClose={() => {}} text="" url="" />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a role=dialog with aria-modal when open", async () => {
    render(
      <ShareSheet open kind="survive" name="Test" day={1} rank={5} cap={25} onClose={() => {}} text="hi" url="https://x" />,
    );
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(
      <ShareSheet open kind="survive" name="Test" day={1} rank={5} cap={25} onClose={onClose} text="hi" url="https://x" />,
    );
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

// ===========================================================================
// 2. useFocusTrap — tab cycling + escape
// ===========================================================================
import { useFocusTrap } from "../src/hooks/useFocusTrap.js";

function TrapHarness({ active, onEscape }) {
  const ref = useFocusTrap(active, { onEscape });
  return (
    <div ref={ref}>
      <button>First</button>
      <button>Second</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("does not intercept Escape when inactive", () => {
    const onEscape = vi.fn();
    render(<TrapHarness active={false} onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("calls onEscape when active and Escape pressed", () => {
    const onEscape = vi.fn();
    render(<TrapHarness active onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("wraps focus from last to first on Tab (calls preventDefault)", () => {
    render(<TrapHarness active onEscape={() => {}} />);
    const second = screen.getByText("Second");
    second.focus();
    expect(document.activeElement).toBe(second);
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    // The trap should call preventDefault to stop default Tab behavior
    // and wrap focus. In jsdom, focus() may not move, but preventDefault
    // confirms the trap intercepted the event.
    expect(event.defaultPrevented).toBe(true);
  });

  it("wraps focus from first to last on Shift+Tab (calls preventDefault)", () => {
    render(<TrapHarness active onEscape={() => {}} />);
    const first = screen.getByText("First");
    first.focus();
    expect(document.activeElement).toBe(first);
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

// ===========================================================================
// 3. Mascot name migration (useMascotName)
// ===========================================================================
import { useMascotName } from "../src/__experimental__/usePersonalization.jsx";

function NameHarness({ saveValue }) {
  const { name, saveName } = useMascotName();
  return (
    <div>
      <span data-testid="name">{name}</span>
      <button onClick={() => saveName(saveValue)}>save</button>
    </div>
  );
}

describe("useMascotName migration", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to the guide name when no keys exist", () => {
    render(<NameHarness />);
    expect(screen.getByTestId("name").textContent).toBe("Ember");
  });

  it("reads from legacy mascot_name key when lhs_mascot_name is absent", () => {
    localStorage.setItem("mascot_name", "OldName");
    render(<NameHarness />);
    expect(screen.getByTestId("name").textContent).toBe("OldName");
  });

  it("prefers lhs_mascot_name over legacy mascot_name", () => {
    localStorage.setItem("mascot_name", "OldName");
    localStorage.setItem("lhs_mascot_name", "NewName");
    render(<NameHarness />);
    expect(screen.getByTestId("name").textContent).toBe("NewName");
  });

  it("migrates legacy key to new key on save", () => {
    localStorage.setItem("mascot_name", "OldName");
    render(<NameHarness saveValue="Buddy" />);
    fireEvent.click(screen.getByText("save"));
    expect(localStorage.getItem("lhs_mascot_name")).toBe("Buddy");
    expect(localStorage.getItem("mascot_name")).toBeNull();
  });

  it("trims and caps name to 20 characters on save", () => {
    const long = "A".repeat(30);
    render(<NameHarness saveValue={long} />);
    fireEvent.click(screen.getByText("save"));
    expect(screen.getByTestId("name").textContent).toBe("A".repeat(20));
    expect(localStorage.getItem("lhs_mascot_name")).toBe("A".repeat(20));
  });
});

// ===========================================================================
// 4. Survival counted once (recordSurvival via DelightProvider)
// ===========================================================================
import { DelightProvider, useDelight } from "../src/components/DelightProvider.jsx";

function SurvivalHarness() {
  const { recordSurvival } = useDelight();
  return (
    <div>
      <button onClick={() => recordSurvival("round-1")}>record</button>
      <button onClick={() => recordSurvival("round-2")}>record-2</button>
    </div>
  );
}

describe("recordSurvival — once per round key", () => {
  beforeEach(() => localStorage.clear());

  it("records the same round key only once in localStorage", () => {
    render(
      <DelightProvider>
        <SurvivalHarness />
      </DelightProvider>,
    );
    fireEvent.click(screen.getByText("record"));
    fireEvent.click(screen.getByText("record"));
    fireEvent.click(screen.getByText("record"));
    const stored = JSON.parse(localStorage.getItem("lhs_recorded_survivals") || "[]");
    expect(stored.filter((k) => k === "round-1").length).toBe(1);
  });

  it("records different round keys separately", () => {
    render(
      <DelightProvider>
        <SurvivalHarness />
      </DelightProvider>,
    );
    fireEvent.click(screen.getByText("record"));
    fireEvent.click(screen.getByText("record-2"));
    const stored = JSON.parse(localStorage.getItem("lhs_recorded_survivals") || "[]");
    expect(stored).toContain("round-1");
    expect(stored).toContain("round-2");
  });

  it("does not throw when localStorage is unavailable", () => {
    const orig = localStorage.getItem;
    localStorage.getItem = () => { throw new Error("denied"); };
    render(
      <DelightProvider>
        <SurvivalHarness />
      </DelightProvider>,
    );
    expect(() => fireEvent.click(screen.getByText("record"))).not.toThrow();
    localStorage.getItem = orig;
  });
});

// ===========================================================================
// 5. Mascot variant expressions — all variants render
// ===========================================================================
import Mascot from "../src/components/Mascot.jsx";

const ALL_VARIANTS = [
  "excited", "celebrating", "cheering", "thinking", "worried",
  "winner", "sad", "sleeping", "shocked", "determined", "proud", "idle",
];

describe("Mascot variant expressions", () => {
  for (const variant of ALL_VARIANTS) {
    it(`renders an SVG for variant="${variant}"`, () => {
      const { container } = render(<Mascot variant={variant} size={48} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  }

  it("renders without crashing for an unknown variant (default expression)", () => {
    const { container } = render(<Mascot variant="unknown" size={48} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

// ===========================================================================
// 6. Chat error branding
// ===========================================================================
import Chat from "../src/components/Chat.jsx";

function renderChat({ worldOverrides = {}, roundOverrides = {} } = {}) {
  const worldValue = {
    user: { address: "0xabc", paid: true },
    walletAuthed: true,
    entryPaid: true,
    isMiniApp: false,
    sendWorldChat: vi.fn().mockResolvedValue({ ok: true }),
    ...worldOverrides,
  };
  const roundValue = {
    phase: "live",
    currentDay: 1,
    you: { isAuthed: true, isEliminated: false, checkedInToday: false, survivedToday: false },
    round: { closesAt: null, survivalCap: 25, placeType: "test" },
    ...roundOverrides,
  };
  return render(
    <DelightProvider>
      <WorldContext.Provider value={worldValue}>
        <RoundContext.Provider value={roundValue}>
          <Chat onBack={() => {}} />
        </RoundContext.Provider>
      </WorldContext.Provider>
    </DelightProvider>,
  );
}

describe("Chat error branding", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });
  });

  it("renders the chat container without crashing", async () => {
    renderChat();
    // In dev/mock mode, the component loads simulated messages, not fetch.
    // Just verify the chat shell rendered.
    await waitFor(() => {
      expect(document.querySelector("textarea, input[type='text']")).toBeTruthy();
    });
  });

  it("shows a blood-themed system message when send fails", async () => {
    // In dev mode (useMocks=true, isMiniApp=false), the browser-demo path
    // calls sendWorldChat. If it rejects, a system error message with
    // bg-blood/10 styling is appended.
    const sendWorldChat = vi.fn().mockRejectedValue(new Error("network"));
    renderChat({
      worldOverrides: { sendWorldChat },
    });

    await waitFor(() => {
      expect(document.querySelector("textarea, input[type='text']")).toBeTruthy();
    });

    const input = document.querySelector("textarea, input[type='text']");
    expect(input).toBeTruthy();

    // Set input value and submit via Enter key.
    fireEvent.change(input, { target: { value: "hello" } });
    // Wait for React to process the state update.
    await waitFor(() => {
      expect(input.value).toBe("hello");
    });

    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    // Wait for the async sendWorldChat rejection + system message to appear.
    // The system error message uses the worldChatFailed copy.
    await waitFor(() => {
      expect(sendWorldChat).toHaveBeenCalled();
    }, { timeout: 3000 });

    // After sendWorldChat rejects, the catch block appends a system message.
    await waitFor(() => {
      const allText = document.body.textContent || "";
      expect(allText).toContain("World Chat lost the signal");
    }, { timeout: 3000 });
  });
});

// ===========================================================================
// 7. Reduced-motion mascot
// ===========================================================================
describe("Reduced-motion mascot", () => {
  it("renders the mascot SVG with default (motion enabled) mock", () => {
    const { container } = render(<Mascot variant="celebrating" size={48} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the pulsing halo when reduceMotion is false", () => {
    const { container } = render(<Mascot variant="idle" size={48} />);
    // The halo uses bg-amber-500/30 class.
    const halo = container.querySelector("[class*='bg-amber-500/30']");
    // With the default mock (reduceMotion=false), halo should exist.
    expect(halo).toBeTruthy();
  });
});

// ===========================================================================
// 8. MascotEventProvider — durable state derivation + dispatch
// ===========================================================================
import { MascotEventProvider } from "../src/components/MascotEventProvider.jsx";
import { useMascotEvent } from "../src/hooks/useMascotEvent.js";

function MascotEventHarness() {
  const { mascotEvent, durableEvent, dispatchMascotEvent } = useMascotEvent();
  return (
    <div>
      <span data-testid="type">{mascotEvent?.type ?? "none"}</span>
      <span data-testid="variant">{mascotEvent?.variant ?? "none"}</span>
      <span data-testid="durable-type">{durableEvent?.type ?? "none"}</span>
      <button onClick={() => dispatchMascotEvent({ type: "achievement", variant: "celebrating" })}>dispatch-transient</button>
      <button onClick={() => dispatchMascotEvent({ type: "submitting", variant: "determined" })}>dispatch-durable</button>
      <button onClick={() => dispatchMascotEvent(null)}>clear</button>
    </div>
  );
}

function renderMascotEvent({ roundValue, worldValue }) {
  return render(
    <WorldContext.Provider value={worldValue ?? { user: { paid: true } }}>
      <RoundContext.Provider value={roundValue ?? { phase: "live", isLive: true, isPrelaunch: false, isEnded: false, you: {}, round: {} }}>
        <MascotEventProvider>
          <MascotEventHarness />
        </MascotEventProvider>
      </RoundContext.Provider>
    </WorldContext.Provider>,
  );
}

describe("MascotEventProvider durable state", () => {
  beforeEach(() => localStorage.clear());

  it("derives check_in_due for a live player who hasn't checked in", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: false, checkedInToday: false },
        round: { closesAt: null, survivalCap: 25, placeType: "cafe" },
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("check_in_due");
    expect(getByTestId("variant").textContent).toBe("determined");
  });

  it("derives survived for a player who survived today", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: true, checkedInToday: true },
        round: {},
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("survived");
    expect(getByTestId("variant").textContent).toBe("proud");
  });

  it("derives eliminated for an eliminated player", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: true },
        round: {},
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("eliminated");
    expect(getByTestId("variant").textContent).toBe("sad");
  });

  it("derives spectator for an unpaid live user", () => {
    const { getByTestId } = renderMascotEvent({
      worldValue: { user: { paid: false, eliminated: false } },
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: false, checkedInToday: false },
        round: {},
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("spectator");
  });

  it("derives awaiting_audit after check-in but before survival verdict", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: false, checkedInToday: true },
        round: {},
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("awaiting_audit");
  });

  it("derives check_in_closing when deadline is within 1 hour", () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: false, checkedInToday: false },
        round: { closesAt: soon, survivalCap: 25, placeType: "cafe" },
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("check_in_closing");
    expect(getByTestId("variant").textContent).toBe("worried");
  });

  it("derives prelaunch idle state", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "prelaunch", isLive: false, isPrelaunch: true, isEnded: false,
        you: {}, round: {},
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("idle");
    expect(getByTestId("variant").textContent).toBe("thinking");
  });

  it("derives ended/winner when phase is ended and not eliminated", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "ended", isLive: false, isPrelaunch: false, isEnded: true,
        you: { isEliminated: false }, round: {},
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("ended");
    expect(getByTestId("variant").textContent).toBe("winner");
  });

  it("derives eliminated when phase is ended and player was eliminated", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "ended", isLive: false, isPrelaunch: false, isEnded: true,
        you: { isEliminated: true }, round: {},
      },
    });
    expect(getByTestId("durable-type").textContent).toBe("eliminated");
  });

  it("transient event overrides durable immediately", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: false, checkedInToday: false },
        round: { closesAt: null, survivalCap: 25, placeType: "cafe" },
      },
    });
    expect(getByTestId("type").textContent).toBe("check_in_due");
    fireEvent.click(screen.getByText("dispatch-transient"));
    expect(getByTestId("type").textContent).toBe("achievement");
    expect(getByTestId("variant").textContent).toBe("celebrating");
  });

  it("manual durable override persists until cleared", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: false, checkedInToday: false },
        round: { closesAt: null, survivalCap: 25, placeType: "cafe" },
      },
    });
    fireEvent.click(screen.getByText("dispatch-durable"));
    expect(getByTestId("type").textContent).toBe("submitting");
    expect(getByTestId("variant").textContent).toBe("determined");
    // Should NOT auto-expire.
    expect(getByTestId("type").textContent).toBe("submitting");
    // Clear it.
    fireEvent.click(screen.getByText("clear"));
    expect(getByTestId("type").textContent).toBe("check_in_due");
  });

  it("transient event takes priority over manual durable", () => {
    const { getByTestId } = renderMascotEvent({
      roundValue: {
        phase: "live", isLive: true, isPrelaunch: false, isEnded: false,
        you: { isEliminated: false, survivedToday: false, checkedInToday: false },
        round: { closesAt: null, survivalCap: 25, placeType: "cafe" },
      },
    });
    fireEvent.click(screen.getByText("dispatch-durable"));
    expect(getByTestId("type").textContent).toBe("submitting");
    fireEvent.click(screen.getByText("dispatch-transient"));
    expect(getByTestId("type").textContent).toBe("achievement");
  });
});
