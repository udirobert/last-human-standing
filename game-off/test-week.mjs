/* test-week.mjs — the rebuilt week, end to end: the cold-open tray, then
 * five night-only shifts (postmark judgment), then the finale. The day
 * docket must NOT appear in week mode — every screen asks the one
 * question: which filing is the machine?
 * Run: node test-week.mjs */
import { JSDOM } from "jsdom";

const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
const node = () => new Proxy({ connect() {}, disconnect() {}, start() {}, stop() {} }, {
  get(t, p) { if (p in t) return t[p]; if (typeof p === "string") return param(); return undefined; },
});
class FakeAC {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = "running"; this.destination = node(); }
  resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() { return node(); } createOscillator() { return node(); }
  createBufferSource() { return node(); } createBiquadFilter() { return node(); }
  createDynamicsCompressor() { return node(); } createDelay() { return node(); }
  createWaveShaper() { return node(); } createAnalyser() { return node(); }
  createBuffer(ch, len, sr) { return { getChannelData: () => new Float32Array(len), duration: len / sr }; }
  createPeriodicWave() { return {}; }
}

const dom = await JSDOM.fromFile(new URL("index.html", import.meta.url).pathname, {
  runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = (q) => ({ matches: false, media: q, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    window.HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
    window.HTMLMediaElement.prototype.pause = function() {};
    window.AudioContext = FakeAC; window.webkitAudioContext = FakeAC;
    window.OfflineAudioContext = class extends FakeAC {
      constructor(ch, len, sr) { super(); this.length = len; }
      startRendering() { return Promise.resolve(this.createBuffer(1, this.length, this.sampleRate)); }
    };
  },
});
const { window } = dom;
const d = window.document;
const $ = (s) => d.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗ FAIL:", name); } };
const G = () => window.eval("G");
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
/* work one night: stamp HUMAN on humans, SUS + the seeded tell on the
 * machine; returns true if the machine was caught */
async function workNight() {
  let caught = false;
  for (let i = 0; i < G().auditSubs.length; i++) {
    window.eval(`G.auditIdx = ${i}; G.auditLocked = false;`);
    window.renderCase();
    await sleep(120);
    const sub = G().auditSubs[i];
    if (sub.filer === G().culprit) {
      window.stamp("SUS");
      await sleep(150);
      const tell = sub.tel.tells[0];
      window.flagField(tell);
      if (sub.correct) caught = true;
      await sleep(2800); // the catch auto-advances
    } else {
      window.stamp("HUMAN");
      await sleep(1700);
    }
  }
  return caught;
}

await sleep(700);
const credits = d.getElementById("creditsIntro");
if (credits) credits.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
await sleep(300);

window.startGame("spine-week-1");
await sleep(400);

/* — the tray (night 0): two filings, teach the contrast — */
ok("cold open opens the week", G().coldOpen === true && G().phase === "audit");
await sleep(1200);
/* case 1 is read-only (the clerk's cleared filing) */
click($("#shiftBrief")); // dismiss the memo if it's up
await sleep(200);
click($("#caseCard"));
await sleep(300);
/* case 2 is the machine's — stamp it + point at its tell */
const bot2 = G().auditSubs[1];
window.stamp("SUS");
await sleep(200);
window.flagField(bot2.tel.tells[0]);
await sleep(2800);
ok("tray caught or hunched (flow completes)", bot2.pick === "SUS");
click($("#caseCard"));
await sleep(400);
ok("tray summary shows", !$("#auditSummary").classList.contains("hidden"));
const trayBtn = d.querySelector("#auditActions button");
ok("tray offers the first night", /night one/i.test(trayBtn.textContent));
click(trayBtn);
await sleep(400);

/* — nights 1..5: night-only, postmark judgment — */
let caughtAny = false;
for (let n = 0; n < 5; n++) {
  ok(`night ${n + 1} is an audit (no day docket)`, G().phase === "audit" && G().coldOpen === false);
  const label = d.querySelector("#dayDots .day-label").textContent;
  ok(`night ${n + 1} label reads NIGHT`, /NIGHT/.test(label));
  const caught = await workNight();
  caughtAny = caughtAny || caught;
  ok(`night ${n + 1} machine caught via the postmark`, caught);
  const btn = d.querySelector("#auditActions button");
  const isLast = n === 4;
  ok(`night ${n + 1} summary offers ${isLast ? "last call" : "next night"}`,
    isLast ? /last call/i.test(btn.textContent) : /next night/i.test(btn.textContent));
  click(btn);
  await sleep(500);
}
ok("the machine was caught at least once this week", caughtAny);

/* — the finale replaces the day-rule decree as the week's end — */
ok("week ends at the finale", G().phase === "finale");
ok("five nights were worked", G().nightResults.length === 5);

console.log(fail ? `WEEK FAIL — ${fail} broken, ${pass} ok` : `WEEK PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
