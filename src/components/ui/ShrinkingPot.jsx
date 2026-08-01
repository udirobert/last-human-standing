import { motion, useReducedMotion } from "framer-motion";
import { entranceMotion } from "../../lib/motion.js";

/**
 * ShrinkingPot — the stakes beat for the landing narrative
 * (docs/ART_DIRECTION.md). Dramatizes the elimination funnel from the live
 * cohort size down to one winner. Each row is a huddle of warm human-dots that
 * visibly thins out — the cold machine narrows the field; one warm human remains.
 *
 * Pure: takes the /api/stats `prizePool` object (optional) for the live total
 * and `cohortSize` so the funnel matches the authoritative game state.
 */

/** Mirrors server survivalCapForDay — clipped to the live cohort size. */
function funnelFor(cohortSize) {
  const n = Math.max(1, Number(cohortSize) || 50);
  const dayCaps = [40, 20, 8, 3, 1];
  const rows = [{ label: `${n} reserve their slot`, count: n }];
  let prev = n;
  dayCaps.forEach((cap, i) => {
    const day = i + 1;
    const count = Math.min(n, cap);
    if (day === 5) {
      rows.push({ label: "Day 5 · the last human", count: 1, winner: true });
      return;
    }
    if (count >= prev) return; // no cut that day at this cohort size
    rows.push({ label: `Day ${day} · ${count} survive`, count });
    prev = count;
  });
  return rows;
}

function potTotal(prizePool) {
  if (!prizePool) return null;
  const wld = prizePool.wld ?? { balance: prizePool.balanceWld };
  const total = (wld?.balance ?? 0) * 1.2 + (prizePool.celo?.cusd ?? 0);
  return total > 0 ? total : null;
}

export default function ShrinkingPot({ prizePool, cohortSize = 50 }) {
  const total = potTotal(prizePool);
  const funnel = funnelFor(cohortSize);
  const reduce = useReducedMotion();
  const entrance = entranceMotion(reduce, "y");
  const enterLabel = funnel[0]?.count === 50 ? "Fifty enter. One remains." : `${funnel[0]?.count ?? cohortSize} enter. One remains.`;

  return (
    <section className="w-full max-w-[560px] mx-auto px-5">
      <div className="text-center mb-6">
        <p className="font-mono text-amber/90 uppercase text-[11px] tracking-[0.2em]">The stakes</p>
        <h2
          className="font-display text-bone tracking-wide mt-1"
          style={{ fontSize: "clamp(30px,5vw,52px)", lineHeight: 0.95 }}
        >
          {enterLabel}
        </h2>
      </div>

      <div className="space-y-2.5">
        {funnel.map((row, i) => (
          <motion.div
            key={row.label}
            {...entrance}
            transition={{ delay: reduce ? 0 : i * 0.12, type: "spring", damping: 20 }}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              row.winner ? "bg-amber/10 border-amber/50" : "bg-smoke/40 border-ember/40"
            }`}
          >
            <div className="flex-1 flex flex-wrap gap-1 items-center min-w-0">
              {Array.from({ length: Math.min(row.count, 50) }).map((_, d) => (
                <span
                  key={d}
                  className="rounded-full"
                  style={
                    row.winner
                      ? { width: 14, height: 14, background: "#FFB800", boxShadow: "0 0 10px rgba(255,184,0,0.7)" }
                      : { width: 7, height: 7, background: "#E7DDC6", opacity: 0.85 }
                  }
                />
              ))}
              {row.winner && <span className="ml-1 text-base leading-none">👑</span>}
            </div>
            <p
              className={`font-mono text-[10px] tracking-wide text-right shrink-0 leading-tight ${
                row.winner ? "text-amber" : "text-dim"
              }`}
              style={{ maxWidth: 96 }}
            >
              {row.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* the pot */}
      <motion.div
        {...entrance}
        transition={{ delay: reduce ? 0 : 0.7, type: "spring", damping: 20 }}
        className="mt-4 text-center rounded-2xl bg-smoke/50 border border-ember/40 p-5"
      >
        <p className="font-mono text-dim uppercase text-[10px] tracking-[0.2em]">Winner takes</p>
        {total != null ? (
          <p className="font-display text-bone tabular-nums mt-1" style={{ fontSize: "clamp(34px,7vw,56px)", lineHeight: 1 }}>
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        ) : (
          <p className="font-display text-bone mt-1" style={{ fontSize: "clamp(28px,6vw,48px)", lineHeight: 1 }}>
            the entire pot
          </p>
        )}
        <p className="font-mono text-dim text-[11px] mt-1.5">
          {total != null ? "and growing — real money, on-chain" : "one human, winner-takes-all"}
        </p>
      </motion.div>
    </section>
  );
}
