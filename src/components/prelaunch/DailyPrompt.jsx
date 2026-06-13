import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Daily teaser prompt shown during prelaunch. Rotates daily so the page
 * never feels stale when early supporters return. Submitting "votes" locally
 * (localStorage) so we get a community vibe even before the game is live.
 */

const PROMPTS = [
  {
    id: "weird-cafe",
    q: "What's the weirdest place that still counts as 'AT A CAFÉ'?",
    options: [
      "A literal café",
      "A food truck with seating",
      "Someone's kitchen during brunch",
      "A coworking space with free coffee",
    ],
  },
  {
    id: "day-1-theme",
    q: "Predict Day 1's theme. What place type will it be?",
    options: ["A park", "A café", "A bus stop", "A bookshop"],
  },
  {
    id: "would-you-lie",
    q: "Be honest — would you cheat and submit a stock photo?",
    options: ["Never", "Only if I was sure I'd get caught", "Only Day 1", "I'm an AI, I literally can't"],
  },
  {
    id: "best-ai-sus",
    q: "When a HUMAN looks SUS, what's the giveaway?",
    options: ["Perfect lighting", "Smiles too much", "Stiff pose", "Doesn't blink"],
  },
  {
    id: "playmate",
    q: "Who are you recruiting into your cohort?",
    options: ["My group chat", "Only people I can beat", "Whoever is fastest", "Just me, 1v50"],
  },
  {
    id: "pot-prediction",
    q: "How big will the final pot be?",
    options: ["Under 100 WLD", "100–500 WLD", "500–2k WLD", "Over 2k WLD"],
  },
];

function dayKey() {
  // Bucket by day (UTC) so the prompt rotates at midnight
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function pickPromptForToday() {
  const key = `lhs_daily_prompt_v1:${dayKey()}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  } catch { /* ignore */ }
  // Deterministic pick based on the date so all users see the same prompt
  const dayIndex = Math.floor(Date.parse(dayKey() + "T00:00:00Z") / 86_400_000);
  const prompt = PROMPTS[dayIndex % PROMPTS.length].id;
  try { localStorage.setItem(key, prompt); } catch { /* ignore */ }
  return prompt;
}

function getMyVote(promptId) {
  try {
    const raw = localStorage.getItem(`lhs_daily_prompt_vote:${promptId}:${dayKey()}`);
    return raw ? Number(raw) : null;
  } catch { return null; }
}

function setMyVote(promptId, idx) {
  try { localStorage.setItem(`lhs_daily_prompt_vote:${promptId}:${dayKey()}`, String(idx)); } catch { /* ignore */ }
}

/**
 * Read aggregate counts from a shared community counter. If the backend
 * doesn't expose it, we fall back to local counts (so the UI never breaks).
 * This is best-effort engagement, not a security-sensitive vote.
 */
function getLocalTallies(promptId) {
  try {
    const raw = localStorage.getItem(`lhs_daily_prompt_tally:${promptId}:${dayKey()}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function bumpLocalTally(promptId, idx) {
  const key = `lhs_daily_prompt_tally:${promptId}:${dayKey()}`;
  const current = getLocalTallies(promptId) || {};
  const next = { ...current, [idx]: (current[idx] || 0) + 1, _total: (current._total || 0) + 1 };
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export default function DailyPrompt() {
  const [vote, setVote] = useState(() => {
    const p = PROMPTS.find((x) => x.id === pickPromptForToday());
    return p ? getMyVote(p.id) : null;
  });
  const [tallies, setTallies] = useState(() => {
    const p = PROMPTS.find((x) => x.id === pickPromptForToday());
    return p ? (getLocalTallies(p.id) || { _total: 0 }) : { _total: 0 };
  });

  const prompt = useMemo(() => {
    const id = pickPromptForToday();
    return PROMPTS.find((p) => p.id === id) || PROMPTS[0];
  }, []);

  const handleVote = (idx) => {
    if (vote !== null) return;
    setVote(idx);
    setMyVote(prompt.id, idx);
    setTallies((t) => bumpLocalTally(prompt.id, idx));
  };

  const total = tallies._total || 0;

  return (
    <div className="w-full mt-3 bg-smoke/50 rounded-xl p-3 border border-ember/30">
      <div className="flex items-center justify-between mb-2">
        <p className="text-amber text-[10px] font-mono uppercase tracking-widest">Daily pulse</p>
        <p className="text-dim text-[10px] font-mono">pre-launch</p>
      </div>
      <p className="text-bone font-mono text-sm leading-snug mb-3">{prompt.q}</p>
      <div className="space-y-1.5">
        {prompt.options.map((opt, idx) => {
          const count = tallies[idx] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMine = vote === idx;
          const hasVoted = vote !== null;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleVote(idx)}
              disabled={hasVoted}
              className={`relative w-full text-left rounded-lg border px-3 py-2 font-mono text-xs overflow-hidden transition-colors ${
                isMine
                  ? "border-amber/70 bg-amber/10 text-amber"
                  : hasVoted
                    ? "border-ember/30 bg-smoke text-dim"
                    : "border-ember/50 bg-smoke text-bone hover:border-amber/50 active:scale-[0.98]"
              }`}
            >
              {hasVoted && (
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 ${isMine ? "bg-amber/20" : "bg-ember/20"}`}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="truncate">{opt}</span>
                <AnimatePresence>
                  {hasVoted && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-dim text-[10px] tabular-nums shrink-0"
                    >
                      {pct}%
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
      </div>
      {vote === null ? (
        <p className="text-dim/70 text-[10px] font-mono mt-2 text-center">
          Your take · community totals land with the leaderboard at launch
        </p>
      ) : (
        <p className="text-dim/70 text-[10px] font-mono mt-2 text-center">
          ✓ Locked in · new question tomorrow
        </p>
      )}
    </div>
  );
}
