import { useRound } from "../world/RoundProvider.jsx";

export default function RoundMetaNotice({ variant = "card" }) {
  const { isError, isLoading, error, refresh } = useRound();

  if (!isError && !isLoading) return null;

  const base =
    variant === "inline"
      ? "px-4 py-2 rounded-xl border"
      : "bg-smoke border border-ember rounded-xl p-3";

  return (
    <div className={base}>
      {isLoading ? (
        <p className="text-dim text-xs font-mono text-center">Loading round status…</p>
      ) : (
        <div className="space-y-2">
          <p className="text-dim text-xs font-mono text-center">
            Can’t load live round status — using defaults.
          </p>
          {error && (
            <p className="text-dim text-[10px] font-mono text-center opacity-70 break-words">
              {String(error).slice(0, 140)}
            </p>
          )}
          <div className="flex justify-center">
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
  );
}

