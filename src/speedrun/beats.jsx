import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpeedRun } from "./SpeedRunProvider.jsx";
import {
  FINALE_COPY,
  JURY_COPY,
  DEMO_SHARE_URL_PATH,
  DEMO_DRAW,
  WILDCARD_CANDIDATES,
  dayMeta,
} from "./script.js";
import ThemeMotif from "../components/ui/ThemeMotif.jsx";
import GameMoment from "../components/GameMoment.jsx";
import ShareSheet from "../components/ShareSheet.jsx";
import MascotGuide from "../components/ui/MascotGuide.jsx";
import VoteBar from "../components/ui/VoteBar.jsx";
import { shareMoment, momentCardDataUrl } from "../lib/shareMoment.js";
import { getProfiledMascotLines } from "../lib/copy.js";
import BuiltWithStack from "./BuiltWithStack.jsx";
import SpeedRunIntro from "./SpeedRunIntro.jsx";
import MotifFrieze from "../components/ui/MotifFrieze.jsx";
import { useSpeedRunFeel, CUE_PRESS, CUE_HOVER } from "./useSpeedRunFeel.js";
import {
  HumanCta,
  GameCta,
  Ceremony,
  DayReveal,
  CutCeremony,
  DrawCeremony,
  ThemeMissionCard,
  OutcomeCeremony,
} from "./beatUi.jsx";
import { MOTION_SPRING } from "../lib/motion.js";

export function IntroBeat({ onStart, onExit, soundEnabled, onToggleSound }) {
  const { nextBeat } = useSpeedRun();
  return (
    <SpeedRunIntro
      soundEnabled={soundEnabled}
      onToggleSound={onToggleSound}
      onExit={onExit}
      onStart={() => {
        onStart?.();
        nextBeat();
      }}
    />
  );
}

export function D1RevealBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(1);
  return (
    <DayReveal
      day={1}
      theme={d.theme}
      unlock={d.unlock}
      capFrom={d.capFrom}
      capTo={d.capTo}
      onContinue={nextBeat}
    />
  );
}

export function D1CheckInBeat() {
  const { photoPreview, setPhoto, submitDay1Checkin } = useSpeedRun();
  const { beatFeel } = useSpeedRunFeel();
  const fileRef = useRef(null);
  const d = dayMeta(1);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto(reader.result);
        beatFeel("snap");
      }
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    beatFeel("checkin");
    submitDay1Checkin();
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-5 pb-8">
      <ThemeMissionCard
        day={1}
        theme={d.theme}
        mantra="Answer the riddle. Your photo is your answer — add one line on why it fits."
        footnote={`If more than ${d.capTo} are eligible, the seed lottery decides who survives.`}
      />

      {photoPreview ? (
        <div className="mb-4 rounded-3xl overflow-hidden border border-neon/30 relative aspect-[4/5] max-h-[40vh] shadow-[0_16px_40px_-20px_rgba(0,0,0,0.55)]">
          <img src={photoPreview} alt="Your proof" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            {...CUE_PRESS}
            className="absolute top-3 right-3 bg-ash/80 backdrop-blur rounded-full px-3 py-1.5 text-bone text-xs font-mono"
          >
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          {...CUE_PRESS}
          className="mb-4 w-full aspect-[4/5] max-h-[36vh] rounded-3xl border border-dashed border-amber/45 flex flex-col items-center justify-center gap-3 bg-smoke/40 active:scale-[0.98] transition-transform shadow-[inset_0_0_0_1px_rgba(244,184,74,0.12)]"
        >
          <ThemeMotif emoji={d.theme.emoji} size={72} label={d.theme.theme} />
          <span className="font-body text-bone text-sm">Snap your answer</span>
          <span className="font-mono text-amber/80 text-[10px] uppercase tracking-wider">Tap to open camera</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      {photoPreview ? (
        <GameCta onClick={submit} className="mb-2">
          Lock in your answer →
        </GameCta>
      ) : (
        <>
          <HumanCta onClick={() => fileRef.current?.click()} className="mb-2">
            Snap your answer →
          </HumanCta>
          <button
            type="button"
            onClick={submit}
            {...CUE_PRESS}
            className="w-full py-3 rounded-xl text-dim font-mono text-xs underline decoration-dotted underline-offset-2"
          >
            Practice with a sample shot
          </button>
        </>
      )}
    </div>
  );
}

