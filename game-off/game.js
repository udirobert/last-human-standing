/* NIGHT SHIFT — Game Off 2026 (theme: SHIFT)
 * A Last Human Standing vignette, rebuilt as a deduction game.
 *
 * Each day ARIA holds a SECRET RULE (1–3 criteria over a card's four facts).
 * Her earlier rulings sit on the docket — read them, file the card she'd
 * pass. A failing filing is a strike; three strikes cuts you to the night
 * shift, where the rule is in plain sight and you stamp everyone else's
 * cases. Verdicts are deterministic — no crowd noise decides anything.
 *
 * Later days add pressure in stages: a pay-for-clue ruling and an oath
 * (day 2), a shift clock and mid-night rule amendments (days 2–5), a
 * clerical error hidden in the docket (days 4–5) — and after night five,
 * the finale: one filer that isn't human, and a rule you write yourself.
 *
 * All gameplay randomness is seeded (logic.js makeRng) — a given docket
 * deals the same way every time. Vanilla JS, no deps, works from file://.
 */
const { CARDS, DAYS, JURY_TITLES, ATTR_KEYS, ATTR_LABEL, ATTR_ICONS, ATTR_WORD, FINALE } =
  window.NIGHT_SHIFT_DATA;
const LOGIC = window.NIGHT_SHIFT_LOGIC;

const $ = (id) => document.getElementById(id);
const titleEl = $("title"), gameEl = $("game"), dawnEl = $("dawn"), dossierEl = $("dossier");
const frameEl = $("frame");
const dayPhase = $("dayPhase"), verdictPhase = $("verdictPhase"), auditPhase = $("auditPhase");
const finalePhase = $("finalePhase");

// ---------- seed / url params ----------
function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const params = new URLSearchParams(location.search);
const dailySeed = localDateStr();
let SEED = params.get("seed") || dailySeed;
function docketLabel() {
  if (params.get("seed")) return `DOCKET ${SEED}`;
  const n = Math.floor((new Date(dailySeed + "T00:00") - new Date("2026-11-01T00:00")) / 864e5) + 1;
  return `DOCKET #${n}`;
}
const stream = (p) => LOGIC.makeRng(`${SEED}|${G.day}|${p}`);
// ?seed= is the only supported URL override (daily docket vs custom docket).

// ---------- tiny synth ----------
let AC = null;
function audio() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === "suspended") AC.resume();
  return AC;
}
function tone(freq, dur = 0.09, type = "square", vol = 0.04, when = 0) {
  try {
    const ac = audio();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ac.currentTime + when;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch { /* no audio */ }
}
const sfx = {
  tick:   () => tone(720, .04, "square", .03),
  file:   () => { tone(392, .08, "triangle", .05); tone(523, .1, "triangle", .05, .09); },
  human:  () => [523, 659].forEach((f, i) => tone(f, .12, "triangle", .05, i * .1)),
  sus:    () => [392, 311].forEach((f, i) => tone(f, .16, "sawtooth", .045, i * .12)),
  stamp:  () => tone(180, .15, "square", .06),
  audit:  () => [440, 554, 659].forEach((f, i) => tone(f, .1, "square", .035, i * .08)),
  dawn:   () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, .2, "triangle", .05, i * .13)),
  alarm:  () => [660, 880, 660, 880].forEach((f, i) => tone(f, .12, "square", .05, i * .14)),
  gavel:  () => { thudDrop(0); tone(1400, .03, "square", .03, .02); thudDrop(.2); tone(1400, .03, "square", .03, .22); },
  rise:   (i) => tone(340 + i * 70, .06, "triangle", .035),
  klaxon: () => [440, 330, 440, 330, 550, 330].forEach((f, i) => tone(f, .14, "square", .06, i * .17)),
  thud:   () => { thudDrop(); tone(1400, .03, "square", .03, .02); },
  slide:  () => noiseBurst(.16, 1800, .05),
  shutter:() => { noiseBurst(.07, 900, .06); noiseBurst(.07, 1400, .05, .09); },
  click:  () => { tone(240, .025, "square", .05); noiseBurst(.05, 3000, .05, .03); },
  tickHi: (left) => tone(880 + (3 - left) * 160, .035, "square", .035),
  // a pen moving across paper
  pen:    () => [0, .12, .26, .4].forEach((w, i) => noiseBurst(.1, 2100 + i * 260, .026, w)),
  // the time clock biting through the card
  punch:  () => { thudDrop(); tone(1180, .03, "square", .045, .02); noiseBurst(.06, 2600, .055, .04); },
  // four cards coming off the deck, one at a time
  riffle: () => [0, .09, .18, .27].forEach((w, i) => noiseBurst(.055, 1500 + i * 320, .038, w)),
  // a file crossing the desk and landing in the tray
  handover: () => { noiseBurst(.2, 1100, .05); thudDrop(.16); },
  // a case file dropped onto the desk
  drop:   () => { thudDrop(); noiseBurst(.09, 2400, .035, .03); },
  // mechanical gear shift / perspective lever
  gearShift: () => {
    try {
      tone(170, .14, "sawtooth", .06);
      noiseBurst(.15, 850, .07, .02);
      tone(85, .28, "square", .09, .06);
      thudDrop(.08);
    } catch {}
  },
  // UV forensic lens transformer hum
  lensHum: () => {
    try {
      const ac = audio(), t = ac.currentTime;
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
      o1.type = "sine"; o1.frequency.setValueAtTime(60, t);
      o2.type = "sawtooth"; o2.frequency.setValueAtTime(120, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o1.connect(g); o2.connect(g); g.connect(ambientGain || ac.destination);
      o1.start(t); o1.stop(t + 0.65);
      o2.start(t); o2.stop(t + 0.65);
    } catch {}
  },
};

/* filtered noise burst — paper slides, camera shutters. */
function noiseBurst(dur = .15, freq = 1500, vol = .05, when = 0) {
  try {
    const ac = audio();
    const t = ac.currentTime + when;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.1;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start(t);
  } catch { /* no audio */ }
}
/* low sine drop — the stamp landing on the desk. */
function thudDrop(at = 0) {
  try {
    const ac = audio();
    const t = ac.currentTime + at;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + .2);
    g.gain.setValueAtTime(.14, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + .28);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + .32);
  } catch { /* no audio */ }
}

// ---------- procedural atmospheric soundscape (WebAudio) ----------
/* Zero external dependencies, 0 KB disk footprint, no CORS on file://.
 * Synthesizes a warm late-night fluorescent tape-deck drone with subtle
 * detuned harmonics, rhythmic lo-fi 72 BPM pulse, and tape noise.
 * Injects an eerie dissonance and radar ping when filer VALE is on the desk.
 */
let AMBIENT = null;
let ambientGain = null;
let valeDissonanceGain = null;
let audioMuted = false;
let rhythmTimer = null;

function initAmbient() {
  if (AMBIENT) return;
  try {
    const ac = audio();
    const master = ac.createGain();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.connect(ac.destination);
    ambientGain = master;

    // Sub-bass drone: A1 (55Hz) + fifth E2 (82.5Hz) with subtle LFO
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    const filter = ac.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 160;

    osc1.type = "triangle";
    osc1.frequency.value = 55.0;
    osc2.type = "sine";
    osc2.frequency.value = 82.4;

    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 18;
    lfo.connect(filter.frequency);

    const droneGain = ac.createGain();
    droneGain.gain.value = 0.08;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(master);

    // Warm tape hiss generator (filtered noise buffer)
    const bufLen = ac.sampleRate * 2;
    const noiseBuf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02; // soft pink noise
      last = data[i];
    }
    const noiseSrc = ac.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 1.0;

    const noiseGain = ac.createGain();
    noiseGain.gain.value = 0.016;

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    // VALE eerie dissonance oscillator: detuned tritone (116.5Hz)
    const valeOsc = ac.createOscillator();
    valeOsc.type = "sawtooth";
    valeOsc.frequency.value = 116.5;

    const valeFilter = ac.createBiquadFilter();
    valeFilter.type = "lowpass";
    valeFilter.frequency.value = 340;

    const vGain = ac.createGain();
    vGain.gain.setValueAtTime(0, ac.currentTime);
    valeDissonanceGain = vGain;

    valeOsc.connect(valeFilter);
    valeFilter.connect(vGain);
    vGain.connect(master);

    osc1.start();
    osc2.start();
    lfo.start();
    noiseSrc.start();
    valeOsc.start();

    // Rhythmic 72 BPM subtle clockwork pulse (kick on 1 & 3, typewriter click on 2 & 4)
    let beat = 0;
    const tempoMs = (60 / 72) * 1000;
    clearInterval(rhythmTimer);
    rhythmTimer = setInterval(() => {
      if (!ambientGain || audioMuted || G.phase === "day") return;
      try {
        const curAc = audio(), ct = curAc.currentTime;
        if (beat % 2 === 0) {
          // Soft subterranean pulse
          const k = curAc.createOscillator(), kg = curAc.createGain();
          k.type = "sine";
          k.frequency.setValueAtTime(76, ct);
          k.frequency.exponentialRampToValueAtTime(32, ct + 0.12);
          kg.gain.setValueAtTime(0.045, ct);
          kg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.14);
          k.connect(kg); kg.connect(master);
          k.start(ct); k.stop(ct + 0.16);
        } else {
          // Subtle mechanical clockwork/teletype tick
          noiseBurst(0.035, 1900, 0.012);
        }
        beat = (beat + 1) % 4;
      } catch {}
    }, tempoMs);

    AMBIENT = { master, osc1, osc2, lfo, noiseSrc, valeOsc };
  } catch (e) {
    /* audio unavailable */
  }
}

