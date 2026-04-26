import { useMemo } from "react";
import { useWorld } from "../world/WorldProvider.jsx";

export default function ModeBanner() {
  const { isWorldApp, installAttempted } = useWorld();

  const mode = useMemo(() => {
    if (!installAttempted) return { label: "Initializing…", tone: "dim" };
    if (isWorldApp) return { label: "World App mode", tone: "neon" };
    return { label: "Demo mode (browser)", tone: "amber" };
  }, [isWorldApp, installAttempted]);

  const classes =
    mode.tone === "neon"
      ? "bg-neon/10 border-neon/30 text-neon"
      : mode.tone === "amber"
        ? "bg-amber/10 border-amber/30 text-amber"
        : "bg-smoke border-ember text-dim";

  return (
    <div className="fixed top-3 left-3 right-3 z-50 pointer-events-none">
      <div className={`mx-auto max-w-md border rounded-xl px-3 py-2 ${classes}`}>
        <p className="text-xs font-mono text-center tracking-wider uppercase">
          {mode.label}
        </p>
      </div>
    </div>
  );
}