export function D1ClosingBeat() {
  const { photoPreview, submissions, nextBeat } = useSpeedRun();
  const { beatFeel } = useSpeedRunFeel();
  const mySub = submissions.find((s) => s.isYou);
  const photo = photoPreview || mySub?.mediaUrl;
  const targetReal = mySub?.votes?.real ?? 0;
  const targetFake = mySub?.votes?.fake ?? 0;

  // sealed → reveal → ready. Keep counts hidden until the seal lifts.
  const [phase, setPhase] = useState("sealed"); // sealed | reveal | ready
  const [displayReal, setDisplayReal] = useState(0);
  const [displayFake, setDisplayFake] = useState(0);

  useEffect(() => {
    const sealTimer = setTimeout(() => {
      setPhase("reveal");
      beatFeel("tally");
    }, 1600);
    return () => clearTimeout(sealTimer);
  }, [beatFeel]);

  useEffect(() => {
    if (phase !== "reveal") return undefined;
    const duration = 1400;
    const steps = 20;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;
      setDisplayReal(Math.round(targetReal * progress));
      setDisplayFake(Math.round(targetFake * progress));
      if (step >= steps) {
        clearInterval(timer);
        setDisplayReal(targetReal);
        setDisplayFake(targetFake);
        setPhase("ready");
        beatFeel("advance");
      }
    }, interval);
    return () => clearInterval(timer);
  }, [phase, targetReal, targetFake, beatFeel]);

  const ready = phase === "ready";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-5 pb-8 items-center justify-center">
      <div className="w-full max-w-sm text-center mb-5">
        <p className="font-mono text-amber text-xs uppercase tracking-[0.2em] mb-2">Day 1 · Submitted</p>
        <p className="font-display text-4xl text-bone leading-none mb-2">Proof received</p>
        <p className="font-body text-bone/60 text-sm">
          {phase === "sealed"
            ? "Sealed for the jury. Your photo is on trial."
            : ready
              ? "The jury has spoken. Now you judge others."
              : "The seal lifts. Votes are landing."}
        </p>
      </div>

      <div className="w-full max-w-sm mb-5 rounded-3xl overflow-hidden border border-amber/30 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.55)] aspect-[4/5] max-h-[40vh] bg-ash relative">
        {photo ? (
          <img src={photo} alt="Your proof" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ThemeMotif emoji={dayMeta(1).theme.emoji} size={80} />
          </div>
        )}
        {phase === "sealed" && (
          <div className="absolute inset-0 bg-ash/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
            <p className="font-mono text-amber text-[10px] uppercase tracking-[0.22em]">Sealed receipt</p>
            <p className="font-display text-2xl text-bone">Awaiting jury</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mb-6">
        {phase === "sealed" ? (
          <SealedTally />
        ) : (
          <LiveTally real={displayReal} fake={displayFake} />
        )}
        <p className="text-center font-mono text-dim text-[10px] mt-2 uppercase tracking-widest">
          {ready ? "Verdict in — enter the audit" : phase === "sealed" ? "Jury deliberating..." : "Votes landing..."}
        </p>
      </div>

      <GameCta onClick={nextBeat} disabled={!ready} className="w-full max-w-sm">
        {ready ? "Enter the audit →" : "Holding the seal..."}
      </GameCta>
    </div>
  );
}