function musicStart() {
  initAmbient();
  if (!ambientGain || audioMuted) return;
  try {
    const ac = audio();
    ambientGain.gain.cancelScheduledValues(ac.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.35, ac.currentTime + 1.2);
  } catch {}
}

function musicStop() {
  if (!ambientGain) return;
  try {
    const ac = audio();
    ambientGain.gain.cancelScheduledValues(ac.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
  } catch {}
}

function musicDuck(on) {
  if (!ambientGain || audioMuted) return;
  try {
    const ac = audio();
    ambientGain.gain.cancelScheduledValues(ac.currentTime);
    ambientGain.gain.linearRampToValueAtTime(on ? 0.08 : 0.35, ac.currentTime + 0.4);
  } catch {}
}

function setValeDissonance(on) {
  if (!valeDissonanceGain || audioMuted) return;
  try {
    const ac = audio();
    valeDissonanceGain.gain.cancelScheduledValues(ac.currentTime);
    valeDissonanceGain.gain.linearRampToValueAtTime(on ? 0.045 : 0, ac.currentTime + 0.5);
  } catch {}
}

/* Generated score (ElevenLabs) — real tracks where the files load, the
 * procedural drone as the silent fallback so nothing breaks offline. */
const score = {
  VOL: { title: 0.5, day: 0.3, night: 0.42, dawn: 0.5 },
  els: {},
  cur: null,
  el(name) {
    if (!(name in this.els)) {
      const a = new Audio(`audio/${name}.mp3`);
      a.loop = true;
      a.volume = 0;
      a.addEventListener("error", () => { this.els[name] = null; });
      this.els[name] = a;
    }
    return this.els[name];
  },
  fade(a, v) {
    clearInterval(a._fade);
    a._fade = setInterval(() => {
      if (Math.abs(v - a.volume) <= 0.06) {
        a.volume = v;
        if (!v) a.pause();
        clearInterval(a._fade);
      } else {
        a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(v - a.volume) * 0.06));
      }
    }, 50);
  },
  play(name) {
    if (this.cur === name) return;
    this.cur = name;
    for (const key of Object.keys(this.els)) {
      const a = this.els[key];
      if (a && key !== name) this.fade(a, 0);
    }
    if (!name) return;
    const a = this.el(name);
    if (!a) { this.fallback(name); return; }
    a.play()
      .then(() => { musicStop(); this.fade(a, audioMuted ? 0 : this.VOL[name]); })
      .catch(() => { this.els[name] = null; this.fallback(name); });
  },
  fallback(name) { name === "night" ? musicStart() : musicStop(); },
  setMuted() {
    for (const key of Object.keys(this.els)) {
      const a = this.els[key];
      if (a) this.fade(a, audioMuted ? 0 : (key === this.cur ? this.VOL[key] : 0));
    }
  },
};
function applyScore() {
  score.play({ day: "day", verdict: "day", audit: "night", finale: "night" }[G.phase]);
}

// ---------- skippable timers ----------
let timers = [];
function later(fn, ms) {
  const id = setTimeout(() => { timers = timers.filter((t) => t !== id); fn(); }, ms);
  timers.push(id);
  return id;
}
function clearLater() { timers.forEach(clearTimeout); timers = []; }

function ri(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[ri(arr.length)]; }

// ---------- facts display: WHERE · WHEN · WHO · IN/OUT, emoji + word ----
function factCell(k, tag) {
  return `${ATTR_ICONS[k][tag]} ${ATTR_WORD[k][tag]}`;
}
/* Labeled fact rows used by hand cards, the verdict, night cases.
 * verdicts = LOGIC.check() output; without it no marks are drawn.
 * pending = rows start hidden (the suspense verdict reveals them). */
function factRows(card, verdicts, pending) {
  return `<div class="facts">${ATTR_KEYS.map((k) => {
    const v = verdicts ? verdicts[k] : null;
    let cls = "", mark = "";
    if (v && v.status === "pass") { cls = " pass"; mark = `<span class="mk pass">✓ meets the rule</span>`; }
    else if (v && v.status === "fail") {
      cls = " fail"; mark = `<span class="mk fail">✗ needed: ${v.needed}</span>`;
    } else if (v) { cls = " dim"; mark = `<span class="mk dim">— not checked</span>`; }
    if (pending) cls += " pre";
    return `<div class="fact${cls}" data-key="${k}">
      <span class="fk">${ATTR_LABEL[k]}</span>
      <span class="fv">${factCell(k, card.tags[k])}</span>${mark}
    </div>`;
  }).join("")}</div>`;
}

// ---------- instruction lines ----------
const INSTR = {
  day: "Deduce ARIA's secret rule from her rulings. SHIFT narrows the desk to one column.",
  day1: "What do ARIA's approvals share that her rejections lack? SHIFT narrows the desk to one column.",
  dayLiar: "Deduce ARIA's secret rule. SHIFT cycles the column. ⚠ One ruling below is a clerical error — tap it for +100.",
  verdict: "The rule is unsealed. Here's how your card did.",
  night: "Stamp each filing against the rule — S: SUS · H: HUMAN.",
  finale: "One filer isn't human, and ARIA's rules can't catch it. Tonight you write the rule.",
};
function setInstr(key) { $("instr").textContent = INSTR[key]; }

// ---------- shift banner (brief, non-blocking) ----------
let bannerTimer = null;
function banner(text) {
  const b = $("banner");
  $("bannerText").textContent = text;
  b.classList.remove("hidden", "run");
  void b.offsetWidth;
  b.classList.add("run");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.add("hidden"), 1300);
}

// ---------- ARIA voice ----------
const ARIA = {
  dayOpen: [
    "Two rulings passed, a few struck. My rule is hiding in the docket.",
    "The docket never lies. Read the stamps, not the riddles.",
  ],
  survived: ["You lived.", "The ledger notes a survivor."],
  struck: ["A strike. The rule didn't bend for you.", "Filed under SUS. The ledger remembers."],
  nearMiss: [
    "One fact off. The rule doesn't bend for almost.",
    "So close the ledger almost lied for you. Almost.",
  ],
  eliminated: ["Three strikes. Cut — but not erased."],
  juror: ["You're on jury duty now."],
  auditOpen: [
    "My rules only check facts. Whatever isn't a fact walks right through.",
    "Night shift. The rule is pinned. Five cases tonight — stamp each one.",
    "The night shift doesn't sleep. Check every detail.",
    "Someone on this docket has never missed. Humans miss.",
    "The ledger is watching tonight. Stamp cleanly.",
  ],
};
// one-line explainers shown the first time each mechanic appears
const EXPLAIN = {
  clue: "You may request one more ruling per day. It costs a hundred from today's pay.",
  oath: "File under oath and I'll hold you to it. Keep it and a strike vanishes; break it and you take two.",
  amend: "Head office is restless tonight — they amend my rules mid-shift now. Watch the chips when it happens.",
  liar: "A clerical error slipped onto the docket. Find which ruling is wrong and I'll note it.",
};
let ariaTimer = null, ariaTypeTimer = null;
const calmMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ARIA talks; the terminal types. mood: neutral | smug | alarm */
function ariaSay(lines, mood = "neutral") {
  const el = $("ariaSay");
  const out = $("ariaText");
  const full = pick(lines);
  el.dataset.mood = mood;
  el.classList.remove("hidden");
  clearTimeout(ariaTimer);
  clearInterval(ariaTypeTimer);
  let typed = 0;
  if (calmMotion()) {
    out.textContent = full;
  } else {
    out.textContent = "";
    ariaTypeTimer = setInterval(() => {
      typed += 1;
      out.textContent = full.slice(0, typed);
      if (typed >= full.length) clearInterval(ariaTypeTimer);
    }, 16);
  }
  const hold = 4200 + (calmMotion() ? 0 : full.length * 16);
  ariaTimer = setTimeout(() => {
    clearInterval(ariaTypeTimer);
    el.classList.add("hidden");
  }, hold);
}
function explain(feature) {
  if (G.explained.has(feature)) return false;
  G.explained.add(feature);
  ariaSay([EXPLAIN[feature]]);
  return true;
}
const newTag = (feature, debut) =>
  G.day === debut ? ' <span class="new">NEW</span>' : "";

// ---------- state ----------
const G = {
  day: 0,
  status: "player",      // player | juror
  strikes: 0,
  score: 0,
  daysSurvived: 0,
  auditHits: 0, auditTotal: 0,
  selected: null,
  hand: [],
  docket: [],
  filed: null,
  focusAttr: "all",
  telemetry: false,       // night: the packet wire is pulled up (hold SHIFT)
  wireSeen: false,        // the desk wire has been opened at least once
  valeWireSeen: false,    // VALE's own packet has been on the wire
  valeCaught: 0,          // nights VALE was stamped SUS
  valeEscapes: 0,         // nights VALE was waved through as HUMAN
  oath: false,
  clueUsed: false,
  dayPay: 300,
  flagged: null,          // liar day: the docket row the player suspects
  lastMissKeys: null,     // failKeys of yesterday's filing — ARIA's nudge names them
  auditSubs: [],
  amendAfter: null,
  amendShown: false,
  auditIdx: 0,
  amending: false,
  amendTimer: null,
  contestedIdx: -1,
  finaleRows: null,
  finaleOpts: null,
  finaleChoice: null,
  auditHitsToday: 0,
  nightPoints: 0,
  auditLocked: false,
  verdictDone: false,
  dayResults: [],        // "survived" | "struck" | "juror"
  nightResults: [],      // correct stamps per night
  phase: "day",
  explained: new Set(),
  elimDay: 0,
};

