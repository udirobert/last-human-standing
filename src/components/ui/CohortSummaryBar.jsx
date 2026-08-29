import { memo } from 'react';
import { motion } from 'framer-motion';
import { CUE_PRESS, CUE_HOVER } from '../../lib/cuelume.js';

/**
 * CohortSummaryBar — concise, tactile bridge between Survive and Standings.
 * Replaces the heavy census grid and redundant prize pot card on the Survive tab
 * with a high-design status strip that progressively discloses full standings.
 */
function CohortSummaryBar({
  activePlayers,
  totalPlayers,
  cohortSize = 50,
  prizePoolWld,
  isLive = false,
  isPrelaunch = false,
  onViewStandings,
}) {
  const displayTotal = totalPlayers ?? cohortSize;
  const aliveCount = activePlayers ?? displayTotal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-3 bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Alive / Reserved Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-ember/30 border border-ember/50 flex items-center justify-center shrink-0">
            <span className="text-base select-none">{isLive ? '⚡' : '🔒'}</span>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-bone/60 uppercase tracking-wider">
              {isLive ? 'Cohort Status' : 'Reserved'}
            </p>
            <p className="font-display text-sm text-bone tracking-wide tabular-nums leading-tight">
              {isLive ? (
                <>
                  <span className="text-neon font-semibold">{aliveCount}</span>
                  <span className="text-dim text-xs"> / {cohortSize} Alive</span>
                </>
              ) : (
                <>
                  <span className="text-amber font-semibold">{displayTotal}</span>
                  <span className="text-dim text-xs"> / {cohortSize} Seats</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Center/Right: Prize Pool + Standings CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {prizePoolWld != null && (
            <div className="hidden sm:flex flex-col items-end pr-2 border-r border-ember/30">
              <span className="font-mono text-[9px] text-amber/70 uppercase tracking-widest">Prize Pool</span>
              <span className="font-display text-xs text-amber tabular-nums font-semibold">
                {Number(prizePoolWld).toLocaleString()} WLD
              </span>
            </div>
          )}

          {onViewStandings && (
            <motion.button
              type="button"
              onClick={onViewStandings}
              whileTap={{ scale: 0.94 }}
              {...CUE_HOVER}
              {...CUE_PRESS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ash/80 hover:bg-ember/40 border border-ember/50 hover:border-amber/50 text-bone hover:text-amber font-mono text-[11px] transition-all"
            >
              <span>Standings</span>
              <span className="text-amber text-xs">→</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(CohortSummaryBar);
