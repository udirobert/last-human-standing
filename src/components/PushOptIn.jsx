import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MiniKit } from "@worldcoin/minikit-js";
import {
  subscribePush,
  unsubscribePush,
  getPushStatus,
  subscribeWorldPush,
  unsubscribeWorldPush,
  getWorldPushStatus,
} from "../lib/pushClient.js";

/**
 * PushOptIn — toggle component for enabling/disabling push notifications.
 * Uses MiniKit.requestPermission() inside World App, and the browser
 * PushManager + VAPID outside of it.
 */
export default function PushOptIn() {
  const [status, setStatus] = useState("loading"); // loading | unsupported | unconfigured | off | on | error
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  const isWorldApp = typeof window !== "undefined" && MiniKit.isInstalled();

  // Fetch status on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        if (isWorldApp) {
          const { subscribed } = await getWorldPushStatus();
          if (!cancelled) setStatus(subscribed ? "on" : "off");
          return;
        }

        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          if (!cancelled) setStatus("unsupported");
          return;
        }
        const resp = await fetch("/api/push/vapid-key");
        if (!resp.ok) {
          if (!cancelled) setStatus("unconfigured");
          return;
        }
        const { subscribed } = await getPushStatus();
        if (!cancelled) setStatus(subscribed ? "on" : "off");
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [isWorldApp]);

  const handleEnable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (isWorldApp) {
        await subscribeWorldPush();
      } else {
        // Browser PushManager path
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError("Permission denied");
          setStatus("off");
          return;
        }
        const resp = await fetch("/api/push/vapid-key");
        const { publicKey } = await resp.json();
        await subscribePush(publicKey);
      }
      setStatus("on");
      // Brief "Subscribed!" beat so the user gets explicit confirmation
      // instead of a silent toggle flip.
      setJustEnabled(true);
      setTimeout(() => setJustEnabled(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, [isWorldApp]);

  const handleDisable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (isWorldApp) {
        await unsubscribeWorldPush();
      } else {
        await unsubscribePush();
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, [isWorldApp]);

  if (status === "loading") return null;
  if (status === "unsupported") return null;
  if (status === "unconfigured") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-smoke border border-ember rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{status === "on" ? "🔔" : "🔕"}</span>
        <div className="flex-1">
          <p className="font-mono text-bone text-sm">
            Round notifications
          </p>
          <p className="text-dim text-[11px] font-mono mt-1">
            {status === "on"
              ? "We'll ping you when a new round opens and when you're eliminated."
              : "Get notified the moment a new round opens."}
          </p>
          {error && (
            <p className="text-blood text-[11px] font-mono mt-1">{error}</p>
          )}
          {justEnabled && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-neon text-[11px] font-mono mt-1"
            >
              ✓ Subscribed — we&apos;ll ping you when a round opens.
            </motion.p>
          )}
        </div>
        <button
          onClick={status === "on" ? handleDisable : handleEnable}
          disabled={busy}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-[transform,background-color,color,border-color] active:scale-95 ${
            status === "on"
              ? "bg-ember text-bone border border-ember"
              : "bg-amber text-ash"
          } disabled:opacity-50`}
        >
          {busy ? "..." : status === "on" ? "Off" : "Enable"}
        </button>
      </div>
    </motion.div>
  );
}
