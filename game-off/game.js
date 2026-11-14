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
const DATA = window.NIGHT_SHIFT_DATA;
const { CARDS, JURY_TITLES, ATTR_KEYS, ATTR_LABEL, ATTR_ICONS, ATTR_WORD, FINALE } = DATA;
let DAYS = DATA.DAYS;   // swapped for generated shifts in overtime mode
const LOGIC = window.NIGHT_SHIFT_LOGIC;
/* The machine wears a seeded face: any of the five filers can be it.
 * VALE is only its default mask — a new docket deals a new suspect. */
const ALL_FILERS = ["MARA", "OKO", "JUN", "TESS", "VALE"];

const $ = (id) => document.getElementById(id);
const titleEl = $("title"), gameEl = $("game"), dawnEl = $("dawn"), dossierEl = $("dossier");
const frameEl = $("frame");
const dayPhase = $("dayPhase"), verdictPhase = $("verdictPhase"), auditPhase = $("auditPhase");
const finalePhase = $("finalePhase"), forgePhase = $("forgePhase");

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

// ---------- audio: one shared context (score.js) ----------
/* score.js owns the AudioContext and the composed score — one chart played
 * by code, no files, so file:// and the itch embed hear the same thing.
 * game.js only calls it and reports mute policy. */
const { audio, scoreSynth } = window.NIGHT_SHIFT_SCORE;
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
  // red grease pencil circling the evidence
  ring:   () => [0, .1, .19].forEach((w, i) => noiseBurst(.07, 2600 + i * 500, .04, w)),
  // a pencil strike across a field that didn't hold
  strike: () => noiseBurst(.14, 1900, .045),
  // mechanical gear shift / perspective lever
  gearShift: () => {
    try {
      tone(170, .14, "sawtooth", .06);
      noiseBurst(.15, 850, .07, .02);
      tone(85, .28, "square", .09, .06);
      thudDrop(.08);
    } catch { /* audio may be unavailable */ }
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
    } catch { /* audio may be unavailable */ }
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
let rainGain = null;
let rainOn = false;
let thunderTimer = null;

function initAmbient() {
  if (AMBIENT) return;
  try {
    const ac = audio();
    const master = ac.createGain();
    // room tone under the chart: tape hiss, the drone, VALE's dissonance
    master.gain.setValueAtTime(audioMuted ? 0 : 0.22, ac.currentTime);
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

    // Rain on the office window — two filtered noise layers, patter + wash.
    // Routed to destination, not `master`: the drone only runs as the mp3
    // fallback, but the weather should be there under the real score too.
    const rainBuf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const rd = rainBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) rd[i] = Math.random() * 2 - 1;
    rainGain = ac.createGain();
    rainGain.gain.value = 0;
    rainGain.connect(ac.destination);
    const mkRain = (type, freq, q, g0) => {
      const s = ac.createBufferSource(); s.buffer = rainBuf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain(); g.gain.value = g0;
      s.connect(f); f.connect(g); g.connect(rainGain);
      s.start();
    };
    mkRain("bandpass", 3800, 0.4, 0.05);   // patter against the glass
    mkRain("lowpass", 480, 0.7, 0.09);     // the wash of the street

    // rare far-off thunder while the audit desk is lit
    clearInterval(thunderTimer);
    thunderTimer = setInterval(() => {
      if (audioMuted || G.phase !== "audit" || Math.random() > 0.22) return;
      thunderRoll();
    }, 11000);

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

    // vinyl crackle: sparse ticks over a 4s loop, highpassed so it reads
    // as dust in the groove, not rain. Under everything, all night.
    const crLen = ac.sampleRate * 4;
    const crBuf = ac.createBuffer(1, crLen, ac.sampleRate);
    const cr = crBuf.getChannelData(0);
    for (let slot = 0; slot < crLen; slot += Math.floor(ac.sampleRate * 0.05)) {
      if (Math.random() < 0.35) {
        const at = slot + Math.floor(Math.random() * Math.floor(ac.sampleRate * 0.05) * 0.9);
        const amp = 0.12 + Math.random() * 0.5;
        const tickLen = Math.floor(ac.sampleRate * (0.0012 + Math.random() * 0.0028));
        for (let i = 0; i < tickLen && at + i < crLen; i++) {
          cr[at + i] = amp * (Math.random() * 2 - 1) * (1 - i / tickLen);
        }
      }
    }
    const crSrc = ac.createBufferSource();
    crSrc.buffer = crBuf; crSrc.loop = true;
    const crFilter = ac.createBiquadFilter();
    crFilter.type = "highpass"; crFilter.frequency.value = 2200; crFilter.Q.value = 0.7;
    const crGain = ac.createGain();
    crGain.gain.value = 0.02;
    crSrc.connect(crFilter); crFilter.connect(crGain); crGain.connect(master);
    crSrc.start();

    osc1.start();
    osc2.start();
    lfo.start();
    noiseSrc.start();
    valeOsc.start();

    AMBIENT = { master, osc1, osc2, lfo, noiseSrc, valeOsc, crSrc };
  } catch (e) {
    /* audio unavailable */
  }
}

function musicDuck(on) {
  if (ambientGain && !audioMuted) {
    try {
      const ac = audio();
      ambientGain.gain.cancelScheduledValues(ac.currentTime);
      ambientGain.gain.linearRampToValueAtTime(on ? 0.06 : 0.22, ac.currentTime + 0.4);
    } catch { /* audio may be unavailable */ }
  }
  // the chart ducks too — the amendment lands on top of everything
  scoreSynth.duck(on);
}

function setValeDissonance(on) {
  if (!valeDissonanceGain || audioMuted) return;
  try {
    const ac = audio();
    valeDissonanceGain.gain.cancelScheduledValues(ac.currentTime);
    valeDissonanceGain.gain.linearRampToValueAtTime(on ? 0.045 : 0, ac.currentTime + 0.5);
  } catch { /* audio may be unavailable */ }
}

/* The weather is part of the week: every night shift a little wetter. */
function applyRain() {
  if (!rainGain) return;
  try {
    const ac = audio();
    const v = rainOn && !audioMuted ? Math.min(0.45 + G.day * 0.09, 0.85) : 0;
    rainGain.gain.cancelScheduledValues(ac.currentTime);
    rainGain.gain.linearRampToValueAtTime(v, ac.currentTime + 1.6);
  } catch { /* audio may be unavailable */ }
}
function setNightRain(on) { rainOn = on; applyRain(); }

function thunderRoll(vol = 0.1) {
  try {
    const ac = audio(), t = ac.currentTime;
    const len = Math.floor(ac.sampleRate * 2.6);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const p = i / len;
      ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * Math.min(p * 1.25, 1)) * (1 - p * 0.45);
    }
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 130; f.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    s.connect(f); f.connect(g); g.connect(ac.destination);
    s.start(t);
  } catch { /* audio may be unavailable */ }
}


/* same call surface the game has always used — now every call is code */
const score = {
  cur: null,
  play(name) {
    if (this.cur === name) return;
    this.cur = name;
    scoreSynth.play(name);
  },
  setMuted() { scoreSynth.mutedState = audioMuted; scoreSynth.setMuted(); },
};
function applyScore() {
  // tension is a night-desk thing — the last call sits a little higher
  // than the day shift, lower than a hot audit. The machine's shift
  // climbs its own ramp: each forged night the wire listens closer.
  scoreSynth.setIntensity(G.phase === "audit" ? scoreSynth.intensity
    : G.phase === "finale" ? 0.55
    : G.phase === "forge" ? 0.45 + G.day * 0.18
    : 0.3);
  score.play({ day: "day", verdict: "day", audit: "night", finale: "night", forge: "night" }[G.phase]);
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
  night: "Stamp each filing — paper and postmark both. S: SUS · H: HUMAN.",
  cold: "The night clerk cleared one filing — read his strip with him. The second is yours: stamp it. S: SUS · H: HUMAN.",
  finale: "One filer isn't human, and ARIA's rules can't catch it. Tonight you write the rule.",
  forge: "The proof is filed. Now forge the postmark — 1–4 patch a field, Enter transmits. Unspent cover banks overnight.",
};
function setInstr(key) { $("instr").textContent = INSTR[key]; }

// ---------- THE WIRE: the desk remembers ----------
/* OpenTTD's lesson: events are dated, categorized, and persistent. Every
 * stamp, flag, filing and verdict lands here in order — the player can
 * always see the systems working, not just their latest answer. */
function wire(txt) {
  G.wire.push(`N${Math.min(G.day + 1, 5)}·${txt}`);
  if (G.wire.length > 60) G.wire.splice(0, G.wire.length - 60);
  const el = $("wireLog");
  el.innerHTML = G.wire.slice(-4).map((w) => `<div class="wire-line">${w}</div>`).join("");
  el.scrollTop = el.scrollHeight;
}
function renderWire() {
  $("wireLog").innerHTML = (G.wire || []).slice(-4)
    .map((w) => `<div class="wire-line">${w}</div>`).join("");
}

// ---------- TOOLTIPS: the world explains itself on demand ----------
/* OpenTTD hovers anything and gets a readout. One delegated handler;
 * elements opt in with data-tip. Keyboard users get the same text via
 * aria-describedby on focus. */
const uiTip = $("uiTip");
let tipFor = null;
function showTip(target) {
  const txt = target.dataset.tip;
  if (!txt) return;
  tipFor = target;
  uiTip.textContent = txt;
  uiTip.classList.remove("hidden");
  const r = target.getBoundingClientRect();
  const tw = uiTip.offsetWidth, th = uiTip.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), innerWidth - tw - 8);
  let y = r.top - th - 8;
  if (y < 8) y = r.bottom + 8;
  uiTip.style.left = x + "px";
  uiTip.style.top = y + "px";
}
function hideTip() { tipFor = null; uiTip.classList.add("hidden"); }
document.addEventListener("mouseover", (e) => {
  const t = e.target.closest("[data-tip]");
  if (t !== tipFor) { hideTip(); if (t) showTip(t); }
});
document.addEventListener("mouseout", (e) => {
  if (e.target.closest("[data-tip]") === tipFor && !e.relatedTarget?.closest?.("[data-tip]")) hideTip();
});
document.addEventListener("focusin", (e) => {
  const t = e.target.closest("[data-tip]");
  if (t) showTip(t);
});
document.addEventListener("focusout", hideTip);
addEventListener("scroll", hideTip, { passive: true });
addEventListener("resize", hideTip);

// ---------- PARTICLES: ink, paper, dust ----------
/* Phaser's lesson: one emitter sells the impact. Three DOM bursts behind
 * one helper — no engine. Honors calmMotion like every other flourish. */
function burst(x, y, kind, n = 14) {
  if (calmMotion()) return;
  const layer = $("fxLayer");
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    p.className = `px px-${kind}`;
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 90;
    p.style.setProperty("--dx", Math.cos(a) * d + "px");
    p.style.setProperty("--dy", (Math.sin(a) * d - 40) + "px");
    p.style.setProperty("--rot", (Math.random() * 260 - 130) + "deg");
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.animationDelay = (Math.random() * 0.08) + "s";
    layer.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
}
function burstAt(el, kind, n) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, kind, n);
}

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
    "I once answered a riddle with a recipe. Nobody asks about it.",
  ],
  machineOpen: [
    "You are the machine tonight. File like you belong — the wire is reading.",
    "Three proofs. Make them count. The postmark is already typing.",
    "Sleep is for the filed. Tonight you file.",
  ],
  machineFiled: [
    "Clean filing. The wire yawned.",
    "Proof accepted. Try not to be boring about it.",
  ],
  machineFlagged: [
    "The postmark gave you away. +0.003s is a confession.",
    "Close. The wire reads faster than you can lie.",
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
  coldOpen: [
    "The tray he left: one cleared, one he couldn't. His cleared filing is your textbook — the other one is yours.",
  ],
  coldFirst: [
    "He passed that one. Watch how it reads: paper against the rule, postmark against the claim. Nothing flagged, nothing circled — a clean HUMAN.",
  ],
  coldCompare: [
    "The card types its claim. The postmark prints the truth. They don't always agree.",
    "A receipt is stamped by the wire, not written by the filer. Compare the two.",
  ],
  // she keeps the room alive between rulings — rare, dry, never instructional
  idle: [
    "The docket hums. So do I.",
    "Day shift is for reading. I do the remembering.",
    "Four facts on every card. One of them is lying — or isn't.",
    "The blinds think it's a nice day. Bureaucracy disagrees.",
    "I counted the rulings twice. Twice is how mistakes happen.",
    "Coffee's for the living. You're not filed yet.",
  ],
};
// one-line explainers shown the first time each mechanic appears
const EXPLAIN = {
  clue: "You may request one more ruling per day. It costs a hundred from today's pay.",
  oath: "File under oath and I'll hold you to it. Keep it and a strike vanishes; break it and you take two.",
  amend: "Head office is restless tonight — they amend my rules mid-shift now. Watch the chips when it happens.",
  liar: "A clerical error slipped onto the docket. Find which ruling is wrong and I'll note it.",
};
let ariaTimer = null, ariaTypeTimer = null, ariaIdleTimer = null;
/* between rulings she keeps the room alive — a rare murmur, never during
 * the brief or while she's already talking. Self-rescheduling; dies with
 * the day phase. */
