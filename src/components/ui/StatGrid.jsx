/**
 * StatGrid / Stat — the ONE small-metric cluster used across the app.
 *
 * Before this existed the same "big number + tiny mono label" cell was
 * rebuilt in ~7 files (DayRecap, MissionBoard, PersonalShelf, Feed,
 * Leaderboard, AgentReveal, AdminDashboard). Two variants:
 *
 *   boxed  — each cell gets its own card (DayRecap style)
 *   inline — cells share one panel (MissionBoard style)
 */

const TONES = {
  neon: "text-neon",
  blood: "text-blood",
  amber: "text-amber",
  bone: "text-bone",
};

export function Stat({ label, value, tone = "amber", boxed = false, size = "text-2xl" }) {
  const color = TONES[tone] || TONES.amber;
  const cell = (
    <>
      <p className={`font-display ${size} ${color} leading-none tabular-nums`}>{value}</p>
      <p className="text-dim text-[9px] font-mono uppercase mt-1">{label}</p>
    </>
  );
  if (boxed) {
    return <div className="bg-smoke/60 border border-ember/40 rounded-xl p-3">{cell}</div>;
  }
  return <div>{cell}</div>;
}

export function StatGrid({ children, cols = 3, boxed = false, className = "" }) {
  // Static class maps — Tailwind JIT cannot see interpolated class names.
  const colClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols] || "grid-cols-3";
  const gapClass = boxed ? "gap-3" : "gap-2";
  const wrap = boxed ? "" : "bg-ash/60 rounded-xl p-3";
  return <div className={`grid ${colClass} ${gapClass} ${wrap} ${className}`}>{children}</div>;
}
