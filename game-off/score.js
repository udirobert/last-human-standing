/* NIGHT SHIFT — the composed score (Game Off 2026, W5).
 * One chart, played by code — no audio files, so file:// and the itch
 * embed hear the same thing. This module owns the shared AudioContext,
 * the voices, and an offline WAV renderer: scripts/audio-lab.html
 * auditions and downloads every arrangement without opening the game.
 *
 * The chart: eight bars of noir in D minor, 76 bpm, swung — Dm9 · Gm9 ·
 * B♭maj7 · A7sus, twice around. Voices:
 *   bass   — Karplus–Strong plucked upright (noise burst through a
 *            damped delay line), not an oscillator: it has a attack
 *            thump and a woody decay a triangle can't fake
 *   piano  — sine + one shimmer partial, comping the charleston
 *   drums  — kick + brushes; every offbeat humanized (timing jitter,
 *            velocity spread, per-bar swing ratio drift) so the swung
 *            chart breathes instead of loop
 *   horn   — muted trumpet with a late vibrato, melody only
 * The room chooses the arrangement: title gets the full chart, day is
 * piano reading music, night drops the horn, dawn resolves and rests.
 */
(function (root) {

let AC = null;
function audio() {
  if (!AC) AC = new (root.AudioContext || root.webkitAudioContext)();
  if (AC.state === "suspended") AC.resume();
  return AC;
}

const SCORE = {
  bpm: 76,
  bars: [
    { bass: [38, 45, 38, 42], voicing: [65, 72, 76], mel: [[0, 69, 2], [2, 72, 1], [3, 74, 1]] },  // Dm9
    { bass: [43, 50, 43, 45], voicing: [70, 74, 77], mel: [[0, 74, 2], [2, 72, 1], [3, 70, 1]] },  // Gm9
    { bass: [46, 53, 46, 44], voicing: [74, 77, 81], mel: [[0, 70, 1], [1, 69, 1], [2, 67, 2]] },  // B♭maj7
    { bass: [45, 52, 45, 37], voicing: [67, 72, 74], mel: [[0, 69, 3], [3, 67, 1]] },              // A7sus
    { bass: [38, 45, 38, 42], voicing: [65, 72, 76], mel: [[0, 69, 2], [2, 72, 1], [3, 76, 1]] },  // Dm9
    { bass: [43, 50, 43, 38], voicing: [70, 74, 77], mel: [[0, 77, 2], [2, 79, 1], [3, 77, 1]] },  // Gm7
    { bass: [39, 46, 39, 44], voicing: [67, 70, 74], mel: [[0, 75, 2], [2, 74, 1], [3, 72, 1]] },  // E♭maj7
    { bass: [45, 52, 45, 37], voicing: [67, 72, 74], mel: [[1, 73, 1], [2, 74, 2]] },              // A7sus → Dm
  ],
  ARR: {
    title: { bass: true, piano: true, drums: true, horn: true, loop: true },
    day:   { bass: "roots", piano: true, drums: false, horn: false, loop: true },
    night: { bass: true, piano: true, drums: true, horn: false, loop: true },
    dawn:  { bass: "whole", piano: "whole", drums: false, horn: true, loop: false },
  },
};
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

const scoreSynth = {
  name: null, bus: null, timer: null, barIdx: 0, nextBar: 0, muted: false,
  /* desk tension: 0 = early shift, 1 = final case on a hot streak. Scales
   * the drum voices and, past the midpoint, adds a kicked offbeat and a
   * busier ghost-brush rate. game.js drives it from audit progress. */
  intensity: 0.3,
  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); },
  graph() {
    if (!this.bus) {
      try {
        const g = audio().createGain();
        g.gain.value = this.muted ? 0 : 0.5;
        g.connect(audio().destination);
        this.bus = g;
      } catch { return null; }
    }
    return this.bus;
  },
  /* every voice takes a trailing `io` — realtime by default, offline when
   * renderWav is auditioning the chart into a file */
  io(over) { return over || { ctx: audio(), dest: this.graph() }; },
  beat() { return 60 / SCORE.bpm; },
  barDur() { return this.beat() * 4; },

  /* --- the voices --- */
  /* Karplus–Strong plucked upright: a burst of noise circulating through
   * a damped delay line tuned to the note. Attack thump, woody decay. */
  bassNote(m, t, dur, over) {
    const { ctx, dest } = this.io(over);
    try {
      const sr = ctx.sampleRate;
      const f0 = midiHz(m);
      const N = Math.max(2, Math.round(sr / f0));
      const durSamp = Math.ceil(sr * Math.min(dur + 0.08, 1.6));
      const buf = ctx.createBuffer(1, durSamp, sr);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < N; i++) ch[i] = (Math.random() * 2 - 1) * 0.9;
      const damp = 0.9965;   // the string losing energy
      for (let i = N; i < durSamp; i++) ch[i] = damp * 0.5 * (ch[i - N] + ch[i - N + 1]);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 640; f.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.014);           // the pluck
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(dest);
      src.start(t); src.stop(t + dur + 0.1);
    } catch { /* no audio */ }
  },
  pianoNote(m, t, dur, vel = 0.05, over) {
    const { ctx, dest } = this.io(over);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = midiHz(m);
    o2.type = "sine"; o2.frequency.value = midiHz(m) * 2.001; // one shimmer partial
    const g2 = ctx.createGain(); g2.gain.value = 0.28;
    o2.connect(g2); g2.connect(g);
    o.connect(g);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest);
    o.start(t); o2.start(t);
    o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  },
  hornNote(m, t, dur, over) {
    const { ctx, dest } = this.io(over);
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = midiHz(m);
    f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 1.2;
    // the vibrato arrives after the attack, like breath
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.4; lg.gain.setValueAtTime(0, t);
    lg.gain.setValueAtTime(0.8, t);
    lg.gain.linearRampToValueAtTime(4.5, t + Math.max(0.25, dur * 0.6));
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.075, t + 0.07);
    g.gain.setValueAtTime(0.075, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t); lfo.start(t);
    o.stop(t + dur + 0.15); lfo.stop(t + dur + 0.15);
  },
  kick(t, vol = 0.05, over) {
    const { ctx, dest } = this.io(over);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + 0.18);
  },
  brush(t, freq, vol = 0.02, dur = 0.06, over) {
    try {
      const { ctx, dest } = this.io(over);
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(dest);
      s.start(t);
    } catch { /* no audio */ }
  },

  /* --- one bar of the chart, arranged for the room ---
   * humanization: ±12ms timing jitter and a velocity spread on every
   * brush, a per-bar swing ratio that drifts around 2/3, and a soft
   * ghost brush on the off-off-beat. The chart never loops metronome-
   * clean; that's what separates "band" from "drone". */
  scheduleBar(bi, t, over) {
    const io = this.io(over);
    const bar = SCORE.bars[bi];
    const arr = (over && over.arr) || SCORE.ARR[this.name] || SCORE.ARR.night;
    const it = (over && over.intensity != null) ? over.intensity : this.intensity;
    const beat = this.beat();
    const swing = 2 / 3 + (Math.random() * 2 - 1) * 0.035;
    const hum = () => 0.75 + Math.random() * 0.5;
    const jit = (v) => v + (Math.random() * 2 - 1) * 0.012;
    if (arr.bass === true) {
      bar.bass.forEach((m, i) => this.bassNote(m, t + i * beat, beat * 0.95, io));
    } else if (arr.bass === "roots" && bi % 2 === 0) {
      this.bassNote(bar.bass[0], t, beat * 1.8, io);
    } else if (arr.bass === "whole") {
      this.bassNote(bar.bass[0], t, this.barDur() * 0.95, io);
    }
    if (arr.piano) {
      if (arr.piano === "whole") {
        bar.voicing.forEach((m, i) => this.pianoNote(m, t + i * 0.03, this.barDur() * 0.9, 0.042, io));
      } else {
        bar.voicing.forEach((m) => this.pianoNote(m, t, beat * 0.85, 0.05 * hum(), io));
        bar.voicing.forEach((m) => this.pianoNote(m, t + beat * (2 + swing), beat * 0.6, 0.042 * hum(), io));
        if (bi % 2 === 1) bar.voicing.forEach((m) => this.pianoNote(m, t + beat * 3.5, beat * 0.5, 0.036 * hum(), io));
      }
    }
    if (arr.drums) {
      const dv = 0.85 + it * 0.4; // the kit leans in as the desk heats up
      this.kick(jit(t), 0.045 * dv, io); this.kick(jit(t + beat * 2), 0.04 * hum() * dv, io);
      this.brush(jit(t + beat), 3000, 0.02 * hum() * dv, 0.06, io);
      this.brush(jit(t + beat * 3), 3000, 0.02 * hum() * dv, 0.06, io);
      for (let i = 0; i < 4; i++) {
        this.brush(jit(t + i * beat), 7800, 0.008 * hum() * dv, 0.03, io);            // the ride ping
        this.brush(jit(t + (i + swing) * beat), 7800, 0.005 * hum() * dv, 0.03, io);  // swung upbeat
        if (Math.random() < 0.3 + it * 0.25) this.brush(t + (i + 0.5) * beat, 3400, 0.004 * dv, 0.04, io); // ghost
      }
      // past the midpoint the drummer sits up: an extra kick and a low
      // brush answer on the off-off-beat — tension you hear, not see
      if (it > 0.6) {
        this.kick(jit(t + beat * 3.5), 0.028 * dv, io);
        this.brush(jit(t + beat * 2.5), 5200, 0.011 * dv, 0.05, io);
      }
    }
    if (arr.horn) {
      bar.mel.forEach(([b, m, d]) => this.hornNote(m, t + b * beat, d * beat * 0.92, io));
    }
  },

  /* --- the transport --- */
  play(name) {
    if (!name || this.name === name) return;
    this.name = name;
    if (!this.graph()) return;
    this.barIdx = 0;
    this.nextBar = audio().currentTime + 0.12;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 120);
    this.tick();
  },
  tick() {
    if (!this.name) return;
    const ac = audio();
    while (this.nextBar < ac.currentTime + 0.4) {
      this.scheduleBar(this.barIdx, this.nextBar);
      this.nextBar += this.barDur();
      this.barIdx++;
      if (this.barIdx >= SCORE.bars.length) {
        if (SCORE.ARR[this.name]?.loop) this.barIdx = 0;
        else { this.resolve(); return; }
      }
    }
  },
  /* dawn passes once and resolves: the last chord held, then rest */
  resolve() {
    clearInterval(this.timer);
    this.timer = null;
    const t = this.nextBar;
    [53, 62, 65, 69, 72].forEach((m, i) => this.pianoNote(m, t + i * 0.06, 5.5, 0.045));
    this.bassNote(38, t, 5.2);
    this.name = null;
  },
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.name = null;
  },
  duck(on) {
    const bus = this.graph();
    if (!bus) return;
    try {
      const ac = audio();
      bus.gain.cancelScheduledValues(ac.currentTime);
      bus.gain.linearRampToValueAtTime(this.muted ? 0 : (on ? 0.16 : 0.5), ac.currentTime + 0.4);
    } catch { /* */ }
  },
  setMuted() {
    const bus = this.graph();
    if (!bus) { this.muted = this.mutedState; return; }
    this.muted = this.mutedState;
    try {
      const ac = audio();
      bus.gain.cancelScheduledValues(ac.currentTime);
      bus.gain.setValueAtTime(this.muted ? 0 : 0.5, ac.currentTime);
    } catch { /* */ }
  },
  /* game.js reports the mute state here — score.js never owns policy */
  mutedState: false,
  /* the catch sting: the horn answers the player's evidence */
  sting() {
    if (!this.graph() || this.muted) return;
    const ac = audio();
    const t = ac.currentTime + 0.05;
    this.hornNote(74, t, 0.22);
    this.hornNote(79, t + 0.2, 0.5);
    [65, 72, 76].forEach((m, i) => this.pianoNote(m, t + 0.34, 1.1, 0.05));
  },
};