export function D1RankBeat() {
  const { rank, nextBeat, shareCopied, setShareCopied, photoPreview } = useSpeedRun();
  const cap = dayMeta(1).capTo;

  const shareText = `Day 1 · SURVIVED\nLast Human Standing practice run`;
  const shareUrl = `${window.location.origin}${DEMO_SHARE_URL_PATH}`;

  const onShare = async () => {
    const status = await shareMoment("survive", {
      name: "@you",
      day: 1,
      rank,
      cap,
      text: shareText,
      url: shareUrl,
      photoUrl: photoPreview,
    });
    if (status === "copied") {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <GameMoment
      result={{ survived: true, rank, survivalCap: cap, gpsShared: false }}
      currentDay={1}
      onDismiss={nextBeat}
      onShare={onShare}
      shareCopied={shareCopied}
      photoUploadFailed={false}
      playerName="@you"
      shareText={shareText}
      shareUrl={shareUrl}
      photoUrl={photoPreview}
    />
  );
}

function SealedTally() {
  return (
    <div className="mt-3 rounded-2xl border border-ember/35 bg-smoke/50 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest">Human</p>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest">Sus</p>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden border border-ember/40 bg-ash relative">
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3 bg-amber/35"
          animate={{ x: ["-40%", "220%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="text-center font-body text-bone/55 text-xs mt-3">Counts stay sealed until the jury finishes.</p>
    </div>
  );
}

function LiveTally({ real = 0, fake = 0 }) {
  return <VoteBar real={real} fake={fake} size="hero" className="mt-3" />;
}

export function D1AuditBeat() {
  const { submissions, votes, castVote, votesDone, nextBeat } = useSpeedRun();
  const { beatFeel, cue, celebrate } = useSpeedRunFeel();
  const theme = dayMeta(1).theme;
  const lines = getProfiledMascotLines();

  const mySub = submissions.find((s) => s.isYou);
  // Only show submissions that aren't "you" — you don't vote on yourself
  const votable = submissions.filter((s) => !s.isYou);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealTally, setRevealTally] = useState(false);
  const [mascotState, setMascotState] = useState({ variant: "determined", message: lines.auditStart });

  const onVote = (id, type) => {
    beatFeel(type === "real" ? "vote-human" : "vote-sus");
    castVote(id, type);
    setRevealTally(true);
    // Mascot reacts to the vote
    const sub = votable.find((s) => s.id === id);
    const crowdAgrees = type === "real" ? sub.votes.real > sub.votes.fake : sub.votes.fake > sub.votes.real;
    if (type === "real") {
      setMascotState({
        variant: crowdAgrees ? "proud" : "thinking",
        message: crowdAgrees ? lines.auditHumanAgrees : lines.auditHumanDisagrees,
      });
    } else {
      setMascotState({
        variant: crowdAgrees ? "determined" : "worried",
        message: crowdAgrees ? lines.auditSusAgrees : lines.auditSusDisagrees,
      });
    }
    // Auto-advance after the tally reveal
    setTimeout(() => {
      setRevealTally(false);
      setCurrentIdx((i) => Math.min(i + 1, votable.length - 1));
      setMascotState({ variant: "determined", message: null });
    }, 1600);
  };

  const sub = votable[currentIdx];
  const myVote = sub ? votes[sub.id] : null;
  const totalVoted = Object.keys(votes).filter((id) => id !== "you").length;
  const votesNeeded = Math.min(3, votable.length);

  // All done — show completion state
  if (votesDone || !sub) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-5 pb-8 gap-5">
        <MascotGuide
          variant="proud"
          size={72}
          message={lines.auditDone(totalVoted)}
          position="top"
          interactive
          onMascotClick={(type) => {
            cue("tap");
            if (type === "secret") celebrate(12);
          }}
        />
        <div className="text-center">
          <p className="font-display text-4xl text-bone leading-none mb-2">Audit complete</p>
          <p className="text-dim font-body text-sm">
            The crowd has spoken.
          </p>
        </div>
        <MotifFrieze className="w-full max-w-sm opacity-85" />
        <GameCta tone="amber" onClick={nextBeat} className="w-full max-w-sm mt-2">
          Close the day →
        </GameCta>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-3 pb-4">
      {/* Header — compact, with mascot */}
      <div className="px-2 mb-3 flex items-start gap-2 shrink-0">
        <MascotGuide
          variant={mascotState.variant}
          size={40}
          message={mascotState.message}
          position="top"
          interactive
          onMascotClick={(type) => {
            cue("tap");
            if (type === "secret") celebrate(12);
          }}
        />
        <div className="flex-1 min-w-0 pt-2">
          <p className="font-display text-2xl text-bone leading-none">The audit</p>
          <p className="font-body text-bone/60 text-xs mt-0.5">Human or bluff? Vote on {votesNeeded}.</p>
        </div>
        <ThemeMotif emoji={theme.emoji} size={32} label={theme.theme} />
      </div>

      {/* Spec revealed — the reveal-then-vote phase (Riddle Rounds §2.3).
          The committed criteria unlock before voting, so every vote is judged
          against what was locked, not invented after the fact. */}
      <div className="shrink-0 mb-3 rounded-xl border border-amber/35 bg-amber/10 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-amber uppercase tracking-widest">Spec revealed</span>
          <span className="font-mono text-[9px] text-dim/50">vote against these</span>
        </div>
        <p className="font-body text-bone/75 text-[11px] leading-snug">
          <span className="text-neon">Accepts</span> {theme.counts?.[0]} · <span className="text-blood">Rejects</span> {theme.doesnt?.[0]}
        </p>
      </div>

      {/* Your proof — on trial */}
      {mySub && (
        <div className="shrink-0 mb-3 rounded-2xl border border-amber/35 bg-smoke/70 overflow-hidden backdrop-blur-sm">
          <div className="flex gap-2 p-2 items-center">
            <div className="w-16 h-16 rounded-xl bg-ash overflow-hidden shrink-0 border border-ember/40">
              {mySub.mediaUrl ? (
                <img src={mySub.mediaUrl} alt="Your proof" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ThemeMotif emoji={theme.emoji} size={28} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] text-amber uppercase tracking-widest">Your proof · on trial</p>
              {mySub.caption && (
                <p className="font-body text-bone/85 text-xs leading-snug truncate">{mySub.caption}</p>
              )}
              <div className="mt-1">
                <LiveTally real={mySub.votes.real} fake={mySub.votes.fake} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-3 shrink-0">
        {votable.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
              i < currentIdx
                ? "w-4 bg-neon"
                : i === currentIdx
                  ? "w-6 bg-amber"
                  : "w-1.5 bg-bone/15"
            }`}
          />
        ))}
      </div>

      {/* Focused card — one submission at a time */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={MOTION_SPRING.snappy}
            className="flex-1 flex flex-col bg-smoke/80 border border-ember/40 rounded-3xl overflow-hidden backdrop-blur-sm min-h-0"
          >
            {/* Image — fills available space */}
            <div className="flex-1 min-h-0 relative bg-ash overflow-hidden">
              {sub.mediaUrl ? (
                <img src={sub.mediaUrl} alt={sub.caption} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ThemeMotif emoji={theme.emoji} size={80} />
                </div>
              )}
              {/* Overlay: user + status */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-ash/80 backdrop-blur text-bone border border-ember/50">
                  {sub.user}
                </span>
                <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-ash/80 backdrop-blur text-amber tracking-widest">
                  ON TRIAL
                </span>
              </div>
              {/* Caption overlay at bottom of image */}
              {sub.caption && (
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-ash/90 to-transparent">
                  <p className="font-body text-bone/90 text-sm leading-snug">{sub.caption}</p>
                </div>
              )}
            </div>

            {/* Tally + vote actions — fixed at bottom of card */}
            <div className="shrink-0 p-4">
              {/* Tally — reveal after voting */}
              <AnimatePresence>
                {revealTally && myVote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <LiveTally real={sub.votes.real} fake={sub.votes.fake} />
                    <p className="text-center font-mono text-[10px] text-dim mt-2">
                      You voted {myVote === "real" ? "HUMAN" : "SUS"} · next submission…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vote buttons — hide after voting */}
              {!myVote && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onVote(sub.id, "real")}
                    data-cuelume-press="chime"
                    data-cuelume-release="release"
                    className="py-4 rounded-2xl font-display text-xl tracking-widest active:scale-[0.97] transition-transform bg-neon/15 border-2 border-neon/50 text-neon"
                  >
                    HUMAN
                  </button>
                  <button
                    type="button"
                    onClick={() => onVote(sub.id, "fake")}
                    data-cuelume-press="press"
                    data-cuelume-release="release"
                    className="py-4 rounded-2xl font-display text-xl tracking-widest active:scale-[0.97] transition-transform bg-blood/15 border-2 border-blood/50 text-blood"
                  >
                    SUS
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function D1DrawBeat() {
  const { nextBeat } = useSpeedRun();
  const { beatFeel } = useSpeedRunFeel();

  // Fire the draw feel once on mount, then the survive feel when it lands.
  useEffect(() => {
    beatFeel("tally");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DrawCeremony
      draw={DEMO_DRAW}
      cta="See your result →"
      onContinue={() => {
        beatFeel("survive");
        nextBeat();
      }}
    />
  );
}

export function D1CutBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(1);
  return (
    <CutCeremony
      from={d.capFrom}
      to={d.capTo}
      title="The cut"
      body="@ghost_protocol got flagged. A cleaner check-in inherited their slot — DQ and replace, live."
      chip="You made it · your rank still holds"
      onContinue={nextBeat}
    />
  );
}

export function D2RevealBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(2);
  return (
    <DayReveal
      day={2}
      theme={d.theme}
      unlock={{ ...d.unlock, eyebrow: `${d.unlock.eyebrow} · twist preview` }}
      capFrom={d.capFrom}
      capTo={d.capTo}
      onContinue={nextBeat}
    />
  );
}

export function D2PathBeat() {
  const { choosePath } = useSpeedRun();
  const { beatFeel } = useSpeedRunFeel();
  const d = dayMeta(2);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-5 pb-8">
      <ThemeMissionCard
        day={2}
        theme={d.theme}
        mantra="Choose your path. The crowd will judge."
      />
      <p className="font-body text-bone/55 text-sm text-center mb-1 px-2">
        Twist preview — infiltrators return in a future cohort.
      </p>
      <p className="font-body text-bone/40 text-xs text-center mb-4 px-2">
        In the real game this choice is irrevocable for the day.
      </p>
      <div className="space-y-3 mb-5">
        <button
          type="button"
          onClick={() => {
            beatFeel("honest");
            choosePath("honest");
          }}
          {...CUE_PRESS}
          {...CUE_HOVER}
          className="w-full p-4 rounded-2xl bg-neon/10 border border-neon/35 text-left active:scale-[0.98] transition-transform"
        >
          <p className="font-display text-xl text-neon mb-1">Play it straight</p>
          <p className="font-body text-bone/65 text-sm leading-relaxed">
            Real gym. Real sweat. Survive on truth.
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            choosePath("bluff");
          }}
          {...CUE_PRESS}
          {...CUE_HOVER}
          className="w-full p-4 rounded-2xl bg-blood/10 border border-blood/35 text-left active:scale-[0.98] transition-transform"
        >
          <p className="font-display text-xl text-blood mb-1">Go infiltrator</p>
          <p className="font-body text-bone/65 text-sm leading-relaxed">
            Bluff the crowd. Fool them → immunity. Get caught → you&apos;re out.
          </p>
        </button>
      </div>
      <MotifFrieze className="w-full opacity-85" />
    </div>
  );
}

export function D2OutcomeBeat() {
  const { pathChoice, bluffOutcome, nextBeat } = useSpeedRun();
  const { beatFeel } = useSpeedRunFeel();
  const jury = bluffOutcome === "caught";

  useEffect(() => {
    if (pathChoice === "honest") beatFeel("honest");
    else if (bluffOutcome === "fooled") beatFeel("fooled");
    else if (jury) beatFeel("caught");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pathChoice === "honest") {
    return (
      <OutcomeCeremony
        eyebrow="Honest path"
        title="Clean submit"
        titleTone="bone"
        body="The crowd buys it. No immunity — but no burn risk either. You hold your spot."
        onContinue={nextBeat}
      />
    );
  }
  if (bluffOutcome === "fooled") {
    return (
      <OutcomeCeremony
        eyebrow="Infiltrator"
        title="You fooled them"
        titleTone="amber"
        body="Immunity sticks through tomorrow's cut. In the real game this is rare — treat it like stolen fire."
        chip="Immunity active"
        onContinue={nextBeat}
      />
    );
  }
  return (
    <OutcomeCeremony
      eyebrow={JURY_COPY.eyebrow}
      title={JURY_COPY.title}
      titleTone="blood"
      body={JURY_COPY.body}
      chip="You stay for the wildcard & finale — so you can see the whole myth."
      onContinue={nextBeat}
    />
  );
}

export function D2CutBeat() {
  const { nextBeat, skipToFinale, hasImmunity } = useSpeedRun();
  const d = dayMeta(2);
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <CutCeremony
        from={d.capFrom}
        to={d.capTo}
        title="The cut"
        body="Cap halves again. The mid-game hunger starts here."
        chip={hasImmunity ? "Your immunity carried you through" : "You made the cut"}
        onContinue={nextBeat}
      />
      <button
        type="button"
        onClick={skipToFinale}
        {...CUE_PRESS}
        className="mx-auto -mt-4 mb-8 font-mono text-dim text-[10px] underline decoration-dotted underline-offset-2"
      >
        Skip to finale →
      </button>
    </div>
  );
}

export function D3RevealBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(3);
  return (
    <DayReveal
      day={3}
      theme={d.theme}
      unlock={d.unlock}
      capFrom={d.capFrom}
      capTo={d.capTo}
      onContinue={nextBeat}
    />
  );
}

export function D3PulseBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(3);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-5 pb-8">
      <ThemeMissionCard
        day={3}
        theme={d.theme}
        mantra={`${d.capTo} spots left. The field is thinner.`}
      />
      <div className="bg-amber/10 border border-amber/35 rounded-2xl p-4 mb-4">
        <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2">Mid-day pulse</p>
        <p className="font-body text-bone/85 text-sm leading-relaxed">
          A flagged survivor just got DQ&apos;d. You were rank #{d.capTo + 1} — you{" "}
          <span className="text-neon font-semibold">inherited their slot</span>.
          Slow and real can still beat fast and fake.
        </p>
      </div>
      <div className="bg-smoke/70 border border-ember/35 rounded-2xl p-4 mb-5 space-y-2.5">
        <p className="font-mono text-dim text-[10px] uppercase tracking-widest">Activity</p>
        <p className="font-body text-bone/80 text-sm">@marina_sol checked in · rank #2</p>
        <p className="font-body text-bone/80 text-sm">@luna_waves checked in · rank #4</p>
        <p className="font-body text-bone/80 text-sm">You · checked in · rank #{d.capTo}</p>
        <p className="font-body text-blood/80 text-sm">3 humans flagged in the last hour</p>
      </div>
      <MotifFrieze className="w-full mb-5 opacity-85" />
      <HumanCta onClick={nextBeat}>Skip to day close →</HumanCta>
    </div>
  );
}

export function D3CutBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(3);
  return (
    <CutCeremony
      from={d.capFrom}
      to={d.capTo}
      title="The cut deepens"
      body="Six humans left. Tomorrow the jury gets a vote — one of the dead might walk back in."
      chip="You're still breathing"
      onContinue={nextBeat}
    />
  );
}

export function D4RevealBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(4);
  const unlock = {
    ...d.unlock,
    eyebrow: `${d.unlock.eyebrow} · twist preview`,
    body: d.unlock.bodyAlive || d.unlock.body,
  };
  return (
    <DayReveal
      day={4}
      theme={d.theme}
      unlock={unlock}
      capFrom={d.capFrom}
      capTo={d.capTo}
      onContinue={nextBeat}
    />
  );
}

export function D4JuryBeat() {
  const { revivePick, pickRevive, nextBeat } = useSpeedRun();
  const { beatFeel } = useSpeedRunFeel();
  const d = dayMeta(4);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-5 pb-8">
      <div className="flex items-start gap-3 mb-4">
        <ThemeMotif emoji={d.theme.emoji} size={52} label={d.theme.theme} />
        <div>
          <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-1">Day 4 · Wildcard</p>
          <h2 className="font-display text-3xl text-bone leading-tight">Who walks back in?</h2>
        </div>
      </div>
      <p className="font-body text-bone/70 text-sm mb-2 leading-relaxed">
        You&apos;re still alive — cast the jury&apos;s vote anyway. In the real game, only the eliminated decide.
      </p>
      <p className="font-body text-bone/40 text-xs mb-5 leading-relaxed">
        Twist preview — the wildcard revival returns in a future cohort.
      </p>
      <MotifFrieze className="w-full mb-5 opacity-85" />
      <div className="space-y-3 mb-6">
        {WILDCARD_CANDIDATES.map((c) => {
          const selected = revivePick === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                beatFeel("advance");
                pickRevive(c.id);
              }}
              {...CUE_PRESS}
              {...CUE_HOVER}
              className={`w-full text-left p-4 rounded-2xl border transition-transform active:scale-[0.98] ${
                selected ? "bg-amber/15 border-amber" : "bg-smoke/80 border-ember/35 backdrop-blur-sm"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="font-display text-xl text-bone">{c.user}</p>
                <p className="font-mono text-amber text-[10px]">{c.tickets} tickets</p>
              </div>
              <p className="font-body text-bone/60 text-sm leading-relaxed">{c.blurb}</p>
            </button>
          );
        })}
      </div>
      <HumanCta
        disabled={!revivePick}
        onClick={() => {
          beatFeel("wildcard");
          nextBeat();
        }}
      >
        Cast revival vote →
      </HumanCta>
    </div>
  );
}

export function D4ReviveBeat() {
  const { revivePick, nextBeat } = useSpeedRun();
  const picked = WILDCARD_CANDIDATES.find((c) => c.id === revivePick) || WILDCARD_CANDIDATES[0];
  const d = dayMeta(4);
  return (
    <Ceremony>
      <p className="font-mono text-neon/90 uppercase mb-3" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
        Wildcard revival
      </p>
      <h2 className="font-display text-neon leading-[0.95] mb-3" style={{ fontSize: "clamp(28px,7vw,40px)" }}>
        {picked.user} walks back in
      </h2>
      <p className="font-body text-bone/75 text-sm max-w-xs mb-4 leading-relaxed">
        The jury spoke. One ghost returns to the living.
      </p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-bone mb-2 tabular-nums"
        style={{ fontSize: "clamp(40px,10vw,52px)" }}
      >
        {d.capFrom}
        <span className="text-dim text-[0.45em] mx-2">→</span>
        <span className="text-amber">{d.capTo}</span>
      </motion.div>
      <p className="font-mono text-dim text-[11px] mb-4">Three remain. Final day arming…</p>
      <MotifFrieze className="w-full mb-6 opacity-90" />
      <HumanCta onClick={nextBeat}>Enter the finale →</HumanCta>
    </Ceremony>
  );
}

export function D5RevealBeat() {
  const { nextBeat } = useSpeedRun();
  const d = dayMeta(5);
  return (
    <DayReveal
      day={5}
      theme={d.theme}
      unlock={d.unlock}
      capFrom={d.capFrom}
      capTo={d.capTo}
      onContinue={nextBeat}
    />
  );
}

export function FinaleBeat({ onReserve, onExit }) {
  const { shareCopied, setShareCopied } = useSpeedRun();
  const { beatFeel, cue, celebrate } = useSpeedRunFeel();
  const c = FINALE_COPY;
  const [cardSrc, setCardSrc] = useState(null);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const shareText = "I just practiced all 5 days of Last Human Standing. Real cohort opens soon — get in.";
  const shareUrl = `${window.location.origin}${DEMO_SHARE_URL_PATH}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const src = await momentCardDataUrl("win", {
          name: "@you",
          day: 5,
          originHost: window.location.host,
        });
        if (!cancelled) setCardSrc(src);
      } catch {
        if (!cancelled) setCardSrc(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onShare = async () => {
    const status = await shareMoment("win", {
      name: "@you",
      day: 5,
      text: shareText,
      url: shareUrl,
    });
    beatFeel("share");
    if (status === "copied") {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <Ceremony>
      <p className="font-mono text-amber/90 uppercase mb-3" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
        {c.eyebrow}
      </p>
      <h2
        className="font-display text-bone leading-[0.9] mb-3"
        style={{ fontSize: "clamp(32px,8vw,44px)" }}
      >
        {c.title}
      </h2>
      <p className="font-body text-bone/75 text-sm leading-relaxed mb-4">{c.body}</p>

      {/* Survivor — your guide, celebrating the finish */}
      <MascotGuide
        variant="winner"
        size={64}
        message={getProfiledMascotLines().finale}
        position="top"
        className="mb-4"
        interactive
        onMascotClick={(type) => {
          cue("tap");
          if (type === "secret") celebrate(24);
        }}
      />

      <MotifFrieze className="w-full mb-2" />
      <p className="font-mono text-dim uppercase mb-4" style={{ fontSize: 10, letterSpacing: "0.14em" }}>
        you showed up. that&apos;s the whole game.
      </p>

      {cardSrc && (
        <img
          src={cardSrc}
          alt="Winner moment card"
          className="w-full rounded-xl border border-ember/40 mb-5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)]"
        />
      )}

      <HumanCta onClick={onReserve} className="mb-3">
        {c.reserveCta}
      </HumanCta>
      <GameCta tone="ghost" onClick={() => setShowShareSheet(true)} className="mb-3 !text-sm">
        {shareCopied ? "✓ Copied" : c.shareCta}
      </GameCta>
      <BuiltWithStack className="mb-4 opacity-80" />
      <button
        type="button"
        onClick={onExit}
        {...CUE_PRESS}
        className="font-mono text-dim text-xs underline decoration-dotted underline-offset-2"
      >
        Back to landing
      </button>
      <ShareSheet
        open={showShareSheet}
        kind="win"
        name="@you"
        day={5}
        text={shareText}
        url={shareUrl}
        onNativeShare={onShare}
        onClose={() => setShowShareSheet(false)}
      />
    </Ceremony>
  );
}
