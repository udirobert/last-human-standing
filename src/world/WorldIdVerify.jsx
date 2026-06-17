import { useCallback, useState } from "react";
import { IDKitRequestWidget, orbLegacy } from "@worldcoin/idkit";
import { useWorld } from "./WorldProvider.jsx";

// World ID 4.0 (current spec) — see docs.world.org/idkit/integrate.
// Replaces the legacy IDKitWidget (3.0) flow. The new widget requires a
// server-signed rp_context, fetched on demand from /api/idkit/rp-context.
//
// NOTE: the Orb proof is cryptographically bound to a `signal` string.
// We use the connected wallet address so the resulting nullifier is
// per-person-per-wallet (the server stores nullifier → wallet in DB).
// If the user hasn't connected a wallet yet, we render an explicit
// "sign in first" state instead of silently sending an empty signal —
// an empty signal produces proofs that can't be tied to any wallet
// and is the most common cause of "I can't register with World ID".
export default function WorldIdVerify() {
  const { setWorldIdVerified, user, walletAuth, walletAuthed } = useWorld();

  const appId = import.meta.env.VITE_WORLD_ID_APP_ID;
  const enabled = import.meta.env.VITE_ENABLE_IDKIT === "true";
  const action = import.meta.env.VITE_WORLD_ID_ACTION || "last-human-standing";
  const walletAddress = user?.address;

  const [rpContext, setRpContext] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [fetchingContext, setFetchingContext] = useState(false);
  const [connecting, setConnecting] = useState(false);

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
    try {
      await walletAuth();
    } catch {
      // walletAuth surfaces its own error via lastError in WorldProvider;
      // swallow here so we don't double-render the message.
    } finally {
      setConnecting(false);
    }
  }, [walletAuth]);

  if (!enabled) return null;

  if (!appId) {
    return (
      <p className="text-blood text-xs font-mono text-center">
        Missing VITE_WORLD_ID_APP_ID (World ID disabled)
      </p>
    );
  }

  // Explicit no-wallet state. Don't render the widget — it would submit
  // a proof with an empty signal which the server can't bind to a user.
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
      </div>
    );
  }

  // Once we have an rp_context, render the widget so the user can open
  // it on click. The widget itself handles the World App flow.
  if (rpContext) {
    return (
      <div className="w-full space-y-2">
        {(fetchError || verifyError) && (
          <p className="text-blood text-xs font-mono text-center">
            {fetchError || verifyError}
          </p>
        )}
        <IDKitRequestWidget
          app_id={appId}
          action={action}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={orbLegacy({ signal: walletAddress })}
          handleVerify={async (result) => {
            setVerifyError(null);
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
              throw new Error(text || "World ID verification failed");
            }
          }}
          onSuccess={() => {
            setWorldIdVerified(true);
          }}
          onError={(code) => {
            setVerifyError(String(code));
          }}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={open}
              className="w-full font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all bg-neon/10 border border-neon/40 text-neon"
            >
              VERIFY WORLD ID
            </button>
          )}
        </IDKitRequestWidget>
      </div>
    );
  }

  // No rp_context yet — show a button that fetches one on click, then
  // the next render shows the widget above. Avoids pre-warming an
  // unused context and sidesteps the setState-in-effect lint rule.
  return (
    <div className="w-full space-y-2">
      {(fetchError || verifyError) && (
        <p className="text-blood text-xs font-mono text-center">
          {fetchError || verifyError}
        </p>
      )}
      <button
        type="button"
        disabled={fetchingContext}
        onClick={async () => {
          const ctx = await fetchRpContext();
          if (ctx) setRpContext(ctx);
        }}
        className="w-full font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all bg-neon/10 border border-neon/40 text-neon disabled:opacity-60"
      >
        {fetchingContext ? "LOADING…" : "VERIFY WORLD ID"}
      </button>
    </div>
  );
}
