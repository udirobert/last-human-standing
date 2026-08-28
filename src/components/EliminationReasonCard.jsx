import { motion } from "framer-motion";
import { formatEliminationReason } from "../lib/eliminationReason.js";

/**
 * Explains why the player was eliminated — shown on home and in jury mode.
 */
export default function EliminationReasonCard({ reason, className = "" }) {
  const formatted = formatEliminationReason(reason);
  if (!formatted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-blood/10 border border-blood/35 rounded-2xl p-4 ${className}`}
    >
      <p className="font-mono text-blood text-[10px] tracking-widest uppercase mb-1">
        Why you&apos;re out · Day {formatted.day ?? "—"}
      </p>
      <p className="font-display text-lg text-bone leading-snug">{formatted.title}</p>
      <p className="text-bone/75 text-sm font-body mt-1 leading-relaxed">{formatted.body}</p>
      {formatted.theme && (
        <p className="text-dim text-[11px] font-mono mt-2">Round: {formatted.theme}</p>
      )}
      <p className="text-dim text-[11px] font-mono mt-2 leading-relaxed">{formatted.hint}</p>
    </motion.div>
  );
}
