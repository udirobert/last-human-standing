import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Mascot from "../Mascot.jsx";
import TrustBadge from "../TrustBadge.jsx";
import EarlyBadge from "./EarlyBadge.jsx";
import PushOptIn from "../PushOptIn.jsx";
import VerifyOptIn from "./VerifyOptIn.jsx";
import PracticeVote from "./PracticeVote.jsx";
import MotifFrieze from "../ui/MotifFrieze.jsx";

const WELCOME_KEY = "lhs_just_reserved";

/**
 * Lobby-only extras after reserve — push, optional verify, practice vote.
 * Shown once at the top of PrelaunchPanel for reserved players.
 */
export default function PostReserveExtras({ reservedAt, phase }) {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_KEY) === "1") {
        sessionStorage.removeItem(WELCOME_KEY);
        setShowWelcome(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="space-y-3">
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-smoke border border-neon/35 rounded-3xl p-5 text-center relative overflow-hidden"
          style={{
            background: "radial-gradient(120% 90% at 50% 0%, rgba(42,28,20,0.9) 0%, rgba(28,22,18,0.95) 100%)",
          }}
        >
          <Mascot variant="celebrating" size={72} />
          <p
            className="font-display text-bone mt-3 animate-glow leading-[0.9]"
            style={{ fontSize: "clamp(28px,7vw,36px)" }}
          >
            You&apos;re in
          </p>
          <p className="text-bone/70 text-sm font-body mt-2 max-w-xs mx-auto leading-relaxed">
            Slot locked. Share your link, try a practice vote, verify when you&apos;re ready.
          </p>
          <MotifFrieze className="w-full mt-4 mb-1" />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <TrustBadge size="md" />
            {phase === "prelaunch" && <EarlyBadge size="md" reservedAt={reservedAt} />}
          </div>
        </motion.div>
      )}

      <div className="bg-smoke/70 rounded-2xl p-3 border border-ember/40 backdrop-blur-sm">
        <PushOptIn />
      </div>

      <VerifyOptIn />
      <PracticeVote />
    </div>
  );
}

/** Call after a successful reserve/pay before routing to the lobby. */
export function markJustReserved() {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}
