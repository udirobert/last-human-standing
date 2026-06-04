import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { HUMANITY_PROVIDERS } from "../config/humanityProviders.js";

const SELF_SCOPE = "last-human-standing";

/**
 * SelfVerify — Self Protocol (Celo) proof-of-humanity verification.
 *
 * When VITE_ENABLE_SELF=true and @selfxyz/qrcode is installed,
 * this renders a QR-based scan flow. Otherwise it shows a fallback
 * that triggers the Self relayer flow via POST /api/self/verify.
 */
export default function SelfVerify() {
  const [status, setStatus] = useState("idle"); // idle | scanning | verifying | verified | error
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const selfEnabled = import.meta.env.VITE_ENABLE_SELF === "true";
  const self = HUMANITY_PROVIDERS.self;

  const handleVerify = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus("verifying");

    try {
      // Try to use Self QR code component if available
      let proofPayload;
      try {
        const { SelfApp, SelfAppQRCode } = await import("@selfxyz/qrcode");
        // Use the app disclosure flow — user scans QR with Self app
        proofPayload = await SelfAppQRCode.waitForProof();
      } catch {
        // Fallback: send a minimal payload and let the server guide the flow
        const resp = await fetch("/api/self/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            scope: SELF_SCOPE,
            // Server expects: attestationId, proof, publicSignals, nullifier
            // Sent as empty; server's SelfBackendVerifier will guide the relayer
          }),
        });

        if (!resp.ok) {
          const json = await resp.json().catch(() => ({}));
          // If server says self_not_configured, we need the client-side lib
          if (json.error === "self_not_configured" || json.error === "self_verifier_unavailable") {
            setError(`Self Protocol backend not ready. Set SELF_ENABLED=true and ensure @selfxyz/core is installed.`);
            setStatus("error");
            return;
          }
          throw new Error(json.error || "Verification request failed");
        }

        proofPayload = await resp.json();
      }

      if (proofPayload?.ok || proofPayload?.verified) {
        setStatus("verified");
      } else {
        setError(proofPayload?.error || "Verification failed");
        setStatus("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!selfEnabled) {
    return (
      <p className="text-dim text-xs font-mono text-center leading-relaxed">
        <span className="text-amber">Self on Celo</span> — set{" "}
        <code className="text-neon">VITE_ENABLE_SELF=true</code> to enable.{" "}
        <a href={self.docsUrl} className="text-neon underline" target="_blank" rel="noreferrer">
          Learn more
        </a>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blood/10 border border-blood/30 rounded-xl p-3"
        >
          <p className="text-blood text-xs font-mono">
            {error || "Self verification failed. Try again."}
          </p>
        </motion.div>
      )}

      {status === "verified" ? (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-neon/10 border border-neon/30 rounded-xl p-4 text-center"
        >
          <p className="text-2xl mb-1">✅</p>
          <p className="text-neon font-mono text-sm">Verified human (Self on Celo)</p>
        </motion.div>
      ) : (
        <button
          onClick={handleVerify}
          disabled={busy}
          className="w-full py-4 rounded-2xl bg-amber/10 border border-amber/40 text-amber font-display text-xl tracking-widest active:scale-95 transition-transform disabled:opacity-50"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-amber border-t-transparent animate-spin" />
              Verifying…
            </span>
          ) : (
            "VERIFY WITH SELF (CELO)"
          )}
        </button>
      )}

      {status === "idle" && (
        <p className="text-dim text-[10px] font-mono text-center">
          Scan with the Self app on Celo. Your identity proof stays private.
        </p>
      )}
    </div>
  );
}
