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
  const [user, setUser] = useState(persisted?.user ?? null);

  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    // MiniKit must be installed before using commands. This only becomes “installed”
    // when running inside World App.
    try {
      MiniKit.install();
    } catch (e) {
      // MiniKit.install() can throw in non-browser contexts; ignore.
      console.warn("MiniKit.install failed", e);
    } finally {
      setInstallAttempted(true);
      setIsWorldApp(MiniKit.isInstalled());
    }
  }, []);

  useEffect(() => {
    persist({ walletAuthed, entryPaid, user });
  }, [walletAuthed, entryPaid, user]);

  const prizePoolAddress =
    import.meta.env.VITE_PRIZE_POOL_ADDRESS || "0x0000000000000000000000000000000000000000";

  async function walletAuth() {
    setLastError(null);
    const nonce = crypto.randomUUID().replaceAll("-", "").slice(0, 16); // alphanumeric, >= 8 chars

    try {
      const result = await MiniKit.walletAuth({
        nonce,
        statement: "Sign in to Last Human Standing",
        expirationTime: new Date(Date.now() + 1000 * 60 * 30),
        fallback: async () => {
          // Browser fallback: simulate a login for local dev.
          return {
            executedWith: "fallback",
            data: {
              address: "0x0000000000000000000000000000000000000000",
              message: "",
              signature: "",
            },
          };
        },
      });

      if (result.executedWith === "fallback") {
        setWalletAuthed(true);
        setUser((u) => u ?? { address: null, username: null, displayName: "Browser Dev" });
        return result;
      }

      const address = result.data.address;
      // MiniKit may cache user metadata after auth.
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
    const reference = crypto.randomUUID();

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

      setEntryPaid(true);
      return result;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Payment failed");
      throw e;
    }
  }

  async function signCheckIn(message) {
    setLastError(null);
    try {
      const result = await MiniKit.signMessage({
        message,
        fallback: () => {
          alert("Open this mini app inside World App to sign a check-in.");
        },
      });
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
        setUser(null);
        setLastError(null);
        persist({ walletAuthed: false, entryPaid: false, user: null });
      },
    }),
    [isWorldApp, installAttempted, walletAuthed, entryPaid, user, lastError, prizePoolAddress],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used within <WorldProvider />");
  return ctx;
}

