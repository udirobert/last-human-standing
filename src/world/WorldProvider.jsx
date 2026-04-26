import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { Tokens, tokenToDecimals } from "@worldcoin/minikit-js/commands";

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
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function WorldProvider({ children }) {
  const persisted = loadPersisted();

  const [isWorldApp, setIsWorldApp] = useState(false);
  const [installAttempted, setInstallAttempted] = useState(false);

  const [walletAuthed, setWalletAuthed] = useState(Boolean(persisted?.walletAuthed));
  const [entryPaid, setEntryPaid] = useState(Boolean(persisted?.entryPaid));
  const [worldIdVerified, setWorldIdVerified] = useState(Boolean(persisted?.worldIdVerified));
  const [user, setUser] = useState(persisted?.user ?? null);

  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    // MiniKit must be installed before using commands. This only becomes “installed”
    // when running inside World App.
    try {
      const appId = import.meta.env.VITE_WORLD_ID_APP_ID || undefined;
      MiniKit.install(appId ? { appId } : undefined);
    } catch (e) {
      // MiniKit.install() can throw in non-browser contexts; ignore.
      console.warn("MiniKit.install failed", e);
    } finally {
      setInstallAttempted(true);
      setIsWorldApp(MiniKit.isInstalled());
    }
  }, []);

  useEffect(() => {
    persist({ walletAuthed, entryPaid, worldIdVerified, user });
  }, [walletAuthed, entryPaid, worldIdVerified, user]);

  const prizePoolAddress =
    import.meta.env.VITE_PRIZE_POOL_ADDRESS || "0x0000000000000000000000000000000000000000";

  async function walletAuth() {
    setLastError(null);

    // Browser/demo mode: try to acquire a real server session via the dev shim
    // (only available when DEV_BYPASS_VERIFICATION=true on the server). If that
    // fails (prod), keep the local-only demo state so the UI still progresses.
    if (!MiniKit.isInstalled()) {
      try {
        const resp = await fetch("/api/dev/login", { method: "POST", credentials: "include" });
        if (resp.ok) {
          const json = await resp.json();
          setWalletAuthed(true);
          setUser({
            address: json.address,
            username: null,
            displayName: "Demo Human",
          });
          return { executedWith: "fallback", data: null };
        }
      } catch {
        // ignore — fall through to UI-only demo state
      }
      setWalletAuthed(true);
      setUser((u) => u ?? { address: null, username: null, displayName: "Demo Human" });
      return { executedWith: "fallback", data: null };
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
        setWalletAuthed(true);
        setUser((u) => u ?? { address: null, username: null, displayName: "Browser Dev" });
        return result;
      }

      const verifyResp = await fetch("/api/complete-siwe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payload: result.data,
          nonce,
        }),
      });
      if (!verifyResp.ok) {
        const text = await verifyResp.text();
        throw new Error(`SIWE verification failed: ${text}`);
      }
      const { address } = await verifyResp.json();

      // MiniKit may cache user metadata after auth (inside World App).
      const username = MiniKit.user?.username ?? null;

      setWalletAuthed(true);
      setUser({
        address,
        username,
        displayName: username ? `@${username}` : safeTruncateAddress(address),
      });

      return result;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Wallet auth failed");
      throw e;
    }
  }

  async function payEntryFee({
    amountWld = 1,
    description = "Entry fee to join the prize pool",
  } = {}) {
    setLastError(null);

    // Browser/demo mode: don't block the product loop on backend auth/payment.
    if (!MiniKit.isInstalled()) {
      setEntryPaid(true);
      return { executedWith: "fallback", data: null };
    }

    const refResp = await fetch("/api/pay/reference", {
      method: "POST",
      credentials: "include",
    });
    if (!refResp.ok) {
      const text = await refResp.text();
      throw new Error(`Reference request failed: ${text}`);
    }
    const { reference } = await refResp.json();

    try {
      const result = await MiniKit.pay({
        reference,
        to: prizePoolAddress,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(amountWld, Tokens.WLD).toString(),
          },
        ],
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
        body: JSON.stringify({ payload: result.data }),
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
  }

  async function signCheckIn(input) {
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
        // Persist the signed check-in server-side (hackathon demo backend).
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
  }

  async function sendWorldChat({ to, message }) {
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
  }

  const value = useMemo(
    () => ({
      isWorldApp,
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
      resetProgress: () => {
        setWalletAuthed(false);
        setEntryPaid(false);
        setWorldIdVerified(false);
        setUser(null);
        setLastError(null);
        persist({ walletAuthed: false, entryPaid: false, worldIdVerified: false, user: null });
      },
      setWorldIdVerified: (val) => setWorldIdVerified(Boolean(val)),
    }),
    [isWorldApp, installAttempted, walletAuthed, entryPaid, worldIdVerified, user, lastError, prizePoolAddress],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used within <WorldProvider />");
  return ctx;
}
