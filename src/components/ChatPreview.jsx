import { motion } from "framer-motion";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import EmptyState from "./EmptyState.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";
import { postSealCopy } from "../lib/copy.js";

/**
 * ChatPreview — educational briefing for an empty Chat tab.
 * Prelaunch: full lobby explainer. Live: cat EmptyState + modes + optional
 * post-seal prompt when the player already checked in.
 */

const EXAMPLE_MESSAGES = [
  { user: "@marina_sol", msg: "let's gooo, who's still standing?", color: "#FF6B6B" },
  { user: "@kai_nomad", msg: "flagging everyone at a hotel pool. that ain't a beach", color: "#FFB800" },
  { user: "@ghost_protocol", msg: "my submission better not get flagged i literally walked 2km for this shot", color: "#00FF94" },
  { user: "@luna_waves", msg: "the prize pool is growing. i'm not sleeping", color: "#00C8FF" },
  { user: "@spectre_x", msg: "anyone else think today's theme was too easy?", color: "#AA55FF" },
  { user: "@marina_sol", msg: "bro you have 31 sus votes lmaooo", color: "#FF6B6B" },
];

const MODES = [
  {
    icon: "📡",
    title: "Lobby",
    body: "Broadcast to every survivor. Strategy calls, sus accusations, last-minute panic. Everyone sees it.",
  },
  {
    icon: "💬",
    title: "DM",
    body: "Private 1:1 via World Chat. Cut a side deal, challenge a proof, coordinate a vote — off the record.",
  },
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
          className="bg-smoke/60 border border-ember/40 rounded-2xl p-5 text-center"
        >
          <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-2">
            Survivors lobby
          </p>
          <p className="font-display text-lg text-bone leading-snug mb-1">
            Where the living talk strategy.
          </p>
          <p className="text-dim text-xs leading-relaxed max-w-sm mx-auto">
            The lobby comes alive when the game starts. Survivors share tips,
            call out sus proofs, and negotiate votes. Spectators can watch;
            only verified players can send.
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

      {/* Example conversation — prelaunch only (live has EmptyState above) */}
      {!isLive && (
        <div>
          <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
            What it looks like mid-game
          </p>
          <div className="space-y-2.5">
            {EXAMPLE_MESSAGES.map((msg, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: MOTION_DURATION.fast,
                  ease: MOTION_EASE.smooth,
                  delay: i * 0.06,
                }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono bg-ember text-dim">
                  {msg.user.slice(1, 3).toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs" style={{ color: stringToColor(msg.user) }}>
                      {msg.user}
                    </span>
                  </div>
                  <div className="rounded-2xl px-4 py-2.5 bg-smoke border border-ember text-bone rounded-tl-sm">
                    <p className="text-sm leading-relaxed font-body">{msg.msg}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-dim text-[10px] font-mono mt-3 px-1 text-center">
            Preview — real messages appear when the game goes live.
          </p>
        </div>
      )}

      {/* Mode explainer */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-1 px-1">
          Two ways to talk
        </p>
        {MODES.map((mode, i) => (
          <motion.div
            key={mode.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: MOTION_DURATION.base,
              ease: MOTION_EASE.smooth,
              delay: i * 0.08,
            }}
            className="flex gap-3 items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-smoke border border-ember/40 flex items-center justify-center text-lg shrink-0">
              {mode.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-bone mb-0.5">{mode.title}</p>
              <p className="text-dim text-xs leading-relaxed">{mode.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.smooth, delay: 0.3 }}
        className="bg-amber/5 border border-amber/30 rounded-2xl p-4 text-center"
      >
        <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-1">
          Lobby rules
        </p>
        <p className="text-dim text-xs leading-relaxed">
          Messages are visible to all survivors. Don&apos;t share photos
          off-platform or harass players. The lobby is for strategy and
          banter — keep it human.
        </p>
      </motion.div>

      <MotifFrieze className="w-full opacity-85" />
    </div>
  );
}
