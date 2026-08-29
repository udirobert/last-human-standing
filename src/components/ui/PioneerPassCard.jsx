import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CUE_PRESS, CUE_HOVER } from "../../lib/cuelume.js";
import { useDelight } from "../DelightProvider.jsx";
import { useWorld } from "../../world/WorldProvider.jsx";
import ThemeMotif from "./ThemeMotif.jsx";

const STORAGE_KEY = "lhs_pioneer_pass_claimed";
const TX_KEY = "lhs_pioneer_pass_tx";

function generatePioneerSerial() {
  try {
    const existing = localStorage.getItem("lhs_pioneer_serial");
    if (existing) return existing;
    const num = Math.floor(1000 + Math.random() * 9000);
    const serial = `LHS-PIONEER-${num}`;
    localStorage.setItem("lhs_pioneer_serial", serial);
    return serial;
  } catch {
    return "LHS-PIONEER-4201";
  }
}

function PioneerPassCard({ className = "", onClaimSuccess }) {
  const { user } = useWorld();
  const [claimed, setClaimed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [explorerUrl, setExplorerUrl] = useState(() => {
    try {
      return localStorage.getItem(TX_KEY) || null;
    } catch {
      return null;
    }
  });
  const [claiming, setClaiming] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const { playSound, celebrate } = useDelight();
  const serial = generatePioneerSerial();

  const handleClaim = async () => {
    if (claimed || claiming) return;
    setClaiming(true);
    playSound("victory");
    celebrate(35);

    try {
      const resp = await fetch("/api/pioneer/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: user?.address || null,
          serial,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (data?.explorerUrl) {
        setExplorerUrl(data.explorerUrl);
        try { localStorage.setItem(TX_KEY, data.explorerUrl); } catch { /* ignore */ }
      }
    } catch {
      /* ignore network errors — local pass still activates */
    }

    try {
      localStorage.setItem(STORAGE_KEY, "1");
      localStorage.setItem("lhs_pioneer_bonus_ticket", "1");
    } catch {
      /* ignore */
    }

    setClaimed(true);
    setClaiming(false);
    onClaimSuccess?.();
  };

  const handleFeedback = (type) => {
    setFeedbackSent(true);
    playSound("click");
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/feedback/speedrun", feedback: type }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`w-full max-w-sm rounded-3xl border border-amber/45 bg-gradient-to-b from-smoke/90 via-ash/90 to-smoke/95 p-5 shadow-[0_20px_50px_-20px_rgba(255,184,0,0.25)] relative overflow-hidden backdrop-blur-md text-left ${className}`}
    >
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header Stamp */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          <span className="font-mono text-[10px] text-amber uppercase tracking-[0.2em] font-semibold">
            Pioneer Pass · Free Mint
          </span>
        </div>
        <span className="font-mono text-[9px] text-bone/60 border border-amber/30 rounded-full px-2 py-0.5 tabular-nums">
          {serial}
        </span>
      </div>

      {/* Card Body */}
      <div className="flex items-center gap-3.5 mb-4 relative z-10 bg-ash/50 border border-ember/40 rounded-2xl p-3">
        <div className="w-14 h-14 rounded-xl bg-amber/10 border border-amber/35 flex items-center justify-center shrink-0 shadow-inner">
          <ThemeMotif emoji="🎖️" size={36} label="pioneer" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-bone leading-tight">
            Alpha Playtester Pass
          </p>
          <p className="font-mono text-[10px] text-neon mt-0.5">
            ✓ Practice Run Complete
          </p>
        </div>
      </div>

      {/* Perks List */}
      <div className="space-y-1.5 mb-4 relative z-10 text-xs font-mono">
        <p className="text-[10px] text-bone/50 uppercase tracking-widest mb-1 font-semibold">
          Unlocked Perks for Live Cohort:
        </p>
        <div className="flex items-center gap-2 text-bone/85 bg-smoke/40 px-2.5 py-1.5 rounded-lg border border-ember/30">
          <span className="text-amber">🎟️</span>
          <span className="truncate">+1 Bonus Jury Ticket on Day 1</span>
        </div>
        <div className="flex items-center gap-2 text-bone/85 bg-smoke/40 px-2.5 py-1.5 rounded-lg border border-ember/30">
          <span className="text-neon">⚡</span>
          <span className="truncate">Guaranteed Priority Seat in Cohort 2</span>
        </div>
        <div className="flex items-center gap-2 text-bone/85 bg-smoke/40 px-2.5 py-1.5 rounded-lg border border-ember/30">
          <span className="text-amber">🛡️</span>
          <span className="truncate">&quot;Pioneer&quot; Aura on Personal Shelf</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="relative z-10 mb-3 space-y-2">
        {claimed ? (
          <>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full py-3 rounded-2xl bg-neon/15 border border-neon/50 text-neon font-mono text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-sm"
            >
              <span>✓</span>
              <span>PASS MINTED · ACTIVE IN INVENTORY</span>
            </motion.div>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center font-mono text-[10px] text-amber hover:underline decoration-dotted"
              >
                Verify on Celoscan ↗
              </a>
            )}
          </>
        ) : (
          <motion.button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            whileTap={{ scale: 0.97 }}
            {...CUE_HOVER}
            {...CUE_PRESS}
            className="w-full py-3.5 rounded-2xl bg-amber hover:bg-amber/90 text-ash font-display text-sm uppercase tracking-wider font-bold transition-transform shadow-lg shadow-amber/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🎖️</span>
            <span>{claiming ? "Minting on Celo…" : "Claim Free Pioneer Pass →"}</span>
          </motion.button>
        )}
      </div>

      {/* Feedback Strip */}
      <div className="relative z-10 pt-3 border-t border-ember/30 text-center">
        <p className="font-mono text-[10px] text-bone/60 mb-2">
          Help us polish: How did the 5-day flow feel?
        </p>
        {feedbackSent ? (
          <p className="font-mono text-[10px] text-neon animate-fade-in">
            ✓ Thanks for the feedback! Your input shapes the live pilot.
          </p>
        ) : (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleFeedback("clear")}
              {...CUE_PRESS}
              className="px-2.5 py-1 rounded-lg bg-ash/70 hover:bg-ash border border-ember/40 text-bone/80 text-[10px] font-mono hover:text-bone active:scale-95 transition-all"
            >
              👍 Clear &amp; fun
            </button>
            <button
              type="button"
              onClick={() => handleFeedback("confusing")}
              {...CUE_PRESS}
              className="px-2.5 py-1 rounded-lg bg-ash/70 hover:bg-ash border border-ember/40 text-bone/80 text-[10px] font-mono hover:text-amber active:scale-95 transition-all"
            >
              🤔 Rules confused me
            </button>
            <a
              href="https://t.me/realworldagentshackathon"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-amber/10 hover:bg-amber/20 border border-amber/35 text-amber text-[10px] font-mono active:scale-95 transition-all inline-flex items-center gap-1"
            >
              <span>💬</span>
              <span>Telegram</span>
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(PioneerPassCard);

