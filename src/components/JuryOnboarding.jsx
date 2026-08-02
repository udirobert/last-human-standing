import { motion } from "framer-motion";
import MascotGuide from "./ui/MascotGuide.jsx";
import { useDelight } from "./DelightProvider.jsx";
import { postSealCopy } from "../lib/copy.js";

/**
 * JuryOnboarding — appears for eliminated players to explain their new role.
 * Converts the loss into an active, meaningful next chapter.
 */
export default function JuryOnboarding({ user, onViewFeed }) {
  const { handleMascotClick } = useDelight();
  const juryTickets = user?.juryTickets ?? 0;
  const isJury = user?.isJury;
  const votesResolved = user?.votesResolved ?? 0;
  const voteAccuracy = user?.voteAccuracy;
  const watch = postSealCopy({ role: "jury" });

  const progressToJury = Math.min(100, (votesResolved / 5) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neon/10 border border-neon/40 rounded-xl p-4 mb-3"
    >
      <div className="flex items-start gap-3 mb-3">
        <MascotGuide
          variant="determined"
          size={48}
          message={isJury ? "You're on the jury. Your votes count ×2." : "Vote accurately to become a juror."}
          position="top"
          interactive
          onMascotClick={handleMascotClick}
        />
        <div className="flex-1">
          <p className="font-mono text-neon text-xs tracking-widest uppercase mb-1">
            {isJury ? "Jury member" : "Path to jury"}
          </p>
          <p className="text-bone text-sm font-body leading-snug">
            {isJury
              ? "Your votes count double. Accuracy is your influence — build your detective rank for the next cohort."
              : `Vote on ${5 - votesResolved} more submission${5 - votesResolved !== 1 ? "s" : ""} with ≥80% accuracy to become a juror.`}
          </p>
        </div>
      </div>

      {!isJury && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-dim text-[10px] font-mono uppercase">Progress</p>
            <p className="text-dim text-[10px] font-mono">{votesResolved}/5</p>
          </div>
          <div className="h-1.5 bg-ash/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToJury}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-neon/60"
            />
          </div>
        </div>
      )}

      {isJury && voteAccuracy != null && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
            <p className="text-dim text-[9px] font-mono uppercase">Accuracy</p>
            <p className="text-neon font-display text-lg tabular-nums">
              {Math.round(voteAccuracy * 100)}%
            </p>
          </div>
          <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
            <p className="text-dim text-[9px] font-mono uppercase">Tickets</p>
            <p className="text-amber font-display text-lg tabular-nums">{juryTickets}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-ember/25 bg-ash/40 px-3 py-2.5 mb-3">
        <p className="font-mono text-amber text-[10px] uppercase tracking-[0.16em] mb-1">{watch.shelf}</p>
        <p className="font-body text-bone/75 text-xs leading-snug">{watch.body}</p>
      </div>

      <div className="space-y-2">
        <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
          <p className="text-dim text-[10px] font-mono uppercase mb-1">How it works</p>
          <ul className="text-bone text-xs font-body leading-relaxed space-y-1">
            <li>• Vote on submissions in the audit feed</li>
            <li>• Correct votes raise your accuracy toward ×2 weight</li>
            <li>• Accuracy + detective rank build your pilot record</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onViewFeed}
          className="w-full py-2.5 rounded-lg bg-neon/20 border border-neon/40 text-neon font-mono text-sm active:scale-95 transition-transform"
        >
          Open audit feed →
        </button>
      </div>
    </motion.div>
  );
}
