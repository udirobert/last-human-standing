import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIDKitRequest, proofOfHuman } from "@worldcoin/idkit";
import QRCode from "qrcode";
import { useWorld } from "./WorldProvider.jsx";
import { useDelight } from "../components/DelightProvider.jsx";

// World ID 4.0 (current spec) — see docs.world.org/idkit/integrate.
// Uses the lower-level `useIDKitRequest` hook so we can render a
// custom QR + deep-link card that matches the Self verify card
// visually. The hook returns `connectorURI` (a world.org/verify URL
// that opens World App on mobile) which we render as both a QR code
// and a deep link — same UX as Self, same trust tier weight.
//
// NOTE: the Orb proof is cryptographically bound to a `signal` string.
// We use the connected wallet address so the resulting nullifier is
// per-person-per-wallet (the server stores nullifier → wallet in DB).
// If the user hasn't connected a wallet yet, we render an explicit
// "sign in first" state instead of silently sending an empty signal —
// an empty signal produces proofs that can't be tied to any wallet
// and is the most common cause of "I can't register with World ID".

const POLL_TIMEOUT_MS = 60_000;

// Subcomponent: only mounted once we have a real rp_context. Splitting
// this out avoids running the polling hook with a placeholder config
// (which would generate fake /v4/verify calls on every render).
function VerifyCard({
  idkitConfig,
  rpContext,
  walletAddress,
  onSuccess,
  onError,
}) {
  const { celebrate, playSound } = useDelight();
  const celebratedRef = useRef(false);
  const [stuck, setStuck] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [qrSvg, setQrSvg] = useState(null);

  const {
    open,
    connectorURI,
    isSuccess,
    isError,
    result,
    errorCode,
    reset: resetIdkit,
  } = useIDKitRequest(idkitConfig);

  // Render the connectorURI as an inline SVG so we don't need a
  // <canvas>. Recomputes only when the URI changes.
  useEffect(() => {
    if (!connectorURI) {
      setQrSvg(null);
      return;
    }
    let cancelled = false;
    QRCode.toString(connectorURI, {
      type: "svg",
      margin: 1,
      width: 220,
      color: { dark: "#0a0a0a", light: "#f8f4ec" },
      errorCorrectionLevel: "M",
    })
      .then((svg) => { if (!cancelled) setQrSvg(svg); })
      .catch(() => { if (!cancelled) setQrSvg(null); });
    return () => { cancelled = true; };
  }, [connectorURI]);

  // Forward the IDKit result to our backend for nullifier storage.
  // We do this in an effect (not in onSuccess) because the hook only
  // returns a single success state — handleVerify-style forwarding
  // isn't part of the hook API.
  useEffect(() => {
    if (!isSuccess || !result || !rpContext || celebratedRef.current) return;
    celebratedRef.current = true;
    (async () => {
      try {
        const resp = await fetch("/api/idkit/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            rp_id: rpContext.rp_id,
            idkitResponse: result,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          setVerifyError(text || "World ID verification failed");
          celebratedRef.current = false;
          onError?.(text || "World ID verification failed");
          return;
        }
        // Celebrate the trust upgrade — same grammar as the
        // "YOU'RE IN" finale so the verify path doesn't feel flat.
        playSound("victory");
        celebrate(15);
        onSuccess?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setVerifyError(msg);
        celebratedRef.current = false;
        onError?.(msg);
      }
    })();
  }, [isSuccess, result, rpContext, playSound, celebrate, onSuccess, onError]);

  // 60s UX timeout. The hook's own polling has no UX timeout, so we
  // surface a "still waiting" affordance so the user isn't stranded.
  useEffect(() => {
    if (!connectorURI || isSuccess || isError) return undefined;
    const id = setTimeout(() => setStuck(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [connectorURI, isSuccess, isError]);

  // Surface hook-level errors with a clear cause.
  useEffect(() => {
    if (isError && errorCode) {
      setVerifyError(String(errorCode));
      onError?.(String(errorCode));
    }
  }, [isError, errorCode, onError]);

  const handleOpen = useCallback(() => {
    setStuck(false);
    setVerifyError(null);
    celebratedRef.current = false;
    open();
  }, [open]);

  const handleRetry = useCallback(() => {
    setStuck(false);
    setVerifyError(null);
    celebratedRef.current = false;
    resetIdkit();
  }, [resetIdkit]);

  return (
    <div className="space-y-3">
      {verifyError && (
        <div className="rounded-xl border border-blood/30 bg-blood/10 p-3">
          <p className="text-blood font-mono text-xs">{verifyError}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        {qrSvg ? (
          <div
            className="bg-bone p-3 rounded-xl"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            aria-label="World ID verification QR code"
            role="img"
          />
        ) : (
          <div className="bg-bone p-3 rounded-xl w-[244px] h-[244px] flex items-center justify-center">
            <p className="text-ash font-mono text-xs">Loading QR…</p>
          </div>
        )}
        {connectorURI && (
          <a
            href={connectorURI}
            target="_blank"
            rel="noreferrer"
            className="text-dim font-mono text-xs underline text-center"
          >
            📱 Open in World App (deep link)
          </a>
        )}
        {import.meta.env.DEV && (
          <p className="text-dim text-[10px] font-mono text-center max-w-[260px]">
            Staging (mock passport) — flip server env to mainnet for prod proofs.
          </p>
        )}
      </div>

      {stuck && !isSuccess && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-3 text-center">
          <p className="text-amber font-mono text-xs">
            Still waiting for World ID proof. This usually takes under 30 seconds.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 text-amber font-mono text-[10px] underline decoration-dotted underline-offset-2"
          >
            I just verified — start over
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpen}
        className="w-full py-3 rounded-xl bg-smoke border border-ember text-bone font-mono text-xs active:scale-95 transition-transform"
      >
        Open World ID again
      </button>
    </div>
  );
}

export default function WorldIdVerify() {
  const { setWorldIdVerified, user, walletAuth, walletAuthed } = useWorld();

  const appId = import.meta.env.VITE_WORLD_ID_APP_ID;
  const enabled = import.meta.env.VITE_ENABLE_IDKIT === "true";
  const action = import.meta.env.VITE_WORLD_ID_ACTION || "last-human-standing";
  const walletAddress = user?.address;

  const [rpContext, setRpContext] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [fetchingContext, setFetchingContext] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState(null);

  const fetchRpContext = useCallback(async () => {
    setFetchingContext(true);
    setFetchError(null);
    try {
      const resp = await fetch("/api/idkit/rp-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `rp-context failed (${resp.status})`);
      }
      const data = await resp.json();
      if (!data?.rp_context) throw new Error("rp-context missing rp_context field");
      return data.rp_context;
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setFetchingContext(false);
    }
  }, [action]);

  const handleConnectWallet = useCallback(async () => {
    setConnecting(true);
    setWalletError(null);
    try {
      await walletAuth();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/no.*wallet|no.*provider|not.*detected/i.test(msg)) {
        setWalletError("No wallet detected — open inside World App or a wallet browser.");
      } else if (/reject|deny|user/i.test(msg)) {
        setWalletError("Signature rejected — try again to verify.");
      } else {
        setWalletError(msg || "Wallet connect failed. Try again.");
      }
    } finally {
      setConnecting(false);
    }
  }, [walletAuth]);

  const idkitConfig = useMemo(() => {
    if (!rpContext || !appId || !walletAddress) return null;
    return {
      app_id: appId,
      action,
      rp_context: rpContext,
      allow_legacy_proofs: true,
      // proofOfHuman is the current World ID 4.0 credential and still
      // accepts legacy Orb proofs as a fallback via allow_legacy_proofs.
      preset: proofOfHuman({ signal: walletAddress }),
      polling: { interval: 2000, timeout: 0 }, // 0 = poll forever; we manage UX timeout ourselves
    };
  }, [rpContext, appId, action, walletAddress]);

  const handleStart = useCallback(async () => {
    if (!rpContext) {
      const ctx = await fetchRpContext();
      if (ctx) setRpContext(ctx);
    }
  }, [rpContext, fetchRpContext]);

  if (!enabled) return null;

  if (!appId) {
    return (
      <p className="text-blood text-xs font-mono text-center">
        Missing VITE_WORLD_ID_APP_ID (World ID disabled)
      </p>
    );
  }

  // Explicit no-wallet state. Don't render the QR — it would point
  // to a flow that produces a proof with an empty signal which the
  // server can't bind to a user.
  if (!walletAddress) {
    return (
      <div className="w-full space-y-2">
        <p className="text-dim text-xs font-mono text-center leading-relaxed">
          World ID verification is bound to your wallet, so sign in first.
        </p>
        <button
          type="button"
          onClick={handleConnectWallet}
          disabled={connecting || walletAuthed}
          className="w-full font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all bg-neon/10 border border-neon/40 text-neon disabled:opacity-60"
        >
          {connecting ? "CONNECTING…" : walletAuthed ? "WALLET READY" : "CONNECT WALLET TO VERIFY"}
        </button>
        {walletError && (
          <p className="text-blood font-mono text-xs text-center leading-relaxed">
            {walletError}
          </p>
        )}
      </div>
    );
  }

  if (idkitConfig) {
    return (
      <VerifyCard
        idkitConfig={idkitConfig}
        rpContext={rpContext}
        walletAddress={walletAddress}
        onSuccess={() => setWorldIdVerified(true)}
        onError={() => { /* surface is handled inside the card */ }}
      />
    );
  }

  // No rp_context yet — show a button that fetches one on click, then
  // the next render shows the QR card. Avoids pre-warming an unused
  // context and sidesteps the setState-in-effect lint rule.
  return (
    <div className="w-full space-y-2">
      {fetchError && (
        <p className="text-blood text-xs font-mono text-center">{fetchError}</p>
      )}
      <button
        type="button"
        onClick={handleStart}
        disabled={fetchingContext}
        className="w-full font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all bg-neon/10 border border-neon/40 text-neon disabled:opacity-60"
      >
        {fetchingContext ? "LOADING…" : "VERIFY WORLD ID"}
      </button>
    </div>
  );
}
