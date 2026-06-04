import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import BottomNav from "../src/components/BottomNav.jsx";
import Countdown from "../src/components/Countdown.jsx";

afterEach(() => cleanup());

describe("BottomNav", () => {
  it("renders all four tabs with labels", () => {
    render(<BottomNav current="home" onChange={() => {}} />);
    expect(screen.getByText("Survive")).toBeTruthy();
    expect(screen.getByText("Vote")).toBeTruthy();
    expect(screen.getByText("Chat")).toBeTruthy();
    expect(screen.getByText("Standings")).toBeTruthy();
  });

  it("calls onChange with the clicked tab id", () => {
    const onChange = vi.fn();
    render(<BottomNav current="home" onChange={onChange} />);
    fireEvent.click(screen.getByText("Chat"));
    expect(onChange).toHaveBeenCalledWith("chat");
    fireEvent.click(screen.getByText("Standings"));
    expect(onChange).toHaveBeenCalledWith("leaderboard");
  });

  it("highlights the current tab with text-blood class", () => {
    const { container } = render(<BottomNav current="feed" onChange={() => {}} />);
    const feedBtn = screen.getByText("Vote").closest("button");
    expect(feedBtn.className).toContain("text-blood");
    const homeBtn = screen.getByText("Survive").closest("button");
    expect(homeBtn.className).not.toContain("text-blood");
  });

  it("shows a badge dot for tabs marked unread in badges prop", () => {
    const { container } = render(
      <BottomNav current="home" onChange={() => {}} badges={{ chat: true }} />,
    );
    const chatBtn = screen.getByText("Chat").closest("button");
    const dot = chatBtn.querySelector("span.bg-blood");
    expect(dot).toBeTruthy();
  });

  it("does not show a badge dot when badges is empty", () => {
    const { container } = render(
      <BottomNav current="home" onChange={() => {}} badges={{}} />,
    );
    const dots = container.querySelectorAll("span.bg-blood.rounded-full.animate-pulse");
    expect(dots.length).toBe(0);
  });
});

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders em-dash when no target is provided", () => {
    render(<Countdown targetIso={null} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders 00:00:00 when the target is in the past", () => {
    render(<Countdown targetIso="2026-06-04T11:00:00Z" />);
    expect(screen.getByText("00:00:00")).toBeTruthy();
  });

  it("renders days+hours:minutes:seconds for distant targets", () => {
    // 2 days, 3 hours, 4 minutes, 5 seconds in the future
    const future = new Date("2026-06-06T15:04:05Z").toISOString();
    render(<Countdown targetIso={future} />);
    expect(screen.getByText(/2d 03:04:05/)).toBeTruthy();
  });

  it("renders HH:MM:SS for sub-day targets", () => {
    const future = new Date("2026-06-04T15:30:45Z").toISOString();
    render(<Countdown targetIso={future} />);
    expect(screen.getByText("03:30:45")).toBeTruthy();
  });

  it("applies a custom className", () => {
    const future = new Date("2026-06-04T15:00:00Z").toISOString();
    const { container } = render(<Countdown targetIso={future} className="text-amber" />);
    const span = container.querySelector("span");
    expect(span.className).toContain("text-amber");
  });

  it("displays different countdown values for different targets", () => {
    // Two independent mounts, each should compute their own initial value
    vi.setSystemTime(new Date("2026-06-04T12:00:00Z"));
    const { container, unmount } = render(<Countdown targetIso="2026-06-04T12:05:00Z" />);
    expect(container.textContent).toBe("00:05:00");
    unmount();

    vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));
    const { container: c2 } = render(<Countdown targetIso="2026-06-08T12:00:00Z" />);
    expect(c2.textContent).toBe("3d 00:00:00");
  });
});