function hud() {
  $("hudShift").textContent =
    G.phase === "audit" ? "🌙 NIGHT SHIFT" : G.phase === "finale" ? "✒ LAST CALL" : "☀ DAY SHIFT";
  const dots = $("dayDots");
  dots.innerHTML = `<span class="day-label">DAY ${Math.min(G.day + 1, DAYS.length)}/${DAYS.length}</span>`;
  DAYS.forEach((_, i) => {
    const s = document.createElement("span");
    s.className = "dot";
    if (G.dayResults[i] === "survived") s.classList.add("done");
    else if (G.dayResults[i] === "struck") s.classList.add("cut");
    else if (G.dayResults[i] === "juror") s.classList.add("juror");
    else if (i === G.day && G.day < DAYS.length) s.classList.add("now");
    dots.appendChild(s);
  });
  const st = $("hudStrikes");
  st.innerHTML = `<span class="strikes-label">STRIKES</span>`;
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "pip" + (i < G.strikes ? " on" : "");
    if (i < G.strikes && i >= prevStrikes) s.classList.add("gain");
    st.appendChild(s);
  }
  renderScore(G.score);
  prevStrikes = G.strikes;
}

/* the third strike is not a pip appearing — the room goes dark and the
 * counter is stamped CUT, and only then does the dossier arrive. */
function strikeOut() {
  const st = $("hudStrikes");
  st.classList.add("spent");
  if (calmMotion()) return;
  st.classList.remove("third");
  void st.offsetWidth;
  st.classList.add("third");
  later(() => sfx.thud(), 500);   // the stamp biting down
  later(() => st.classList.remove("third"), 1700);
}

/* the score rolls instead of jumping — money counting on the desk */
let scoreAnim = null, scoreShown = 0, prevStrikes = 0;
function renderScore(n) {
  const el = $("hudScore");
  clearInterval(scoreAnim);
  if (calmMotion() || Math.abs(n - scoreShown) < 2) {
    scoreShown = n;
    el.textContent = `SCORE ${n}`;
    return;
  }
  const from = scoreShown, t0 = performance.now(), dur = 520;
  el.classList.add("rolling");
  scoreAnim = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / dur);
    const v = Math.round(from + (n - from) * (1 - (1 - p) ** 3));
    el.textContent = `SCORE ${v}`;
    if (p >= 1) {
      clearInterval(scoreAnim);
      el.classList.remove("rolling");
      scoreShown = n;
    }
  }, 40);
}
function setShift(shift) { document.body.dataset.shift = shift; }
let wipeTimer = null;
/* shutter-sweep on day/night shift changes — the trailer transition. */
function wipeShift() {
  sfx.shutter();
  later(() => sfx.click(), 380);   // the desk lamp clicks as the light changes
  document.body.classList.remove("wiping");
  void document.body.offsetWidth;
  document.body.classList.add("wiping");
  clearTimeout(wipeTimer);
  wipeTimer = setTimeout(() => document.body.classList.remove("wiping"), 750);
}
function showOnly(which) {
  G.phase = which;
  dayPhase.classList.toggle("hidden", which !== "day");
  verdictPhase.classList.toggle("hidden", which !== "verdict");
  auditPhase.classList.toggle("hidden", which !== "audit");
  finalePhase.classList.toggle("hidden", which !== "finale");
  setShift(which === "audit" || which === "finale" ? "night" : "day");
  applyScore();
  if (which !== "verdict") wipeShift();
  hud();
}

// ---------- DAY PHASE ----------
function startDay() {
  const d = DAYS[G.day];
  const deal = LOGIC.deal(CARDS, d, G.day, stream("deal"));
  G.docket = deal.docket;
  G.hand = deal.hand;
  G.selected = null;
  G.oath = false;
  G.clueUsed = false;
  G.dayPay = 300;
  G.flagged = null;
  G.filing = false;
  banner(`${d.dayLabel} · ${d.emoji} ${d.theme}`);
  showOnly("day");
  setInstr(G.day >= 3 ? "dayLiar" : G.day === 0 ? "day1" : "day");
  // progressive features
  const clueBtn = $("clueBtn");
  clueBtn.classList.toggle("hidden", G.day < 1);
  clueBtn.disabled = false;
  clueBtn.innerHTML = `+ Request another ruling — today's pay 300 → 200${newTag("clue", 1)}`;
  $("oathWrap").classList.toggle("hidden", G.day < 1);
  $("oathBtn").innerHTML = `⚖ Under oath${newTag("oath", 1)}`;
  $("oathBtn").classList.remove("on");
  $("oathBtn").setAttribute("aria-pressed", "false");
  $("oathNote").classList.add("hidden");
  $("docketHead").textContent = G.day >= 3
    ? "Already ruled today — tap the ruling you think is the error (optional, +100)"
    : "Already ruled today";
  // Golden-Idol nudge: name exactly what fooled them yesterday
  if (G.day >= 1 && G.lastMissKeys && G.lastMissKeys.length) {
    const labels = G.lastMissKeys
      .map((k) => ({ place: "WHERE", time: "WHEN", people: "WHO", setting: "IN/OUT" }[k]))
      .join(" and ");
    ariaSay([`Yesterday the ${labels} fooled you. Read it twice today.`]);
  }
  else if (G.day === 3) explain("liar") || ariaSay(ARIA.dayOpen);
  else ariaSay(ARIA.dayOpen);
  renderDay();
  stageDay(d);
}

/* the shift brief: a memo card opens the day, the riddle types itself,
 * then the docket cascades onto the desk row by row. Any input skips it. */
let briefOpen = false, briefTypeTimer = null;
function stageDay(d) {
  $("briefDay").textContent = d.dayLabel;
  $("briefTheme").textContent = `${d.emoji} ${d.theme}`;
  $("briefAria").textContent = d.ariaLine;
  const riddleEl = $("briefRiddle");
  riddleEl.textContent = "";
  $("shiftBrief").classList.remove("hidden");
  document.body.classList.add("brief-up");
  dayPhase.classList.add("staging");
  briefOpen = true;
  const full = `\u201C${d.riddle}\u201D`;
  clearInterval(briefTypeTimer);
  if (calmMotion()) {
    riddleEl.textContent = full;
  } else {
    let n = 0;
    briefTypeTimer = setInterval(() => {
      riddleEl.textContent = full.slice(0, ++n);
      if (n % 3 === 0) sfx.tick();
      if (n >= full.length) clearInterval(briefTypeTimer);
    }, 28);
  }
  // the main-title theme swells under the first brief, then hands off
  score.play(G.day === 0 ? "title" : "day");
  later(endBrief, calmMotion() ? 1500 : 3400);
}
function endBrief() {
  if (!briefOpen) return;
  briefOpen = false;
  clearInterval(briefTypeTimer);
  $("shiftBrief").classList.add("hidden");
  document.body.classList.remove("brief-up");
  dayPhase.classList.add("dealt");
  const rows = $("docketBody").children.length;
  // a stamp tick per row as the ink lands, then the hand riffles in
  for (let i = 0; i < Math.min(rows, 8); i++) later(() => sfx.tick(), 200 + i * 110);
  later(() => sfx.riffle(), 420);
  if (G.day === 0) later(() => score.play("day"), 1400);
  later(() => dayPhase.classList.remove("staging", "dealt"), 1500 + rows * 110);
}

function highlightMatchingTags(tags) {
  const cells = $("docket").querySelectorAll("td.c-fact");
  cells.forEach((td) => {
    if (!tags) {
      td.classList.remove("tag-match");
    } else {
      const k = td.dataset.key;
      const v = td.dataset.val;
      td.classList.toggle("tag-match", tags[k] === v);
    }
  });
}

function highlightMatchingHandCards(tags) {
  const cards = $("hand").querySelectorAll(".evidence");
  cards.forEach((el, i) => {
    const c = G.hand[i];
    let match = false;
    for (const k of ATTR_KEYS) {
      if (tags[k] === c.tags[k]) { match = true; break; }
    }
    el.classList.toggle("tag-match-hand", match);
  });
  sfx.tick();
}

/* SHIFT = shift focus, not shift-to-answer. Tapping Shift walks a loupe
 * across the four fact columns and dims everything else — every cell in
 * the lit column still shows its own value, approvals and rejections
 * alike. It narrows where you look; it never says what you should see. */
