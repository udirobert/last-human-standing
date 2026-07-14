import { useEffect } from "react";
import { SpeedRunProvider, useSpeedRun, clearSpeedRunState } from "./SpeedRunProvider.jsx";
import {
  IntroBeat,
  D1RevealBeat,
  D1CheckInBeat,
  D1ClosingBeat,
  D1RankBeat,
  D1AuditBeat,
  D1CutBeat,
  D2RevealBeat,
  D2PathBeat,
  D2OutcomeBeat,
  D2CutBeat,
  D3RevealBeat,
  D3PulseBeat,
  D3CutBeat,
  D4RevealBeat,
  D4JuryBeat,
  D4ReviveBeat,
  D5RevealBeat,
  FinaleBeat,
} from "./beats.jsx";
import AmbientBackdrop from "../components/AmbientBackdrop.jsx";
import { useSpeedRunFeel, CUE_PRESS, CUE_HOVER } from "./useSpeedRunFeel.js";

const BEAT_VIEW = {
  intro: IntroBeat,
  d1_reveal: D1RevealBeat,
  d1_checkin: D1CheckInBeat,
  d1_closing: D1ClosingBeat,
  d1_rank: D1RankBeat,
  d1_audit: D1AuditBeat,
  d1_cut: D1CutBeat,
  d2_reveal: D2RevealBeat,
  d2_path: D2PathBeat,
  d2_outcome: D2OutcomeBeat,
  d2_cut: D2CutBeat,
  d3_reveal: D3RevealBeat,
  d3_pulse: D3PulseBeat,
  d3_cut: D3CutBeat,
  d4_reveal: D4RevealBeat,
  d4_jury: D4JuryBeat,
  d4_revive: D4ReviveBeat,
  d5_reveal: D5RevealBeat,
  finale: FinaleBeat,
};

function phaseForDay(demoDay, beat) {
  if (beat === "finale" || demoDay >= 5) return "ended";
  if (demoDay <= 0) return "prelaunch";
  return "live";
}

/**
 * Whisper chrome for in-play beats — day pulse + icon actions.
 * Intro gets its own cinematic chrome inside SpeedRunIntro.
 */
function PlayChrome({ demoDay, beat, soundEnabled, onToggleSound, onSkip, onExit }) {
  return (
    <div className="absolute top-0 inset-x-0 z-30 pointer-events-none">
      <div className="px-3 pt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-[72px]">
          {[1, 2, 3, 4, 5].map((d) => (
            <span
              key={d}
              className={`h-1 rounded-full transition-all duration-300 ${
                demoDay === d
                  ? "w-5 bg-amber shadow-[0_0_10px_rgba(255,184,0,0.45)]"
                  : demoDay > d
                    ? "w-2 bg-bone/35"
                    : "w-2 bg-bone/12"
              }`}
            />
          ))}
        </div>

        <p
          className="font-mono text-bone/40 uppercase tracking-[0.16em] text-[9px] tabular-nums"
          aria-live="polite"
        >
          {demoDay > 0 ? `Day ${demoDay} of 5` : "…"}
        </p>

        <div className="flex items-center justify-end gap-0.5 min-w-[72px] pointer-events-auto">
          {demoDay >= 2 && beat !== "finale" && (
            <button
              type="button"
              onClick={onSkip}
              {...CUE_PRESS}
              className="px-2 h-9 font-mono text-[9px] text-bone/35 hover:text-bone/70 uppercase tracking-wider transition-colors"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSound}
            {...CUE_HOVER}
            data-cuelume-press="toggle"
            className="w-9 h-9 rounded-full flex items-center justify-center text-bone/40 hover:text-bone/80 hover:bg-bone/5 transition-colors"
            aria-label={soundEnabled ? "Mute" : "Unmute"}
          >
            <span className="text-xs" aria-hidden>{soundEnabled ? "♪" : "–"}</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            {...CUE_PRESS}
            className="w-9 h-9 rounded-full flex items-center justify-center text-bone/40 hover:text-bone/80 hover:bg-bone/5 transition-colors font-display text-lg leading-none"
            aria-label="Exit"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SpeedRunApp — guided 5-day cohort myth, compressed.
 * Entry: /?demo=1
 *
 * Intro matches LandingHero immersion; play beats keep MissionBoard warmth
 * with whisper chrome instead of a demo control bar.
 */
function SpeedRunShell({ onReserve, onExit }) {
  const { beat, demoDay, reset, skipToFinale } = useSpeedRun();
  const { beatFeel, soundEnabled, toggleSound } = useSpeedRunFeel();
  const isIntro = beat === "intro";
  const isFinale = beat === "finale";
  const phase = phaseForDay(demoDay, beat);

  // Peak moments when entering key beats
  useEffect(() => {
    if (beat === "d1_reveal" || beat === "d2_reveal" || beat === "d3_reveal" || beat === "d4_reveal" || beat === "d5_reveal") {
      beatFeel("reveal");
    } else if (beat === "d1_closing") {
      beatFeel("pressure");
    } else if (beat === "d1_cut" || beat === "d2_cut" || beat === "d3_cut") {
      beatFeel("cut");
    } else if (beat === "d4_revive") {
      beatFeel("revive");
    } else if (beat === "finale") {
      beatFeel("finale");
    } else if (beat === "d2_path") {
      beatFeel("infiltrator-unlock");
    } else if (beat === "d3_pulse") {
      beatFeel("pressure");
    } else if (beat === "d4_jury") {
      beatFeel("wildcard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per beat id
  }, [beat]);

  // Intro uses the same full-bleed room breakout as Onboarding step 0
  useEffect(() => {
    document.body.classList.toggle("landing-mode", isIntro);
    document.documentElement.classList.toggle("landing-mode", isIntro);
    return () => {
      document.body.classList.remove("landing-mode");
      document.documentElement.classList.remove("landing-mode");
    };
  }, [isIntro]);

  const handleExit = () => {
    beatFeel("advance");
    reset();
    clearSpeedRunState();
    onExit?.();
  };

  const handleReserve = () => {
    beatFeel("share");
    clearSpeedRunState();
    onReserve?.();
  };

  const View = BEAT_VIEW[beat] || IntroBeat;

  if (isIntro) {
    return (
      <div className="relative min-h-screen flex flex-col font-body overflow-hidden bg-transparent">
        <IntroBeat
          onStart={() => {
            beatFeel("reveal");
          }}
          onExit={handleExit}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col font-body pb-10 overflow-hidden bg-transparent">
      <AmbientBackdrop phase={phase} />
      <PlayChrome
        demoDay={demoDay}
        beat={beat}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onSkip={() => {
          beatFeel("advance");
          skipToFinale();
        }}
        onExit={handleExit}
      />
      <div className="relative z-10 flex-1 min-h-0 flex flex-col pt-12">
        {isFinale ? (
          <FinaleBeat onReserve={handleReserve} onExit={handleExit} />
        ) : (
          <View />
        )}
      </div>
    </div>
  );
}

export default function SpeedRunApp({ onReserve, onExit }) {
  return (
    <SpeedRunProvider>
      <SpeedRunShell onReserve={onReserve} onExit={onExit} />
    </SpeedRunProvider>
  );
}
