import DozingCat from "./ui/DozingCat.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import { GameCta } from "./ui/CraftCta.jsx";
import { postSealCopy } from "../lib/copy.js";

/**
 * SpectatorPanel - shown to users who are watching but not in the current cohort.
 * Explains their role (audit, vote, chat) and encourages joining the next cohort.
 */
export default function SpectatorPanel({ onViewFeed }) {
  const watch = postSealCopy({ role: "spectator" });

  return (
    <div className="space-y-3 mb-3">
      <div className="bg-ash/70 border border-ember/40 rounded-2xl p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3 mb-3">
          <MascotGuide
            variant="watching"
            size={48}
            message="You're watching this cohort. Your votes help the jury."
            position="top"
          />
        </div>

        <div className="space-y-2 mb-3">
          <div className="bg-smoke/50 border border-ember/30 rounded-xl p-3">
            <p className="font-mono text-amber text-xs uppercase tracking-widest mb-1">{watch.shelf}</p>
            <p className="text-bone text-sm font-body leading-relaxed">{watch.body}</p>
          </div>

          <div className="bg-neon/10 border border-neon/30 rounded-xl p-3">
            <p className="font-mono text-neon text-xs uppercase tracking-widest mb-1">Build your influence</p>
            <p className="text-bone text-sm font-body leading-relaxed">
              Vote accurately to build your detective rank and jury weight. Your pilot record will inform future access rules.
            </p>
          </div>
        </div>

        <GameCta onClick={onViewFeed} className="!text-base w-full">
          Open audit feed →
        </GameCta>
      </div>

      <div className="bg-ember/5 border border-ember/30 rounded-2xl p-3 text-center">
        <div className="flex justify-center mb-2">
          <DozingCat size={40} />
        </div>
        <p className="text-dim text-xs font-mono mb-1">
          Want to play in the next cohort?
        </p>
        <p className="text-bone text-sm font-body">
          Accurate votes build your standing. Future cohort access rules will be announced separately.
        </p>
      </div>
    </div>
  );
}