const FOCUS_ORDER = ["all", "place", "time", "people", "setting"];
function setFocusAttr(k) {
  G.focusAttr = k;
  document.querySelectorAll("#attrShiftRail .rail-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.attr === k));
  const dk = $("docket");
  for (const a of FOCUS_ORDER) dk.classList.remove("focus-" + a);
  const evs = $("hand").querySelectorAll(".evidence");
  evs.forEach((el) => { for (const a of FOCUS_ORDER) el.classList.remove("focus-" + a); });
  if (k !== "all") {
    dk.classList.add("focus-" + k);
    evs.forEach((el) => el.classList.add("focus-" + k));
  }
}
function cycleFocus() {
  if (G.phase !== "day") return;
  setFocusAttr(FOCUS_ORDER[(FOCUS_ORDER.indexOf(G.focusAttr) + 1) % FOCUS_ORDER.length]);
  sfx.click();
}

function renderDay() {
  setFocusAttr("all");
  const d = DAYS[G.day];
  $("dayKicker").textContent = `${d.dayLabel} · ${d.theme} · TODAY'S RIDDLE`;
  $("riddleText").textContent = `“${d.riddle}”`;
  renderDocket();

  const handEl = $("hand");
  handEl.innerHTML = "";
  G.hand.forEach((card, i) => {
    const el = document.createElement("div");
    el.className = "evidence" + (G.selected === card ? " selected" : "");
    el.style.setProperty("--i", i);
    el.innerHTML = `<div class="e-head"><span class="glyph">${card.glyph}</span>
        <span class="key">${i + 1}</span></div>
      <div class="name">${card.name}</div>
      ${factRows(card)}`;
    el.addEventListener("mouseenter", () => highlightMatchingTags(card.tags));
    el.addEventListener("mouseleave", () => {
      if (G.selected) highlightMatchingTags(G.selected.tags);
      else highlightMatchingTags(null);
    });
    el.addEventListener("touchstart", () => {
      selectCard(card);
      highlightMatchingTags(card.tags);
    }, { passive: true });
    el.addEventListener("click", () => {
      selectCard(card);
      highlightMatchingTags(card.tags);
    });
    handEl.appendChild(el);
  });
  if (!calmMotion()) later(() => sfx.riffle(), 120);
  updateFileBtn();
}

function renderDocket(animRow) {
  const tb = $("docketBody");
  tb.innerHTML = "";
  // On Day 1, sort docket rows so HUMAN precedents are grouped at top, clearly showing the contrast!
  const rows = G.day === 0
    ? [...G.docket].sort((a, b) => (a.verdict === "HUMAN" ? -1 : 1))
    : G.docket;

  let lastVerdict = null, di = 0;
  for (const row of rows) {
    if (G.day === 0 && row.verdict !== lastVerdict) {
      lastVerdict = row.verdict;
      const htr = document.createElement("tr");
      htr.className = "docket-hdr-tr";
      htr.style.setProperty("--i", di++);
      const isH = row.verdict === "HUMAN";
      htr.innerHTML = `<td colspan="6" class="docket-sec-header ${isH ? "human" : "sus"}">
        ${isH ? "✔ ARIA'S APPROVED PRECEDENTS (HUMAN)" : "✖ ARIA'S REJECTIONS (SUS)"}
      </td>`;
      tb.appendChild(htr);
    }
    const tr = document.createElement("tr");
    tr.style.setProperty("--i", di++);
    if (G.day >= 3) tr.className = "flaggable";
    if (row === animRow) tr.classList.add("new-row");
    if (row === G.flagged) tr.classList.add("flagged");
    tr.dataset.verdict = row.verdict;
    ATTR_KEYS.forEach((k) => { tr.dataset[k] = row.card.tags[k]; });
    tr.innerHTML =
      `<td class="c-file"><span class="glyph">${row.card.glyph}</span><span class="name">${row.card.name}</span></td>` +
      ATTR_KEYS.map((k) => `<td class="c-fact" data-key="${k}" data-val="${row.card.tags[k]}">${factCell(k, row.card.tags[k])}</td>`).join("") +
      `<td class="c-stamp ${row.verdict === "HUMAN" ? "human" : "sus"}">` +
      `<span class="ink">${row.verdict}</span>${row === G.flagged ? " ⚑" : ""}</td>`;
    tr.addEventListener("click", () => {
      if (G.day >= 3) {
        G.flagged = G.flagged === row ? null : row;
        sfx.tick();
        renderDocket();
      } else {
        highlightMatchingHandCards(row.card.tags);
      }
    });
    tb.appendChild(tr);
  }
  if (G.selected) highlightMatchingTags(G.selected.tags);
}

function requestClue() {
  if (G.clueUsed || G.day < 1) return;
  const d = DAYS[G.day];
  const row = LOGIC.extraRuling(CARDS, d, { docket: G.docket, hand: G.hand }, stream("clue"));
  if (!row) return;
  G.clueUsed = true;
  G.dayPay = 200;
  G.docket.push(row);
  sfx.tick();
  $("clueBtn").disabled = true;
  $("clueBtn").textContent = "Ruling added — pay for today is 200";
  renderDocket(row);
  explain("clue");
}

function toggleOath() {
  if (G.day < 1 || G.phase !== "day") return;
  G.oath = !G.oath;
  $("oathBtn").classList.toggle("on", G.oath);
  $("oathBtn").setAttribute("aria-pressed", String(G.oath));
  $("oathNote").classList.toggle("hidden", !G.oath);
  sfx.tick();
  if (G.oath) explain("oath");
  updateFileBtn();
}

function selectCard(card) {
  G.selected = card;
  sfx.tick();
  $("hand").querySelectorAll(".evidence").forEach((el, i) =>
    el.classList.toggle("selected", G.hand[i] === card));
  updateFileBtn();
}
function updateFileBtn() {
  const b = $("fileBtn");
  b.disabled = !G.selected;
  b.textContent = G.selected
    ? `File ${G.selected.name}${G.oath ? " — under oath" : ""} →`
    : "Pick a card — 1–4, then Enter";
}

/* the filed card leaves your hand, crosses the desk and drops into the
   tray — the paperwork you can actually see moving. */
function flyToTray(from) {
  const tray = $("fileBtn");
  if (!from || !tray || calmMotion() || !from.animate) return 0;
  const a = from.getBoundingClientRect(), b = tray.getBoundingClientRect();
  const ghost = from.cloneNode(true);
  ghost.className = "evidence flying";
  ghost.removeAttribute("id");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed", margin: "0", zIndex: "70",
    left: a.left + "px", top: a.top + "px",
    width: a.width + "px", height: a.height + "px",
  });
  document.body.appendChild(ghost);
  from.style.visibility = "hidden";
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const dur = 560;
  try {
    ghost.animate([
      { transform: "rotate(0deg) translate(0,0) scale(1)", opacity: 1, offset: 0 },
      { transform: "rotate(-5deg) translate(0,-14px) scale(1.03)", opacity: 1, offset: .26 },
      { transform: `rotate(-16deg) translate(${dx}px, ${dy}px) scale(.28)`, opacity: 0, offset: 1 },
    ], { duration: dur, easing: "cubic-bezier(.5,0,.62,1)", fill: "forwards" });
  } catch {
    ghost.remove(); from.style.visibility = "";
    return 0;
  }
  setTimeout(() => { ghost.remove(); from.style.visibility = ""; }, dur + 60);
  setTimeout(() => sfx.handover(), dur - 170);
  return dur;
}

function fileSelected() {
  if (!G.selected || G.phase !== "day" || G.filing) return;
  G.filed = G.selected;
  G.filing = true;
  sfx.slide();
  const cards = $("hand").querySelectorAll(".evidence");
  const dur = flyToTray(cards[G.hand.indexOf(G.selected)]);
  const btn = $("fileBtn");
  btn.disabled = true;
  btn.textContent = "Filed.";
  later(() => {
    G.filing = false;
    showOnly("verdict");
    setInstr("verdict");
    renderVerdict();
  }, dur ? 360 : 0);
}

// ---------- VERDICT (suspense reveal) ----------
function ruleText(d) {
  return "ARIA's rule: " + d.rule.map((c) => c.text).join(" · ");
}

function renderVerdict() {
  const d = DAYS[G.day], c = G.filed;
  G.verdictDone = false;
  clearLater();

  const passed = LOGIC.passes(c, d.rule);
  const verdicts = LOGIC.check(c, d.rule);
  G.verdictPassed = passed;

  $("pickMini").innerHTML =
    `<span class="glyph">${c.glyph}</span><span class="name">${c.name}</span>` +
    `<span class="arg">“${c.argument}”</span>`;
  $("ruleLine").textContent = ruleText(d);
  $("factRows").innerHTML = factRows(c, verdicts, true);
  G.factHTML = $("factRows").innerHTML;
  $("lieLine").classList.add("hidden");
  $("lieLine").innerHTML = "";

  $("stampBox").innerHTML = "";
  $("verdictActions").innerHTML = "";

  // staggered reveal: unchecked rows first (250ms apart), then checked
  // rows passes-first (550ms apart, rising tone), last checked row holds
  // 1200ms on a pulsing "…" before its mark lands — the trailer beat
  const rows = [...$("factRows").querySelectorAll(".fact")];
  const unchecked = rows.filter((r) => r.classList.contains("dim"));
  const seq = rows.filter((r) => !r.classList.contains("dim"))
    .sort((a, b) => (a.classList.contains("fail") ? 1 : 0) - (b.classList.contains("fail") ? 1 : 0));
  let t = 200;
  unchecked.forEach((r) => {
    later(() => r.classList.remove("pre"), t);
    t += 250;
  });
  seq.forEach((r, i) => {
    const isLast = i === seq.length - 1;
    if (isLast && seq.length > 1) {
      const mk = r.querySelector(".mk");
      const orig = mk ? mk.innerHTML : "";
      later(() => {
        r.classList.remove("pre");
        if (mk) { mk.textContent = "…"; mk.classList.add("pulse"); }
      }, t);
      t += 1200;
      later(() => {
        if (mk) { mk.innerHTML = orig; mk.classList.remove("pulse"); }
        sfx.rise(i);
      }, t);
    } else {
      later(() => { r.classList.remove("pre"); sfx.rise(i); }, t);
      t += 550;
    }
  });

  later(() => finishVerdict(), t + 300);
}

