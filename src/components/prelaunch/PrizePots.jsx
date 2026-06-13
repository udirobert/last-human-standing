/**
 * Prize pots card. Shows the WLD (World Chain) and cUSD+USDC
 * (Celo) prize pools side-by-side. Pure: takes a `prizePool`
 * object in the /api/stats shape and renders.
 *
 * Backward-compatible: reads both the new shape
 *   { wld: { balance, explorerUrl }, celo: { stable, cusd, usdc, explorerUrl } }
 * and the legacy alias
 *   { balanceWld, address, explorerUrl }.
 */
export default function PrizePots({ prizePool, className = "" }) {
  if (!prizePool) return null;

  // New shape first, fall back to legacy.
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
        explorerUrl={wld?.explorerUrl}
        empty={!wld?.balance}
      />
      <PotCard
        chain="Celo"
        balance={celo?.stable}
        suffix="cUSD+USDC"
        explorerUrl={celo?.explorerUrl}
        empty={!celo?.stable}
      />
    </div>
  );
}

function PotCard({ chain, balance, suffix, explorerUrl, empty }) {
  const display = empty
    ? "—"
    : `${(balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${suffix}`;
  return (
    <div className="bg-ash/50 rounded-xl p-2.5 border border-ember/40">
      <p className="text-dim text-[9px] font-mono uppercase tracking-widest mb-0.5">
        {chain}
      </p>
      <p className={`font-mono text-sm leading-tight ${empty ? "text-dim" : "text-amber"}`}>
        {display}
      </p>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono text-dim underline mt-0.5 inline-block"
        >
          on chain
        </a>
      )}
    </div>
  );
}
