import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

/**
 * DossierCard — ARIA's case file for one of YOUR check-ins.
 *
 * Noir "evidence file" treatment: stamped verdict, the player's own argument
 * (caption), proof photo thumbnail, and file metadata. Rendered only for the
 * signed-in player's own submissions (see GET /api/checkins/mine) — never
 * for other players, so no consent surface is needed.
 *
 * All text stays in DOM type; the only image is the player's own proof
 * photo (or nothing, if signing fails).
 */

function useSignedMediaUrl(mediaPath) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!mediaPath) return undefined;
    let cancelled = false;
    fetch("/api/media-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ path: mediaPath }),
    })
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j.url) setUrl(j.url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mediaPath]);
  return url;
}

function verdictFor(ck) {
  if (ck.dq) return { label: "DISQUALIFIED", cls: "border-blood/60 text-blood", rotate: "-rotate-6" };
  if (ck.survived === true) return { label: "SURVIVED", cls: "border-neon/60 text-neon", rotate: "rotate-3" };
  if (ck.survived === false) return { label: "ELIMINATED", cls: "border-blood/60 text-blood", rotate: "-rotate-3" };
  if (ck.status === "pending") return { label: "PENDING", cls: "border-amber/50 text-amber", rotate: "rotate-2" };
  return { label: "FILED", cls: "border-dim/50 text-dim", rotate: "" };
}

export default function DossierCard({ checkin, index = 0 }) {
  const photoUrl = useSignedMediaUrl(checkin.media_path);
  const verdict = verdictFor(checkin);
  const time = checkin.created_at
    ? new Date(checkin.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth, delay: Math.min(index * 0.05, 0.3) }}
      className="relative bg-[#141210]/90 border border-amber/25 rounded-xl overflow-hidden backdrop-blur-sm"
    >
      {/* File header strip */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-dashed border-amber/20">
        <p className="font-mono text-[9px] text-amber/80 uppercase tracking-[0.2em]">
          ARIA dossier · Day {checkin.day}
          {checkin.theme ? ` · ${checkin.theme}` : ""}
        </p>
        <span className="font-mono text-[9px] text-dim/70 tabular-nums">
          {checkin.rank != null ? `#${checkin.rank}` : ""}{time ? ` · ${time}` : ""}
        </span>
      </div>

      <div className="flex gap-3 p-3">
        {/* Proof photo */}
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-smoke border border-ember/40">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center font-mono text-dim/50 text-lg">◈</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* The player's argument */}
          <p className="font-body text-bone/85 text-xs leading-relaxed line-clamp-3">
            {checkin.caption?.trim() || <span className="text-dim/60 italic">No argument filed.</span>}
          </p>
          <div className="flex gap-3 text-[10px] font-mono text-dim mt-1.5">
            {checkin.distance_m != null && <span>{Math.round(checkin.distance_m)}m</span>}
            {checkin.status && <span className="uppercase">{checkin.status}</span>}
          </div>
        </div>

        {/* Verdict stamp */}
        <div className="shrink-0 self-start pt-1">
          <span
            className={`inline-block border-2 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${verdict.cls} ${verdict.rotate} opacity-90`}
          >
            {verdict.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
