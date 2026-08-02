import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { Tokens, tokenToDecimals } from "@worldcoin/minikit-js/commands";

function constructSiweMessage({ domain, address, statement, uri, nonce, chainId, requestId }) {
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const lines = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    statement,
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationTime}`,
  ];
  if (requestId) {
    lines.push(`Request ID: ${requestId}`);
  }
  return lines.join("\n");
}

function detectFarcaster() {
  try {
    if (typeof window !== "undefined" && (window.farcaster || window.parent !== window)) {
      return true;
    }
  } catch (error) {
    void error;
  }
  return false;
}

if (typeof window !== "undefined" && (window.farcaster || window.parent !== window)) {
  import("@farcaster/miniapp-sdk").then(({ sdk }) => sdk.actions.ready()).catch(() => {});
}

export const WorldContext = createContext(null);
const STORAGE_KEY = "******************";

function safeTruncateAddress(address) {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function generateRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const [humanityProvider, setHumanityProvider] = useState(persisted?.humanityProvider ?? null);
  const [user, setUser] = useState(persisted?.user ?? null);
  const [farcasterUser, setFarcasterUser] = useState(persisted?.farcasterUser ?? null);
  const [lastError, setLastError] = useState(null);
  const [hasWorldAppId, setHasWorldAppId] = useState(false);
  const [hasQueuedCheckin, setHasQueuedCheckin] = useState(false);

  // Surface queued check-ins globally so home can show a chip after the
  // user navigates away from CheckIn. Cleared when the user submits
  // successfully or manually dismisses.
  const markQueuedCheckin = useCallback(() => setHasQueuedCheckin(true), []);
  const clearQueuedCheckin = useCallback(() => setHasQueuedCheckin(false), []);

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
      if (json.humanityProvider) setHumanityProvider(json.humanityProvider);
      if (json.username || json.address) {
        setUser((u) => ({
          address: json.address,
          username: json.username ?? u?.username ?? null,
          displayName: json.username ? `@${json.username}` : safeTruncateAddress(json.address),
          referralCode: json.referralCode ?? u?.referralCode ?? null,
          referralCount: json.referralCount ?? 0,
          reservedAt: json.reservedAt ?? null,
          cohort: json.cohort ?? u?.cohort ?? null,
          entryKind: json.entryKind ?? u?.entryKind ?? null,
        }));
      }
    } catch {
      // network error — keep local state
    }
  }, []);

  const walletAuth = useCallback(async () => {
    setLastError(null);

    const nonceResp = await fetch("/api/nonce", { method: "POST" });
    if (!nonceResp.ok) {
      const text = await nonceResp.text();
      throw new Error(`Nonce request failed: ${text}`);
    }
    const { nonce } = await nonceResp.json();
    const requestId = generateRequestId();
    const statement = "Sign in to Last Human Standing";

    if (isFarcaster) {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        const provider = await sdk.wallet.getEthereumProvider();
        const [address] = await provider.request({ method: "eth_requestAccounts" });
        const chainId = await provider.request({ method: "eth_chainId" });
        const domain = window.location.host;
        const uri = window.location.origin;

        const message = constructSiweMessage({
          domain,
          address,
          statement,
          uri,
          nonce,
          chainId: parseInt(chainId, 16),
          requestId,
        });

        const signature = await provider.request({
          method: "personal_sign",
          params: [message, address],
        });

        const verifyResp = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ payload: { message, signature, address }, nonce, statement, requestId }),
        });
        if (!verifyResp.ok) {
          const text = await verifyResp.text();
          throw new Error(`SIWE verification failed: ${text}`);
        }
        const { address: verifiedAddress } = await verifyResp.json();

        const ctx = sdk.context;
        const fcUser = ctx?.user
          ? { fid: ctx.user.fid, username: ctx.user.username, pfpUrl: ctx.user.pfpUrl, displayName: ctx.user.displayName || `@${ctx.user.username}` }
          : null;

        setWalletAuthed(true);
        setFarcasterUser(fcUser);
        setUser({ address: verifiedAddress, username: fcUser?.username ?? null, displayName: fcUser?.displayName ?? safeTruncateAddress(verifiedAddress) });
        await syncAuth();
        return { message, signature, address: verifiedAddress };
      } catch (e) {
        setLastError(e instanceof Error ? e.message : "Farcaster auth failed");
        throw e;
      }
    }

    if (!MiniKit.isInstalled()) {
      const err = "Wallet auth requires World App or Farcaster.";
      setLastError(err);
      throw new Error(err);
    }

    try {
      const result = await MiniKit.walletAuth({
        nonce,
        statement,
        requestId,
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
        body: JSON.stringify({ payload: result.data, nonce, statement, requestId }),
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
  }, [syncAuth, isFarcaster]);

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

      if (isFarcaster) {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        const provider = await sdk.wallet.getEthereumProvider();
        const [address] = await provider.request({ method: "eth_requestAccounts" });
        const signature = await provider.request({
          method: "personal_sign",
          params: [message, address],
        });
        await fetch("/api/checkin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            day: typeof input === "string" ? Math.floor(Date.now() / (1000 * 60 * 60 * 24)) : input.day,
            theme: typeof input === "string" ? "daily" : input.theme,
            caption: typeof input === "string" ? "" : input.caption,
            mediaPath: typeof input === "string" ? null : (input.mediaPath ?? null),
            photoHash: typeof input === "string" ? null : (input.photoHash ?? null),
            isInfiltrator: typeof input === "string" ? false : Boolean(input.isInfiltrator),
            username: farcasterUser?.username ?? user?.username ?? null,
            message,
            signature,
            address,
          }),
        });
        return { data: { signature, address } };
      }

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
            photoHash: typeof input === "string" ? null : (input.photoHash ?? null),
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
  }, [user, farcasterUser, isFarcaster]);

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
    // MiniKit.install is now performed by <MiniKitProvider> in main.jsx.
    // We just sync our derived flags (hasWorldAppId, isWorldApp,
    // isFarcaster) on mount.
    try {
      const appId = import.meta.env.VITE_MINI_APP_ID || import.meta.env.VITE_WORLD_ID_APP_ID || undefined;
      setHasWorldAppId(Boolean(appId));
    } catch (e) {
      console.warn("MiniKit install detection failed", e);
    } finally {
      setInstallAttempted(true);
      setIsWorldApp(MiniKit.isInstalled());
      setIsFarcaster(detectFarcaster());
    }
  }, []);

  // Reconcile client state with server on mount; clears stale local flags
  useEffect(() => {
    if (!hasWorldAppId && !isFarcaster) return undefined;
    const t = setTimeout(() => {
      syncAuth();
    }, 0);
    return () => clearTimeout(t);
  }, [hasWorldAppId, isFarcaster, syncAuth]);

  // Auto-auth for Farcaster users with connected wallets
  const autoAuthAttempted = useRef(false);
  useEffect(() => {
    if (!isFarcaster || walletAuthed || autoAuthAttempted.current) return;
    const doAutoAuth = async () => {
      autoAuthAttempted.current = true;
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        const ctx = sdk.context;
        if (!ctx?.user?.addresses?.length) return;
        const provider = await sdk.wallet.getEthereumProvider().catch(() => null);
        if (!provider) return;
        const [address] = await provider.request({ method: "eth_requestAccounts" }).catch(() => []);
        if (!address) return;
        const chainId = await provider.request({ method: "eth_chainId" }).catch(() => "0x2105");
        const domain = window.location.host;
        const uri = window.location.origin;
        const nonceResp = await fetch("/api/nonce", { method: "POST" });
        if (!nonceResp.ok) return;
        const { nonce } = await nonceResp.json();
        const autoRequestId = generateRequestId();
        const autoStatement = "Sign in to Last Human Standing";
        const message = constructSiweMessage({
          domain, address, statement: autoStatement, uri, nonce,
          chainId: parseInt(chainId, 16),
          requestId: autoRequestId,
        });
        const signature = await provider.request({ method: "personal_sign", params: [message, address] });
        const verifyResp = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ payload: { message, signature, address }, nonce, statement: autoStatement, requestId: autoRequestId }),
        });
        if (!verifyResp.ok) return;
        const { address: verifiedAddress } = await verifyResp.json();
        const fcUser = ctx?.user
          ? { fid: ctx.user.fid, username: ctx.user.username, pfpUrl: ctx.user.pfpUrl, displayName: ctx.user.displayName || `@${ctx.user.username}` }
          : null;
        setWalletAuthed(true);
        setFarcasterUser(fcUser);
        setUser({ address: verifiedAddress, username: fcUser?.username ?? null, displayName: fcUser?.displayName ?? safeTruncateAddress(verifiedAddress) });
      } catch {
        // silent — user can auth manually
      }
    };
    doAutoAuth();
  }, [isFarcaster, walletAuthed]);

  useEffect(() => {
    if (!isFarcaster) return;
    import("@farcaster/miniapp-sdk").then(({ sdk }) => {
      const ctx = sdk.context;
      if (ctx?.user) {
        setFarcasterUser({
          fid: ctx.user.fid,
          username: ctx.user.username,
          pfpUrl: ctx.user.pfpUrl,
          displayName: ctx.user.displayName || `@${ctx.user.username}`,
        });
      }
    }).catch(() => {});
  }, [isFarcaster]);

  useEffect(() => {
    persist({ walletAuthed, entryPaid, worldIdVerified, humanityProvider, user, farcasterUser });
  }, [walletAuthed, entryPaid, worldIdVerified, humanityProvider, user, farcasterUser]);

  const platform = isWorldApp ? "world" : isFarcaster ? "farcaster" : "browser";
  const isMiniApp = isWorldApp || isFarcaster;

  const markBrowserPaid = useCallback((address) => {
    setWalletAuthed(true);
    setEntryPaid(true);
    if (address) setUser((u) => u ?? { address, username: null, displayName: safeTruncateAddress(address) });
    syncAuth();
  }, [syncAuth]);

  const resetProgress = useCallback(() => {
    setWalletAuthed(false);
    setEntryPaid(false);
    setWorldIdVerified(false);
    setHumanityProvider(null);
    setUser(null);
    setFarcasterUser(null);
    setLastError(null);
    persist({ walletAuthed: false, entryPaid: false, worldIdVerified: false, user: null, farcasterUser: null });
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
      humanityProvider,
      user,
      farcasterUser,
      lastError,
      prizePoolAddress,
      hasQueuedCheckin,
      walletAuth,
      payEntryFee,
      signCheckIn,
      sendWorldChat,
      markBrowserPaid,
      markQueuedCheckin,
      clearQueuedCheckin,
      refreshAuth: syncAuth,
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
      humanityProvider,
      user,
      farcasterUser,
      lastError,
      prizePoolAddress,
      hasQueuedCheckin,
      walletAuth,
      payEntryFee,
      signCheckIn,
      sendWorldChat,
      markBrowserPaid,
      markQueuedCheckin,
      clearQueuedCheckin,
      syncAuth,
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