/* ---------- offline render: audition the chart as a WAV ----------
 * Used by scripts/audio-lab.html — schedule every bar of the chart into
 * an OfflineAudioContext and encode the buffer as a 16-bit PCM WAV. */
function encodeWav(buf) {
  const sr = buf.sampleRate, ch = buf.getChannelData(0);
  const len = ch.length;
  const bytes = 44 + len * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, bytes - 8, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const v = Math.max(-1, Math.min(1, ch[i]));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}
async function renderWav(name, times = 2) {
  const barDur = (60 / SCORE.bpm) * 4;
  const bars = SCORE.bars.length * times;
  const sr = 44100;
  const len = Math.ceil((bars * barDur + 3) * sr);
  const off = new OfflineAudioContext(1, len, sr);
  const master = off.createGain();
  master.gain.value = 0.5;
  master.connect(off.destination);
  const io = { ctx: off, dest: master, arr: SCORE.ARR[name] || SCORE.ARR.night, intensity: 0.3 };
  let t = 0.1;
  for (let b = 0; b < bars; b++) {
    scoreSynth.scheduleBar(b % SCORE.bars.length, t, io);
    t += barDur;
  }
  if (!io.arr.loop) {
    [53, 62, 65, 69, 72].forEach((m, i) => scoreSynth.pianoNote(m, t + i * 0.06, 5.5, 0.045, io));
    scoreSynth.bassNote(38, t, 5.2, io);
  }
  return encodeWav(await off.startRendering());
}

root.NIGHT_SHIFT_SCORE = { SCORE, scoreSynth, renderWav, audio };
})(typeof window !== "undefined" ? window : null);
