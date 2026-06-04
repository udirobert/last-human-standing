import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "../src/hooks/useOnlineStatus.js";

describe("useOnlineStatus", () => {
  beforeEach(() => {
    // Reset navigator.onLine mock before each test
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true (online) by default in jsdom", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.online).toBe(true);
  });

  it("exposes a queueCheckin function", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(typeof result.current.queueCheckin).toBe("function");
  });

  it("updates state when offline event fires", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.online).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.online).toBe(true);
  });

  it("queueCheckin rejects when no service worker is registered", async () => {
    // jsdom doesn't have a service worker by default
    const { result } = renderHook(() => useOnlineStatus());

    await expect(result.current.queueCheckin({ lat: 0, lng: 0 })).rejects.toThrow();
  });
});