function finishVerdict() {
  if (G.verdictDone) return;
  G.verdictDone = true;
  clearLater();
  const d = DAYS[G.day], c = G.filed;
  const passed = G.verdictPassed;

  // restore full rows instantly on skip
  $("factRows").innerHTML = G.factHTML;
  $("factRows").querySelectorAll(".pre").forEach((r) => r.classList.remove("pre"));

  let stampText, stampCls;
  if (passed) {
    stampText = G.oath ? "SURVIVED · OATH KEPT" : "SURVIVED";
    stampCls = "survived";
  } else {
    stampText = G.oath ? "PERJURY · 2 STRIKES" : "STRIKE";
    stampCls = "eliminated";
  }
  const sb = $("stampBox");
  sb.innerHTML = `<span class="slip-no">EXHIBIT ${c.glyph} · ${d.dayLabel}</span>` +
    `<div class="stamp ${stampCls}">${stampText}</div>`;
  // the ledger speaks: one ruling sentence, then the room washes past
  const keys = d.rule.filter((x) => !x.allow.includes(c.tags[x.key])).map((x) => x.text);
  $("ledgerLine").textContent = passed
    ? `${c.name} — meets every criterion. Filed.`
    : `${c.name} — fails ${keys.join(", ")}. Struck.`;
  const vp = verdictPhase;
  vp.classList.remove("flash-pass", "flash-fail");
  void vp.offsetWidth;
  vp.classList.add(passed ? "flash-pass" : "flash-fail");
  later(() => vp.classList.remove("flash-pass", "flash-fail"), 550);
  sfx.stamp();
  // hitstop: the stamp hangs silent for one beat, then the desk answers
  later(() => { sfx.thud(); passed ? sfx.human() : sfx.sus(); }, 120);
  deskShake();

  if (passed) {
    G.daysSurvived++;
    G.lastMissKeys = null;
    G.score += G.dayPay;
    if (G.oath) {
      if (G.strikes > 0) G.strikes--;
      else G.score += 200;
    }
    G.dayResults[G.day] = "survived";
    ariaSay(ARIA.survived, "smug");
  } else {
    G.strikes += G.oath ? 2 : 1;
    G.dayResults[G.day] = "struck";
    G.lastMissKeys = LOGIC.failKeys(c, d.rule);
    // off by exactly one fact — the near-miss gets its own line
    ariaSay(LOGIC.nearMiss(c, d.rule) ? ARIA.nearMiss : ARIA.struck);
  }

  // liar day: reveal the clerical error, score the flag
  const lieRow = G.docket.find((r) => r.lie);
  if (lieRow) {
    const ll = $("lieLine");
    ll.classList.remove("hidden");
    let note = `Clerical error: ${lieRow.card.name} was stamped HUMAN, should be SUS.`;
    if (G.flagged === lieRow) { G.score += 100; note += ` You caught it — +100`; }
    else if (G.flagged) note += ` You flagged the wrong one.`;
    ll.innerHTML = note;
  }
  const cut = G.strikes >= 3 && G.status === "player";
  hud();
  if (cut) strikeOut();

  const actions = $("verdictActions");
  actions.innerHTML = "";
  if (cut) {
    G.elimDay = G.day + 1;
    $("dossierDay").textContent = `${d.dayLabel} · ${d.theme}`;
    $("dossierArg").textContent = `“${c.argument}”`;
    $("dossierMeta").textContent =
      `${c.name} · failed: ${d.rule.filter((x) => !x.allow.includes(c.tags[x.key])).map((x) => x.text).join(", ")}`;
    ariaSay(ARIA.eliminated, "alarm");
    // the counter has the room first; the dossier lands after it
    later(() => dossierEl.classList.remove("hidden"), calmMotion() ? 0 : 1900);
    $("dossierBtn").onclick = () => {
      dossierEl.classList.add("hidden");
      G.status = "juror";
      ariaSay(ARIA.juror);
      sfx.gearShift();
      startAudit();
    };
  } else {
    const btn = document.createElement("button");
    btn.className = "shift-lever-btn";
    btn.innerHTML = `<span class="lever-icon">⚙</span> PULL SHIFT LEVER — WORK THE NIGHT SHIFT ↷`;
    btn.addEventListener("click", () => {
      sfx.gearShift();
      startAudit();
    });
    actions.appendChild(btn);
    btn.focus();
  }
}

verdictPhase.addEventListener("click", () => { if (!G.verdictDone) finishVerdict(); });

// ---------- NIGHT AUDIT ----------
const FILERS = ["MARA", "OKO", "JUN", "TESS"];
function fmtFiled(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `+${h}h${String(m).padStart(2, "0")}m`;
}
/* "MARA, OKO and JUN" — names the humans a bad rule cuts. */
function joinNames(a) {
  if (!a.length) return "no one";
  if (a.length === 1) return a[0];
  return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
}

function startAudit() {
  banner("NIGHT SHIFT — now you judge");
  showOnly("audit");
  setInstr("night");
  ariaSay([ARIA.auditOpen[Math.min(G.day, ARIA.auditOpen.length - 1)]]);
  if (G.day === 2) explain("amend");
  setTelemetry(false);
  const d = DAYS[G.day];

  renderRuleChips(d.rule, false);

  const { cases, amendAfter } = LOGIC.auditSet(CARDS, d, G.day, G.filed, stream("audit"));
  G.amendAfter = amendAfter;
  G.amendShown = false;
  // filers: the bot case is VALE; the rest get the four humans shuffled
  const humans = (function () {
    const r = stream("filers"), a = [...FILERS];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  })();
  const trng = stream("times");
  let hi = 0;
  G.auditSubs = cases.map((c) => {
    const filer = c.bot ? "VALE" : humans[hi++];
    // VALE's card wears a human filing time — the tell is on the wire,
    // behind SHIFT, never printed on the paper.
    const filed = fmtFiled(40 + Math.floor(trng() * 500));
    const tel = c.bot
      ? { latency: "3ms", origin: "GATE 0", hops: "0",
          receipt: "+0.003s after post", anomaly: true }
      : { latency: `${150 + Math.floor(trng() * 350)}ms`,
          origin: `EXT GATE ${1 + Math.floor(trng() * 6)}`,
          hops: `${2 + Math.floor(trng() * 4)}`,
          receipt: `queued ${filed}`, anomaly: false };
    return { ...c, filer, filed, tel, truth: LOGIC.passes(c.card, c.rule), pick: null, correct: null };
  });
  G.auditIdx = 0;
  // one filing a night is contested: right pays double bonus
  G.contestedIdx = Math.floor(stream("contested")() * G.auditSubs.length);
  G.auditHitsToday = 0;
  G.nightPoints = 0;
  G.auditLocked = false;
  $("auditSummary").classList.add("hidden");
  $("auditActions").innerHTML = "";
  $("caseBtns").classList.remove("hidden");
  renderCase();
}

function renderRuleChips(rule, amended) {
  $("ruleChips").innerHTML =
    `<span class="rc-label">ARIA's rule: ${rule.map((c) => c.text).join(" · ")}${amended ? ' <b class="amended-tag">AMENDED</b>' : ""}</span>` +
    rule.map((c) => `<span class="chip">${c.text}</span>`).join("") +
    (dayHasAmend() && G.day === 2 ? newTag("amend", 2) : "");
}
function dayHasAmend() { return !!DAYS[G.day].amend; }

/* SHIFT at night pulls the desk wire: latency, origin, hops, receipt —
 * the same columns for every filer, nothing flagged. What reads wrong
 * is for the auditor to notice. Works on a resolved case too. */
function setTelemetry(on) {
  if (G.phase !== "audit" && G.phase !== "finale") on = false;
  if (G.telemetry === on) return;
  G.telemetry = on;
  document.body.classList.toggle("telemetry-active", on);
  for (const id of ["telemetryBtn", "finaleWireBtn"]) {
    const b = $(id);
    if (b) b.classList.toggle("active", on);
  }
  if (on) {
    G.wireSeen = true;
    sfx.lensHum();
    if (G.phase === "audit") {
      const sub = G.auditSubs[G.auditIdx];
      if (sub) {
        sub.wireOpened = true;
        // you only know the machine if its packet was the one on the desk
        if (sub.filer === "VALE") G.valeWireSeen = true;
      }
      setValeDissonance(!!(sub && sub.filer === "VALE"));
      // the reveal lands when you look: a stamped VALE card only glows
      // once its own packet has been on the wire
      if (sub && sub.filer === "VALE" && sub.pick) {
        const card = $("caseCard").querySelector(".case-card");
        if (card) card.classList.add("anomaly");
      }
    } else {
      G.valeWireSeen = true; // the ledger lists all five packets at once
      setValeDissonance(true);
    }
  } else {
    setValeDissonance(false);
  }
}

