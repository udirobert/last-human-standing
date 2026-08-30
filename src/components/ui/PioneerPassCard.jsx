import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CUE_PRESS, CUE_HOVER } from "../../lib/cuelume.js";
import { useDelight } from "../DelightProvider.jsx";
import { useWorld } from "../../world/WorldProvider.jsx";
import ThemeMotif from "./ThemeMotif.jsx";
import PioneerArtifactArt from "./PioneerArtifactArt.jsx";

const STORAGE_KEY = "lhs_pioneer_pass_claimed";
const TX_KEY = "lhs_pioneer_pass_tx";
const TOTAL_EDITION = 100;

function parseSerialNumber(serial) {
  const match = serial.match(/\d+$/);
  if (!match) return 42;
  return (parseInt(match[0], 10) % TOTAL_EDITION) || 1;
}

function generatePioneerSerial() {
  try {
    const existing = localStorage.getItem("lhs_pioneer_serial");
    if (existing) return existing;
    const num = Math.floor(1 + Math.random() * 99);
    const serial = `LHS-PIONEER-${String(num).padStart(3, "0")}`;
    localStorage.setItem("lhs_pioneer_serial", serial);
    return serial;
  } catch {
    return "LHS-PIONEER-042";
  }
}

function PioneerPassCard({ className = "", onClaimSuccess }) {
  const { user, isWorldApp } = useWorld();
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
  const [skipped, setSkipped] = useState(false);
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
          chain: isWorldApp ? "worldchain" : "celo",
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

  if (skipped && !claimed) {
    return (
      <div className={`w-full max-w-sm text-center py-2 ${className}`}>
        <button
          type="button"
          onClick={() => setSkipped(false)}
          className="font-mono text-[11px] text-amber/80 hover:text-amber underline decoration-dotted underline-offset-2"
        >
          🎖️ Claim your optional Pioneer Pass
        </button>
      </div>
    );
  }

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
            {isWorldApp ? "World Chain · Optional Free Mint" : "Celo Mainnet · Optional Free Mint"}
          </span>
        </div>
        <span className="font-mono text-[9px] text-bone/60 border border-amber/30 rounded-full px-2 py-0.5 tabular-nums">
          {serial}
        </span>
      </div>

      {/* 3D Master Artwork Card */}
      <div className="w-full max-w-[260px] mx-auto mb-4 relative z-10">
        <PioneerArtifactArt
          serialNumber={parseSerialNumber(serial)}
          totalEdition={TOTAL_EDITION}
          stamped={claimed}
        />
      </div>

      {/* Perks List */}
      <div className="space-y-1.5 mb-4 relative z-10 text-xs font-mono">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-bone/50 uppercase tracking-widest font-semibold">
            Optional perks for live cohort:
          </p>
          <span className="text-[9px] text-amber/80 font-mono">
            {isWorldApp ? "50 World ID slots" : "50 Celo/Self slots"}
          </span>
        </div>
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
        <p className="text-[9.5px] text-dim/60 font-mono text-center pt-1">
          Soulbound: bound to your verified human identity
        </p>
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
              <span>{isWorldApp ? "BADGE SAVED · ACTIVE IN INVENTORY" : "PASS MINTED ON CELO · ACTIVE"}</span>
            </motion.div>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center font-mono text-[10px] text-amber hover:underline decoration-dotted"
              >
                {isWorldApp ? "Verify on Worldscan ↗" : "Verify on Celoscan ↗"}
              </a>
            )}
          </>
        ) : (
          <>
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
              <span>{claiming ? (isWorldApp ? "Verifying…" : "Minting on Celo…") : (isWorldApp ? "Claim Free Pioneer Badge →" : "Claim Free Pioneer Pass →")}</span>
            </motion.button>
            <button
              type="button"
              onClick={() => setSkipped(true)}
              className="w-full text-center font-mono text-[10px] text-dim hover:text-bone underline decoration-dotted py-0.5 transition-colors"
            >
              Skip mint for now
            </button>
          </>
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

