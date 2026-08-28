/**
 * VoteBar — the ONE HUMAN/SUS tally used across the app.
 *
 * Before this existed the same neon/blood split bar was re-implemented in ~18
 * files (Feed, GameMoment, MissionBoard, VotePreview, GameplayLoopDemo,
 * beats.jsx, DailyPrompt, PracticeVote…). One component, three densities:
 *
 *   size="hero"    — big counts + percentages + bar (Feed card, demo audit)
 *   size="compact" — bar only, thin (inline rows, history)
 *   sealed         — commit-reveal placeholder (counts hidden until reveal)
 */

function pct(real, fake) {
  const total = real + fake;
  const realPct = total > 0 ? Math.round((real / total) * 100) : 50;
  return { total, realPct, fakePct: 100 - realPct };
}

export default function VoteBar({
  real = 0,
  fake = 0,
  size = "hero",
  sealed = false,
  commitCount = 0,
  className = "",
}) {
  if (sealed) {
    return (
      <div className={`rounded-xl border border-ember/40 bg-ash/60 px-3 py-3 text-center ${className}`}>
        <p className="font-mono text-amber text-[10px] uppercase tracking-widest mb-1">Sealed ballots</p>
        <p className="font-display text-3xl text-bone leading-none tabular-nums">{commitCount}</p>
        <p className="font-mono text-dim text-[10px] mt-1">HUMAN/SUS hidden until reveal</p>
      </div>
    );
  }

  const { total, realPct, fakePct } = pct(real, fake);

  if (size === "verdict") {
    // Verdict bar — percent labels inside the segments, counts below.
    // Used by GameMoment's elimination verdict breakdown.
    return (
      <div className={className}>
        <div className="flex h-6 rounded-lg overflow-hidden border border-ember/30">
          {realPct > 0 && (
            <div
              className="bg-neon/40 flex items-center justify-center"
              style={{ width: `${realPct}%` }}
            >
              <span className="text-neon font-mono text-[10px] tabular-nums">{realPct}%</span>
            </div>
          )}
          {fakePct > 0 && (
            <div
              className="bg-blood/40 flex items-center justify-center"
              style={{ width: `${fakePct}%` }}
            >
              <span className="text-blood font-mono text-[10px] tabular-nums">{fakePct}%</span>
            </div>
          )}
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-neon font-mono text-[10px] tabular-nums">🧍 HUMAN · {real}</p>
          <p className="text-blood font-mono text-[10px] tabular-nums">SUS · {fake}</p>
        </div>
      </div>
    );
  }

  if (size === "compact") {
    return (
      <div className={className}>
        <div className="flex h-2 rounded-full overflow-hidden border border-ember/40 bg-ash">
          <div className="h-full bg-neon transition-[width] duration-500 ease-out" style={{ width: `${realPct}%` }} />
          <div className="h-full bg-blood transition-[width] duration-500 ease-out" style={{ width: `${fakePct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[9px] text-neon tabular-nums">HUMAN {real}</span>
          <span className="font-mono text-[9px] text-blood tabular-nums">SUS {fake}</span>
        </div>
      </div>
    );
  }

  // hero
  return (
    <div className={className}>
      <div className="flex items-end justify-between mb-1.5">
        <div>
          <p className="font-mono text-[10px] text-neon uppercase tracking-widest">Human</p>
          <p className="font-display text-3xl text-neon leading-none tabular-nums">{real}</p>
        </div>
        <p className="font-mono text-dim text-xs pb-1 tabular-nums">
          {total === 0 ? "awaiting votes" : `${realPct}% · ${fakePct}%`}
        </p>
        <div className="text-right">
          <p className="font-mono text-[10px] text-blood uppercase tracking-widest">Sus</p>
          <p className="font-display text-3xl text-blood leading-none tabular-nums">{fake}</p>
        </div>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden border border-ember/40 bg-ash">
        <div className="h-full bg-neon transition-[width] duration-500 ease-out" style={{ width: `${realPct}%` }} />
        <div className="h-full bg-blood transition-[width] duration-500 ease-out" style={{ width: `${fakePct}%` }} />
      </div>
    </div>
  );
}
