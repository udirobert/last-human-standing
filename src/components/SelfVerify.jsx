import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useWorld } from "../world/WorldProvider.jsx";
import { useDelight } from "./DelightProvider.jsx";
import { HUMANITY_PROVIDERS } from "../config/humanityProviders.js";

const SELF_SCOPE = "last-human-standing";
const SELF_APP_NAME = "Last Human Standing";

/**
 * SelfVerify — Self Protocol (Celo) proof-of-humanity verification.
 *
 * Renders a QR code (and a deep-link button for mobile users who already
 * have the Self app) using the official @selfxyz/qrcode SDK. When the
 * user scans and the Self app submits a ZK proof, the relayer hits
 * POST /api/self/verify on our backend, which verifies the proof and
 * upserts the user's row. We poll /api/me to learn when it's done.
 *
 * Endpoint type: "staging_https" (Celo Sepolia, mock passports) for the
 * launch; flip SELF_MOCK_PASSPORT=false on the server to use mainnet
 * with real passports (one env var, no code change).
 */
export default function SelfVerify() {
  const { user, refreshAuth } = useWorld();
  const { celebrate, playSound } = useDelight();
  const [pollVerified, setPollVerified] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [modules, setModules] = useState(null);
  const [stuck, setStuck] = useState(false);

  const selfEnabled = import.meta.env.VITE_ENABLE_SELF === "true";
  const self = HUMANITY_PROVIDERS.self;
  const walletAddress = user?.address;

  // Lazy-load the SDK so it doesn't bloat the main bundle.
  useEffect(() => {
    if (!selfEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await import("@selfxyz/qrcode");
        if (!cancelled) setModules(m);
      } catch {
        if (!cancelled) setQrError("Self SDK not available. Install @selfxyz/qrcode.");
      }
    })();
    return () => { cancelled = true; };
  }, [selfEnabled]);

  // Build the SelfApp config once we have the SDK and a wallet address.
  // useMemo (not useEffect+setState) so the linter doesn't complain about
  // setState in an effect — building the SelfApp is pure, no side effects.
  const buildError = useMemo(() => {
    if (!modules || !walletAddress || !selfEnabled) return null;
    try {
      const endpoint =
        import.meta.env.VITE_SELF_VERIFY_ENDPOINT ||
        `${window.location.origin}/api/self/verify`;
      const app = new modules.SelfAppBuilder({
        version: 2,
        appName: SELF_APP_NAME,
        scope: SELF_SCOPE,
        endpoint,
        userId: walletAddress,
        endpointType: "staging_https", // staging for launch; flip server env to mainnet later
        userIdType: "hex",
        disclosures: {
          minimumAge: 18,
          nationality: true,
          gender: true,
        },
      }).build();
      return { app, error: null };
    } catch (e) {
      return { app: null, error: e instanceof Error ? e.message : "Failed to build Self app" };
    }
  }, [modules, walletAddress, selfEnabled]);

  const selfApp = buildError?.app ?? null;
  const buildErrMsg = buildError?.error ?? null;

  // Poll /api/me while the QR is showing; flip to "verified" when the
  // server has written the Self nullifier for our wallet. Cap the poll
  // at 60s — if the server never confirms, surface "still waiting" so
  // the user isn't left in a permanent loading state with a leaked
  // interval.
  useEffect(() => {
    if (!selfApp || !walletAddress) return;
    let stopped = false;
    const startedAt = Date.now();
    const TIMEOUT_MS = 60_000;
    const tick = async () => {
      if (stopped) return;
      if (Date.now() - startedAt > TIMEOUT_MS) {
        if (!stopped) setStuck(true);
        return;
      }
      try {
        const resp = await fetch("/api/me", { credentials: "include" });
        if (!resp.ok) return;
        const json = await resp.json();
        if (json.humanityProvider === "self" && json.humanityVerified) {
          if (!stopped) {
            setPollVerified(true);
            // Celebrate the trust upgrade — same grammar as the
            // "YOU'RE IN" finale so the verify path doesn't feel flat.
            playSound('victory');
            celebrate(15);
            refreshAuth?.();
          }
        }
      } catch { /* keep polling */ }
    };
    const interval = setInterval(tick, 3000);
    tick();
    return () => { stopped = true; clearInterval(interval); };
    // celebrate/playSound come from useDelight; celebrate is recreated on
    // every render (its closure reads confettiKey), so including them in
    // deps would restart the poll on every render — disable the rule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfApp, walletAddress, refreshAuth]);

  // Status is derived: build error > qr error > verified (poll or callback) > ready (built) > idle
  const status = buildErrMsg || qrError
    ? "error"
    : pollVerified
      ? "verified"
      : selfApp
        ? "ready"
        : "idle";
  const errorMessage = buildErrMsg || qrError;

  const handleManualVerify = useCallback(() => {
    setQrError("Scan the QR with the Self app, or tap the deep link below.");
  }, []);

  const universalLink = useMemo(() => {
    if (!selfApp || !modules) return null;
    try { return modules.getUniversalLink(selfApp); } catch { return null; }
  }, [selfApp, modules]);

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

  if (!walletAddress) {
    return (
      <p className="text-dim text-xs font-mono text-center">
        Sign in with your wallet first to verify with Self.
      </p>
    );
  }

  if (status === "verified") {
    return (
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-neon/10 border border-neon/30 rounded-xl p-4 text-center"
      >
        <p className="text-2xl mb-1">✅</p>
        <p className="text-neon font-mono text-sm">Verified human (Self on Celo)</p>
      </motion.div>
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
            {errorMessage || "Self verification failed. Try again."}
          </p>
        </motion.div>
      )}

      {selfApp && modules ? (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-bone p-3 rounded-xl">
            <modules.SelfQRcodeWrapper
              selfApp={selfApp}
              onSuccess={() => {
                setPollVerified(true);
                // Celebrate the trust upgrade — same grammar as the
                // "YOU'RE IN" finale so the verify path doesn't feel flat.
                playSound('victory');
                celebrate(15);
                refreshAuth?.();
              }}
              onError={(e) => {
                const reason = e?.reason || e?.error_code || e?.message || "Something went wrong. Try again or use the deep link below.";
                setQrError(reason);
              }}
              size={220}
            />
          </div>
          {universalLink && (
            <a
              href={universalLink}
              target="_blank"
              rel="noreferrer"
              className="text-dim font-mono text-xs underline text-center"
            >
              📱 Open in Self app (deep link)
            </a>
          )}
          <p className="text-dim text-[10px] font-mono text-center max-w-[260px]">
            Staging (mock passport). Server env SELF_MOCK_PASSPORT=false flips to mainnet.
          </p>
        </div>
      ) : (
        <p className="text-dim text-xs font-mono text-center">Loading Self SDK…</p>
      )}

      {stuck && !pollVerified && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 p-3 text-center">
          <p className="text-amber font-mono text-xs">
            Still waiting for Self proof. This usually takes 30–60 seconds.
          </p>
          <button
            type="button"
            onClick={() => { setStuck(false); }}
            className="mt-2 text-amber font-mono text-[10px] underline decoration-dotted underline-offset-2"
          >
            I just verified — check again
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleManualVerify}
        className="w-full py-3 rounded-xl bg-smoke border border-ember text-bone font-mono text-xs active:scale-95 transition-transform"
      >
        I already verified
      </button>
    </div>
  );
}
