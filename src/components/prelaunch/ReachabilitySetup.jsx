import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MiniKit } from "@worldcoin/minikit-js";
import PushOptIn from "../PushOptIn.jsx";
import { HumanCta } from "../ui/CraftCta.jsx";

/**
 * Pre-reserve reachability wizard — wallet + notifications + contact.
 * Required before free seat claim. Paid entry skips this (push still encouraged in lobby).
 */
export default function ReachabilitySetup({
  walletAuthed,
  onWalletAuth,
  authing,
  isWorldApp,
  isFarcaster,
  farcasterUser,
  user,
  onEligible,
  onFreeEntry,
  freeEntryBusy,
  humanityRequired = false,
  humanityVerified = false,
}) {
  const [email, setEmail] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tgLink, setTgLink] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/profile/reachability", { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json();
      setState(data);
      if (data.eligible) onEligible?.(data);
    } catch {
      /* ignore */
    }
  }, [onEligible]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!walletAuthed) return;
    const platform = isWorldApp ? "world" : isFarcaster ? "farcaster" : "browser";
    const body = {
      platform,
      username: user?.username || farcasterUser?.username || MiniKit.user?.username || null,
      farcasterFid: farcasterUser?.fid ?? null,
    };
    fetch("/api/profile/sync-platform", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(() => refresh()).catch(() => {});
  }, [walletAuthed, isWorldApp, isFarcaster, user, farcasterUser, refresh]);

  const saveContact = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/profile/contact", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          telegramUsername: telegramHandle.trim() || undefined,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "save_failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save contact info");
    } finally {
      setSaving(false);
    }
  };

  const requestTelegramLink = async () => {
    setError(null);
    try {
      const r = await fetch("/api/profile/telegram-link", { method: "POST", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "telegram_link_failed");
      setTgLink(data.url);
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Telegram link failed");
    }
  };

  const missing = state?.missing ?? ["wallet", "notifications", "contact"];
  const eligible = Boolean(state?.eligible);
  const claimBlocked = humanityRequired && !humanityVerified;

  return (
    <div className="space-y-3">
      <div className="bg-smoke/80 border border-neon/30 rounded-3xl p-5">
        <p className="font-display text-xl text-neon mb-1">Before you&apos;re in</p>
        <p className="text-bone/70 text-sm font-body leading-relaxed mb-4">
          Free seats need a wallet, live round alerts, and a way to reach you
          (email or Telegram). World App and Farcaster players get alerts in-app when enabled.
        </p>

        <ol className="space-y-3 text-sm font-body">
          <Step done={walletAuthed} label="Connect wallet">
            {!walletAuthed && onWalletAuth && (
              <HumanCta onClick={onWalletAuth} disabled={authing} className="mt-2 w-full text-sm py-2">
                {authing ? "Connecting…" : "Connect wallet →"}
              </HumanCta>
            )}
          </Step>

          <Step
            done={!missing.includes("notifications")}
            label="Enable round notifications"
          >
            <div className="mt-2">
              <PushOptIn />
            </div>
          </Step>

          <Step
            done={!missing.includes("contact")}
            label="Contact fallback (email or Telegram bot)"
          >
            <div className="mt-2 space-y-2">
              {!isWorldApp && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-ash border border-ember/50 rounded-xl px-3 py-2 text-bone text-sm font-mono"
                />
              )}
              {isWorldApp && (
                <p className="text-dim text-xs font-mono">
                  World App push counts as your in-app channel — email optional.
                </p>
              )}
              {isFarcaster && farcasterUser?.username && (
                <p className="text-neon text-xs font-mono">
                  Farcaster: @{farcasterUser.username} (fid {farcasterUser.fid})
                </p>
              )}
              <input
                type="text"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                placeholder="@telegram (optional backup)"
                className="w-full bg-ash border border-ember/50 rounded-xl px-3 py-2 text-bone text-sm font-mono"
              />
              {state?.telegramConfigured && (
                <button
                  type="button"
                  onClick={requestTelegramLink}
                  className="w-full py-2 rounded-xl border border-amber/40 text-amber font-mono text-xs"
                >
                  Link Telegram bot for DM alerts →
                </button>
              )}
              {tgLink && (
                <p className="text-dim text-[10px] font-mono break-all">
                  Opened {tgLink} — tap Start in Telegram, then return here.
                </p>
              )}
              <button
                type="button"
                onClick={saveContact}
                disabled={saving || !walletAuthed}
                className="w-full py-2 rounded-xl bg-ember text-bone font-mono text-xs disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save contact info"}
              </button>
            </div>
          </Step>
        </ol>

        {error && <p className="text-blood text-xs font-mono mt-3">{error}</p>}

        {eligible && claimBlocked && (
          <p className="text-amber text-[10px] font-mono mt-3 text-center">
            Verify your humanity above to unlock the free seat claim.
          </p>
        )}

        {eligible && onFreeEntry && !claimBlocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <HumanCta
              onClick={onFreeEntry}
              disabled={freeEntryBusy}
              className="w-full !bg-neon !text-ash"
            >
              {freeEntryBusy ? "Claiming…" : "Claim my free seat →"}
            </HumanCta>
          </motion.div>
        )}

        {!eligible && walletAuthed && (
          <p className="text-dim text-[10px] font-mono mt-3 text-center">
            Complete the steps above to unlock free entry.
          </p>
        )}
      </div>
    </div>
  );
}

function Step({ done, label, children }) {
  return (
    <li className="flex gap-3 items-start">
      <span
        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
          done ? "bg-neon/20 text-neon" : "bg-ember/30 text-dim"
        }`}
      >
        {done ? "✓" : "·"}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-mono text-xs ${done ? "text-neon" : "text-bone"}`}>{label}</p>
        {children}
      </div>
    </li>
  );
}
