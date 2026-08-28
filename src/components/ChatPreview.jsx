import { motion } from "framer-motion";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import EmptyState from "./EmptyState.jsx";
import InfoStrip from "./ui/InfoStrip.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";
import { postSealCopy } from "../lib/copy.js";

/**
 * ChatPreview — briefing for an empty Chat tab, compact.
 * Prelaunch: 2-line header + mock conversation + tight mode strip + rules.
 * Live: cat EmptyState + modes + optional post-seal prompt.
 */

const EXAMPLE_MESSAGES = [
  { user: "@marina_sol", msg: "let's gooo, who's still standing?" },
  { user: "@kai_nomad", msg: "flagging that submission. stock photo, not a real answer" },
  { user: "@ghost_protocol", msg: "i literally walked 2km for this shot. better not get sus'd" },
  { user: "@luna_waves", msg: "the prize pool is growing. i'm not sleeping" },
  { user: "@spectre_x", msg: "anyone else think today's riddle was too easy?" },
];

const MODES = [
  { icon: "📡", title: "Lobby", body: "Broadcast to every survivor. Strategy calls, sus accusations, panic. Everyone sees it." },
  { icon: "💬", title: "DM", body: "Private 1:1 via World Chat. Side deals, proof challenges, vote coordination — off the record." },
];

function stringToColor(str) {
  const colors = ["#FF6B6B", "#FFB800", "#00FF94", "#00C8FF", "#AA55FF", "#FF6B00"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ChatPreview({ isLive = false, checkedIn = false }) {
  const seal = postSealCopy({ role: "checkedIn" });

  return (
    <div className="space-y-5">
      {isLive ? (
        <EmptyState
          motif="cat"
          title="Lobby is quiet"
          body={
            checkedIn
              ? `${seal.body} Challenge a player or wait for the room to wake up.`
              : "Survivors talk strategy here once the field fills. Be first — or watch the living."
          }
          showFrieze={false}
          className="!py-6"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
          className="text-center"
        >
          <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-1">
            Survivors lobby
          </p>
          <p className="font-display text-xl text-bone leading-snug">
            Where the living talk strategy.
          </p>
        </motion.div>
      )}

      {checkedIn && isLive && (
        <div className="rounded-2xl border border-amber/35 bg-amber/5 px-4 py-3 text-center">
          <p className="font-mono text-amber text-[10px] uppercase tracking-[0.16em] mb-1">
            {seal.shelf}
          </p>
          <p className="font-body text-bone/75 text-xs leading-snug">
            {seal.body} Challenge a proof from the audit, or drop a line so the field knows you&apos;re still here.
          </p>
        </div>
      )}

      {/* Mock conversation — prelaunch only */}
      {!isLive && (
        <div>
          <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
            What it looks like mid-game
          </p>
          <div className="space-y-2">
            {EXAMPLE_MESSAGES.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE.smooth, delay: i * 0.06 }}
                className="flex gap-2.5"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-mono bg-ember text-dim">
                  {msg.user.slice(1, 3).toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 max-w-xs">
                  <span className="font-mono text-[11px]" style={{ color: stringToColor(msg.user) }}>
                    {msg.user}
                  </span>
                  <div className="rounded-2xl px-3.5 py-2 bg-smoke border border-ember text-bone rounded-tl-sm">
                    <p className="text-[13px] leading-relaxed font-body">{msg.msg}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Typing indicator — the room feels like it's filling */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth, delay: EXAMPLE_MESSAGES.length * 0.06 + 0.2 }}
              className="flex gap-2.5 items-center"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-mono bg-ember text-dim">
                ??
              </div>
              <div className="rounded-2xl px-3.5 py-2.5 bg-smoke border border-ember rounded-tl-sm flex items-center gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-dim"
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.18, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
          <p className="text-dim text-[10px] font-mono mt-2.5 px-1 text-center">
            Preview — real messages appear at launch.
          </p>
        </div>
      )}

      {/* Two ways to talk — tight strip */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-1 px-1">
          Two ways to talk
        </p>
        <InfoStrip items={MODES} />
      </div>

      <p className="text-dim text-xs font-body text-center leading-relaxed">
        Messages are visible to all survivors. Don&apos;t share photos
        off-platform or harass players. Keep it human.
      </p>

      <MotifFrieze className="w-full opacity-85" />
    </div>
  );
}
