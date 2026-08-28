import { useCallback, useEffect, useState } from "react";
import { useRound } from "../../world/RoundProvider.jsx";
import { resolveActiveTheme } from "../../data/game.js";
import { ROUND_UNLOCKS } from "../../lib/copy.js";
import {
  readSpecRevealSeen,
  markSpecRevealSeen,
  hasPendingRuleUnlock,
} from "../../lib/ceremonyGate.js";
import ThemeMotif from "./ThemeMotif.jsx";
import MotifFrieze from "./MotifFrieze.jsx";
import MascotGuide from "./MascotGuide.jsx";
import { HumanCta, GhostLink } from "./CraftCta.jsx";
import { CeremonyShell, Eyebrow, CeremonyTitle, CeremonySub } from "./Ceremony.jsx";

/**
 * SpecReveal — "the turn" ceremony (Riddle Rounds §2.3).
 *
 * At reveal_at (T+18h) the hunt closes, the committed judging spec is
 * revealed, and the vote window opens. This is the pivot of the whole loop —
 * the moment the game stops asking "can you answer the riddle?" and starts
 * asking "can you judge the answers?" — so it gets its own staged moment
 * instead of a silent state flip:
 *
 *   "The hunt is over. Here's what we were actually looking for. Now you judge."
 *
 * Fires once per day, the first time the client sees round.specRevealed=true.
 * Yields to RuleReveal (the day-open ceremony) if that overlay is still owed.
 *
 * Chrome (portal + trap + warm room + entrance) comes from CeremonyShell.
 */
export default function SpecReveal({ onAudit }) {
  const { isLive, currentDay, round } = useRound();
  const [open, setOpen] = useState(false);

  const revealed = Boolean(round?.specRevealed && round?.spec);
  const day = Number(currentDay);

  useEffect(() => {
    if (!isLive || !revealed || !Number.isFinite(day) || day < 1) {
      setOpen(false);
      return;
    }
    if (readSpecRevealSeen(day)) {
      setOpen(false);
      return;
    }
    // Don't stack under the day-open rule ceremony — it will have played
    // long before T+18h in practice, but guard anyway.
    if (hasPendingRuleUnlock(day, ROUND_UNLOCKS)) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [isLive, revealed, day]);

  const dismiss = useCallback(() => {
    markSpecRevealSeen(day);
    setOpen(false);
  }, [day]);

  const goAudit = useCallback(() => {
    dismiss();
    onAudit?.();
  }, [dismiss, onAudit]);

  const theme = resolveActiveTheme(round);
  const spec = round?.spec ?? null;

  return (
    <CeremonyShell
      open={open}
      onDismiss={dismiss}
      label="The reveal — judging criteria unlocked"
      z={68}
    >
      <Eyebrow>Day {day} · the hunt is over</Eyebrow>

      <div className="mb-3 flex justify-center">
        <ThemeMotif emoji={theme.emoji} size={92} label={theme.theme} />
      </div>

      <CeremonyTitle>THE REVEAL</CeremonyTitle>
      <CeremonySub>The criteria are unlocked</CeremonySub>

      {round?.riddle && (
        <p className="font-body text-bone/85 text-sm italic leading-relaxed mb-4">
          “{round.riddle}”
        </p>
      )}

      <div className="w-full rounded-3xl border border-amber/35 bg-smoke/50 backdrop-blur-sm p-4 mb-4 text-left">
        <p className="font-mono text-amber text-[10px] tracking-[0.18em] uppercase mb-2">
          What we were actually looking for
        </p>
        {spec?.literal_categories && (
          <SpecRow label="Accepts" value={spec.literal_categories.join(" · ")} tone="neon" />
        )}
        {spec?.required_elements && (
          <SpecRow label="Must show" value={spec.required_elements.join(" · ")} tone="bone" />
        )}
        {spec?.interpretive_axes && (
          <SpecRow label="Judged on" value={spec.interpretive_axes.join(" · ")} tone="amber" />
        )}
        {spec?.hard_rejects && (
          <SpecRow label="Rejects" value={spec.hard_rejects.join(" · ")} tone="blood" />
        )}
        {round?.specHash && (
          <p className="font-mono text-dim/50 text-[9px] mt-2 break-all">
            committed before any submission · {round.specHash.slice(0, 10)}…{round.specHash.slice(-6)}
          </p>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <MascotGuide
          variant="determined"
          size={48}
          message="The hunt is over. Now you judge."
          position="top"
        />
      </div>

      <MotifFrieze className="w-full mb-5 opacity-70" />

      <HumanCta onClick={goAudit}>Enter the vote →</HumanCta>
      <GhostLink onClick={dismiss} className="mt-3">Not now</GhostLink>
    </CeremonyShell>
  );
}

function SpecRow({ label, value, tone }) {
  const color =
    tone === "neon" ? "text-neon" :
    tone === "blood" ? "text-blood" :
    tone === "amber" ? "text-amber" :
    "text-bone/80";
  return (
    <div className="mb-1.5">
      <span className={`font-mono text-[10px] uppercase tracking-widest ${color}`}>{label}</span>
      <p className="text-dim text-xs font-body leading-relaxed">{value}</p>
    </div>
  );
}