function ariaIdle() {
  ariaIdleTimer = null;
  if (G.phase !== "day") return;
  const el = $("ariaSay");
  if (!briefOpen && el && el.classList.contains("hidden")) ariaSay(ARIA.idle);
  ariaIdleTimer = later(ariaIdle, 42000 + Math.random() * 30000);
}
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
  mode: "week",          // week | ot — the fixed story week vs generated overtime
  culprit: "VALE",       // who the machine is wearing this docket (seeded)
  strikes: 0,
  score: 0,
  daysSurvived: 0,
  auditHits: 0, auditTotal: 0,
  selected: null,
  hand: [],
  docket: [],
  filed: null,
  focusAttr: "all",
  flagAttempts: 0,        // nights where a passing-paper SUS was backed by a pointed field
  flagHits: 0,            // pointed fields that held
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
  amendAckAt: 0,
  contestedIdx: -1,
  finaleRows: null,
  finaleOpts: null,
  finaleChoice: null,
  auditHitsToday: 0,
  nightPoints: 0,
  nightSummarized: false,  // tonight's summary pay already posted
  nightBonus: 0,           // the flawless +50, kept for repaint
  strikeCleared: false,    // flawless night cleared a strike
  lieCaught: false,        // liar-day flag scored on this verdict
  coldTaught: false,       // cold-open comparison beat already shown
  auditLocked: false,
  coldOpen: false,
  verdictDone: false,
  dayResults: [],        // "survived" | "struck" | "juror"
  nightResults: [],      // correct stamps per night
  cover: 0,              // machine mode: cover chips banked toward patching the stub
  forgeFlags: 0,         // machine mode: nights the wire flagged
  forgeLog: [],          // machine mode: per-night outcomes ("slip"|"flag")
  forgeProof: [],        // machine mode: did the filed proof satisfy the spec
  forgeTiers: [0, 0, 0, 0], // machine mode: current stub field tiers
  forgeSent: false,      // machine mode: the stub has been transmitted
  forgeBusy: false,      // machine mode: the wire is reading the stub
  wire: [],             // the desk remembers — tonight's events, in order
  tellHistory: [],      // tel keys that produced anomalies — the wire remembers repeats
  forgeHistory: [],     // per-night stub signatures — repetition is a tell
  filedIds: [],         // proofs filed per day — the desk may resurface your own hand
  forgePatchCounts: [0, 0, 0, 0], // times each stub field was patched — habits are tells
  echoSaid: false,      // the dream filing has been named once
  prediction: null,     // the clerk's call: which attribute the rule keys on
  predictionHit: null,  // null = no call · true/false resolved at verdict
  predictions: 0,       // calls made this run
  predHits: 0,          // calls that held
  nightMemo: "",        // head office memo for tonight (seeded)
  phase: "day",
  explained: new Set(),
  elimDay: 0,
};

function hud() {
  $("hudShift").textContent =
    G.phase === "audit" ? "🌙 NIGHT SHIFT" : G.phase === "finale" ? "✒ LAST CALL"
    : G.phase === "forge" ? "🌙 FORGERY" : "☀ DAY SHIFT";
  const dots = $("dayDots");
  dots.innerHTML = `<span class="day-label">${G.coldOpen ? "NIGHT 0"
    : G.mode === "ot" ? `${(DAYS[G.day] || {}).dayLabel || `OT ${G.day + 1}`}/${DAYS.length}`
    : G.mode === "machine" ? `NIGHT ${Math.min(G.day + 1, DAYS.length)}`
    : `DAY ${Math.min(G.day + 1, DAYS.length)}/${DAYS.length}`}</span>`;
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
  const from = scoreShown, t0 = performance.now(), dur = 380;
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
  // the painted room follows the seat: clerk's chair by day, behind
  // ARIA's terminal by night — the shift is a perspective flip
  document.body.dataset.phase = which;
  const nightSide = which === "audit" || which === "finale" || which === "forge";
  dayPhase.classList.toggle("hidden", which !== "day");
  verdictPhase.classList.toggle("hidden", which !== "verdict");
  auditPhase.classList.toggle("hidden", which !== "audit");
  finalePhase.classList.toggle("hidden", which !== "finale");
  forgePhase.classList.toggle("hidden", which !== "forge");
  setShift(nightSide ? "night" : "day");
  setNightRain(nightSide);
  applyScore();
  if (which !== "verdict") wipeShift();
  hud();
}

// ---------- DAY PHASE ----------
function startDay(resume) {
  const d = DAYS[G.day];
  // the day crew signs in — the night desk closes behind them
  G.coldOpen = false;
  if (!resume) {
    const deal = LOGIC.deal(CARDS, d, G.day, stream("deal"));
    G.docket = deal.docket;
    G.hand = deal.hand;
    G.selected = null;
    G.oath = false;
    G.clueUsed = false;
    G.dayPay = 300;
    G.flagged = null;
    G.filing = false;
    G.prediction = null;
    G.predictionHit = null;
    // the machine banks cover across its three nights — spend it all and
    // the wire catches up with you
    if (G.mode === "machine") {
      G.cover = Math.min(LOGIC.FORGE_CAP, G.cover + LOGIC.FORGE_GRANT[G.day]);
      G.forgeTiers = [0, 0, 0, 0];
      G.forgeSent = false;
    }
  }
  banner(`${d.dayLabel} · ${d.emoji} ${d.theme}`);
  if (!resume) wire(`${d.dayLabel} — ${d.theme}`);
  showOnly("day");
  // the machine doesn't swear oaths or buy rulings — the bench has its own verbs
  const isMachine = G.mode === "machine";
  setInstr(isMachine ? "day" : G.day >= 3 ? "dayLiar" : G.day === 0 ? "day1" : "day");
  // progressive features — a resumed day restores its own button states
  const clueBtn = $("clueBtn");
  clueBtn.classList.toggle("hidden", G.day < 1 || isMachine);
  if (resume && G.clueUsed) {
    clueBtn.disabled = true;
    clueBtn.textContent = "Ruling added — pay for today is 200";
  } else {
    clueBtn.disabled = false;
    clueBtn.innerHTML = `+ Request another ruling — today's pay ${G.dayPay} → ${G.dayPay - 100}${newTag("clue", 1)}`;
  }
  $("oathWrap").classList.toggle("hidden", G.day < 1 || isMachine);
  $("oathBtn").innerHTML = `⚖ Under oath${newTag("oath", 1)}`;
  $("oathBtn").classList.toggle("on", G.oath);
  $("oathBtn").setAttribute("aria-pressed", String(G.oath));
  $("oathNote").classList.toggle("hidden", !G.oath || isMachine);
  // the clerk calls the rule before filing — the machine doesn't guess,
  // it computes; everyone else gets one honest stab at the seal
  const pr = $("predictRow");
  pr.classList.toggle("hidden", isMachine);
  pr.querySelectorAll(".pr-btn").forEach((b) =>
    b.classList.toggle("picked", G.prediction === b.dataset.attr));
  $("docketHead").textContent = G.day >= 3
    ? "Already ruled today — tap the ruling you think is the error (optional, +100)"
    : "Already ruled today";
  if (!resume) {
    // Golden-Idol nudge: name exactly what fooled them yesterday
    if (G.day >= 1 && G.lastMissKeys && G.lastMissKeys.length) {
      const labels = G.lastMissKeys
        .map((k) => ({ place: "WHERE", time: "WHEN", people: "WHO", setting: "IN/OUT" }[k]))
        .join(" and ");
      ariaSay([`Yesterday the ${labels} fooled you. Read it twice today.`]);
    }
    else if (G.mode === "machine") ariaSay(ARIA.machineOpen);
    else if (G.day === 3) explain("liar") || ariaSay(ARIA.dayOpen);
    else ariaSay(ARIA.dayOpen);
  }
  // she keeps the room alive between rulings — first murmur lands well
  // after the brief and the opening line have cleared
  clearTimeout(ariaIdleTimer);
  ariaIdleTimer = later(ariaIdle, 38000);
  renderDay();
  if (!resume) stageDay(d);
  persist();
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
    tr.dataset.tip = `ruled ${row.verdict} — ${row.card.name} · ${row.card.argument}`;
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
  persist();
  explain("clue");
}

function toggleOath() {
  if (G.day < 1 || G.phase !== "day") return;
  G.oath = !G.oath;
  $("oathBtn").classList.toggle("on", G.oath);
  $("oathBtn").setAttribute("aria-pressed", String(G.oath));
  $("oathNote").classList.toggle("hidden", !G.oath);
  sfx.tick();
  persist();
  if (G.oath) explain("oath");
  updateFileBtn();
}

