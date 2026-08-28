/**
 * ThemeFairness — short "what counts" notes so themes don't feel arbitrary.
 * Collapsed by default; one tap expands counts / doesn't.
 */
import { useState } from "react";

export default function ThemeFairness({ theme, className = "" }) {
  const [open, setOpen] = useState(false);
  if (!theme?.counts?.length && !theme?.doesnt?.length) return null;

  return (
    <div className={`rounded-xl border border-ember/40 bg-ash/50 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="font-mono text-[10px] text-amber uppercase tracking-widest">
          What counts
        </span>
        <span className="font-mono text-[10px] text-dim">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 gap-2">
          {theme.counts?.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-neon uppercase tracking-widest mb-1">Counts</p>
              <ul className="space-y-0.5">
                {theme.counts.map((line) => (
                  <li key={line} className="text-dim text-[11px] font-mono leading-snug">
                    · {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {theme.doesnt?.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-blood uppercase tracking-widest mb-1">Doesn&apos;t count</p>
              <ul className="space-y-0.5">
                {theme.doesnt.map((line) => (
                  <li key={line} className="text-dim text-[11px] font-mono leading-snug">
                    · {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
