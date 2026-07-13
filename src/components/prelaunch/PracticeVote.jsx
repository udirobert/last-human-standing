import { useState } from "react";
import { motion } from "framer-motion";
import ThemeMotif from "../ui/ThemeMotif.jsx";
import { CUE_PRESS } from "../../lib/cuelume.js";

/**
 * PracticeVote — teaches HUMAN/SUS before real submissions appear.
 * Matches audit-feed craft: motif proof + clean verdict CTAs.
 */
export default function PracticeVote() {
  const [vote, setVote] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const sample = {
    caption: "Flat white at my local in Lisbon. Day 1 — still here.",
    location: "Lisbon, Portugal",
    gpsShared: true,
    mediaUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop",
    answer: "real",
    explanation:
      "This was voted HUMAN. Real location, GPS shared, specific caption with city name. Those are the signals voters look for.",
  };

  const handleVote = (v) => {
    if (revealed) return;
    setVote(v);
    setRevealed(true);
  };

  const correct = vote === sample.answer;

  return (
    <div className="bg-smoke/70 rounded-2xl p-4 border border-ember/40 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute -right-2 -top-2 opacity-20 pointer-events-none" aria-hidden>
        <ThemeMotif emoji="☕" size={72} label="café" />
      </div>

      <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2 text-center relative">
        Practice vote
      </p>
      <p className="text-bone/60 text-[11px] font-body mb-3 text-center relative">
        Try it — vote HUMAN or SUS. No stakes, just learning.
      </p>

      <div className="bg-ash/60 rounded-xl overflow-hidden border border-ember/30 relative">
        <img
          src={sample.mediaUrl}
          alt="Café submission"
          className="w-full h-40 object-cover"
          loading="lazy"
        />
        <div className="p-3">
          <div className="flex items-start gap-2 mb-1">
            <ThemeMotif emoji="☕" size={28} label="café" className="shrink-0 mt-0.5" />
            <p className="text-bone font-body text-xs leading-relaxed">{sample.caption}</p>
          </div>
          <p className="text-dim font-mono text-[10px]">
            {sample.location}{sample.gpsShared ? " · GPS ✓" : ""}
          </p>
        </div>
      </div>

      {!revealed ? (
        <div className="grid grid-cols-2 gap-2 mt-3 relative">
          <button
            type="button"
            onClick={() => handleVote("real")}
            data-cuelume-press="chime"
            data-cuelume-release="release"
            className="py-3 rounded-xl bg-neon/10 border border-neon/40 text-neon font-display text-sm tracking-widest active:scale-95 transition-transform"
          >
            HUMAN
          </button>
          <button
            type="button"
            onClick={() => handleVote("fake")}
            data-cuelume-press="press"
            data-cuelume-release="release"
            className="py-3 rounded-xl bg-blood/10 border border-blood/40 text-blood font-display text-sm tracking-widest active:scale-95 transition-transform"
          >
            SUS
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-2 relative"
        >
          <div
            className={`rounded-xl p-3 text-center border ${
              correct ? "bg-neon/10 border-neon/40" : "bg-blood/10 border-blood/40"
            }`}
          >
            <p className={`font-display text-sm ${correct ? "text-neon" : "text-blood"}`}>
              {correct ? "Correct" : "Not quite"}
            </p>
            <p className="text-bone/70 text-[11px] font-body mt-1 leading-relaxed">
              {sample.explanation}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setVote(null);
              setRevealed(false);
            }}
            {...CUE_PRESS}
            className="w-full py-2 rounded-lg bg-smoke border border-ember text-dim font-mono text-[10px] active:scale-95 transition-transform"
          >
            Try again
          </button>
        </motion.div>
      )}
    </div>
  );
}