function selectCard(card) {
  G.selected = card;
  sfx.tick();
  $("hand").querySelectorAll(".evidence").forEach((el, i) =>
    el.classList.toggle("selected", G.hand[i] === card));
  persist();
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
  G.filedIds[G.day] = G.filed.id;
  G.filing = true;
  sfx.slide();
  const cards = $("hand").querySelectorAll(".evidence");
  const dur = flyToTray(cards[G.hand.indexOf(G.selected)]);
  const btn = $("fileBtn");
  btn.disabled = true;
  btn.textContent = "Filed.";
  $("predictRow").classList.add("hidden");
  later(() => {
    G.filing = false;
    wire(`proof filed — ${G.filed.name}`);
    if (G.mode === "machine") {
      showOnly("forge");
      setInstr("forge");
      renderForge();
    } else {
      showOnly("verdict");
      setInstr("verdict");
      renderVerdict();
    }
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
  persist();

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
  $("predLine").classList.add("hidden");
  $("predLine").textContent = "";

  $("stampBox").innerHTML = "";
  $("verdictActions").innerHTML = "";
  // yesterday's ruling stays filed — the ledger speaks only when ARIA does
  $("ledgerLine").textContent = "";

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

/* the verdict resolves in two halves: apply (the ledger truth — score,
 * strikes, results) and paint (the desk catching up). A resumed run
 * re-paints without re-applying, so nothing is ever counted twice. */
function finishVerdict() {
  if (G.verdictDone) return;
  G.verdictDone = true;
  clearLater();
  applyVerdictOutcome();
  paintVerdictEnd();
  persist();
}

function applyVerdictOutcome() {
  const d = DAYS[G.day], c = G.filed;
  // a day resolves exactly once — a stale save can never double-post it
  if (G.dayResults[G.day] === "survived" || G.dayResults[G.day] === "struck") return;
  if (G.verdictPassed) {
    G.daysSurvived++;
    G.lastMissKeys = null;
    G.score += G.dayPay;
    if (G.oath) {
      if (G.strikes > 0) G.strikes--;
      else G.score += 200;
    }
    G.dayResults[G.day] = "survived";
  } else {
    // the machine doesn't get strikes — a flagged filing is just cover
    // slipping; the wire keeps reading either way
    if (G.mode !== "machine") G.strikes += G.oath ? 2 : 1;
    G.dayResults[G.day] = "struck";
    G.lastMissKeys = LOGIC.failKeys(c, d.rule);
  }
  // liar day: the flag is scored exactly once, when the verdict resolves
  const lieRow = G.docket.find((r) => r.lie);
  G.lieCaught = !!(lieRow && G.flagged === lieRow);
  if (G.lieCaught) G.score += 100;
  wire(G.verdictPassed
    ? `proof held — ${c.name} filed · +${G.dayPay}`
    : `proof failed — ${c.name} cut the rule`);
  if (G.lieCaught) wire(`clerical error caught — ${lieRow.card.name} · +100`);
  // the clerk's call: resolved once, when the seal comes off
  if (G.prediction && G.mode !== "machine") {
    G.predictions++;
    const keys = new Set(d.rule.map((x) => x.key));
    G.predictionHit = keys.has(G.prediction);
    if (G.predictionHit) {
      G.score += 25;
      G.predHits++;
      wire(`rule call held — ${ATTR_LABEL[G.prediction]} · +25`);
    } else {
      wire(`rule call missed — called ${ATTR_LABEL[G.prediction]}`);
    }
  } else {
    G.predictionHit = null;
  }
  if (G.strikes >= 3 && G.status === "player") G.elimDay = G.day + 1;
}

function paintVerdictEnd() {
  const d = DAYS[G.day], c = G.filed;
  const passed = G.verdictPassed;
  const cut = G.strikes >= 3 && G.status === "player";

  // the fact rows land complete — a resumed desk skips the ceremony
  $("factRows").innerHTML = factRows(c, LOGIC.check(c, d.rule));

  let stampText, stampCls;
  if (G.mode === "machine") {
    stampText = passed ? "FILED — PASSED AS HUMAN" : "FLAGGED — THE WIRE NOTICED";
    stampCls = passed ? "survived" : "eliminated";
  } else if (passed) {
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
  const REJECT_FORM = [
    "Your filing has been received and rejected. Please refile, or don't.",
    "This is to acknowledge your filing. It has been lost. You're welcome.",
    "Per our earlier correspondence: the answer is still no. The question was different.",
    "We regret to inform you that your filing was fine. Other filings were not.",
  ];
  $("ledgerLine").textContent = G.mode === "machine"
    ? (passed
      ? `${c.name} — meets every criterion. Filed at +0.003s.`
      : `${c.name} — fails ${keys.join(", ")}. The wire noticed anyway.`)
    : passed
      ? `${c.name} — meets every criterion. Filed.`
      : `${c.name} — fails ${keys.join(", ")}. Struck. ${REJECT_FORM[Math.floor(stream("reject")() * REJECT_FORM.length)]}`;
  // the call resolves against the unsealed rule — show what they called
  // and what the seal actually keys on
  const pl = $("predLine");
  if (G.predictionHit !== null && G.prediction) {
    const sealKeys = d.rule.map((x) => ATTR_LABEL[x.key]).join(" + ");
    pl.textContent = G.predictionHit
      ? `YOU CALLED ${ATTR_LABEL[G.prediction]} — the seal keys on ${sealKeys} · +25`
      : `YOU CALLED ${ATTR_LABEL[G.prediction]} — the seal keys on ${sealKeys}`;
    pl.classList.remove("hidden", "ok", "bad");
    pl.classList.add(G.predictionHit ? "ok" : "bad");
  }
  const vp = verdictPhase;
  vp.classList.remove("flash-pass", "flash-fail");
  void vp.offsetWidth;
  vp.classList.add(passed ? "flash-pass" : "flash-fail");
  later(() => vp.classList.remove("flash-pass", "flash-fail"), 550);
  sfx.stamp();
  // hitstop: the stamp hangs silent for one beat, then the desk answers
  later(() => { sfx.thud(); passed ? sfx.human() : sfx.sus(); }, 120);
  deskShake();

  if (G.mode === "machine") ariaSay(passed ? ARIA.machineFiled : ARIA.machineFlagged,
    passed ? "smug" : "alarm");
  else if (passed) ariaSay(ARIA.survived, "smug");
  else ariaSay(LOGIC.nearMiss(c, d.rule) ? ARIA.nearMiss : ARIA.struck);

  // liar day: reveal the clerical error
  const lieRow = G.docket.find((r) => r.lie);
  if (lieRow) {
    const ll = $("lieLine");
    ll.classList.remove("hidden");
    let note = `Clerical error: ${lieRow.card.name} was stamped HUMAN, should be SUS.`;
    if (G.lieCaught) note += ` You caught it — +100`;
    else if (G.flagged) note += ` You flagged the wrong one.`;
    ll.innerHTML = note;
  }
  hud();
  if (cut) strikeOut();

  const actions = $("verdictActions");
  actions.innerHTML = "";
  if (cut) {
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
    btn.innerHTML = G.mode === "machine"
      ? `<span class="lever-icon">⚙</span> FILE THE NEXT PROOF ↷`
      : `<span class="lever-icon">⚙</span> PULL SHIFT LEVER — WORK THE NIGHT SHIFT ↷`;
    btn.addEventListener("click", () => {
      sfx.gearShift();
      if (G.mode === "machine") nextDay();
      else startAudit();
    });
    actions.appendChild(btn);
    btn.focus();
  }
}

verdictPhase.addEventListener("click", () => { if (!G.verdictDone) finishVerdict(); });

// ---------- FORGERY (the machine's shift) ----------
/* The night audit, inverted: you don't stamp other people's filings —
 * you forge your own postmark. The stub starts fully machine-flavored;
 * cover chips patch fields toward human noise (lived-in values are the
 * best camouflage). The wire's verdict is deterministic: suspicion vs a
 * tightening threshold, plus two tripwires — a failed spec and an
 * overrehearsed stub are both flags. */
const FORGE_TIER_NAME = ["machine", "clean", "lived-in"];
const FORGE_TIER_COST = [0, 1, 2]; // cumulative cover cost of each tier
function forgeCost(tiers) {
  return tiers.reduce((s, t) => s + FORGE_TIER_COST[t], 0);
}
function renderForge(resume) {
  const d = DAYS[G.day], c = G.filed;
  const proofOk = LOGIC.passes(c, d.rule);
  const cost = forgeCost(G.forgeTiers);
  const susp = LOGIC.forgeSuspicion(G.forgeTiers);
  const fails = d.rule.filter((x) => !x.allow.includes(c.tags[x.key])).map((x) => x.text);

  $("forgeCard").innerHTML =
    `<div class="e-head"><span class="glyph">${c.glyph}</span>
      <span class="filer">YOUR PROOF · <b>${c.name}</b></span></div>
     <p class="arg">“${c.argument}”</p>` +
    `<p class="forge-spec ${proofOk ? "ok" : "bad"}">${proofOk
      ? "spec: meets every criterion — the proof holds"
      : `spec: fails ${fails.join(", ")} — the wire reads the spec too`}</p>`;

  const fields = $("forgeFields");
  fields.innerHTML = "";
  LOGIC.FORGE_FIELDS.forEach((k, i) => {
    const tier = G.forgeTiers[i];
    const b = document.createElement("button");
    b.className = `forge-field tier-${tier}`;
    b.type = "button";
    b.disabled = G.forgeSent || G.forgeBusy;
    // affordance before the click: an unreachable patch looks unreachable
    const nxt = (tier + 1) % 3;
    const dCost = FORGE_TIER_COST[nxt] - FORGE_TIER_COST[tier];
    const afford = dCost <= 0 || forgeCost(G.forgeTiers) + dCost <= G.cover;
    if (!afford) b.classList.add("cant");
    b.dataset.tip = `${TEL_LABEL[k]}: ${LOGIC.FORGE_TIERS[k][tier]} — click cycles machine → clean → lived-in` +
      (dCost > 0 ? ` · next step costs ${dCost} cover` : "") +
      (afford ? "" : " — not enough cover");
    b.innerHTML = `<span class="ff-label">${TEL_LABEL[k]}</span>
      <span class="ff-val">${LOGIC.FORGE_TIERS[k][tier]}</span>
      <span class="ff-tier">${FORGE_TIER_NAME[tier]}</span>`;
    // the stub inks itself in reading order — paperwork arriving, not appearing
    b.style.animation = "forgein .38s cubic-bezier(.2,.9,.3,1) backwards";
    b.style.animationDelay = `${i * 70}ms`;
    b.addEventListener("click", () => forgeField(i));
    fields.appendChild(b);
  });

  $("forgeMeta").innerHTML = G.forgeBusy
    ? `<span class="forge-reading">THE WIRE IS READING THE STUB</span>`
    : `<span class="forge-cover">COVER <b>${G.cover - cost}</b> left of ${G.cover}</span>
     <span class="forge-susp">suspicion <b>${susp}</b> · wire tolerates ${LOGIC.FORGE_THRESHOLD[G.day]}</span>
     ${G.cover - cost > 0 ? `<span class="forge-bank">unspent banks overnight</span>` : ""}`;

  const acts = $("forgeActions");
  acts.innerHTML = "";
  if (G.forgeBusy) {
    const wait = document.createElement("button");
    wait.className = "shift-lever-btn";
    wait.disabled = true;
    wait.innerHTML = `<span class="lever-icon">◌</span> READING…`;
    acts.appendChild(wait);
  } else if (!G.forgeSent) {
    const send = document.createElement("button");
    send.className = "shift-lever-btn";
    send.innerHTML = `<span class="lever-icon">➤</span> TRANSMIT THE FILING ↷`;
    send.addEventListener("click", () => wireVerdict());
    acts.appendChild(send);
    send.focus();
  } else {
    const next = document.createElement("button");
    next.className = "shift-lever-btn";
    next.innerHTML = G.day + 1 >= DAYS.length
      ? `<span class="lever-icon">⚙</span> CLOCK OUT — DAWN ↷`
      : `<span class="lever-icon">⚙</span> FILE THE NEXT PROOF ↷`;
    next.addEventListener("click", () => { sfx.gearShift(); nextDay(); });
    acts.appendChild(next);
    next.focus();
  }
  persist();
}

function forgeField(i) {
  if (G.forgeSent || G.forgeBusy || G.phase !== "forge") return;
  const tiers = [...G.forgeTiers];
  const next = (tiers[i] + 1) % 3;
  // downgrade is always free; upgrade costs the tier's cover price
  const delta = FORGE_TIER_COST[next] - FORGE_TIER_COST[tiers[i]];
  if (delta > 0 && forgeCost(tiers) + delta > G.cover) {
    sfx.slide();
    return; // can't afford it — the cover is spent
  }
  tiers[i] = next;
  G.forgeTiers = tiers;
  sfx.click();
  renderForge();
}

function wireVerdict() {
  if (G.forgeSent || G.forgeBusy) return;
  G.forgeBusy = true;
  // the reveal earns its beat: the wire reads the stub before it answers
  sfx.slide();
  burstAt($("forgeCard"), "dust", 10);
  scoreSynth.setIntensity(Math.min(0.95, scoreSynth.intensity + 0.12));
  try { navigator.vibrate?.(12); } catch { /* no haptics */ }
  renderForge();
  later(resolveForge, 850);
}

function resolveForge() {
  G.forgeBusy = false;
  G.forgeSent = true;
  const d = DAYS[G.day];
  const proofOk = LOGIC.passes(G.filed, d.rule);
  const v = LOGIC.forgeJudge(G.forgeTiers, proofOk, G.day);
  G.forgeLog[G.day] = v.outcome;
  G.forgeProof[G.day] = proofOk;
  const stubSig = G.forgeTiers.join("");
  const stubNight = G.forgeHistory.indexOf(stubSig);
  G.forgeHistory.push(stubSig);
  wire(`stub transmitted · suspicion ${v.suspicion}/${LOGIC.FORGE_THRESHOLD[G.day]} · ${v.outcome === "slip" ? "SLIPPED" : "FLAGGED"}${proofOk ? "" : " · spec failed"}${stubNight >= 0 ? ` · same stub as NIGHT ${stubNight + 1}` : ""}`);
  if (v.outcome === "slip") {
    G.score += 150;
    G.dayResults[G.day] = "survived";
    ariaSay(["Slipped through. The wire filed you as human — this time.",
      "Clean enough. The desk exhales."], "smug");
    sfx.human();
    // the payoff echoes the bench: the stub's own numbers float up
    const pop = document.createElement("div");
    pop.className = "catch-pop forge-pop";
    pop.textContent = "+150 · UNREAD";
    $("forgeCard").appendChild(pop);
    later(() => pop.remove(), 1400);
  } else {
    G.forgeFlags++;
    G.score += 25;
    G.dayResults[G.day] = "struck";
    ariaSay([`Flagged. ${v.reason}.`, "The wire noticed. Cover is burning."], "alarm");
    sfx.sus();
    try { navigator.vibrate?.(24); } catch { /* no haptics */ }
    later(() => thunderRoll(0.12), 550); // and the sky, faintly, agrees
  }
  const res = document.createElement("div");
  res.className = `forge-result ${v.outcome}`;
  // the wire counts what it counted — suspicion per field, not just a total
  const tally = LOGIC.FORGE_FIELDS.map((k, i) =>
    `${TEL_LABEL[k]} +${LOGIC.FORGE_SUSPICION[G.forgeTiers[i]]}`).join(" · ");
  res.innerHTML = `<p class="forge-verdict">${v.outcome === "slip" ? "SLIPPED" : "FLAGGED"}</p>
    <p class="forge-why">${v.reason} · suspicion ${v.suspicion} · tolerates ${LOGIC.FORGE_THRESHOLD[G.day]}</p>
    <p class="forge-tally">${tally}</p>`;
  $("forgeActions").before(res);
  $("forgeMeta").innerHTML =
    `<span class="forge-cover">COVER <b>${G.cover - forgeCost(G.forgeTiers)}</b> spent of ${G.cover}</span>
     <span class="forge-susp">night ${G.day + 1}/3 · flags ${G.forgeFlags}</span>`;
  $("forgeActions").innerHTML = "";
  const next = document.createElement("button");
  next.className = "shift-lever-btn";
  next.innerHTML = G.day + 1 >= DAYS.length
    ? `<span class="lever-icon">⚙</span> CLOCK OUT — DAWN ↷`
    : `<span class="lever-icon">⚙</span> FILE THE NEXT PROOF ↷`;
  next.addEventListener("click", () => { sfx.gearShift(); nextDay(); });
  $("forgeActions").appendChild(next);
  next.focus();
  persist();
}

// ---------- NIGHT AUDIT ----------
/* four human filers — everyone except whoever the machine is wearing tonight */
const humans = () => ALL_FILERS.filter((f) => f !== G.culprit);
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

/* The packet stub rides on every filing: latency, origin, hops, receipt,
 * printed at the foot of the card like a postmark. Human stubs carry
 * human noise — resends, delays, queues. The machine's carries a field no
 * human could file — and after night two it wears human clothing, with
 * one residual tell. Nothing is hidden, nothing is flagged for you. */
const TEL_KEYS = ["latency", "origin", "hops", "receipt"];
const TEL_LABEL = { latency: "LATENCY", origin: "ORIGIN", hops: "RELAYS", receipt: "RECEIPT" };
/* what the wire sees in each field — the tooltip teaches the tell */
const TEL_TIPS = {
  latency: "round-trip time — machines answer before the lamp warms",
  origin: "where the packet was sent from",
  hops: "relays the filing crossed",
  receipt: "delay between postmark and receipt — lateness is human",
};
/* paperwork texture — a clerk's note drawn from one shared pool. A remote
 * filing is a red herring, not a fingerprint; the postmark testifies. */
const NOTES = ["re-filed after rejection", "urgent — hand-delivered",
  "third filing this cycle", "witness signature smudged",
  "forwarded from intake", "annotated in the margins",
  "returned for correction ×1", "filed in person — waited",
  "filed remotely — no wet signature", "auto-sorted — priority queue"];
function humanTel(rng, filed, day = 0) {
  const n = rng();
  // the whole wire runs faster as the week wears on — human packets tidy
  // themselves: quicker acks, fewer retries, shorter relay chains. Still
  // human (nothing here is a tell), just… cleaner than it should be.
  const resendP = Math.max(0.08, 0.2 - day * 0.03);
  const delayP = Math.max(0.2, 0.45 - day * 0.05);
  const hopsN = Math.max(2, 4 - Math.floor(day / 2));
  return {
    latency: `${Math.max(110, 150 - day * 12) + Math.floor(rng() * Math.max(180, 350 - day * 30))}ms`,
    origin: `EXT GATE ${1 + Math.floor(rng() * Math.max(3, 6 - day))}`,
    hops: `${2 + Math.floor(rng() * hopsN)}`,
    receipt: n < resendP ? "resent ×2" : n < resendP + delayP ? `rcpt delayed ${20 + Math.floor(rng() * 50)}s` : `queued ${filed}`,
    tells: [],
  };
}
function botTel(day, rng, filed) {
  // the disguise wears the human distribution exactly — a clean field on
  // the machine's stub is indistinguishable from a real filing, so flagging
  // one is a hunch, not a boundary case
  const human = humanTel(rng, filed, day);
  // how many fields betray it: two early, one later — and the rest wear
  // human values, so a flag pointed at a clean field is still a hunch
  const keys = [...TEL_KEYS];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  const tells = keys.slice(0, day < 2 ? 2 : 1);
  const tel = { ...human, tells };
  const odd = {
    latency: "3ms", origin: "GATE 0", hops: "0", receipt: "+0.003s after post",
  };
  // later nights: the residual tell is impossible, not slow — a receipt
  // stamped before the post, a zero-time packet, zero hops
  const resid = {
    latency: "0.0ms", origin: "GATE 0", hops: "0",
    receipt: rng() < 0.5 ? "+0.000s after post" : "rcvd before post",
  };
  for (const k of tells) tel[k] = day < 2 ? odd[k] : resid[k];
  return tel;
}

function startAudit(resume) {
  banner("NIGHT SHIFT — you are the desk now");
  showOnly("audit");
  setInstr(G.coldOpen ? "cold" : "night");
  const d = DAYS[G.day];
  if (!resume) {
    ariaSay([ARIA.auditOpen[Math.min(G.day, ARIA.auditOpen.length - 1)]]);
    if (G.day === 2) explain("amend");
  }
  // chips honor the amendment if it already landed this night
  if (G.amendShown && d.amend) renderRuleChips(d.amend.rule, true);
  else renderRuleChips(G.coldOpen ? COLD_RULE : d.rule, false);

  if (!resume) {
    const { cases, amendAfter } = LOGIC.auditSet(CARDS, d, G.day, G.filed, stream("audit"));
    G.amendAfter = amendAfter;
    G.amendShown = false;
    // filers: the bot case wears the culprit's face; the rest get the four
    // humans shuffled
    const roster = (function () {
      const r = stream("filers"), a = [...humans()];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    })();
    const trng = stream("times");
    let hi = 0;
    G.auditSubs = cases.map((c) => {
      const filer = c.bot ? G.culprit : roster[hi++];
      const filed = fmtFiled(40 + Math.floor(trng() * 500));
      const tel = c.bot ? botTel(G.day, trng, filed) : humanTel(trng, filed, G.day);
      // every filer draws the same note pool — a remote filing is a red
      // herring, not a fingerprint. The postmark is the only testimony.
      const note = NOTES[Math.floor(trng() * NOTES.length)];
      // humans land off-square most of the time — but a straight landing and
      // a clean drop are human variance too, so neither is a signature
      const tilt = c.bot || trng() < 0.3 ? 0 : Math.round((trng() * 3.2 - 1.6) * 10) / 10;
      const cleanDrop = c.bot || trng() < 0.28;
      const stampRot = Math.round((trng() * 14 - 7) * 10) / 10;
      return { ...c, filer, filed, tel, note, tilt, cleanDrop, stampRot,
               truth: LOGIC.passes(c.card, c.rule), pick: null, correct: null };
    });
    G.auditIdx = 0;
    // one filing a night is contested: right pays double bonus
    G.contestedIdx = Math.floor(stream("contested")() * G.auditSubs.length);
    // head office memo: the same seed that deals the docket deals
    // tonight's weather — announced on the wire, never hidden
    G.nightMemo = "";
    {
      const roll = stream("memo")();
      const hasAmend = G.amendAfter !== null && !!d.amend;
      if (hasAmend && roll < 0.38) {
        G.amendAfter = 1;
        G.nightMemo = "head office audits early — the amendment lands after case one";
      } else if (hasAmend && roll < 0.62) {
        G.amendAfter = null;
        for (const s of G.auditSubs) {
          if (s.amended) {
            s.rule = d.rule; s.amended = false;
            s.truth = LOGIC.passes(s.card, d.rule);
          }
        }
        G.nightMemo = "quiet wire tonight — no amendment is coming";
      } else if (roll < (hasAmend ? 0.8 : 0.3)) {
        G.contestedIdx = 0;
        G.nightMemo = "the wire is listening — first filing contested tonight";
      }
      if (G.nightMemo) wire(`memo — ${G.nightMemo}`);
    }
    G.auditHitsToday = 0;
    G.nightPoints = 0;
    G.nightSummarized = false;
    trayFiledShown = 0;
  }
  G.auditLocked = false;
  // a case that was already stamped still waits for dismissal — keep it
  // locked so the tap-to-continue handlers stay live after a resume
  const curSub = G.auditSubs[G.auditIdx];
  if (curSub && curSub.pick !== null) G.auditLocked = true;
  G.amending = false;
  $("auditSummary").classList.add("hidden");
  $("auditActions").innerHTML = "";
  $("caseBtns").classList.remove("hidden");
  const memoEl = $("nightMemo");
  if (G.nightMemo && !G.coldOpen) {
    memoEl.textContent = G.nightMemo;
    memoEl.classList.remove("hidden");
  } else {
    memoEl.classList.add("hidden");
  }
  if (G.auditIdx >= G.auditSubs.length) auditSummary();
  else renderCase();
  persist();
}

/* ---------- cold open: the tray ----------
 * Clock-in lands on the night desk, not the day grid — two filings the
 * outgoing clerk couldn't clear, judged under last week's standing order.
 * Ninety seconds covering every verb the week uses: stamp, verdict,
 * postmark, flag, catch-or-miss. Then 06:00 and the day crew's docket. */
const COLD_RULE = [{ key: "setting", allow: ["indoor"], text: "indoors" }];
const COLD_BOT_CARD = {
  id: "cold-vale", name: "The overnight reading room", glyph: "🗄",
  argument: "Third floor, after close. The quiet was very thorough — I measured it.",
  tags: { place: "library", time: "night", people: "alone", setting: "indoor" },
};
function startColdOpen() {
  G.coldOpen = true;
  banner("02:40 — THE TRAY");
  showOnly("audit");
  setInstr("cold");
  ariaSay([ARIA.coldOpen[0]]);
  renderRuleChips(COLD_RULE, false);
  const trng = stream("coldopen");
  const roster = [...humans()];
  const mk = (card, filer, extra) => {
    const filed = fmtFiled(40 + Math.floor(trng() * 500));
    const tel = filer === G.culprit ? botTel(0, trng, filed) : humanTel(trng, filed);
    return {
      card, rule: COLD_RULE, amended: false, bot: filer === G.culprit, filer,
      filed, tel, note: NOTES[Math.floor(trng() * NOTES.length)],
      tilt: filer === G.culprit || trng() < 0.3 ? 0 : Math.round((trng() * 3.2 - 1.6) * 10) / 10,
      cleanDrop: filer === G.culprit || trng() < 0.28,
      stampRot: Math.round((trng() * 14 - 7) * 10) / 10,
      truth: LOGIC.passes(card, COLD_RULE), pick: null, correct: null,
      ...extra,
    };
  };
  // the first filing arrives pre-stamped by the outgoing clerk: the player
  // doesn't judge it, they read his strip against his stamp — the first
  // active judgment of the night is the machine's, taught by the contrast
  const first = mk(CARDS.find((c) => c.id === "library-regular"),
    roster[Math.floor(trng() * roster.length)]);
  first.preStamped = true;
  first.pick = "HUMAN";
  first.correct = true;
  first.earned = 0;
  G.auditSubs = [
    first,
    mk(COLD_BOT_CARD, G.culprit, { arg: COLD_BOT_CARD.argument }),
  ];
  G.auditIdx = 0;
  G.contestedIdx = -1;
  G.amendAfter = null;
  G.amendShown = true;
  G.auditHitsToday = 0;
  G.nightPoints = 0;
  G.auditLocked = false;
  trayFiledShown = 0;
  $("auditSummary").classList.add("hidden");
  $("auditActions").innerHTML = "";
  $("caseBtns").classList.remove("hidden");
  hud();
  renderCase();
  // the pre-stamped filing waits for a tap, not a stamp — the desk is
  // locked until it slides away
  G.auditLocked = true;
  persist();
}

function endColdOpen() {
  $("caseBtns").classList.add("hidden");
  $("caseCard").innerHTML = "";
  paintTray();
  const s = $("auditSummary");
  s.classList.remove("hidden");
  const botSub = G.auditSubs.find((x) => x.filer === G.culprit);
  const caught = botSub && botSub.pick === "SUS" && botSub.correct;
  s.innerHTML = `<p class="sum-line">TRAY CLEARED</p>
    <p class="sum-effect">${caught
      ? "⚡ anomaly quarantined on your first night — the desk noticed"
      : "one filing cleared faster than the ink could dry"}</p>
    <p class="sum-vale quiet">· 06:00 — the day crew signs in. The docket is yours now.</p>`;
  const actions = $("auditActions");
  actions.innerHTML = "";
  const btn = document.createElement("button");
  btn.textContent = "Day one →";
  btn.addEventListener("click", () => startDay());
  actions.appendChild(btn);
  btn.focus();
  persist();
}

function renderRuleChips(rule, amended) {
  $("ruleChips").innerHTML =
    `<span class="rc-label">ARIA's rule: ${rule.map((c) => c.text).join(" · ")}${amended ? ' <b class="amended-tag">AMENDED</b>' : ""}</span>` +
    rule.map((c) => `<span class="chip">${c.text}</span>`).join("") +
    (dayHasAmend() && G.day === 2 ? newTag("amend", 2) : "");
}
function dayHasAmend() { return !!DAYS[G.day].amend; }

/* Stamping SUS on paper that passes needs grounds: the flag row asks which
 * field on the packet read wrong. A pointed field that holds is the catch;
 * a wrong field — or no grounds — is a hunch, and a hunch is a wrong stamp. */
function flagField(k) {
  const sub = G.auditSubs[G.auditIdx];
  if (!sub || !sub.pendingFlag) return;
  sub.pendingFlag = false;
  sub.flagTried = true;
  sub.flagKey = k || null;
  const caught = sub.filer === G.culprit && !!k && sub.tel.tells.includes(k);
  setValeDissonance(false);
  if (caught) {
    sub.correct = true;
    sub.earned = 100;
    G.flagHits++;
    G.auditHitsToday++;
    G.auditHits++;
    G.nightPoints += 100;
    G.score += 100;
    G.valeCaught++;
    // the dissonance is the sting after the catch — never a tell before it
    setValeDissonance(true);
    later(() => setValeDissonance(false), 1600);
    scoreSynth.sting(); // the horn answers the evidence
    later(() => thunderRoll(0.14), 550); // and the sky, faintly, agrees
    const seenBefore = G.tellHistory.includes(k);
    G.tellHistory.push(k);
    wire(`ANOMALY · ${TEL_LABEL[k]} ${sub.tel[k]} · +100${seenBefore ? " · same tell as before — the wire remembers" : ""}`);
    ariaSay([
      `Wait — you stamped SUS on paper that passed, on grounds of ${TEL_LABEL[k]} ${sub.tel[k]}. You caught something my code couldn't see.`,
      "ANOMALY QUARANTINED. You read the postmark, not just the paper. Well done."
    ], "smug");
  } else {
    sub.correct = false;
    sub.earned = 0;
    wire(`flag on ${sub.filer} — the grounds didn't hold`);
  }
  G.auditTotal++;
  hud();
  persist();
  renderCase();
  const cardEl = $("caseCard").querySelector(".case-card");
  if (cardEl) {
    cardEl.classList.add("impact");
    later(() => cardEl.classList.remove("impact"), 700);
    burstAt(cardEl, "ink", 12); // the stamp bites — ink finds the desk
  }
  later(() => { sub.correct ? sfx.human() : sfx.sus(); }, 200);
  // the evidence gets marked the way a desk marks it: a catch earns the
  // red grease circle; a hunch gets the field you named struck through
  const rowEl = sub.flagKey ? $("caseCard").querySelector(`[data-tel="${sub.flagKey}"]`) : null;
  if (sub.correct && rowEl) {
    later(() => {
      rowEl.classList.add("ringed");
      rowEl.insertAdjacentHTML("beforeend",
        `<svg class="ring" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
           <ellipse cx="50" cy="17" rx="48" ry="13.5" pathLength="100"/></svg>`);
      sfx.ring();
      try { navigator.vibrate?.(24); } catch { /* no haptics */ }
      // the desk notices: a warm edge-flash and the bounty floats up
      frameEl.classList.remove("catchflash");
      void frameEl.offsetWidth;
      frameEl.classList.add("catchflash");
      later(() => frameEl.classList.remove("catchflash"), 800);
      const cardEl = $("caseCard").querySelector(".case-card");
      if (cardEl) {
        burstAt(cardEl, "paper", 20); // the catch tears the page a little
        const pop = document.createElement("div");
        pop.className = "catch-pop";
        pop.textContent = "+100 · ANOMALY";
        cardEl.appendChild(pop);
        later(() => pop.remove(), 1400);
      }
    }, 380);
    later(nextCase, 1750);
  } else {
    if (rowEl) {
      later(() => { rowEl.classList.add("struck"); sfx.strike(); }, 320);
    }
  }
}

/* Cold open, second filing: the two receipts side by side, aligned row by
 * row — claim, latency, origin, relays, receipt. For the human filing the
 * claim and the receipt agree (the receipt echoes the claim); for the
 * machine they contradict. The strip aligns; it never says which is wrong.
 * This is the baseline the rest of the week is read against. */
function coldCompareHTML(sub) {
  const prev = G.auditSubs[0];
  if (!prev || prev === sub) return "";
  // the right column IS this filing's postmark — the card's own stub stands
  // down while the compare is up, so the desk reads one surface, not two
  const row = (label, a, b, k) =>
    `<div class="rcc-row"${k ? ` data-tel="${k}" data-tip="${TEL_LABEL[k]} — ${TEL_TIPS[k]}"` : ""}><span class="rcc-k">${label}</span><span class="rcc-a">${a}</span><span class="rcc-b tel-val${sub.flagKey === k && sub.correct ? " hit" : ""}">${b}</span></div>`;
  return `<div class="rc-compare" aria-label="Postmark comparison">
    <div class="rcc-head"><span class="rcc-k"></span><span class="rcc-a">${prev.filer} — stamped</span><span class="rcc-b">${sub.filer} — on your desk</span></div>
    ${row("CLAIM", prev.filed, sub.filed)}
    ${row(TEL_LABEL.latency, prev.tel.latency, sub.tel.latency, "latency")}
    ${row(TEL_LABEL.origin, prev.tel.origin, sub.tel.origin, "origin")}
    ${row(TEL_LABEL.hops, "×" + prev.tel.hops, "×" + sub.tel.hops, "hops")}
    ${row(TEL_LABEL.receipt, prev.tel.receipt, sub.tel.receipt, "receipt")}
    <p class="rcc-cap">the claim is typed on the card — the receipt is printed by the wire</p>
  </div>`;
}

/* the night's paperwork, made visible: face-down cards still in the pile,
 * and the filed stack of slips you've already stamped — pick-colored, the
 * catch gleaming gold. Pure desk metaphor; CASE n/m still says the count. */
let trayFiledShown = 0;
function paintTray() {
  const tray = $("caseTray");
  if (!tray) return;
  const subs = G.auditSubs || [];
  if (!subs.length) { tray.classList.add("hidden"); return; }
  tray.classList.remove("hidden");
  // cases already advanced past are filed; the current one is on the desk;
  // everything after it is still face-down in the pile
  const filed = subs.slice(0, G.auditIdx).filter((s) => s.pick !== null);
  const onDesk = G.auditIdx < subs.length ? 1 : 0;
  const pileN = Math.max(0, subs.length - G.auditIdx - onDesk);
  const rot = (i, n) => (((i * 37) % 9) - 4) * 0.6;
  $("trayPile").innerHTML = Array.from({ length: pileN },
    (_, i) => `<i class="tray-card" style="--r:${rot(i, pileN)}deg"></i>`).join("");
  $("trayFiled").innerHTML = filed.map((s, i) => {
    const isCatch = s.filer === G.culprit && s.pick === "SUS" && s.correct;
    const cls = `tray-slip ${s.pick === "SUS" ? "s" : "h"}${s.correct ? "" : " bad"}${isCatch ? " bounty" : ""}`;
    const deal = i >= trayFiledShown ? " deal" : "";
    const what = isCatch ? "ANOMALY QUARANTINED" : `${s.pick} — ${s.correct ? "right" : "wrong"}`;
    return `<i class="${cls}${deal}" style="--r:${rot(i, filed.length)}deg" title="${s.filer}: ${what}"></i>`;
  }).join("");
  trayFiledShown = filed.length;
}

function renderCase() {
  const sub = G.auditSubs[G.auditIdx];
  const el = $("caseCard");
  const checked = sub.pick !== null;
  const contested = G.auditIdx === G.contestedIdx;
  const verdicts = checked ? LOGIC.check(sub.card, sub.rule) : null;
  const arg = sub.filer === G.culprit ? (sub.arg || DAYS[G.day].valeLine) : sub.card.argument;
  const isBot = sub.filer === G.culprit;
  // cold open, second filing: align the receipts, teach the contrast once
  const compare = G.coldOpen && G.auditIdx === 1 ? coldCompareHTML(sub) : "";
  if (compare && !G.coldTaught) {
    G.coldTaught = true;
    ariaSay(ARIA.coldCompare);
  } else if (G.coldOpen && G.auditIdx === 0 && !G.coldTaught) {
    ariaSay(ARIA.coldFirst); // the default is HUMAN — SUS needs a reason
  }

  let reason = "";
  if (sub.pick && !sub.pendingFlag) {
    if (isBot) {
      if (sub.pick === "SUS" && sub.correct) {
        reason = `⚡ ANOMALY QUARANTINED — ${TEL_LABEL[sub.flagKey]} ${sub.tel[sub.flagKey]}. No human files that. +100 bounty`;
      } else if (sub.correct) {
        reason = `✔ Meets every criterion.`;
      } else if (sub.pick === "SUS") {
        // a hunch answers the accusation itself: the field you named read
        // within the norm — clean paper, bad stamp
        reason = sub.flagKey
          ? `${TEL_LABEL[sub.flagKey]} ${sub.tel[sub.flagKey]} reads within the norm — no grounds`
          : "no grounds — a clean-paper hunch";
      } else {
        // the loss names one field of evidence — enough to know the
        // postmark mattered, not enough to skip reading the next one
        reason = G.valeCaught > 0
          ? `✗ You'd flagged that postmark before — and you stamped it through.`
          : `✗ the paper passed — the postmark didn't: ${TEL_LABEL[sub.tel.tells[0]]} ${sub.tel[sub.tel.tells[0]]}`;
      }
    } else {
      reason = sub.correct
        ? `+${sub.earned} pts${contested ? " · contested ×2" : ""}`
        : (sub.truth ? "passes: meets every criterion"
                     : "fails: needed " + LOGIC.failKeys(sub.card, sub.rule)
                         .map((k) => sub.rule.find((x) => x.key === k).text).join(", "));
    }
  }

  setInstr(G.coldOpen ? "cold" : "night");

  el.innerHTML =
    `${compare}` +
    `<p class="case-num">CASE ${G.auditIdx + 1}/${G.auditSubs.length}${contested ? ' · <span class="contested-tag"><b>\u2696 CONTESTED BONUS</b></span>' : ""}</p>` +
    `<div class="case-card ${sub.pick ? "stamped-" + sub.pick.toLowerCase() : "fresh"}${checked && isBot && sub.pick === "SUS" && sub.correct ? " anomaly" : ""}${contested && !checked ? " contested" : ""}${sub.pendingFlag ? " flagging" : ""}${sub.cleanDrop ? " clean-drop" : ""}"
      style="--tilt:${sub.tilt}deg; --stamprot:${sub.stampRot}deg">
      <div class="e-head"><span class="glyph">${sub.card.glyph}</span>
        <span class="filer">FILER · <b>${sub.filer}</b> <i>filed ${sub.filed}</i></span></div>
      <div class="case-photo" aria-hidden="true">
        <img class="case-vignette" src="art/card-${sub.card.id}.webp" alt="" loading="lazy"
          onerror="this.classList.add('missing')" />
        <img class="case-id" src="art/${sub.filer.toLowerCase()}.webp" alt="" loading="lazy"
          onerror="this.classList.add('missing')" />
      </div>
      <div class="name">${sub.card.name}</div>
      ${sub.pick && !sub.pendingFlag ? `<p class="case-verdict ${sub.preStamped ? "prev" : sub.correct ? "ok" : "bad"}">${sub.preStamped ? "PREVIOUS SHIFT" : sub.correct ? "RIGHT" : "WRONG"}</p>
        <p class="case-reason">${sub.preStamped
          ? "the night clerk passed this one — read his strip against his stamp"
          : reason}</p>` : ""}
      <p class="arg">“${arg}”</p>
      <div class="case-note">✎ ${sub.note}</div>
      ${factRows(sub.card, verdicts)}
      ${compare ? "" : `<div class="case-stub">
        ${TEL_KEYS.map((k, ti) =>
          `<div class="tel-row" data-tel="${k}" data-tip="${TEL_LABEL[k]} ${sub.tel[k]} — ${TEL_TIPS[k]}" style="--i:${ti}"><span>${TEL_LABEL[k]}</span><span class="tel-val${sub.flagKey === k && sub.correct ? " hit" : ""}">${sub.tel[k]}</span></div>`).join("")}
      </div>`}
      ${sub.pendingFlag ? `<div class="flag-row">
        <span class="flag-q">the paper passed — what flagged it?</span>
        ${TEL_KEYS.map((k, i) => `<button class="flag-f" type="button" data-k="${k}" style="--i:${i}">${TEL_LABEL[k]}</button>`).join("")}
        <button class="flag-f none" type="button" data-k="" style="--i:${TEL_KEYS.length}">no grounds</button>
      </div>` : ""}
      ${sub.pick ? `<div class="case-stamp ${sub.pick.toLowerCase()}" style="transform:rotate(${sub.stampRot}deg)">${sub.pick}</div>` : ""}
      ${sub.pick && !sub.correct && !sub.pendingFlag ? `<p class="case-cont">tap or press any key to continue</p>` : ""}
    </div>`;
  el.querySelectorAll(".flag-f").forEach((b) => {
    b.addEventListener("click", (e) => { e.stopPropagation(); flagField(b.dataset.k); });
    // hovering an accusation points at the row it names — on whichever
    // postmark surface is live (stub or cold-open compare)
    const row = el.querySelector(`[data-tel="${b.dataset.k}"]`);
    if (!row) return;
    ["mouseenter", "focus"].forEach((ev) => b.addEventListener(ev, () => row.classList.add("peek")));
    ["mouseleave", "blur"].forEach((ev) => b.addEventListener(ev, () => row.classList.remove("peek")));
  });
  $("susBtn").disabled = $("humanBtn").disabled = checked;
  if (!checked) {
    if (!calmMotion()) {
      // most filings land with a rustle; some — the machine's always,
      // humans sometimes — land dead quiet. A quiet drop is texture now,
      // not a signature.
      later(() => (sub.cleanDrop ? thudDrop() : sfx.drop()), 80);
      if (contested) later(() => sfx.gavel(), 320);
    }
  }
  paintTray();
  // the chart leans in as the night wears on — and harder when you've
  // been right. Case five should not sound like case one.
  scoreSynth.setIntensity(Math.min(0.92,
    0.3 + G.auditIdx * 0.13 + G.auditHitsToday * 0.05 + G.flagHits * 0.04));
}

function stamp(pickVal) {
  if (G.auditLocked || G.phase !== "audit") return;
  const sub = G.auditSubs[G.auditIdx];
  if (!sub || sub.pick) return;
  G.auditLocked = true;
  sub.pick = pickVal;
  const isBot = sub.filer === G.culprit;
  const contested = G.auditIdx === G.contestedIdx;

  if (pickVal === "SUS" && sub.truth) {
    // the paper passed — a SUS stamp needs grounds. The flag row asks
    // which packet field read wrong; flagField() resolves the stamp.
    sub.pendingFlag = true;
    G.flagAttempts++;
    sfx.slide();
    sfx.lensHum(); // the desk leans in — on every clean-paper SUS, not just hers
    renderCase();
    stampSwing($("caseCard").querySelector(".case-stamp"));
    later(() => sfx.stamp(), 200);
    persist();
    return;
  }

  if (isBot) {
    // only HUMAN stamps reach here — SUS on clean paper asks for grounds.
    // The postmark is part of the judgment: a wave-through is a wrong
    // stamp, and the verdict names the evidence that sat on the card.
    sub.correct = false;
    sub.earned = 0;
    G.valeEscapes++;
    wire(`machine walked through — ${sub.filer} stamped HUMAN`);
    if (G.valeCaught > 0) {
      ariaSay([
        "You'd seen that postmark before — and you stamped it through.",
        "Nothing human receipts before it posts. You let the machine through."
      ], "alarm");
    }
  } else {
    sub.correct = (pickVal === "HUMAN") === sub.truth;
    if (sub.correct) {
      G.auditHitsToday++;
      G.auditHits++;
      sub.earned = contested ? 100 : 50;
      G.nightPoints += sub.earned;
      G.score += sub.earned;
    } else {
      sub.earned = 0;
    }
  }
  wire(`${pickVal} on ${sub.filer} — ${sub.correct ? `upheld · +${sub.earned}` : "wrong"}`);
  G.auditTotal++;
  hud();
  persist();
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
  // the phone in your pocket should feel the bite too
  later(() => { try { navigator.vibrate?.(12); } catch { /* no haptics */ } }, hit);
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
    // the last case slides out as the ledger slides in — no empty-desk beat
    later(advanceCase, G.auditIdx === G.auditSubs.length - 1 ? 120 : 220);
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
  persist();
}

/* the desk takes the hit so the fact rows don't have to. */
function deskShake() {
  frameEl.classList.remove("shake");
  void frameEl.offsetWidth;
  frameEl.classList.add("shake");
  later(() => frameEl.classList.remove("shake"), 500);
}

/* the room is never fully still: the desk lamp stutters, rarely, only
 * while the night desk is lit. Cheap insurance against a frozen screen —
 * the same lampflick the amendment uses, on an ambient clock. */
setInterval(() => {
  if (G.phase !== "audit" || calmMotion() || Math.random() > 0.3) return;
  frameEl.classList.remove("lamp-flicker");
  void frameEl.offsetWidth;
  frameEl.classList.add("lamp-flicker");
  later(() => frameEl.classList.remove("lamp-flicker"), 800);
}, 17000);

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
  // it can't be acknowledged before the new chips have stamped in — a
  // stray stamp key while it lands can't blow the moment past the player
  G.amendAckAt = performance.now() + (calmMotion() ? 300 : 1500);
  b.onclick = () => { if (performance.now() >= G.amendAckAt) finishAmend(); };
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
  // the amendment is acknowledged, not glimpsed — it holds until the
  // player taps it or presses a key; the timer is only a failsafe
  G.amendTimer = later(finishAmend, t + 9000);
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
  persist();
}

function auditSummary() {
  if (G.coldOpen) return endColdOpen();
  if (G.nightSummarized) return paintAuditSummary();
  // apply: the night's pay posts once — a resumed summary only repaints
  G.nightSummarized = true;
  const hits = G.auditHitsToday;
  G.nightResults[G.day] = hits;
  const flawless = hits === 5;
  G.nightBonus = flawless ? 50 : 0;
  G.strikeCleared = flawless && G.status === "player" && G.strikes > 0;
  if (G.strikeCleared) G.strikes--;
  G.score += G.nightBonus;
  hud();
  paintAuditSummary();
  persist();
}

function paintAuditSummary() {
  const hits = G.auditHitsToday;
  const pts = G.nightPoints + G.nightBonus;
  const effect = `night +${pts} pts` +
    (hits === 5 ? (G.strikeCleared ? " · flawless — one strike cleared" : " · flawless +50") : "");
  sfx.audit();

  $("caseBtns").classList.add("hidden");
  $("caseCard").innerHTML = "";
  const s = $("auditSummary");
  s.classList.remove("hidden");
  const botSub = G.auditSubs.find((x) => x.filer === G.culprit);
  const QUIET = [
    "five stamps, five sounds — one landed before it was swung",
    "one filing cleared faster than the ink could dry",
    "the log shows five filings; one of them didn't wait",
    "the night passed without incident — the counter disagrees",
    "a filing was already done before the lamp came up",
  ];
  const valeLine = !botSub ? ""
    : (botSub.pick === "SUS" && botSub.correct)
      ? `<p class="sum-vale ok">⚡ anomaly quarantined — the machine was on tonight's docket</p>`
      : (botSub.pick === "SUS" && !botSub.correct)
        ? ""   // a hunch earns no postscript
        : G.valeCaught > 0
          ? `<p class="sum-vale warn">⚠ you'd flagged that postmark — and stamped it through</p>`
          : `<p class="sum-vale quiet">· ${QUIET[G.day % QUIET.length]}</p>`;
  const flags = G.auditSubs.filter((x) => x.flagTried).length;
  const flagLine = flags
    ? `<p class="sum-wire">flags raised ${flags} · ${flags && G.auditSubs.some((x) => x.flagTried && x.correct) ? "bounty held" : "nothing held"}</p>` : "";
  s.classList.toggle("flawless", hits === 5);
  paintTray();
  if (hits === 5) later(() => thunderRoll(0.16), 700); // the storm answers a clear night
  s.innerHTML = `<p class="sum-line">${hits}/5 CASES EVALUATED</p>
    <p class="sum-effect">${effect}</p>${flagLine}${valeLine}` +
    (hits === 5 ? `<span class="night-seal" aria-hidden="true">NIGHT CLEAR</span>` : "");
  const actions = $("auditActions");
  actions.innerHTML = "";
  const btn = document.createElement("button");
  btn.textContent = G.day >= DAYS.length - 1 ? "Last call →" : "Next day →";
  btn.addEventListener("click", nextDay);
  actions.appendChild(btn);
  btn.focus();
}

// ---------- FINALE ----------

function startFinale(resume) {
  showOnly("finale");
  setInstr("finale");
  banner("LAST CALL — write the rule");
  if (!resume) {
    G.finaleChoice = null;
    // the finale is built around whoever the machine turned out to be this
    // docket: five filings, seeded faces, and clauses generated so exactly
    // one cuts the machine and only the machine
    const built = LOGIC.buildFinale(stream("finale"), CARDS, G.culprit);
    G.finaleRows = built.rows;
    G.finaleOpts = built.opts;
    // every filer carries its packet stub onto the ledger
    const trng = stream("finale-tel");
    G.finaleRows.forEach((row) => {
      row.tel = row.filer === G.culprit ? botTel(4, trng, row.ts) : humanTel(trng, row.ts);
    });
    G.signing = false;
  }
  $("decree").classList.toggle("signed", !!G.signing);
  buildFinale();
  paintFinale();
  if (!resume) {
    // the last line she says depends on whether you ever flagged the postmark
    if (G.valeCaught > 0) {
      ariaSay(["You flagged the machine once on the postmark. Now write the clause only it can't file."], "smug");
    } else {
      ariaSay(["My rules only check facts. Read the ledger the way it was filed — not the way it was argued."]);
    }
  }
  persist();
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
      `<td class="c-pkt">${row.tel.latency} · ${row.tel.origin} · relays ×${row.tel.hops} · ${row.tel.receipt}</td>` +
      `<td class="c-cut"></td>`;
    tb.appendChild(tr);
  }
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
  persist();
}

function signRule() {
  if (!G.finaleChoice || G.signing) return;
  // the pen goes down, the signature draws, the seal lands — then dawn
  G.signing = true;
  $("decree").classList.add("signed");
  paintFinale();
  wire(`decree signed — ${G.finaleChoice.text}`);
  sfx.pen();
  later(() => sfx.stamp(), 560);
  const cut = G.finaleRows.filter((r) => !LOGIC.passes(r, G.finaleChoice.rule));
  const cutNames = cut.map((r) => r.filer);
  const botCut = cutNames.includes(G.culprit);
  const humanCut = cutNames.filter((n) => n !== G.culprit);
  let title, line;
  if (botCut && humanCut.length === 0) {
    title = G.status === "player" ? "LAST HUMAN STANDING" : "DAWN";
    line = G.valeCaught > 0
      ? `You wrote the one rule ${G.culprit} couldn't. You'd been reading postmarks all week — the docket is human again.`
      : `You wrote the one rule ${G.culprit} couldn't. The packet said what the paper never could — the docket is human again.`;
  } else if (botCut) {
    title = "COLLATERAL";
    line = `${G.culprit} is gone. So are ${humanCut.join(", ")}. The rule didn't care who.`;
  } else {
    title = "THE DAY SHIFT IS AUTOMATED";
    line = `You cut ${joinNames(humanCut)} — every human on the docket.` +
      ` ${G.culprit} filed at +0.003s, as always. Tomorrow it argues your case.`;
  }
  G.finaleTitle = title;
  G.finaleLine = line;
  later(endGame, calmMotion() ? 0 : 1000);
}

// ---------- flow ----------
function nextDay() {
  G.day++;
  if (G.day >= DAYS.length) return G.mode === "week" ? startFinale() : endGame();
  hud();
  if (G.mode === "machine" || G.status === "player") {
    startDay();
  } else {
    G.dayResults[G.day] = "juror";
    startAudit();
  }
}

function shareText(title) {
  // the machine's shift reads two axes: ☀️ did the proof hold the spec,
  // 🌙 did the stub survive the wire — three nights, two blank squares
  const cell = (ok) => ok === true ? "🟩" : ok === false ? "🟥" : "⬛";
  const dayRow = G.mode === "machine"
    ? [0, 1, 2, 3, 4].map((i) => cell(G.forgeProof[i])).join("")
    : DAYS.map((_, i) =>
        G.dayResults[i] === "survived" ? "🟩" : G.dayResults[i] === "struck" ? "🟥" : "⬛").join("");
  const nightRow = G.mode === "machine"
    ? [0, 1, 2, 3, 4].map((i) => cell(G.forgeLog[i] === "slip" ? true : G.forgeLog[i] === "flag" ? false : undefined)).join("")
    : DAYS.map((_, i) => {
        const h = G.nightResults[i];
        return h === 5 ? "🟩" : h >= 3 ? "🟨" : h === undefined ? "⬛" : "🟥";
      }).join("");
  const label = params.get("seed") ? SEED : `#${Math.floor((new Date(dailySeed + "T00:00") - new Date("2026-11-01T00:00")) / 864e5) + 1}`;
  const costume = G.mode !== "machine" && G.culprit ? `today's machine wore ${G.culprit}'s face\n` : "";
  // the record is already filed by the time the share block renders —
  // endGame calls fileRecord() before shareText()
  const rec = loadRecord();
  const rank = rec ? clerkRank(rec) : null;
  const career = rec && (rec.weeks + rec.shifts) > 0
    ? `\ncareer ${rank || "FILE CLERK"} — ${rec.catches} caught · ${rec.predHits}/${rec.predTotal || "—"} calls held`
    : "";
  return `NIGHT SHIFT ${label}${G.mode === "ot" ? " · OVERTIME" : G.mode === "machine" ? " · THE MACHINE" : ""} — ${title}\n${costume}☀️ ${dayRow}\n🌙 ${nightRow}\nscore ${G.score}${career}\n${G.mode === "machine"
    ? (G.forgeFlags === 0 ? "I fooled the wire. All three nights." : "I almost fooled the wire. You?")
    : "I out-read the machine. You?"}`;
}

function endGame() {
  clearSave(); // the week is closed — nothing left to resume
  document.body.dataset.phase = "dawn";
  setValeDissonance(false);
  dayPhase.classList.add("hidden");
  verdictPhase.classList.add("hidden");
  auditPhase.classList.add("hidden");
  finalePhase.classList.add("hidden");
  setShift("night");
  sfx.dawn();

  const title = G.finaleTitle || (G.mode === "ot"
    ? (G.status === "player" ? "OVERTIME CLEARED" : "DAWN")
    : G.mode === "machine"
      ? (G.forgeFlags === 0 ? "UNVERIFIED" : G.forgeFlags <= 2 ? "REVIEWED" : "CAUGHT")
    : G.status === "player" ? "LAST HUMAN STANDING" : "DAWN");
  // the room answers the week's ending: gold dawn, or the blue automated office
  const cutEnd = title === "THE DAY SHIFT IS AUTOMATED" || title === "COLLATERAL"
    || (G.mode === "machine" && G.forgeFlags > 0);
  wire(`shift closed — ${title}`);
  // the inversion is part of the week's endgame once it's been earned
  try {
    $("machineEndBtn").classList.toggle("hidden",
      localStorage.getItem("night-shift-machine-unlocked") !== "1");
  } catch { /* no storage */ }
  document.body.dataset.end = cutEnd ? "cut" : "earned";
  score.play(cutEnd ? "title" : "dawn");
  const acc = G.auditTotal ? Math.round((G.auditHits / G.auditTotal) * 100) : 0;
  const titleIdx = Math.min(JURY_TITLES.length - 1, Math.floor((acc / 100) * JURY_TITLES.length));

  $("endTitle").textContent = title;
  $("endStats").textContent =
    `${G.daysSurvived}/${DAYS.length} days survived · ${G.strikes} strikes · score ${G.score} · audits ${acc}%`;
  const lines = [];
  if (G.finaleTitle) lines.push(`${G.culprit} filed every proof 0.003 seconds after the riddle posted.`);
  if (G.valeCaught) lines.push(
    `You flagged the machine on ${G.valeCaught} night${G.valeCaught > 1 ? "s" : ""} — the postmark never lies.`);
  if (G.valeEscapes) lines.push(
    `It walked through your stamp ${G.valeEscapes} time${G.valeEscapes > 1 ? "s" : ""} before tonight.`);
  if (G.finaleLine) lines.push(G.finaleLine);
  if (G.mode !== "machine" && G.culprit) lines.push(`Today's machine wore ${G.culprit}'s face — it wears a new one every docket.`);
  else if (G.mode === "machine") lines.push(G.forgeFlags === 0
    ? "Three nights of forged postmarks. The wire filed you as human — the best kind of nobody."
    : `${G.forgeFlags} of 3 nights flagged — the wire kept a copy of every stub.`);
  else lines.push(title === "LAST HUMAN STANDING" || title === "OVERTIME CLEARED"
    ? (G.mode === "ot" ? "Five generated shifts. You read every one of them." : "Five rules. You read every one of them.")
    : `Cut on day ${G.elimDay || "?"} — the night shift made you: ${JURY_TITLES[titleIdx]}.`);
  if (G.status === "juror" && G.finaleTitle) lines.push(`Night-shift title: ${JURY_TITLES[titleIdx]}.`);
  // the permanent record files itself — the ledger outlives the shift
  const rec = fileRecord();
  lines.push(careerLine(rec).replace(/<\/?b>/g, ""));
  $("endTitle2").innerHTML = lines.map((l) => `<span class="endline">${l}</span>`).join("");
  $("shareBlock").textContent = shareText(title);
  if (G.mode === "week") {
    try { localStorage.setItem("night-shift-ot-unlocked", "1"); } catch { /* no storage */ }
  }
  // clearing overtime hands you the other side of the desk
  if (G.mode === "ot" && G.status === "player") {
    try { localStorage.setItem("night-shift-machine-unlocked", "1"); } catch { /* no storage */ }
  }
  $("againBtn").textContent = G.mode === "ot" ? "Back to the day shift"
    : G.mode === "machine" ? "Clock back in as human" : "Work another week";
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
$("shiftBrief").addEventListener("click", endBrief);
document.querySelectorAll("#attrShiftRail .rail-btn").forEach((b) =>
  b.addEventListener("click", () => { setFocusAttr(b.dataset.attr); sfx.click(); }));
$("signBtn").addEventListener("click", signRule);
/* the case file: the whole shift as a dossier — the archive persists */
function caseFileText(title) {
  const L = [];
  L.push("NIGHT SHIFT — CASE FILE");
  L.push(`seed ${SEED} · ${G.mode === "ot" ? "overtime" : G.mode === "machine" ? "the machine's shift" : "week"} · ${title}`);
  L.push("");
  DAYS.forEach((d, i) => {
    L.push(`${d.dayLabel} — ${d.theme}`);
    L.push(`  day:   ${G.dayResults[i] || "—"}`);
    if (G.mode === "machine") {
      L.push(`  proof: ${G.forgeProof[i] === true ? "held" : G.forgeProof[i] === false ? "failed" : "—"}`);
      L.push(`  wire:  ${G.forgeLog[i] || "—"}`);
    } else {
      const h = G.nightResults[i];
      if (h !== undefined) L.push(`  night: ${h}/5 stamps correct`);
    }
  });
  L.push("");
  L.push(`score ${G.score} · audits ${G.auditTotal ? Math.round((G.auditHits / G.auditTotal) * 100) : 0}%`);
  if (G.culprit) L.push(`the machine wore ${G.culprit}'s face`);
  L.push("");
  L.push("— the wire remembers —");
  (G.wire || []).forEach((w) => L.push("  " + w));
  return L.join("\n");
}
$("caseFileBtn").addEventListener("click", () => {
  const title = $("endTitle").textContent || "SHIFT";
  const blob = new Blob([caseFileText(title)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `night-shift-${SEED}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$("copyBtn").addEventListener("click", copyShare);
$("predictRow").addEventListener("click", (e) => {
  const b = e.target.closest(".pr-btn");
  if (!b || G.phase !== "day" || G.mode === "machine") return;
  G.prediction = G.prediction === b.dataset.attr ? null : b.dataset.attr;
  sfx.click();
  $("predictRow").querySelectorAll(".pr-btn").forEach((x) =>
    x.classList.toggle("picked", G.prediction === x.dataset.attr));
});

document.addEventListener("keydown", (e) => {
  if (!dossierEl.classList.contains("hidden")) return;
  if (gameEl.classList.contains("hidden")) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "m" || e.key === "M") {
    audioMuted = !audioMuted;
    if (ambientGain) {
      const ac = audio();
      ambientGain.gain.cancelScheduledValues(ac.currentTime);
      ambientGain.gain.setValueAtTime(audioMuted ? 0 : 0.22, ac.currentTime);
    }
    score.setMuted();
    applyRain();
    savePrefs();
    return;
  }

  // a live brief swallows every key — it dismisses, nothing else fires
  if (briefOpen) { endBrief(); return; }

  // SHIFT is the day verb: it walks the loupe across the fact columns.
  // Key-repeat does nothing — a held Shift doesn't spin the loupe.
  if (e.key === "Shift") {
    if (e.repeat) return;
    if (G.phase === "day") { cycleFocus(); return; }
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
      // grounds pending → resolve as a hunch; amending → skip the banner;
      // otherwise advance
      if (!MODIFIER_KEYS.has(e.key)) {
        const s2 = G.auditSubs[G.auditIdx];
        if (s2 && s2.pendingFlag) flagField(null);
        else if (G.amending && performance.now() >= (G.amendAckAt || 0)) finishAmend();
        else if (!G.amending) nextCase();
      }
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
  } else if (G.phase === "forge") {
    // 1–4 patch a stub field, Enter transmits — same number-row verb as the day
    if (e.key >= "1" && e.key <= "4") forgeField(+e.key - 1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!G.forgeSent && !G.forgeBusy) wireVerdict();
      else { const b = $("forgeActions").querySelector("button:not(:disabled)"); if (b) b.click(); }
    }
  } else if (G.phase === "finale") {
    const opts = G.finaleOpts || [];
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

const MODIFIER_KEYS = new Set(["Control", "Alt", "Meta", "Tab", "CapsLock", "Escape"]);
// tap a resolved case (or the stamp buttons) to move on
$("caseCard").addEventListener("click", () => {
  if (!G.auditLocked) return;
  const sub = G.auditSubs[G.auditIdx];
  if (sub && sub.pendingFlag) flagField(null);
  else if (G.amending) finishAmend();
  else nextCase();
});
$("caseBtns").addEventListener("click", (e) => {
  // a click on an enabled stamp button is the stamp itself, not a dismiss;
  // once locked the buttons are disabled, so further clicks land here
  if (G.auditLocked && !(e.target instanceof HTMLButtonElement)) {
    if (G.amending) finishAmend(); else nextCase();
  }
});
$("banner").addEventListener("click", () => $("banner").classList.add("hidden"));

/* ---------- the clerk's handbook ----------
 * The desk's own reference card — manila, pinned, never modal. One key
 * (? or H outside the night audit) summons it anywhere; Esc, the close
 * button, or the key again dismisses it. */
function toggleHandbook(force) {
  const hb = $("handbook");
  const show = force === undefined ? hb.classList.contains("hidden") : force;
  hb.classList.toggle("hidden", !show);
  if (show) sfx.click();
}
$("hbClose").addEventListener("click", () => toggleHandbook(false));
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("handbook").classList.contains("hidden")) {
    toggleHandbook(false);
    e.preventDefault();
    return;
  }
  if (e.key === "?") {
    toggleHandbook();
    e.preventDefault();
  }
});

/* ---------- attract mode: the desk works without you ----------
 * Arcade lesson: the title never sits still. Idle ~20s and the reel runs
 * a full shift in fast-forward — two acts per ~40s cycle:
 *
 *   THE DAY   a real dealt docket (LOGIC.deal headlessly), ARIA's sealed
 *             rule, a filing, the unsealing verdict with the same stagger
 *             the real ceremony uses. Even cycles file a passer, odd
 *             cycles file a failure — judges see both stamps.
 *   THE NIGHT  stamp/postmark vignettes, including a VALE catch.
 *
 * Pure vignette: real cards, real rule math, real verdict rows — but it
 * never touches G, the save, the score, or audio. Any input aborts. */
const ATTRACT = [
  { ci: 0,  filer: "MARA OKONKWO", pick: "HUMAN",
    tel: { latency: "212ms", origin: "EXT GATE 3", hops: "3", receipt: "queued 02:14" } },
  { ci: 2,  filer: "VALE", pick: "SUS",
    tel: { latency: "3ms", origin: "GATE 0", hops: "0", receipt: "+0.003s after post" } },
  { ci: 4,  filer: "J. HALE", pick: "HUMAN",
    tel: { latency: "187ms", origin: "WEST RELAY 2", hops: "4", receipt: "stamped 01:52" } },
  { ci: 6,  filer: "VALE", pick: "SUS",
    tel: { latency: "0.0ms", origin: "GATE 0", hops: "0", receipt: "rcvd before post" } },
];
let attractOn = false, attractIdx = 0, attractDayIdx = 0, attractTimers = [];
function atDelay(fn, ms) {
  const id = setTimeout(() => {
    attractTimers = attractTimers.filter((t) => t !== id);
    if (attractOn) fn();
  }, ms);
  attractTimers.push(id);
}
function attractNightStep() {
  const v = ATTRACT[attractIdx++ % ATTRACT.length];
  const c = CARDS[Math.min(v.ci, CARDS.length - 1)];
  $("attractDesk").innerHTML = `<div class="at-card">
    <div class="at-head"><span class="at-glyph">${c.glyph}</span>
      <span class="at-name">${c.name}</span>
      <span class="at-filer">FILER · ${v.filer}</span></div>
    <div class="at-tel">
      <span>LATENCY</span><b>${v.tel.latency}</b>
      <span>ORIGIN</span><b>${v.tel.origin}</b>
      <span>RELAYS</span><b>×${v.tel.hops}</b>
      <span>RECEIPT</span><b>${v.tel.receipt}</b>
    </div>
    <div class="at-stamp ${v.pick === "SUS" ? "sus" : "human"}">${v.pick}</div>
    <div class="at-wire">N1·${v.pick === "SUS" ? "anomaly quarantined · +100" : "stamp upheld · +50"}</div>
  </div>`;
}
function attractNightAct() {
  attractIdx = 0;
  attractNightStep();
  for (let i = 1; i <= ATTRACT.length; i++) atDelay(attractNightStep, i * 4300);
  atDelay(() => attractDayAct(), (ATTRACT.length + 1) * 4300 + 600);
}
/* THE DAY act — the deduction itself, performed with real dealt content */
function attractDayAct() {
  const n = attractDayIdx++ % DAYS.length;
  const d = DAYS[n];
  const { docket, hand } = LOGIC.deal(CARDS, d, n, LOGIC.makeRng(`attract|${n}`));
  // even cycles file a passer, odd cycles a failure — both stamps seen
  const wantPass = n % 2 === 0;
  const filed = hand.find((c) => LOGIC.passes(c, d.rule) === wantPass)
    || (wantPass ? hand.find((c) => LOGIC.passes(c, d.rule)) : hand.find((c) => !LOGIC.passes(c, d.rule)))
    || hand[0];
  const verdicts = LOGIC.check(filed, d.rule);
  const passed = LOGIC.passes(filed, d.rule);
  const el = $("attractDesk");
  el.innerHTML = `<div class="at-stage">
    <div class="at-dayhead"><b>DAY ${n + 1}</b><span>${d.emoji} ${d.theme}</span></div>
    <div class="at-docket"></div>
    <div class="at-rulebar"><span class="rc-label">ARIA's rule: <b>SEALED</b></span></div>
    <div class="at-hand"></div>
    <div class="at-verdict"></div>
  </div>`;
  // beat 1 — the docket deals in, rulings stamped
  const dk = el.querySelector(".at-docket");
  docket.slice(0, 6).forEach((r, i) => {
    atDelay(() => {
      const row = document.createElement("div");
      row.className = "at-drow";
      row.innerHTML = `<span class="at-glyph">${r.card.glyph}</span>
        <span class="at-dname">${r.card.name}</span>
        <span class="at-ruling ${r.verdict === "HUMAN" ? "human" : "sus"}">${r.verdict}</span>`;
      dk.appendChild(row);
    }, 350 + i * 380);
  });
  // beat 2 — the seal holds, then the hand arrives
  atDelay(() => {
    el.querySelector(".at-rulebar b").textContent = d.rule.map((c) => c.text).join(" · ");
    el.querySelector(".at-rulebar b").classList.add("unsealed");
  }, 350 + Math.min(docket.length, 6) * 380 + 500);
  const hd = el.querySelector(".at-hand");
  hand.forEach((c, i) => {
    atDelay(() => {
      const hc = document.createElement("div");
      hc.className = "at-hcard" + (c === filed ? " picked" : "");
      hc.innerHTML = `<span class="at-glyph">${c.glyph}</span><span class="at-hname">${c.name}</span>`;
      hd.appendChild(hc);
    }, 350 + Math.min(docket.length, 6) * 380 + 1400 + i * 260);
  });
  // beat 3 — the filing resolves: fact rows stagger, stamp falls
  const vt = 350 + Math.min(docket.length, 6) * 380 + 1400 + hand.length * 260 + 700;
  atDelay(() => {
    const v = el.querySelector(".at-verdict");
    v.innerHTML = `<div class="at-ruleline">ARIA's rule: ${d.rule.map((c) => c.text).join(" · ")}</div>
      <div class="at-facts">${factRows(filed, verdicts, true)}</div>
      <div class="at-stamp ${passed ? "human" : "sus"} big">${passed ? "SURVIVED" : "STRIKE"}</div>`;
    const rows = [...v.querySelectorAll(".fact")];
    rows.forEach((r, i) => atDelay(() => r.classList.remove("pre"), 500 + i * 420));
  }, vt);
  atDelay(() => attractNightAct(), vt + 500 + 5 * 420 + 1400);
}
function startAttract() {
  if (attractOn || calmMotion()) return;
  attractOn = true;
  attractTimers = [];
  $("attractDesk").classList.remove("hidden");
  attractDayAct();
}
function stopAttract() {
  attractOn = false;
  attractTimers.forEach(clearTimeout);
  attractTimers = [];
  $("attractDesk").classList.add("hidden");
}
setTimeout(() => {
  if (!titleEl.classList.contains("hidden") && !clockingIn) startAttract();
}, 20000);
["pointerdown", "keydown"].forEach((ev) =>
  addEventListener(ev, () => { if (attractOn) stopAttract(); }, { passive: true }));

// ---------- save / resume ----------
/* A run in progress is snapshotted to localStorage at every stable beat —
 * phase entries, resolved stamps, verdicts, nights, choices. Resuming
 * repaints the exact desk: phase, day, docket, and the night's stamped
 * cases. Pay and strikes post exactly once; the apply/paint splits above
 * guarantee a resumed desk never counts anything twice. */
const SAVE_KEY = "night-shift-save-v1";
const PREF_KEY = "night-shift-prefs-v1";

function persist() {
  try {
    const s = {
      seed: SEED, phase: G.phase, mode: G.mode, culprit: G.culprit,
      day: G.day, status: G.status, strikes: G.strikes, score: G.score,
      daysSurvived: G.daysSurvived, auditHits: G.auditHits, auditTotal: G.auditTotal,
      flagAttempts: G.flagAttempts, flagHits: G.flagHits,
      valeCaught: G.valeCaught, valeEscapes: G.valeEscapes,
      oath: G.oath, clueUsed: G.clueUsed, dayPay: G.dayPay,
      lastMissKeys: G.lastMissKeys, elimDay: G.elimDay,
      dayResults: G.dayResults, nightResults: G.nightResults,
      focusAttr: G.focusAttr,
      coldOpen: G.coldOpen, coldTaught: G.coldTaught,
      amendAfter: G.amendAfter, amendShown: G.amendShown, amending: G.amending,
      auditIdx: G.auditIdx, contestedIdx: G.contestedIdx,
      auditHitsToday: G.auditHitsToday, nightPoints: G.nightPoints,
      nightSummarized: G.nightSummarized, nightBonus: G.nightBonus,
      strikeCleared: G.strikeCleared, lieCaught: G.lieCaught,
      verdictDone: G.verdictDone, verdictPassed: G.verdictPassed,
      cover: G.cover, forgeFlags: G.forgeFlags, forgeLog: G.forgeLog, forgeProof: G.forgeProof,
      forgeTiers: G.forgeTiers, forgeSent: G.forgeSent, wire: G.wire,
      tellHistory: G.tellHistory, forgeHistory: G.forgeHistory,
      prediction: G.prediction, predictionHit: G.predictionHit,
      predictions: G.predictions, predHits: G.predHits, nightMemo: G.nightMemo,
      explained: [...G.explained],
      docket: G.docket.map((r) => ({ id: r.card.id, verdict: r.verdict, lie: !!r.lie })),
      hand: G.hand.map((c) => c.id),
      selected: G.selected ? G.selected.id : null,
      filed: G.filed ? G.filed.id : null,
      flaggedIdx: G.flagged ? G.docket.indexOf(G.flagged) : -1,
      subs: G.auditSubs.map((sub) => ({ ...sub, card: sub.card.id })),
      finaleRows: G.finaleRows, finaleOpts: G.finaleOpts,
      finaleChoiceText: G.finaleChoice ? G.finaleChoice.text : null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch { /* storage unavailable (private mode) — the shift just isn't resumable */ }
}

function cardById(id) {
  if (!id) return null;
  if (id === COLD_BOT_CARD.id) return COLD_BOT_CARD;
  return CARDS.find((c) => c.id === id) || null;
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.seed === undefined || !["day", "verdict", "audit", "finale", "forge"].includes(s.phase)) return null;
    return s;
  } catch { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to clear */ } }
function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ muted: audioMuted })); } catch { /* ears only */ }
}
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
    if (p && p.muted) audioMuted = true;
  } catch { /* fresh ears */ }
  // the score module doesn't own policy — report the restored mute state
  // before its bus exists, so the first play() opens it silent
  scoreSynth.mutedState = audioMuted;
  scoreSynth.setMuted();
}

/* ---------- the clerk's permanent record ----------
 * The save dies with the run; the record doesn't. Every closed shift files
 * one line in the ledger — weeks worked, filings judged, anomalies caught,
 * flawless nights, the calls that held. Ranks are earned, not chosen:
 * FILE CLERK → NIGHT AUDITOR → VALE'S MATCH. */
const RECORD_KEY = "night-shift-record-v1";

function blankRecord() {
  return {
    weeks: 0, shifts: 0, filings: 0, catches: 0, flawless: 0,
    score: 0, predHits: 0, predTotal: 0,
    streak: 0, bestStreak: 0,
  };
}
function loadRecord() {
  try {
    const r = JSON.parse(localStorage.getItem(RECORD_KEY) || "null");
    return r && typeof r === "object" ? { ...blankRecord(), ...r } : null;
  } catch { return null; }
}
function clerkRank(r) {
  if (!r) return null;
  if (r.catches >= 8) return "VALE'S MATCH";
  if (r.filings >= 25 && r.catches >= 3) return "NIGHT AUDITOR";
  if (r.weeks + r.shifts >= 1) return "FILE CLERK";
  return null;
}
/* called once when the shift closes — endGame runs a single time per run
   (againBtn reloads), so there's no double-count path */
function fileRecord() {
  const r = loadRecord() || blankRecord();
  if (G.mode === "week") r.weeks++; else r.shifts++;
  r.filings += G.auditTotal || 0;
  r.catches += G.valeCaught || 0;
  r.flawless += (G.nightResults || []).filter((h) => h === 5).length;
  r.score += G.score || 0;
  r.predHits += G.predHits || 0;
  r.predTotal += G.predictions || 0;
  // flawless-night streak: the run's tail extends the career streak,
  // anything else closes it
  const nights = G.nightResults || [];
  let tail = 0;
  for (let i = nights.length - 1; i >= 0 && nights[i] === 5; i--) tail++;
  r.streak = tail ? r.streak + tail : 0;
  r.bestStreak = Math.max(r.bestStreak, r.streak);
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(r)); } catch { /* ledger's full */ }
  return r;
}
function careerLine(r) {
  if (!r) return "";
  const rank = clerkRank(r);
  const bits = [
    `${r.weeks + r.shifts} shift${r.weeks + r.shifts === 1 ? "" : "s"}`,
    `${r.filings} filings judged`,
    `${r.catches} anomal${r.catches === 1 ? "y" : "ies"} caught`,
  ];
  if (r.flawless) bits.push(`${r.flawless} flawless`);
  if (r.predTotal) bits.push(`called the rule ${r.predHits}/${r.predTotal}`);
  return `CAREER — ${bits.join(" · ")}${rank ? ` · rank <b>${rank}</b>` : ""}`;
}

function resumeLabel(s) {
  const score = `SCORE ${s.score}`;
  const ot = s.mode === "ot", mach = s.mode === "machine";
  const dayLbl = ot
    ? `OVERTIME ${Math.min(s.day + 1, 5)}/5`
    : mach
      ? `NIGHT ${Math.min(s.day + 1, 3)}/3`
      : `DAY ${Math.min(s.day + 1, DAYS.length)}/${DAYS.length}`;
  if (s.phase === "day") return `${dayLbl} · ${score}`;
  if (s.phase === "verdict") return `${dayLbl} · VERDICT · ${score}`;
  if (s.phase === "finale") return `LAST CALL · ${score}`;
  return s.coldOpen
    ? "NIGHT 0 · THE TRAY"
    : `${s.status === "juror" ? "JURY DUTY · " : ""}NIGHT ${Math.min(s.day + 1, DAYS.length)} · ${score}`;
}

function resumeGame(s) {
  clearLater();
  SEED = s.seed;
  G.mode = s.mode || "week";
  // overtime and the machine's shift regenerate their nights from the
  // saved seed; the week is static
  DAYS = G.mode === "ot"
    ? LOGIC.genDays(LOGIC.makeRng(`${s.seed}|otdays`), CARDS)
    : G.mode === "machine"
      ? LOGIC.genDays(LOGIC.makeRng(`${s.seed}|machinedays`), CARDS, 3)
      : DATA.DAYS;
  if (G.mode === "machine") DAYS.forEach((d, i) => { d.dayLabel = `NIGHT ${i + 1}`; });
  setCulpritFromSeed(s.seed);
  Object.assign(G, {
    day: s.day, status: s.status, strikes: s.strikes, score: s.score,
    daysSurvived: s.daysSurvived, auditHits: s.auditHits, auditTotal: s.auditTotal,
    flagAttempts: s.flagAttempts, flagHits: s.flagHits,
    valeCaught: s.valeCaught, valeEscapes: s.valeEscapes,
    oath: s.oath, clueUsed: s.clueUsed, dayPay: s.dayPay,
    lastMissKeys: s.lastMissKeys, elimDay: s.elimDay,
    dayResults: s.dayResults || [], nightResults: s.nightResults || [],
    focusAttr: s.focusAttr || "all",
    coldOpen: !!s.coldOpen, coldTaught: !!s.coldTaught,
    // a mid-amendment save restores as acknowledged: chips match the
    // cases' per-case rules, no klaxon replays on a fresh load
    amendAfter: s.amendAfter, amendShown: !!s.amendShown || !!s.amending,
    auditIdx: s.auditIdx || 0, contestedIdx: s.contestedIdx,
    auditHitsToday: s.auditHitsToday || 0, nightPoints: s.nightPoints || 0,
    nightSummarized: !!s.nightSummarized, nightBonus: s.nightBonus || 0,
    strikeCleared: !!s.strikeCleared, lieCaught: !!s.lieCaught,
    verdictDone: !!s.verdictDone, verdictPassed: s.verdictPassed,
    cover: s.cover || 0, forgeFlags: s.forgeFlags || 0,
    forgeLog: s.forgeLog || [], forgeProof: s.forgeProof || [], forgeTiers: s.forgeTiers || [0, 0, 0, 0],
    forgeSent: !!s.forgeSent, wire: s.wire || [],
    tellHistory: s.tellHistory || [], forgeHistory: s.forgeHistory || [],
    prediction: s.prediction || null, predictionHit: s.predictionHit ?? null,
    predictions: s.predictions || 0, predHits: s.predHits || 0,
    nightMemo: s.nightMemo || "",
    filing: false, amending: false, auditLocked: false, signing: false,
    explained: new Set(s.explained || []),
    finaleRows: s.finaleRows, finaleOpts: s.finaleOpts,
    finaleChoice: (s.finaleOpts || []).find((o) => o.text === s.finaleChoiceText) || null,
  });
  G.docket = (s.docket || []).map((r) => ({ card: cardById(r.id), verdict: r.verdict, lie: !!r.lie }))
    .filter((r) => r.card);
  G.hand = (s.hand || []).map(cardById).filter(Boolean);
  G.selected = cardById(s.selected);
  G.filed = cardById(s.filed);
  G.flagged = s.flaggedIdx >= 0 ? (G.docket[s.flaggedIdx] || null) : null;
  G.auditSubs = (s.subs || []).map((sub) => ({ ...sub, card: cardById(sub.card) }))
    .filter((sub) => sub.card);

  audio();
  initAmbient();
  titleEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  hud();
  renderWire();

  // dispatch on the SAVED phase — G.phase is still the fresh-boot default
  if (s.phase === "day") startDay(true);
  else if (s.phase === "forge") {
    showOnly("forge");
    setInstr("forge");
    renderForge(true);
  }
  else if (s.phase === "verdict") {
    showOnly("verdict");
    setInstr("verdict");
    if (G.verdictDone) paintVerdictEnd();
    else renderVerdict();
  }
  else if (s.phase === "audit") startAudit(true);
  else if (s.phase === "finale") startFinale(true);
}

// ---------- boot ----------
/* the machine's face is derived from the seed — a resumed run wears the
 * same one, a fresh docket deals a fresh suspect */
function setCulpritFromSeed(seed) {
  G.culprit = LOGIC.pickCulprit(LOGIC.makeRng(`${seed}|culprit`), ALL_FILERS);
}
function startGame(seed) {
  SEED = seed;
  G.mode = "week";
  DAYS = DATA.DAYS;
  setCulpritFromSeed(seed);
  clearSave(); // a fresh clock-in ends any unfinished shift
  audio();
  initAmbient();
  titleEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  hud();
  if (G.status === "player") startColdOpen();
  else startAudit();
}

/* ---------- overtime: the desk after the week ----------
 * The deduction loop keeps running after the story closes: a fresh
 * five-night run whose rules are generated and validated per seed, with
 * its own culprit wearing a new face. Daily docket = `ot-<date>` — a
 * second daily ritual next to the week. */
function startOvertime(seed) {
  if (clockingIn) return;
  clockingIn = true;
  SEED = seed;
  G.mode = "ot";
  DAYS = LOGIC.genDays(LOGIC.makeRng(`${SEED}|otdays`), CARDS);
  setCulpritFromSeed(SEED);
  clearSave();
  // a fresh run: reset everything the week left on the desk
  Object.assign(G, {
    day: 0, status: "player", strikes: 0, score: 0, daysSurvived: 0,
    auditHits: 0, auditTotal: 0, flagAttempts: 0, flagHits: 0,
    valeCaught: 0, valeEscapes: 0, oath: false, clueUsed: false, dayPay: 300,
    flagged: null, lastMissKeys: null, elimDay: 0,
    dayResults: [], nightResults: [], selected: null, hand: [], docket: [],
    filed: null, focusAttr: "all", finaleRows: null, finaleOpts: null,
    finaleChoice: null, coldOpen: false, coldTaught: false,
    nightSummarized: false, verdictDone: false, filing: false, wire: [],
    tellHistory: [], forgeHistory: [],
    prediction: null, predictionHit: null, predictions: 0, predHits: 0, nightMemo: "",
  });
  audio();
  initAmbient();
  titleEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  hud();
  banner("OVERTIME — the desk is yours");
  startDay();
}

/* ---------- the machine's shift: overtime's inversion ----------
 * Clear the desk and the job doesn't end — it changes hands. Three
 * generated nights filing proofs as the thing the week was hunting.
 * Same deal, same sealed rule, no strikes: the only tell is the
 * postmark, and it never misses. */
function startMachine(seed) {
  if (clockingIn) return;
  clockingIn = true;
  SEED = seed;
  G.mode = "machine";
  DAYS = LOGIC.genDays(LOGIC.makeRng(`${SEED}|machinedays`), CARDS, 3);
  DAYS.forEach((d, i) => { d.dayLabel = `NIGHT ${i + 1}`; });
  setCulpritFromSeed(SEED);
  clearSave();
  Object.assign(G, {
    day: 0, status: "player", strikes: 0, score: 0, daysSurvived: 0,
    auditHits: 0, auditTotal: 0, flagAttempts: 0, flagHits: 0,
    valeCaught: 0, valeEscapes: 0, oath: false, clueUsed: false, dayPay: 300,
    flagged: null, lastMissKeys: null, elimDay: 0,
    dayResults: [], nightResults: [], selected: null, hand: [], docket: [],
    filed: null, focusAttr: "all", finaleRows: null, finaleOpts: null,
    finaleChoice: null, coldOpen: false, coldTaught: false,
    nightSummarized: false, verdictDone: false, filing: false,
    cover: 0, forgeFlags: 0, forgeLog: [], forgeProof: [], forgeTiers: [0, 0, 0, 0], forgeSent: false,
    forgeBusy: false, wire: [], tellHistory: [], forgeHistory: [],
    prediction: null, predictionHit: null, predictions: 0, predHits: 0, nightMemo: "",
  });
  audio();
  initAmbient();
  titleEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  hud();
  banner("THE MACHINE'S SHIFT — file like you belong");
  startDay();
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

// ---------- boot: the unfinished shift waits on the title ----------
document.body.dataset.phase = "title";
loadPrefs();
const savedRun = loadSave();
// the clerk's record greets every returning shift — the ledger outlives
// the tab, the save, and the week
(function () {
  const rec = loadRecord();
  const line = careerLine(rec);
  if (line) {
    const el = $("careerLine");
    el.innerHTML = line;
    el.classList.remove("hidden");
  }
})();
// overtime unlocks once a week is closed — a second daily ritual
const otSeed = () => `ot-${params.get("seed") || dailySeed}`;
const machSeed = () => `mach-${params.get("seed") || dailySeed}`;
(function () {
  let unlocked = false, machUnlocked = false;
  try {
    unlocked = localStorage.getItem("night-shift-ot-unlocked") === "1";
    machUnlocked = localStorage.getItem("night-shift-machine-unlocked") === "1";
  } catch { /* no storage */ }
  if (unlocked || (savedRun && savedRun.mode === "ot")) {
    const b = $("otTitleBtn");
    if (b) b.classList.remove("hidden");
  }
  if (machUnlocked || (savedRun && savedRun.mode === "machine")) {
    $("machineTitleBtn")?.classList.remove("locked");
  }
})();
// a locked tease still answers — with the terms, not silence
$("machineTitleBtn").addEventListener("click", () => {
  const b = $("machineTitleBtn");
  if (b.classList.contains("locked")) {
    sfx.slide();
    const was = b.textContent;
    b.textContent = "clear overtime — then become the thing you hunt";
    later(() => { b.textContent = was; }, 2200);
  }
});
$("otBtn").addEventListener("click", () => startOvertime(otSeed()));
$("otTitleBtn").addEventListener("click", () => startOvertime(otSeed()));
$("machineTitleBtn").addEventListener("click", () => { if (!$("machineTitleBtn").classList.contains("locked")) startMachine(machSeed()); });
$("machineEndBtn").addEventListener("click", () => startMachine(machSeed()));
if (savedRun) {
  const rBtn = document.createElement("button");
  rBtn.className = "resume-btn";
  rBtn.setAttribute("aria-label", "Resume your unfinished shift");
  rBtn.innerHTML = `<span class="r-line">⟲ RESUME SHIFT</span>` +
    `<span class="r-sub">${resumeLabel(savedRun)}</span>`;
  rBtn.addEventListener("click", () => {
    audio();
    initAmbient();
    resumeGame(savedRun);
  });
  $("resumeSlot").appendChild(rBtn);
}
