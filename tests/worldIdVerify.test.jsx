// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

// Mock @worldcoin/idkit so we don't pull the polling hook into tests.
// The mock returns a stable, controllable result object — tests assert
// that we hand the hook a config with a wallet-bound signal and that
// we forward the result to /api/idkit/verify on success.
const mockUseIDKitRequest = vi.fn();
vi.mock("@worldcoin/idkit", () => ({
  useIDKitRequest: (config) => mockUseIDKitRequest(config),
  proofOfHuman: ({ signal }) => ({ signal }),
}));

// Mock qrcode so we don't try to render an SVG in jsdom.
vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg/>"),
  },
}));

import WorldIdVerify from "../src/world/WorldIdVerify.jsx";
import { WorldContext } from "../src/world/WorldProvider.jsx";
import { DelightProvider } from "../src/components/DelightProvider.jsx";

function renderWithContext(ctxValue) {
  const value = {
    user: null,
    walletAuthed: false,
    walletAuth: vi.fn().mockResolvedValue(undefined),
    setWorldIdVerified: vi.fn(),
    ...ctxValue,
  };
  return render(
    <DelightProvider>
      <WorldContext.Provider value={value}>
        <WorldIdVerify />
      </WorldContext.Provider>
    </DelightProvider>,
  );
}

afterEach(() => cleanup());

describe("WorldIdVerify", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ENABLE_IDKIT", "true");
    vi.stubEnv("VITE_WORLD_ID_APP_ID", "app_test");
    // Default hook result: no connector URI, no success — tests can override
    // per-case via mockUseIDKitRequest.mockReturnValueOnce(...)
    mockUseIDKitRequest.mockReturnValue({
      open: vi.fn(),
      connectorURI: null,
      isSuccess: false,
      isError: false,
      result: null,
      errorCode: null,
      reset: vi.fn(),
    });
  });

  it("renders a 'connect wallet' button when user has no address", () => {
    renderWithContext({ user: null });
    expect(screen.getByText(/connect wallet to verify/i)).toBeTruthy();
  });

  it("calls walletAuth when the no-wallet button is clicked", async () => {
    const walletAuth = vi.fn().mockResolvedValue(undefined);
    renderWithContext({ user: null, walletAuth });
    fireEvent.click(screen.getByText(/connect wallet to verify/i));
    expect(walletAuth).toHaveBeenCalledTimes(1);
  });

  it("hides entirely when VITE_ENABLE_IDKIT is not 'true'", () => {
    vi.stubEnv("VITE_ENABLE_IDKIT", "false");
    renderWithContext({ user: { address: "0xabc" } });
    expect(screen.queryByText(/verify world id/i)).toBeNull();
    expect(screen.queryByText(/connect wallet to verify/i)).toBeNull();
  });

  it("binds the Orb signal to the wallet address", async () => {
    // Simulate the user clicking verify to fetch rp-context, then
    // assert the hook receives a config with the wallet as signal.
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

    // After fetch resolves, the hook should be called with the
    // wallet-bound signal.
    await waitFor(() => {
      expect(mockUseIDKitRequest).toHaveBeenCalled();
    });
    const lastConfig = mockUseIDKitRequest.mock.calls.at(-1)?.[0];
    expect(lastConfig?.rp_context?.rp_id).toBe("rp_test");
    expect(lastConfig?.preset?.signal).toBe("0xDEADBEEF");
  });

  it("forwards the IDKit result to /api/idkit/verify on success", async () => {
    // Mock the hook to return a success state immediately — the
    // forward-to-backend effect fires in response to isSuccess.
    mockUseIDKitRequest.mockReturnValue({
      open: vi.fn(),
      connectorURI: "world.org/verify?app_id=app_test",
      isSuccess: true,
      isError: false,
      result: { mock: "proof" },
      errorCode: null,
      reset: vi.fn(),
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rp_context: {
          rp_id: "rp_test", nonce: "n", created_at: "x",
          expires_at: "y", signature: "s",
        },
      }),
    });

    const setWorldIdVerified = vi.fn();
    renderWithContext({ user: { address: "0xDEADBEEF" }, setWorldIdVerified });
    fireEvent.click(screen.getByText(/verify world id/i));

    await waitFor(() => {
      const calls = global.fetch.mock.calls.map((c) => c[0]);
      expect(calls).toContain("/api/idkit/verify");
    });
    const verifyCall = global.fetch.mock.calls.find(
      (c) => c[0] === "/api/idkit/verify",
    );
    const body = JSON.parse(verifyCall[1].body);
    expect(body.rp_id).toBe("rp_test");
    expect(body.idkitResponse).toEqual({ mock: "proof" });
    expect(setWorldIdVerified).toHaveBeenCalledWith(true);
  });
});
