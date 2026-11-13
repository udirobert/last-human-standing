// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PacketStrip from "../src/components/PacketStrip.jsx";

const LYING = { pkt: "+0.003s", origin: "none", hops: 3, rcpt: "velocity_spoof", tells: ["pkt", "origin", "hops", "rcpt"] };

describe("PacketStrip", () => {
  it("renders all four postmark fields", () => {
    render(<PacketStrip packet={{ pkt: "+14m", origin: "geo", hops: 1, rcpt: "clean", tells: [] }} />);
    expect(screen.getByText("PKT")).toBeTruthy();
    expect(screen.getByText("+14m")).toBeTruthy();
    expect(screen.getByText("geo")).toBeTruthy();
  });

  it("keeps tells muted before the juror commits — evidence without anchoring", () => {
    const { container } = render(<PacketStrip packet={LYING} revealed={false} />);
    expect(container.querySelectorAll(".text-blood\\/90").length).toBe(0);
    // the value is still printed — nothing hides the number
    expect(screen.getByText("+0.003s")).toBeTruthy();
  });

  it("lights the tells once revealed", () => {
    const { container } = render(<PacketStrip packet={LYING} revealed />);
    expect(container.querySelectorAll(".text-blood\\/90").length).toBe(4);
  });

  it("renders nothing when packet is null", () => {
    const { container } = render(<PacketStrip packet={null} />);
    expect(container.firstChild).toBeNull();
  });
});