function renderCase() {
  const sub = G.auditSubs[G.auditIdx];
  const el = $("caseCard");
  const checked = sub.pick !== null;
  const contested = G.auditIdx === G.contestedIdx;
  const verdicts = checked ? LOGIC.check(sub.card, sub.rule) : null;
  const arg = sub.filer === "VALE" ? DAYS[G.day].valeLine : sub.card.argument;
  const isVale = sub.filer === "VALE";

  let reason = "";
  if (sub.pick) {
    if (isVale) {
      if (sub.pick === "SUS" && sub.correct) {
        reason = `⚡ ANOMALY QUARANTINED — 3ms, gate zero, no hops. No human files that fast. +100 bounty`;
      } else if (sub.correct) {
        reason = `✔ Meets every criterion.`;
      } else if (sub.pick === "SUS") {
        // a blind hunch reads like any wrong quarantine — clean paper, bad stamp
        reason = "passes: meets every criterion";
      } else {
        reason = `✗ The wire was right there: 3ms, gate zero, no hops. You let the machine through.`;
      }
    } else {
      reason = sub.correct
        ? `+${sub.earned} pts${contested ? " · contested ×2" : ""}${sub.wireOpened ? " · wire ✓" : ""}`
        : (sub.truth ? "passes: meets every criterion"
                     : "fails: needed " + LOGIC.failKeys(sub.card, sub.rule)
                         .map((k) => sub.rule.find((x) => x.key === k).text).join(", "));
    }
  }

  // the wire's hum carries the dissonance — the paper itself stays quiet
  setValeDissonance(isVale && G.telemetry);
  setInstr("night");

  el.innerHTML =
    `<p class="case-num">CASE ${G.auditIdx + 1}/5${contested ? ' · <span class="contested-tag"><b>\u2696 CONTESTED BONUS</b></span>' : ""}</p>` +
    `<div class="case-card ${sub.pick ? "stamped-" + sub.pick.toLowerCase() : "fresh"}${checked && isVale && G.valeWireSeen ? " anomaly" : ""}${contested && !checked ? " contested" : ""}">
      <div class="e-head"><span class="glyph">${sub.card.glyph}</span>
        <span class="filer">FILER · <b>${sub.filer}</b> <i>filed ${sub.filed}</i></span></div>
      <div class="name">${sub.card.name}</div>
      ${sub.pick ? `<p class="case-verdict ${sub.correct ? "ok" : "bad"}">${sub.correct ? "RIGHT" : "WRONG"}</p>
        <p class="case-reason">${reason}</p>` : ""}
      <p class="arg">“${arg}”</p>
      ${factRows(sub.card, verdicts)}
      <div class="case-telemetry">
        <div class="tel-row"><span>PKT LATENCY</span><span class="tel-val">${sub.tel.latency}</span></div>
        <div class="tel-row"><span>ORIGIN</span><span class="tel-val">${sub.tel.origin}</span></div>
        <div class="tel-row"><span>HOPS</span><span class="tel-val">${sub.tel.hops}</span></div>
        <div class="tel-row"><span>RECEIPT</span><span class="tel-val">${sub.tel.receipt}</span></div>
      </div>
      ${sub.pick ? `<div class="case-stamp ${sub.pick.toLowerCase()}">${sub.pick}</div>` : ""}
      ${sub.pick && !sub.correct ? `<p class="case-cont">tap or press any key to continue</p>` : ""}
    </div>`;
  $("susBtn").disabled = $("humanBtn").disabled = checked;
  if (!checked) {
    if (!calmMotion()) {
      later(() => sfx.drop(), 80);
      if (contested) later(() => sfx.gavel(), 320);
    }
  }
}

function stamp(pickVal) {
  if (G.auditLocked || G.phase !== "audit") return;
  const sub = G.auditSubs[G.auditIdx];
  if (!sub || sub.pick) return;
  G.auditLocked = true;
  sub.pick = pickVal;
  const isVale = sub.filer === "VALE";
  const contested = G.auditIdx === G.contestedIdx;

  if (isVale) {
    if (pickVal === "SUS" && G.valeWireSeen) {
      // Detective catch — the packet was on the wire when you stamped.
      sub.correct = true;
      sub.earned = 100;
      G.auditHitsToday++;
      G.auditHits++;
      G.nightPoints += 100;
      G.score += 100;
      G.valeCaught++;
      ariaSay([
        "Wait. You stamped SUS? The facts met my criteria... but you read the wire: 3ms, gate zero, no hops. You caught something my code couldn't see.",
        "ANOMALY QUARANTINED. You read the wire, not just the paper. Well done."
      ], "smug");
    } else if (pickVal === "SUS") {
      // A blind hunch quarantines clean paper — a wrong stamp like any other.
      // No bounty, no reveal: the ledger keeps its secret.
      sub.correct = false;
      sub.earned = 0;
    } else if (!G.valeWireSeen) {
      // The paper genuinely passed — the stamp stands. No whisper names the
      // prop; only the summary's wire-check count hints a verb went unused.
      sub.correct = true;
      sub.earned = contested ? 100 : 50;
      G.auditHitsToday++;
      G.auditHits++;
      G.nightPoints += sub.earned;
      G.score += sub.earned;
      G.valeEscapes++;
      if (G.valeEscapes === 1) {
        ariaSay([
          "Approved — the criteria said so, anyway.",
          "Passed. My rules say that's all that matters."
        ]);
      }
    } else {
      // The packet was on this desk and you approved it anyway.
      sub.correct = false;
      sub.earned = 0;
      G.valeEscapes++;
      ariaSay([
        "You read that packet and stamped it through. That filing was the machine.",
        "3ms, gate zero, no hops — and you approved it."
      ], "alarm");
    }
  } else {
    sub.correct = (pickVal === "HUMAN") === sub.truth;
    if (sub.correct) {
      G.auditHitsToday++;
      G.auditHits++;
      sub.earned = (contested ? 100 : 50) + (sub.wireOpened ? 15 : 0);
      G.nightPoints += sub.earned;
      G.score += sub.earned;
    } else {
      sub.earned = 0;
    }
  }
  G.auditTotal++;
  hud();
  const arm = pickVal === "SUS" ? $("susBtn") : $("humanBtn");
  $("susBtn").classList.remove("press");
  $("humanBtn").classList.remove("press");
  setTimeout(() => arm.classList.add("press"), 0);
  setTimeout(() => arm.classList.remove("press"), 380);

  sfx.slide();
  renderCase();

  // the stamp itself falls, bites the paper, and only then does the
  // verdict answer — the sound and the flinch land on contact
  const stampEl = $("caseCard").querySelector(".case-stamp");
  const fall = stampSwing(stampEl);
  const hit = fall ? Math.round(fall * 0.84) : 0;
  if (fall) {
    const cardEl = $("caseCard").querySelector(".case-card");
    cardEl.classList.add("impact");
    later(() => cardEl.classList.remove("impact"), 700);
  }
  later(() => sfx.stamp(), hit);
  later(() => {
    sub.correct ? sfx.human() : sfx.sus();
    if (!contested) return;
    if (sub.correct) sfx.gavel();
    else { sfx.thud(); deskShake(); }
  }, hit + 70);
  if (sub.correct) later(nextCase, 900 + hit);  // wrong stamps stay up until dismissed
}

/* the hand stamp drops out of frame, lands off-square on the card, and
   leaves ink. Swap it for a clone so nothing about the card has to wait. */
const STAMP_FALL = 300;
function stampSwing(el) {
  if (!el || calmMotion() || !el.animate) return 0;
  const r = el.getBoundingClientRect();
  if (!r.width) return 0;
  const ghost = el.cloneNode(true);
  ghost.className = el.className + " swing";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed", margin: "0", zIndex: "70",
    left: r.left + "px", top: r.top + "px",
    width: r.width + "px", height: r.height + "px",
  });
  document.body.appendChild(ghost);
  el.style.visibility = "hidden";
  try {
    ghost.animate([
      { transform: "translateY(-170px) rotate(-26deg) scale(2.5)", opacity: 0, offset: 0 },
      { opacity: 1, offset: .3 },
      { transform: "translateY(6px) rotate(8deg) scale(.955)", opacity: 1, offset: .84 },
      { transform: "translateY(0) rotate(6deg) scale(1)", opacity: 1, offset: 1 },
    ], { duration: STAMP_FALL, easing: "cubic-bezier(.48,0,.82,.44)", fill: "forwards" });
  } catch {
    ghost.remove(); el.style.visibility = "";
    return 0;
  }
  setTimeout(() => {
    ghost.remove();
    el.style.visibility = "";
    el.classList.add("landed");
  }, STAMP_FALL);
  return STAMP_FALL;
}

function nextCase() {
  if (G.phase !== "audit") return;
  clearLater();
  const cardEl = $("caseCard").querySelector(".case-card");
  const sub = G.auditSubs[G.auditIdx];
  const shiftDir = sub && sub.pick === "SUS" ? "shift-left" : "shift-right";
  if (cardEl && !calmMotion() && !cardEl.classList.contains("shifting")) {
    cardEl.classList.add("shifting", shiftDir);
    sfx.slide();
    later(advanceCase, 220);
    return;
  }
  advanceCase();
}

function advanceCase() {
  G.auditLocked = false;
  const next = G.auditIdx + 1;
  // amendment interrupt lands between the last base-rule case and the
  // first amended case
  if (G.amendAfter !== null && !G.amendShown && next === G.amendAfter) {
    if (!G.amending) showAmendment();
    return;
  }
  G.auditIdx = next;
  if (G.auditIdx >= G.auditSubs.length) return auditSummary();
  renderCase();
}

/* the desk takes the hit so the fact rows don't have to. */
function deskShake() {
  frameEl.classList.remove("shake");
  void frameEl.offsetWidth;
  frameEl.classList.add("shake");
  later(() => frameEl.classList.remove("shake"), 500);
}

