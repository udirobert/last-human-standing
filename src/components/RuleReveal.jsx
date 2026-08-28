import { useCallback, useEffect, useState } from "react";
import { ROUND_UNLOCKS, getRuleMascot } from "../lib/copy.js";
import { resolveActiveTheme } from "../data/game";
import { useRound } from "../world/RoundProvider.jsx";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import ThemeFairness from "./ThemeFairness.jsx";
import Mascot from "./Mascot.jsx";
import { HumanCta, GhostLink } from "./ui/CraftCta.jsx";
import { CeremonyShell, Eyebrow, CeremonyTitle, CeremonySub } from "./ui/Ceremony.jsx";
import {
  readUnlocksSeen,
  markUnlockSeen,
  markBriefingSeen,
} from "../lib/ceremonyGate.js";

/**
 * RuleReveal — day unlock overlay. Matches speed-run DayReveal craft:
 * theme motif hero, twist in a secondary card, amber HumanCta.
 */
export default function RuleReveal({ onAudit }) {
  const { phase, currentDay, you, round, pilot } = useRound();
  const [unlock, setUnlock] = useState(null);
  const [body, setBody] = useState("");
  const [mascot, setMascot] = useState(null);

  const theme = resolveActiveTheme(round);
  const cap = round?.survivalCap ?? null;

  useEffect(() => {
    if (phase !== "live") {
      setUnlock(null);
      return;
    }
    const day = Number(currentDay);
    if (!Number.isFinite(day) || day < 1) {
      setUnlock(null);
      return;
    }
    // Pilot posture: infiltrator (Day 2) and wildcard revival (Day 4) are
    // disabled, so their "unlock" reveals must never play (design review
    // finding 1 — the UI must not promise mechanics the server rejects).
    if (day === 2 && !pilot?.infiltratorEnabled) {
      setUnlock(null);
      return;
    }
    if (day === 4 && !pilot?.revivalEnabled) {
      setUnlock(null);
      return;
    }
    const entry = ROUND_UNLOCKS[day];
    if (!entry) {
      setUnlock(null);
      return;
    }
    if (readUnlocksSeen().has(entry.id)) {
      setUnlock(null);
      return;
    }

    const eliminated = Boolean(you?.isEliminated);
    const copy =
      day === 4 && !eliminated && entry.bodyAlive
        ? entry.bodyAlive
        : entry.body;

    setBody(copy);
    setUnlock(entry);
    setMascot(getRuleMascot({ day, eliminated }));
  }, [phase, currentDay, you?.isEliminated, pilot?.infiltratorEnabled, pilot?.revivalEnabled]);

  const dismiss = useCallback(() => {
    if (!unlock) return;
    markUnlockSeen(unlock.id);
    // RuleReveal is the day ceremony — don't leave DayBriefing underneath.
    markBriefingSeen(currentDay);
    setUnlock(null);
    setMascot(null);
  }, [unlock, currentDay]);

  const handleCta = useCallback(() => {
    const day = Number(currentDay);
    const goAudit = day === 4 && Boolean(you?.isEliminated) && typeof onAudit === "function";
    dismiss();
    if (goAudit) onAudit();
  }, [currentDay, you?.isEliminated, onAudit, dismiss]);

  return (
    <CeremonyShell
      open={Boolean(unlock)}
      onDismiss={dismiss}
      label={unlock ? `Day ${currentDay} riddle: ${theme.theme}` : "Day unlock"}
      overlayKey={unlock?.id}
    >
      <Eyebrow>{unlock?.eyebrow}</Eyebrow>

      <div className="mb-3 flex justify-center">
        <ThemeMotif emoji={theme.emoji} size={100} label={theme.theme} />
      </div>

      <CeremonyTitle>{theme.theme}</CeremonyTitle>
      <CeremonySub>Today&apos;s riddle</CeremonySub>

      <div className="w-full rounded-3xl border border-ember/30 bg-smoke/50 backdrop-blur-sm p-4 mb-4 text-left">
        <p className="font-mono text-amber text-[10px] tracking-[0.18em] uppercase mb-1.5">
          The twist
        </p>
        <p className="font-display text-2xl text-bone leading-snug mb-2">
          {unlock?.title}
        </p>
        <p className="font-body text-bone/75 text-sm leading-relaxed">{body}</p>
        {cap != null && (
          <p className="mt-3 font-mono text-dim text-[11px] tabular-nums">
            Survival cap <span className="text-amber">{cap}</span>
          </p>
        )}
        {mascot?.message && (
          <div className="mt-4 pt-3 border-t border-ember/25 flex items-start gap-3">
            <div className="shrink-0" aria-hidden="true">
              <Mascot variant={mascot.variant || "idle"} size={40} trackCursor={false} />
            </div>
            <p className="font-body text-bone/70 text-xs leading-relaxed pt-1">
              {mascot.message}
            </p>
          </div>
        )}
      </div>

      <ThemeFairness theme={theme} className="mb-6" />

      <HumanCta onClick={handleCta}>
        {(unlock?.cta || "I'm in").replace(/→\s*$/, "").trim()} →
      </HumanCta>
      <GhostLink onClick={dismiss} className="mt-3">
        Dismiss
      </GhostLink>
    </CeremonyShell>
  );
}
