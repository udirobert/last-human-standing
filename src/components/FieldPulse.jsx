import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePolling } from "../hooks/usePolling.js";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";

/** Cold system status marks — same dialect as ActivityFeed. */
const MARKS = {
  checkin: { label: "IN", tone: "text-neon border-neon/40 bg-neon/10" },
  late: { label: "LATE", tone: "text-amber border-amber/40 bg-amber/10" },
  vote: { label: "VOTE", tone: "text-bone border-ember/40 bg-ash/60" },
  elimination: { label: "OUT", tone: "text-blood border-blood/40 bg-blood/10" },
};

function StatusMark({ type }) {
  const mark = MARKS[type] || { label: "·", tone: "text-dim border-ember/30 bg-ash/40" };
  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center min-w-[2rem] h-5 px-1 rounded-md border font-mono text-[9px] tracking-wider ${mark.tone}`}
      aria-hidden="true"
    >
      {mark.label}
    </span>
  );
}

function formatWho(event) {
  if (event.username) return `@${event.username}`;
  if (event.address) return `${event.address.slice(0, 6)}…`;
  return "Someone";
}

function formatLine(event) {
  if (event.text) return event.text;
  switch (event.type) {
    case "checkin":
      return event.rank != null ? `checked in · Rank #${event.rank}` : "checked in";
    case "vote":
      return "cast a vote";
    case "elimination":
      return "was eliminated";
    case "late":
      return "arrived too late";
    default:
      return "moved in the field";
  }
}

function isMine(event, myAddress) {
  if (!myAddress || !event?.address) return false;
  return String(event.address).toLowerCase() === String(myAddress).toLowerCase();
}

/**
 * Live field theater — animated presence pulse from /api/activity.
 * Soft entrance for new lines, highlight for your own event, sealed-today count.
 */
export default function FieldPulse({ maxLines = 2, className = "" }) {
  const reduceMotion = useReducedMotion();
  const { currentDay } = useRound();
  const { user } = useWorld();
  const myAddress = user?.address;

  const dayQ = currentDay != null ? `?day=${currentDay}` : "";
  const { data } = usePolling(`/api/activity${dayQ}`, {
    intervalMs: 12_000,
    transform: (json) => ({
      events: json.events ?? [],
      sealedToday: json.sealedToday ?? null,
    }),
    initial: { events: [], sealedToday: null },
  });

  const events = data?.events || [];
  const sealedToday = data?.sealedToday;
  const lines = events.slice(0, maxLines);

  const [flashId, setFlashId] = useState(null);
  const seenIdsRef = useRef(new Set());
  const primedRef = useRef(false);

  useEffect(() => {
    if (!events.length) return;
    if (!primedRef.current) {
      events.forEach((e) => seenIdsRef.current.add(e.id));
      primedRef.current = true;
      return;
    }
    const newest = events[0];
    if (newest && !seenIdsRef.current.has(newest.id)) {
      seenIdsRef.current.add(newest.id);
      if (!reduceMotion) {
        setFlashId(newest.id);
        const t = setTimeout(() => setFlashId(null), 2200);
        return () => clearTimeout(t);
      }
    }
  }, [events, reduceMotion]);

  const sealedLabel =
    sealedToday != null
      ? sealedToday === 0
        ? "No seals yet today"
        : `${sealedToday} human${sealedToday === 1 ? "" : "s"} sealed today`
      : null;

  return (
    <div
      className={`rounded-xl border border-ember/30 bg-smoke/60 px-3 py-2.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="font-mono text-amber/90 text-[9px] uppercase tracking-[0.16em] flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber animate-pulse pointer-events-none" aria-hidden="true" />
          Field pulse
        </p>
        {sealedLabel && (
          <p className="font-mono text-dim text-[9px] tabular-nums shrink-0">{sealedLabel}</p>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="font-body text-bone/55 text-xs leading-snug">The field is quiet.</p>
      ) : (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {lines.map((event) => {
              const mine = isMine(event, myAddress);
              const flashing = flashId === event.id;
              return (
                <motion.li
                  key={event.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    backgroundColor: flashing
                      ? "rgba(212, 160, 80, 0.14)"
                      : mine
                        ? "rgba(0, 255, 148, 0.06)"
                        : "rgba(0,0,0,0)",
                  }}
                  exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`flex items-start gap-2 min-w-0 rounded-lg px-1 -mx-1 py-0.5 ${
                    mine ? "ring-1 ring-neon/25" : ""
                  }`}
                >
                  <StatusMark type={event.type} />
                  <p className="font-mono text-[11px] text-bone/80 leading-snug truncate">
                    <span className={mine ? "text-neon" : "text-bone"}>
                      {mine ? "You" : formatWho(event)}
                    </span>
                    {" · "}
                    <span className="text-dim">{formatLine(event)}</span>
                  </p>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