const AMEND_CONTACT = 430;
function showAmendment() {
  if (G.amending) return;
  const d = DAYS[G.day];
  G.amending = true;
  G.auditLocked = true;
  const b = $("amendBanner");
  $("amendNote").textContent = d.amend.note;
  // the gut-punch: the case just judged, replayed under the new rule
  const prev = G.auditSubs[G.auditIdx - 1];
  const ghost = $("amendGhost");
  ghost.textContent = "";
  ghost.classList.add("hidden");
  if (prev) {
    const nowPass = LOGIC.passes(prev.card, d.amend.rule);
    if (nowPass !== prev.truth) {
      ghost.textContent =
        `\u26A0 ${prev.card.name} would now ${nowPass ? "PASS" : "FAIL"} — you stamped it ${prev.pick}.`;
      ghost.classList.remove("hidden");
    }
  }
  b.classList.remove("hidden");
  // the alarm first, then the rider falls out of the ceiling and lands
  b.classList.remove("falling");
  void b.offsetWidth;
  b.classList.add("falling");
  b.onclick = () => finishAmend();
  sfx.klaxon();
  // the papers under it rattle — not the frame, whose transform would
  // trap this fixed overlay for the length of the shake
  later(() => {
    sfx.thud();
    for (const el of [$("ruleChips"), $("caseCard")]) {
      if (!el) continue;
      el.classList.remove("recoil");
      void el.offsetWidth;
      el.classList.add("recoil");
    }
  }, AMEND_CONTACT);
  musicDuck(true);
  frameEl.classList.add("lamp-flicker");
  later(() => frameEl.classList.remove("lamp-flicker"), 900);
  // chips: old criteria struck one by one, then the new ones stamp in
  const oldTexts = d.rule.map((c) => c.text);
  const newTexts = d.amend.rule.map((c) => c.text);
  const removed = oldTexts.filter((t) => !newTexts.includes(t));
  const added = newTexts.filter((t) => !oldTexts.includes(t));
  $("ruleChips").innerHTML =
    `<span class="rc-label">${ruleText(d)}</span>` +
    oldTexts.map((t) =>
      `<span class="chip${removed.includes(t) ? " doomed" : ""}">${t}</span>`).join("");
  let t = AMEND_CONTACT + 180;
  removed.forEach(() => {
    later(() => {
      const el = $("ruleChips").querySelector(".chip.doomed:not(.struck)");
      if (el) { el.classList.add("struck"); sfx.tick(); }
    }, t);
    t += 350;
  });
  added.forEach((txt) => {
    const at = t;
    later(() => {
      const rc = $("ruleChips");
      const s = document.createElement("span");
      s.className = "chip flash";
      s.textContent = txt;
      rc.appendChild(s);
      sfx.rise(2);
    }, at);
    t += 350;
  });
  G.amendTimer = later(finishAmend, t + 700);
}

function finishAmend() {
  if (!G.amending) return;
  G.amending = false;
  clearTimeout(G.amendTimer);
  const d = DAYS[G.day];
  $("amendBanner").classList.add("hidden");
  $("amendBanner").onclick = null;
  frameEl.classList.remove("lamp-flicker");
  musicDuck(false);
  G.amendShown = true;
  renderRuleChips(d.amend.rule, true);
  G.auditLocked = false;
  G.auditIdx++;
  renderCase();
}

function auditSummary() {
  const hits = G.auditHitsToday;
  G.nightResults[G.day] = hits;
  let pts = G.nightPoints;
  const flawless = hits === 5;
  let effect;
  if (flawless) {
    pts += 50;
    if (G.status === "player" && G.strikes > 0) {
      G.strikes--;
      effect = `Flawless — one strike cleared · +${pts} pts`;
    } else {
      effect = `Flawless — +${pts} pts`;
    }
  } else {
    effect = `+${pts} pts`;
  }
  G.score += flawless ? 50 : 0;
  sfx.audit();
  hud();

  $("caseBtns").classList.add("hidden");
  $("caseCard").innerHTML = "";
  const s = $("auditSummary");
  s.classList.remove("hidden");
  const valeSub = G.auditSubs.find((x) => x.filer === "VALE");
  const valeLine = !valeSub ? ""
    : (valeSub.pick === "SUS" && valeSub.correct)
      ? `<p class="sum-vale ok">⚡ anomaly quarantined — the machine was on tonight's docket</p>`
      : (valeSub.pick === "SUS" && !valeSub.correct)
        ? ""   // a blind hunch earns no postscript
        : G.valeWireSeen
          ? `<p class="sum-vale warn">⚠ you read the wire and stamped it through</p>`
          : `<p class="sum-vale warn">⚠ the wire went unread tonight — something filed in 3ms</p>`;
  const wireChecks = G.auditSubs.filter((x) => x.wireOpened).length;
  s.innerHTML = `<p class="sum-line">${hits}/5 CASES EVALUATED</p>
    <p class="sum-effect">${effect}</p>
    <p class="sum-wire">wire checks ${wireChecks}/5 · +15 each</p>${valeLine}`;
  const actions = $("auditActions");
  actions.innerHTML = "";
  const btn = document.createElement("button");
  btn.textContent = G.day >= DAYS.length - 1 ? "Last call →" : "Next day →";
  btn.addEventListener("click", nextDay);
  actions.appendChild(btn);
  btn.focus();
}

// ---------- FINALE ----------
const FINALE_RULES = [
  { text: "with someone else", rule: [{ key: "people", allow: ["pair", "group"], text: "with someone else" }] },
  { text: "outdoors", rule: [{ key: "setting", allow: ["outdoor"], text: "outdoors" }] },
  { text: "not at night", rule: [{ key: "time", allow: ["dawn", "day", "dusk"], text: "not at night" }] },
  { text: "at night", rule: [{ key: "time", allow: ["night"], text: "at night" }] },
];

function startFinale() {
  showOnly("finale");
  setInstr("finale");
  banner("LAST CALL — write the rule");
  G.finaleChoice = null;
  // seeded shuffle — same puzzle, but VALE isn't always the last row and
  // the winning rule isn't always option d. Spoilers stay spoiled.
  const frng = stream("finale");
  const shuf = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(frng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  G.finaleRows = shuf([...FINALE]);
  G.finaleOpts = shuf([...FINALE_RULES]);
  // the same wire, one last time — every filer gets a packet row
  const trng = stream("finale-tel");
  G.finaleRows.forEach((row) => {
    row.tel = row.filer === "VALE"
      ? { latency: "3ms", origin: "GATE 0", hops: "0",
          receipt: "+0.003s after post" }
      : { latency: `${150 + Math.floor(trng() * 350)}ms`,
          origin: `EXT GATE ${1 + Math.floor(trng() * 6)}`,
          hops: `${2 + Math.floor(trng() * 4)}`,
          receipt: `queued ${row.ts}` };
  });
  G.signing = false;
  $("decree").classList.remove("signed");
  setTelemetry(false);
  buildFinale();
  paintFinale();
  // the last line she says depends on whether you ever read the wire —
  // a nudge toward the ledger, never a name
  if (G.valeCaught > 0) {
    ariaSay(["You flagged her once on the wire. Now write the clause only she can't file."], "smug");
  } else if (G.wireSeen) {
    ariaSay(["You've read the wire. Whatever isn't a fact is sitting somewhere on that ledger."]);
  } else {
    ariaSay(["My rules only check facts. Read the ledger the way it was filed — not the way it was argued."]);
  }
}

/* the decree is set once — clauses are written into it, rows are struck
   off it — so nothing is rebuilt while you are reading it */
function buildFinale() {
  const tb = $("finaleBody");
  tb.innerHTML = "";
  for (const row of G.finaleRows) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td class="c-file"><span class="glyph">${row.glyph}</span><span class="name">${row.name}</span></td>` +
      ATTR_KEYS.map((k) => `<td class="c-fact">${factCell(k, row.tags[k])}</td>`).join("") +
      `<td class="c-filer">${row.filer}</td><td class="c-ts">${row.ts}</td>` +
      `<td class="c-cut"></td>`;
    tb.appendChild(tr);
  }
  // the wire drawer — same muted columns for every filer, nothing flagged
  $("finaleWire").innerHTML = G.finaleRows.map((row) =>
    `<div class="tel-row"><span>${row.filer}</span>` +
    `<span class="tel-val">${row.tel.latency} · ${row.tel.origin} · ${row.tel.hops} hops · ${row.tel.receipt}</span></div>`
  ).join("");
  const box = $("ruleChoices");
  box.innerHTML = "";
  G.finaleOpts.forEach((opt, i) => {
    const b = document.createElement("button");
    b.className = "rule-choice";
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<b>(${"abcd"[i]})</b><span>${opt.text}</span><i class="tick">\u2713</i>`;
    b.addEventListener("click", () => {
      if (G.signing) return;
      G.finaleChoice = opt;
      sfx.pen();
      paintFinale();
    });
    box.appendChild(b);
  });
}

