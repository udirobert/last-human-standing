/* test-overtime.mjs — overtime still runs: day docket → deduce → file →
 * verdict → postmark-only night, repeated. The spine trim must not have
 * broken the secret modes.
 * Run: node test-overtime.mjs */
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
const LOGIC = () => window.eval("LOGIC");

await sleep(700);
const credits = d.getElementById("creditsIntro");
if (credits) credits.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
await sleep(300);

window.startOvertime("ot-verify-1");
await sleep(400);

for (let n = 0; n < 2; n++) {
  /* day: the docket is real and the rule is sealed */
  ok(`ot day ${n + 1}: the day docket is up (overtime keeps days)`, G().phase === "day" && G().docket.length > 0);
  ok(`ot day ${n + 1}: the docket has HUMAN + SUS precedents`,
    G().docket.some((r) => r.verdict === "HUMAN") && G().docket.some((r) => r.verdict === "SUS"));
  /* file a card that passes the rule — the day still has a correct answer */
  const d_ = window.eval("DAYS[" + G().day + "]");
  const passing = G().hand.find((c) => LOGIC().passes(c, d_.rule));
  ok(`ot day ${n + 1}: a passing card exists in the hand`, !!passing);
  G().selected = passing;
  window.fileSelected();
  await sleep(600);
  ok(`ot day ${n + 1}: filing resolves to the verdict`, G().phase === "verdict");
  /* the staggered reveal auto-resolves; force it and pull the shift lever */
  window.finishVerdict();
  await sleep(300);
  ok(`ot day ${n + 1}: verdict pays (survived)`, G().dayResults[G().day] === "survived");
  const lever = d.querySelector("#verdictActions button");
  ok(`ot day ${n + 1}: the shift lever offers the night`, /SHIFT LEVER/i.test(lever.textContent));
  lever.click();
  await sleep(400);

  /* night: postmark-only — the machine is in the five, catch it on its tell */
  ok(`ot day ${n + 1}: the night is an audit`, G().phase === "audit");
  const subs = G().auditSubs;
  ok(`ot day ${n + 1}: five filings, one machine`, subs.length === 5 && subs.filter((s) => s.filer === G().culprit).length === 1);
  const botIdx = subs.findIndex((s) => s.filer === G().culprit);
  /* stamp HUMAN on the humans, SUS + tell on the machine */
  for (let i = 0; i < 5; i++) {
    window.eval(`G.auditIdx = ${i}; G.auditLocked = false;`);
    window.renderCase();
    await sleep(100);
    if (i === botIdx) {
      window.stamp("SUS");
      await sleep(150);
      window.flagField(subs[i].tel.tells[0]);
      await sleep(2600);
    } else {
      window.stamp("HUMAN");
      await sleep(1600);
    }
  }
  ok(`ot day ${n + 1}: the night machine was caught`, subs[botIdx].correct === true);
  /* the night summary advances to the next day (overtime never hits the finale) */
  const btn = d.querySelector("#auditActions button");
  ok(`ot day ${n + 1}: the night offers the next day`, /next day/i.test(btn.textContent));
  btn.click();
  await sleep(500);
}

ok("overtime is still a deduction + audit week", G().mode === "ot" && G().day === 2);

console.log(fail ? `OVERTIME FAIL — ${fail} broken, ${pass} ok` : `OVERTIME PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
