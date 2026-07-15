import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Prize pots card. Shows the WLD (World Chain) and cUSD (Celo)
 * prize pools side-by-side. Each pot is tap-to-reveal for the
 * on-chain address and explorer link. Pure: takes a `prizePool`
 * object in the /api/stats shape and renders.
 *
 * Reads:
 *   prizePool.wld  = { balance, explorerUrl }
 *   prizePool.celo = { cusd, address, explorerUrl }
 *
 * Also shows a "total pot" header with a live-updating total
 * and a growth indicator (delta since last poll).
 */
export default function PrizePots({ prizePool, className = "" }) {
  // Track growth — hooks must run before any early return
  const prevTotalRef = useRef(null);
  const [growth, setGrowth] = useState(null);

  // Compute total from prizePool (safe if null)
  const wld = prizePool?.wld ?? {
    address: prizePool?.address,
    balance: prizePool?.balanceWld,
    explorerUrl: prizePool?.explorerUrl,
  };
  const celo = prizePool?.celo;
  const wldUsd = (wld?.balance ?? 0) * 1.2;
  const celoUsd = celo?.cusd ?? 0;
  const totalUsd = wldUsd + celoUsd;

  useEffect(() => {
    if (prevTotalRef.current != null && totalUsd > prevTotalRef.current) {
      setGrowth(totalUsd - prevTotalRef.current);
      const t = setTimeout(() => setGrowth(null), 3000);
      return () => clearTimeout(t);
    }
    prevTotalRef.current = totalUsd;
  }, [totalUsd]);

  if (!prizePool) return null;

  return (
    <div className={className}>
      {/* Total pot header */}
      <div className="flex items-baseline justify-between mb-2 px-1">
        <p className="text-dim text-[10px] font-mono uppercase tracking-widest">Total Pot</p>
        <div className="flex items-baseline gap-2">
          <motion.p
            key={totalUsd.toFixed(2)}
            initial={{ scale: 1.1, color: "#00FF94" }}
            animate={{ scale: 1, color: "#F0EDE8" }}
            transition={{ duration: 0.4 }}
            className="font-display text-xl text-bone tabular-nums"
          >
            ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </motion.p>
          <AnimatePresence>
            {growth != null && (
              <motion.span
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-neon text-[10px] font-mono tabular-nums"
              >
                +${growth.toFixed(2)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PotCard
          chain="World Chain"
          balance={wld?.balance}
          suffix="WLD"
          address={wld?.address}
          explorerUrl={wld?.explorerUrl}
          empty={!wld?.balance}
        />
        <PotCard
          chain="Celo"
          balance={celo?.cusd}
          suffix="cUSD"
          address={celo?.address}
          explorerUrl={celo?.explorerUrl}
          empty={!celo?.cusd}
        />
      </div>
    </div>
  );
}

function PotCard({ chain, balance, suffix, address, explorerUrl, empty }) {
  const [expanded, setExpanded] = useState(false);
  const display = empty
    ? "—"
    : `${(balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${suffix}`;
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <div className="bg-ash/50 rounded-xl border border-ember/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-2.5 hover:bg-ash/80 active:scale-[0.98] transition-[transform,background-color]"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between">
          <p className="text-dim text-[9px] font-mono uppercase tracking-widest">
            {chain}
          </p>
          <span className="text-dim text-[9px] font-mono">
            {expanded ? "−" : "+"}
          </span>
        </div>
        <p className={`font-mono text-sm leading-tight mt-0.5 tabular-nums ${empty ? "text-dim" : "text-amber"}`}>
          {display}
        </p>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5 pt-1 border-t border-ember/30 space-y-1">
              {shortAddr && (
                <p className="font-mono text-[10px] text-dim">
                  {shortAddr}
                </p>
              )}
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-amber underline inline-block"
                >
                  on chain ↗
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