function paintFinale() {
  const rows = [...$("finaleBody").children];
  G.finaleRows.forEach((row, i) => {
    const cut = !!G.finaleChoice && !LOGIC.passes(row, G.finaleChoice.rule);
    rows[i].classList.toggle("cut", cut);
    rows[i].querySelector(".c-cut").textContent = cut ? "CUT" : "";
  });
  [...$("ruleChoices").children].forEach((b, i) => {
    const on = G.finaleChoice === G.finaleOpts[i];
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  const blank = $("decreeBlank");
  const text = G.finaleChoice ? G.finaleChoice.text : "";
  const shown = text || "_____________";
  if (blank.textContent !== shown) {
    blank.textContent = shown;
    blank.classList.toggle("filled", !!text);
    blank.classList.remove("written");
    if (text) { void blank.offsetWidth; blank.classList.add("written"); }
  }
  const s = $("signBtn");
  s.disabled = !G.finaleChoice || !!G.signing;
  s.textContent = G.signing ? "Signed into record"
    : G.finaleChoice ? "\u270E Sign here" : "Choose a clause";
}

function signRule() {
  if (!G.finaleChoice || G.signing) return;
  // the pen goes down, the signature draws, the seal lands — then dawn
  G.signing = true;
  $("decree").classList.add("signed");
  paintFinale();
  sfx.pen();
  later(() => sfx.stamp(), 560);
  const cut = FINALE.filter((r) => !LOGIC.passes(r, G.finaleChoice.rule));
  const cutNames = cut.map((r) => r.filer);
  const valeCut = cutNames.includes("VALE");
  const humanCut = cutNames.filter((n) => n !== "VALE");
  let title, line;
  if (valeCut && humanCut.length === 0) {
    title = G.status === "player" ? "LAST HUMAN STANDING" : "DAWN";
    line = G.valeCaught > 0
      ? "You wrote the one rule she couldn't. You'd been reading the wire all week — the docket is human again."
      : G.valeWireSeen
        ? "You wrote the one rule she couldn't. The wire said what the paper never could — the docket is human again."
        : "You wrote the one rule she couldn't. +0.003s never did read human — the docket is human again.";
  } else if (valeCut) {
    title = "COLLATERAL";
    line = `VALE is gone. So are ${humanCut.join(", ")}. The rule didn't care who.`;
  } else {
    title = "THE DAY SHIFT IS AUTOMATED";
    line = `You cut ${joinNames(humanCut)} — every human on the docket.` +
      " VALE filed at +0.003s, as always. Tomorrow it argues your case.";
  }
  G.finaleTitle = title;
  G.finaleLine = line;
  later(endGame, calmMotion() ? 0 : 1000);
}

// ---------- flow ----------
function nextDay() {
  G.day++;
  if (G.day >= DAYS.length) return startFinale();
  hud();
  if (G.status === "player") {
    startDay();
  } else {
    G.dayResults[G.day] = "juror";
    startAudit();
  }
}

function shareText(title) {
  const dayRow = DAYS.map((_, i) =>
    G.dayResults[i] === "survived" ? "🟩" : G.dayResults[i] === "struck" ? "🟥" : "⬛").join("");
  const nightRow = DAYS.map((_, i) => {
    const h = G.nightResults[i];
    return h === 5 ? "🟩" : h >= 3 ? "🟨" : h === undefined ? "⬛" : "🟥";
  }).join("");
  const label = params.get("seed") ? SEED : `#${Math.floor((new Date(dailySeed + "T00:00") - new Date("2026-11-01T00:00")) / 864e5) + 1}`;
  return `NIGHT SHIFT ${label} — ${title}\n☀️ ${dayRow}\n🌙 ${nightRow}\nscore ${G.score}`;
}

function endGame() {
  setTelemetry(false);
  dayPhase.classList.add("hidden");
  verdictPhase.classList.add("hidden");
  auditPhase.classList.add("hidden");
  finalePhase.classList.add("hidden");
  setShift("night");
  sfx.dawn();

  const title = G.finaleTitle || (G.status === "player" ? "LAST HUMAN STANDING" : "DAWN");
  score.play(title === "THE DAY SHIFT IS AUTOMATED" || title === "COLLATERAL" ? "title" : "dawn");
  const acc = G.auditTotal ? Math.round((G.auditHits / G.auditTotal) * 100) : 0;
  const titleIdx = Math.min(JURY_TITLES.length - 1, Math.floor((acc / 100) * JURY_TITLES.length));

  $("endTitle").textContent = title;
  $("endStats").textContent =
    `${G.daysSurvived}/${DAYS.length} days survived · ${G.strikes} strikes · score ${G.score} · audits ${acc}%`;
  const lines = [];
  if (G.finaleTitle) lines.push("VALE filed every proof 0.003 seconds after the riddle posted.");
  if (G.valeCaught) lines.push(
    `You flagged the machine on ${G.valeCaught} night${G.valeCaught > 1 ? "s" : ""} — the wire never lies.`);
  if (G.valeEscapes) lines.push(
    `It walked through your stamp ${G.valeEscapes} time${G.valeEscapes > 1 ? "s" : ""} before tonight.`);
  if (G.finaleLine) lines.push(G.finaleLine);
  else lines.push(title === "LAST HUMAN STANDING"
    ? "Five rules. You read every one of them."
    : `Cut on day ${G.elimDay || "?"} — the night shift made you: ${JURY_TITLES[titleIdx]}.`);
  if (G.status === "juror" && G.finaleTitle) lines.push(`Night-shift title: ${JURY_TITLES[titleIdx]}.`);
  $("endTitle2").innerHTML = lines.map((l) => `<span class="endline">${l}</span>`).join("");
  $("shareBlock").textContent = shareText(title);
  dawnEl.classList.remove("hidden");
}

function copyShare() {
  const text = $("shareBlock").textContent;
  const done = () => { $("copyBtn").textContent = "Copied"; };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  const t = $("copySink");
  t.value = text;
  t.classList.remove("hidden");
  t.select();
  try { document.execCommand("copy"); } catch { /* no-op */ }
  t.classList.add("hidden");
  done();
}

// ---------- input ----------
$("fileBtn").addEventListener("click", fileSelected);
$("oathBtn").addEventListener("click", toggleOath);
$("clueBtn").addEventListener("click", requestClue);
$("susBtn").addEventListener("click", () => stamp("SUS"));
$("humanBtn").addEventListener("click", () => stamp("HUMAN"));
$("telemetryBtn").addEventListener("click", () => setTelemetry(!G.telemetry));
$("finaleWireBtn").addEventListener("click", () => setTelemetry(!G.telemetry));
$("shiftBrief").addEventListener("click", endBrief);
document.querySelectorAll("#attrShiftRail .rail-btn").forEach((b) =>
  b.addEventListener("click", () => { setFocusAttr(b.dataset.attr); sfx.click(); }));
$("signBtn").addEventListener("click", signRule);
$("copyBtn").addEventListener("click", copyShare);

document.addEventListener("keydown", (e) => {
  if (!dossierEl.classList.contains("hidden")) return;
  if (gameEl.classList.contains("hidden")) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "m" || e.key === "M") {
    audioMuted = !audioMuted;
    if (ambientGain) {
      const ac = audio();
      ambientGain.gain.cancelScheduledValues(ac.currentTime);
      ambientGain.gain.setValueAtTime(audioMuted ? 0 : 0.35, ac.currentTime);
    }
    score.setMuted();
    return;
  }

  // a live brief swallows every key — it dismisses, nothing else fires
  if (briefOpen) { endBrief(); return; }

  // SHIFT is the desk verb: by day it walks the loupe across the fact
  // columns; by night it holds the packet wire open. Key-repeat does
  // nothing — a held Shift doesn't spin the loupe or flicker the wire.
  if (e.key === "Shift") {
    if (e.repeat) return;
    if (G.phase === "day") { cycleFocus(); return; }
    if (G.phase === "audit" || G.phase === "finale") { setTelemetry(true); return; }
  }

  if (G.phase === "day") {
    if (e.key >= "1" && e.key <= "4") {
      const c = G.hand[+e.key - 1];
      if (c) selectCard(c);
    } else if (e.key === "o" || e.key === "O") toggleOath();
    else if (e.key === "Enter") { e.preventDefault(); fileSelected(); }
  } else if (G.phase === "verdict") {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!G.verdictDone) finishVerdict();
      else { const b = $("verdictActions").querySelector("button"); if (b) b.click(); }
    }
  } else if (G.phase === "audit") {
    if (G.auditLocked) {
      // during the amendment the banner is skippable; otherwise advance
      if (!MODIFIER_KEYS.has(e.key)) { if (G.amending) finishAmend(); else nextCase(); }
      return;
    }
    const sub = G.auditSubs[G.auditIdx];
    if (sub && !sub.pick) {
      if (e.key === "ArrowLeft" || e.key === "s" || e.key === "S") stamp("SUS");
      else if (e.key === "ArrowRight" || e.key === "h" || e.key === "H") stamp("HUMAN");
    } else if (e.key === "Enter") {
      e.preventDefault();
      const b = $("auditActions").querySelector("button"); if (b) b.click();
    }
  } else if (G.phase === "finale") {
    const opts = G.finaleOpts || FINALE_RULES;
    const idx = "abcd".indexOf(e.key.toLowerCase());
    if (idx >= 0 && opts[idx] && !G.signing) {
      G.finaleChoice = opts[idx];
      sfx.pen();
      paintFinale();
    } else if (e.key === "Enter" && G.finaleChoice) {
      e.preventDefault();
      signRule();
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Shift" && (G.phase === "audit" || G.phase === "finale")) {
    setTelemetry(false);
  }
});

const MODIFIER_KEYS = new Set(["Control", "Alt", "Meta", "Tab", "CapsLock", "Escape"]);
// tap a resolved case (or the stamp buttons) to move on
$("caseCard").addEventListener("click", () => {
  if (G.auditLocked) { if (G.amending) finishAmend(); else nextCase(); }
});
$("caseBtns").addEventListener("click", (e) => {
  // a click on an enabled stamp button is the stamp itself, not a dismiss;
  // once locked the buttons are disabled, so further clicks land here
  if (G.auditLocked && !(e.target instanceof HTMLButtonElement)) {
    if (G.amending) finishAmend(); else nextCase();
  }
});
$("banner").addEventListener("click", () => $("banner").classList.add("hidden"));

// ---------- boot ----------
function startGame(seed) {
  SEED = seed;
  audio();
  initAmbient();
  titleEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  hud();
  if (G.status === "player") startDay();
  else startAudit();
}

// ---------- clocking in: the card goes into the punch ----------
$("pcDocket").textContent = docketLabel();
$("startBtn").setAttribute("aria-label", `Clock in — ${docketLabel()}`);
let clockingIn = false;
function clockIn(seed) {
  if (clockingIn) return;
  clockingIn = true;
  // unlock audio on the gesture itself — the visual punch comes after
  audio();
  initAmbient();
  const b = $("startBtn");
  if (calmMotion()) { startGame(seed); return; }
  b.classList.add("punching");
  sfx.punch();
  later(() => startGame(seed), 520);
}
$("startBtn").addEventListener("click", () => clockIn(SEED));
// a random docket is still a clock-in — same card, same punch
$("randomBtn").addEventListener("click", () =>
  clockIn("rnd-" + Math.random().toString(36).slice(2, 8)));
$("againBtn").addEventListener("click", () => location.reload());
