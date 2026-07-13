import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  SPEEDRUN_BEATS,
  BEAT_DAY,
  buildDay1Audit,
  dayMeta,
  DEMO_DAYS,
} from "./script.js";

const STORAGE_KEY = "lhs_speedrun_v3";
const SpeedRunContext = createContext(null);

function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function clearSpeedRunState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function initialFromStore() {
  const s = readStored();
  const beatIndex = (() => {
    const i = SPEEDRUN_BEATS.indexOf(s?.beat);
    return i >= 0 ? i : 0;
  })();
  return {
    beatIndex,
    photoPreview: s?.photoPreview ?? null,
    votes: s?.votes ?? {},
    submissions: s?.submissions ?? buildDay1Audit({ playerPhoto: s?.photoPreview }),
    pathChoice: s?.pathChoice ?? null, // 'honest' | 'bluff'
    bluffOutcome: s?.bluffOutcome ?? null, // 'fooled' | 'caught'
    revivePick: s?.revivePick ?? null,
    hasImmunity: Boolean(s?.hasImmunity),
    wasCaught: Boolean(s?.wasCaught),
  };
}

export function SpeedRunProvider({ children }) {
  const init = initialFromStore();
  const [beatIndex, setBeatIndex] = useState(init.beatIndex);
  const [photoPreview, setPhotoPreview] = useState(init.photoPreview);
  const [votes, setVotes] = useState(init.votes);
  const [submissions, setSubmissions] = useState(init.submissions);
  const [pathChoice, setPathChoice] = useState(init.pathChoice);
  const [bluffOutcome, setBluffOutcome] = useState(init.bluffOutcome);
  const [revivePick, setRevivePick] = useState(init.revivePick);
  const [hasImmunity, setHasImmunity] = useState(init.hasImmunity);
  const [wasCaught, setWasCaught] = useState(init.wasCaught);
  const [shareCopied, setShareCopied] = useState(false);

  const beat = SPEEDRUN_BEATS[beatIndex] ?? "intro";
  const demoDay = BEAT_DAY[beat] ?? 0;
  const meta = demoDay >= 1 ? dayMeta(demoDay) : null;

  const snapshot = useCallback(
    (patch = {}) => ({
      beat: SPEEDRUN_BEATS[patch.beatIndex ?? beatIndex],
      photoPreview: patch.photoPreview !== undefined ? patch.photoPreview : photoPreview,
      votes: patch.votes ?? votes,
      submissions: patch.submissions ?? submissions,
      pathChoice: patch.pathChoice !== undefined ? patch.pathChoice : pathChoice,
      bluffOutcome: patch.bluffOutcome !== undefined ? patch.bluffOutcome : bluffOutcome,
      revivePick: patch.revivePick !== undefined ? patch.revivePick : revivePick,
      hasImmunity: patch.hasImmunity !== undefined ? patch.hasImmunity : hasImmunity,
      wasCaught: patch.wasCaught !== undefined ? patch.wasCaught : wasCaught,
    }),
    [beatIndex, photoPreview, votes, submissions, pathChoice, bluffOutcome, revivePick, hasImmunity, wasCaught],
  );

  const persist = useCallback((patch) => {
    writeStored(snapshot(patch));
  }, [snapshot]);

  const goToBeat = useCallback((name) => {
    const i = SPEEDRUN_BEATS.indexOf(name);
    if (i < 0) return;
    setBeatIndex(i);
    persist({ beatIndex: i });
  }, [persist]);

  const nextBeat = useCallback(() => {
    setBeatIndex((i) => {
      const n = Math.min(i + 1, SPEEDRUN_BEATS.length - 1);
      persist({ beatIndex: n });
      return n;
    });
  }, [persist]);

  const skipToFinale = useCallback(() => {
    goToBeat("d5_reveal");
  }, [goToBeat]);

  const setPhoto = useCallback((dataUrl) => {
    setPhotoPreview(dataUrl);
    if (!dataUrl) {
      persist({ photoPreview: null });
      return;
    }
    const cast = buildDay1Audit({ playerPhoto: dataUrl });
    setSubmissions(cast);
    persist({ photoPreview: dataUrl, submissions: cast });
  }, [persist]);

  const submitDay1Checkin = useCallback(() => {
    const sample = DEMO_DAYS[1].samplePhoto;
    const photo = photoPreview || sample;
    if (!photoPreview) setPhotoPreview(photo);
    const cast = buildDay1Audit({ playerPhoto: photo });
    setSubmissions(cast);
    persist({ photoPreview: photo, submissions: cast });
    goToBeat("d1_rank");
  }, [photoPreview, persist, goToBeat]);

  const castVote = useCallback((id, type) => {
    if (votes[id]) return;
    const nextVotes = { ...votes, [id]: type };
    setVotes(nextVotes);
    setSubmissions((subs) =>
      subs.map((s) =>
        s.id === id
          ? { ...s, votes: { ...s.votes, [type]: (s.votes[type] || 0) + 1 } }
          : s,
      ),
    );
    persist({ votes: nextVotes });
  }, [votes, persist]);

  const votesDone = useMemo(() => {
    const needed = submissions.filter((s) => !s.isYou).length;
    const cast = Object.keys(votes).filter((id) => id !== "you").length;
    return cast >= Math.min(3, needed);
  }, [votes, submissions]);

  const choosePath = useCallback((choice) => {
    // Honest → clean survive. Bluff → staged 50/50 (seeded by session for replay stability).
    let outcome = null;
    let immunity = false;
    let caught = false;
    if (choice === "honest") {
      outcome = "honest";
    } else {
      const seed = (photoPreview || "bluff").length + beatIndex;
      outcome = seed % 2 === 0 ? "fooled" : "caught";
      immunity = outcome === "fooled";
      caught = outcome === "caught";
    }
    setPathChoice(choice);
    setBluffOutcome(outcome);
    setHasImmunity(immunity);
    setWasCaught(caught);
    persist({
      pathChoice: choice,
      bluffOutcome: outcome,
      hasImmunity: immunity,
      wasCaught: caught,
    });
    goToBeat("d2_outcome");
  }, [photoPreview, beatIndex, persist, goToBeat]);

  const pickRevive = useCallback((id) => {
    setRevivePick(id);
    persist({ revivePick: id });
  }, [persist]);

  const reset = useCallback(() => {
    clearSpeedRunState();
    setBeatIndex(0);
    setPhotoPreview(null);
    setVotes({});
    setSubmissions(buildDay1Audit({}));
    setPathChoice(null);
    setBluffOutcome(null);
    setRevivePick(null);
    setHasImmunity(false);
    setWasCaught(false);
    setShareCopied(false);
  }, []);

  const value = useMemo(
    () => ({
      beat,
      beatIndex,
      beats: SPEEDRUN_BEATS,
      demoDay,
      meta,
      photoPreview,
      submissions,
      votes,
      votesDone,
      pathChoice,
      bluffOutcome,
      revivePick,
      hasImmunity,
      wasCaught,
      shareCopied,
      setShareCopied,
      goToBeat,
      nextBeat,
      skipToFinale,
      setPhoto,
      submitDay1Checkin,
      castVote,
      choosePath,
      pickRevive,
      reset,
      rank: 7,
      survivalCap: CAP_AT(demoDay),
    }),
    [
      beat, beatIndex, demoDay, meta, photoPreview, submissions, votes, votesDone,
      pathChoice, bluffOutcome, revivePick, hasImmunity, wasCaught, shareCopied,
      goToBeat, nextBeat, skipToFinale, setPhoto, submitDay1Checkin, castVote,
      choosePath, pickRevive, reset,
    ],
  );

  return (
    <SpeedRunContext.Provider value={value}>
      {children}
    </SpeedRunContext.Provider>
  );
}

function CAP_AT(day) {
  if (day <= 0) return 25;
  return DEMO_DAYS[day]?.capTo ?? 25;
}

export function useSpeedRun() {
  const ctx = useContext(SpeedRunContext);
  if (!ctx) throw new Error("useSpeedRun must be used within SpeedRunProvider");
  return ctx;
}
