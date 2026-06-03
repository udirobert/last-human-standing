import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { Tokens, tokenToDecimals } from "@worldcoin/minikit-js/commands";

function detectFarcaster() {
  try {
    if (typeof window !== "undefined" && (window.farcaster || window.parent !== window)) {
      return Boolean(window.farcaster);
    }
  } catch (error) {
    void error;
  }
  return false;
}

const WorldContext = createContext(null);
const STORAGE_KEY = "lhs_world_state_v1";

function safeTruncateAddress(address) {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    void error;
    return null;
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    void error;
  }
}

export function WorldProvider({ children }) {
  const persisted = loadPersisted();

  const [isWorldApp, setIsWorldApp] = useState(false);
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [installAttempted, setInstallAttempted] = useState(false);
  const [walletAuthed, setWalletAuthed] = useState(Boolean(persisted?.walletAuthed));
  const [entryPaid, setEntryPaid] = useState(Boolean(persisted?.entryPaid));
  const [worldIdVerified, setWorldIdVerified] = useState(Boolean(persisted?.worldIdVerified));
  const [user, setUser] = useState(persisted?.user ?? null);
  const [lastError, setLastError] = useState(null);
  const [hasWorldAppId, setHasWorldAppId] = useState(false);

  const prizePoolAddress = import.meta.env.VITE_PRIZE_POOL_ADDRESS || "0x0000000000000000000000000000000000000000";

  const syncAuth = useCallback(async () => {
    try {
      const resp = await fetch("/api/me", { credentials: "include" });
      if (!resp.ok) {
        if (resp.status === 401) {
          setWalletAuthed(false);
          setEntryPaid(false);
          setWorldIdVerified(false);
          setUser(null);
        }
        return;
      }
      const json = await resp.json();
      if (json.isPaid) setEntryPaid(true);
      if (json.worldIdVerified || json.humanityVerified) setWorldIdVerified(true);
      if (json.username || json.address) {
        setUser((u) => ({
          address: json.address,
          username: json.username ?? u?.username ?? null,
          displayName: json.username ? `@${json.username}` : safeTruncateAddress(json.address),
        }));
      }
    } catch {
      // network error — keep local state
    }
  }, []);

  const walletAuth = useCallback(async () => {
    setLastError(null);

    if (!MiniKit.isInstalled()) {
      const err = "Wallet auth requires World App in production mode.";
      setLastError(err);
      throw new Error(err);
    }

    const nonceResp = await fetch("/api/nonce", { method: "POST" });
    if (!nonceResp.ok) {
      const text = await nonceResp.text();
      throw new Error(`Nonce request failed: ${text}`);
    }
    const { nonce } = await nonceResp.json();

    try {
      const result = await MiniKit.walletAuth({
        nonce,
        statement: "Sign in to Last Human Standing",
        expirationTime: new Date(Date.now() + 1000 * 60 * 30),
      });

      if (result.executedWith === "fallback") {
        const err = "Open this mini app inside World App to sign in.";
        setLastError(err);
        throw new Error(err);
      }

      const verifyResp = await fetch("/api/complete-siwe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payload: result.data, nonce }),
      });
      if (!verifyResp.ok) {
        const text = await verifyResp.text();
        throw new Error(`SIWE verification failed: ${text}`);
      }
      const { address } = await verifyResp.json();
      const username = MiniKit.user?.username ?? null;

      setWalletAuthed(true);
      setUser({ address, username, displayName: username ? `@${username}` : safeTruncateAddress(address) });
      await syncAuth();
      return result;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Wallet auth failed");
      throw e;
    }
  }, [syncAuth]);

  const payEntryFee = useCallback(async ({ amountWld = 1, description = "Entry fee to join the prize pool", referredBy = null } = {}) => {
    setLastError(null);

    if (!MiniKit.isInstalled()) {
      const err = "Payment in this flow requires World App. Use browser wallet checkout below.";
      setLastError(err);
      throw new Error(err);
    }

    const refResp = await fetch("/api/pay/reference", { method: "POST", credentials: "include" });
    if (!refResp.ok) {
      const text = await refResp.text();
      throw new Error(`Reference request failed: ${text}`);
    }
    const { reference } = await refResp.json();

    try {
      const result = await MiniKit.pay({
        reference,
        to: prizePoolAddress,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(amountWld, Tokens.WLD).toString() }],
        description,
        fallback: () => {
          alert("Open this mini app inside World App to complete payment.");
        },
      });

      if (result.executedWith === "fallback") return result;

      const confirmResp = await fetch("/api/pay/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payload: result.data, referredBy }),
      });
      if (!confirmResp.ok) {
        const text = await confirmResp.text();
        throw new Error(`Payment verification failed: ${text}`);
      }

      setEntryPaid(true);
      return result;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Payment failed");
      throw e;
    }
  }, [prizePoolAddress]);

  const signCheckIn = useCallback(async (input) => {
    setLastError(null);
    try {
      const message = typeof input === "string" ? input : input.message;
      const result = await MiniKit.signMessage({
        message,
        fallback: () => {
          alert("Open this mini app inside World App to sign a check-in.");
        },
      });

      if (result.executedWith !== "fallback") {
        await fetch("/api/checkin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            day: typeof input === "string" ? Math.floor(Date.now() / (1000 * 60 * 60 * 24)) : input.day,
            theme: typeof input === "string" ? "daily" : input.theme,
            caption: typeof input === "string" ? "" : input.caption,
            mediaPath: typeof input === "string" ? null : (input.mediaPath ?? null),
            isInfiltrator: typeof input === "string" ? false : Boolean(input.isInfiltrator),
            username: MiniKit.user?.username ?? user?.username ?? null,
            message,
            signature: result.data.signature,
            address: result.data.address,
          }),
        });
      }

      return result;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Signing failed");
      throw e;
    }
  }, [user]);

  const sendWorldChat = useCallback(async ({ to, message }) => {
    setLastError(null);
    const recipients = Array.isArray(to) ? to : [to].filter(Boolean);
    if (recipients.length === 0) throw new Error("Missing recipient username");

    try {
      const result = await MiniKit.chat({
        to: recipients,
        message,
        fallback: () => {
          alert("Open this mini app inside World App to message via World Chat.");
        },
      });
      return result;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Chat failed");
      throw e;
    }
  }, []);

  useEffect(() => {
    try {
      const appId = import.meta.env.VITE_WORLD_ID_APP_ID || undefined;
      setHasWorldAppId(Boolean(appId));
      if (appId) {
        MiniKit.install({ appId });
      }
    } catch (e) {
      console.warn("MiniKit.install failed", e);
    } finally {
      setInstallAttempted(true);
      setIsWorldApp(Boolean(import.meta.env.VITE_WORLD_ID_APP_ID) && MiniKit.isInstalled());
      setIsFarcaster(detectFarcaster());
    }
  }, []);

  // Reconcile client state with server on mount; clears stale local flags
  useEffect(() => {
    if (!hasWorldAppId) return undefined;
    const t = setTimeout(() => {
      syncAuth();
    }, 0);
    return () => clearTimeout(t);
  }, [hasWorldAppId, syncAuth]);

  useEffect(() => {
    if (!isFarcaster) return;
    import("@farcaster/miniapp-sdk").then(({ sdk }) => {
      sdk.actions.ready();
    }).catch(() => {});
  }, [isFarcaster]);

  useEffect(() => {
    persist({ walletAuthed, entryPaid, worldIdVerified, user });
  }, [walletAuthed, entryPaid, worldIdVerified, user]);

  const platform = isWorldApp ? "world" : isFarcaster ? "farcaster" : "browser";
  const isMiniApp = isWorldApp || isFarcaster;

  const markBrowserPaid = useCallback((address) => {
    setWalletAuthed(true);
    setEntryPaid(true);
    if (address) setUser((u) => u ?? { address, username: null, displayName: safeTruncateAddress(address) });
  }, []);

  const resetProgress = useCallback(() => {
    setWalletAuthed(false);
    setEntryPaid(false);
    setWorldIdVerified(false);
    setUser(null);
    setLastError(null);
    persist({ walletAuthed: false, entryPaid: false, worldIdVerified: false, user: null });
  }, []);

  const value = useMemo(
    () => ({
      isWorldApp,
      isFarcaster,
      isMiniApp,
      platform,
      hasWorldAppId,
      installAttempted,
      walletAuthed,
      entryPaid,
      worldIdVerified,
      user,
      lastError,
      prizePoolAddress,
      walletAuth,
      payEntryFee,
      signCheckIn,
      sendWorldChat,
      markBrowserPaid,
      resetProgress,
      setWorldIdVerified: (val) => setWorldIdVerified(Boolean(val)),
    }),
    [
      isWorldApp,
      isFarcaster,
      isMiniApp,
      platform,
      hasWorldAppId,
      installAttempted,
      walletAuthed,
      entryPaid,
      worldIdVerified,
      user,
      lastError,
      prizePoolAddress,
      walletAuth,
      payEntryFee,
      signCheckIn,
      sendWorldChat,
      markBrowserPaid,
      resetProgress,
    ],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used within <WorldProvider />");
  return ctx;
}
