import { useOnlineStatus } from "../../hooks/useOnlineStatus.js";

/**
 * Small inline pill that surfaces connectivity + retry affordance.
 * Used in screens that swallow fetch errors and need a manual recovery
 * path. Defaults to a low-emphasis "offline" variant; pass `onRetry`
 * to render a "Tap to retry" affordance.
 */
export default function NetworkPill({ onRetry, error, className = "" }) {
  const { online } = useOnlineStatus();
  const offline = !online;
  const broken = offline || Boolean(error);

  if (!broken) return null;

  return (
    <div
      className={`mx-5 my-3 px-3 py-2 rounded-xl border ${
        offline
          ? "border-amber/40 bg-amber/5 text-amber"
          : "border-blood/40 bg-blood/5 text-blood"
      } font-mono text-xs flex items-center justify-between gap-3 ${className}`}
    >
      <span>
        {offline
          ? "Offline — your move is queued."
          : "Live data unavailable. Retrying…"}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-2.5 py-1 rounded-lg border border-current/40 active:scale-95 transition-transform"
        >
          Retry
        </button>
      )}
    </div>
  );
}
