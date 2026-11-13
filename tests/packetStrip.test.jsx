// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PacketStrip from "../src/components/PacketStrip.jsx";

describe("PacketStrip", () => {
  it("renders all four postmark fields", () => {
    render(<PacketStrip packet={{ pkt: "+14m", origin: "geo", hops: 1, rcpt: "clean", tells: [] }} />);
    expect(screen.getByText("PKT")).toBeTruthy();
    expect(screen.getByText("+14m")).toBeTruthy();
    expect(screen.getByText("geo")).toBeTruthy();
  });
  it("renders hot values for out-of-distribution fields", () => {
    const { container } = render(<PacketStrip packet={{ pkt: "+0.003s", origin: "none", hops: 3, rcpt: "velocity_spoof", tells: ["pkt","origin","hops","rcpt"] }} />);
    const hot = container.querySelectorAll(".text-blood\\/90");
    expect(hot.length).toBe(4);
    expect(screen.getByText("+0.003s")).toBeTruthy();
  });
  it("renders nothing when packet is null", () => {
    const { container } = render(<PacketStrip packet={null} />);
    expect(container.firstChild).toBeNull();
  });
});
