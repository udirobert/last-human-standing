import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Prize pots card. Shows the WLD (World Chain) and cUSD+USDC
 * (Celo) prize pools side-by-side. Each pot is tap-to-reveal
 * for the on-chain address and the last deposit tx hash (when
 * available). Pure: takes a `prizePool` object in the /api/stats
 * shape and renders.
 *
 * Backward-compatible: reads both the new shape
 *   { wld: { balance, explorerUrl }, celo: { stable, cusd, usdc, explorerUrl } }
 * and the legacy alias
 *   { balanceWld, address, explorerUrl }.
 */
export default function PrizePots({ prizePool, className = "" }) {
  if (!prizePool) return null;

  const wld = prizePool.wld ?? {
    address: prizePool.address,
    balance: prizePool.balanceWld,
    explorerUrl: prizePool.explorerUrl,
  };
  const celo = prizePool.celo;

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
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
        balance={celo?.stable}
        suffix="cUSD+USDC"
        address={celo?.address}
        explorerUrl={celo?.explorerUrl}
        empty={!celo?.stable}
      />
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
        className="w-full text-left p-2.5 hover:bg-ash/80 active:scale-[0.98] transition-all"
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
        <p className={`font-mono text-sm leading-tight mt-0.5 ${empty ? "text-dim" : "text-amber"}`}>
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
