import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRound } from '../../world/RoundProvider.jsx';
import { useWorld } from '../../world/WorldProvider.jsx';
import { useTrustTier } from '../../hooks/useTrustTier.js';
import TrustBadge from '../TrustBadge.jsx';
import WhatsPublicChip from '../WhatsPublicChip.jsx';
import ModeBanner from '../ModeBanner.jsx';
import EarlyBadge from '../prelaunch/EarlyBadge.jsx';
import VerifyOptIn from '../prelaunch/VerifyOptIn.jsx';
import ArsenalCard from '../ArsenalCard.jsx';
import { CUE_PRESS } from '../../lib/cuelume.js';

function SurvivorDossier({
  isReserved,
  isPrelaunch,
  user,
  verifyRef,
}) {
  const [expanded, setExpanded] = useState(false);
  const { tier } = useTrustTier();
  const { isWorldApp } = useWorld();
  const { you } = useRound();

  const isVerified = tier === 'verified';
  const hasArsenal = (you?.checkinStreak ?? 0) > 0 || (you?.juryTickets ?? 0) > 0 || (you?.votesResolved ?? 0) > 0;

  return (
    <div className="mx-5 mb-4">
      {/* Interactive Trigger Bar */}
      <motion.button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        whileTap={{ scale: 0.98 }}
        {...CUE_PRESS}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-smoke/60 hover:bg-smoke/80 border border-ember/40 hover:border-ember/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm select-none">🪪</span>
          <span className="font-mono text-xs text-bone/80 font-medium">Survivor Dossier</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isVerified
              ? 'bg-neon/10 border-neon/30 text-neon'
              : 'bg-amber/10 border-amber/30 text-amber'
          }`}>
            {isVerified ? 'Verified Human' : 'Unverified'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] text-dim">
            {expanded ? 'Hide details' : 'Badges & Stats'}
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-dim text-xs select-none"
          >
            ▼
          </motion.span>
        </div>
      </motion.button>

      {/* Expandable Body with Progressive Disclosure */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden mt-2.5 space-y-3"
          >
            {/* Quick Chips & Badges */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-ash/40 border border-ember/30">
              <TrustBadge />
              <WhatsPublicChip />
              {isPrelaunch && <EarlyBadge size="sm" reservedAt={user?.reservedAt} />}
              <ModeBanner />
            </div>

            {/* Arsenal stats if player has earned progress */}
            {hasArsenal && (
              <div className="-mx-5">
                <ArsenalCard />
              </div>
            )}

            {/* Verification Opt-in when not yet verified */}
            {isReserved && !isVerified && (
              <div ref={verifyRef} id="verify-section" className="rounded-xl border border-ember/40 bg-smoke/50 p-2">
                <VerifyOptIn defaultOpen={!isWorldApp} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(SurvivorDossier);
