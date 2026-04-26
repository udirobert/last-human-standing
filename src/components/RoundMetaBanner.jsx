import { useEffect, useMemo, useState } from "react";
import { useRound } from "../world/RoundProvider.jsx";

function formatAge(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

export default function RoundMetaBanner() {
  const { isLoading, isError, error, refresh, lastUpdatedAt } = useRound();
  const [tick, setTick] = useState(0);

  // Update "last updated" text while visible.
  useEffect(() => {
    if (!lastUpdatedAt) return;
    const t = setInterval(() => setTick((x) => x + 1), 5_000);
    return () => clearInterval(t);
  }, [lastUpdatedAt]);

  const ageText = useMemo(() => {
    if (!lastUpdatedAt) return null;
    // eslint-disable-next-line no-unused-vars
    const _ = tick; // re-render cadence
    return `Last updated ${formatAge(Date.now() - lastUpdatedAt)} ago`;
  }, [lastUpdatedAt, tick]);

  if (!isLoading && !isError) return null;

  const classes = isError
    ? "bg-blood/10 border-blood/30 text-blood"
    : "bg-smoke border-ember text-dim";

  return (
    <div className="fixed top-14 left-3 right-3 z-50 pointer-events-none">
      <div className={`mx-auto max-w-md border rounded-xl px-3 py-2 ${classes}`}>
        {isLoading ? (
          <p className="text-xs font-mono text-center">Loading live round status…</p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-mono text-center">
              Can’t load live round status — using defaults.
            </p>
            {ageText && (
              <p className="text-[10px] font-mono text-center opacity-80">{ageText}</p>
            )}
            {error && (
              <p className="text-[10px] font-mono text-center opacity-70 break-words">
                {String(error).slice(0, 120)}
              </p>
            )}
            <div className="flex justify-center pt-1">
              <button
                onClick={refresh}
                className="pointer-events-auto bg-ember border border-ember rounded-lg px-3 py-1 text-dim text-xs font-mono active:scale-95 transition-transform"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

