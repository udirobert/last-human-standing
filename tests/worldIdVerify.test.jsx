// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// Mock @worldcoin/idkit so we don't pull the full widget tree into tests.
vi.mock("@worldcoin/idkit", () => ({
  IDKitRequestWidget: ({ children }) => (
    <div data-testid="idkit-widget">{typeof children === "function" ? children({ open: () => {} }) : children}</div>
  ),
  orbLegacy: ({ signal }) => ({ signal }),
}));

import WorldIdVerify from "../src/world/WorldIdVerify.jsx";
import { WorldContext } from "../src/world/WorldProvider.jsx";

function renderWithContext(ctxValue) {
  const value = {
    user: null,
    walletAuthed: false,
    walletAuth: vi.fn().mockResolvedValue(undefined),
    setWorldIdVerified: vi.fn(),
    ...ctxValue,
  };
  return render(
    <WorldContext.Provider value={value}>
      <WorldIdVerify />
    </WorldContext.Provider>,
  );
}

afterEach(() => cleanup());

describe("WorldIdVerify", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ENABLE_IDKIT", "true");
    vi.stubEnv("VITE_WORLD_ID_APP_ID", "app_test");
  });

  it("renders a 'connect wallet' button when user has no address", () => {
    renderWithContext({ user: null });
    expect(screen.getByText(/connect wallet to verify/i)).toBeTruthy();
    expect(screen.queryByTestId("idkit-widget")).toBeNull();
  });

  it("calls walletAuth when the no-wallet button is clicked", async () => {
    const walletAuth = vi.fn().mockResolvedValue(undefined);
    renderWithContext({ user: null, walletAuth });
    fireEvent.click(screen.getByText(/connect wallet to verify/i));
    expect(walletAuth).toHaveBeenCalledTimes(1);
  });

  it("hides entirely when VITE_ENABLE_IDKIT is not 'true'", () => {
    vi.stubEnv("VITE_ENABLE_IDKIT", "false");
    const { container } = renderWithContext({ user: { address: "0xabc" } });
    expect(container.firstChild).toBeNull();
  });

  it("falls back to a wallet-address signal once a user is connected", async () => {
    // Simulate the user clicking verify to fetch rp-context, then assert the
    // widget receives the wallet as signal (no more empty-string fallback).
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rp_context: {
          rp_id: "rp_test",
          nonce: "n",
          created_at: "x",
          expires_at: "y",
          signature: "s",
        },
      }),
    });

    renderWithContext({ user: { address: "0xDEADBEEF" } });
    fireEvent.click(screen.getByText(/verify world id/i));

    // After fetch resolves, the widget renders with the wallet-bound signal.
    await screen.findByTestId("idkit-widget");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/idkit/rp-context",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });
});
