import { useState } from "react";
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
  // Compute totals from prizePool (safe if null). Token amounts only — no
  // synthetic USD conversion (docs/COHORT1_PILOT.md: "No conversion to a
  // synthetic USD total is performed").
  const wld = prizePool?.wld ?? {
    address: prizePool?.address,
    balance: prizePool?.balanceWld,
    explorerUrl: prizePool?.explorerUrl,
  };
  const celo = prizePool?.celo;
  const hasWld = Number(wld?.balance) > 0;
  const hasCusd = Number(celo?.cusd) > 0;

  if (!prizePool) return null;

  return (
    <div className={className}>
      {/* Prize header — real token amounts, on-chain */}
      <div className="flex items-baseline justify-between mb-2 px-1">
        <p className="text-bone/70 text-[11px] font-mono uppercase tracking-widest">Sponsor prize</p>
        {(hasWld || hasCusd) && (
          <p className="font-mono text-sm text-bone tabular-nums">
            {hasWld ? `${wld.balance} WLD` : ""}
            {hasWld && hasCusd ? " + " : ""}
            {hasCusd ? `${celo.cusd} cUSD` : ""}
          </p>
        )}
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
