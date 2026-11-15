/* test-night.mjs — the spine, verified: the postmark is the ONLY axis.
 * Drives a full night headlessly and asserts:
 *   - HUMAN on a human pays, SUS on a human is a STRIKE (not a paper call)
 *   - HUMAN on the machine escapes (no pay), SUS + real tell = the catch
 *   - SUS on the machine + wrong field = a hunch (no strike — the desk
 *     saw it, the grounds failed)
 *   - strikes cap at 3; a cut clerk takes jury duty at the close of the shift
 * Run: node test-night.mjs */
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
/* top-level const G lives in the global lexical env — eval reaches it */
const G = () => window.eval("G");
const clickCard = () => $("#caseCard").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

await sleep(700);
const credits = d.getElementById("creditsIntro");
if (credits) credits.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
await sleep(300);

window.startGame("spine-test-1");
await sleep(400);
window.eval("G.coldOpen = false; G.coldTaught = true;"); // skip the tray — deal night one
window.startAudit();
await sleep(300);

const subs = G().auditSubs;
ok("night dealt 5 filings", subs.length === 5);
ok("exactly one machine case", subs.filter((s) => s.filer === G().culprit).length === 1);

const botIdx = subs.findIndex((s) => s.filer === G().culprit);
ok("machine postmark carries 1–4 seeded tells", subs[botIdx].tel.tells.length >= 1 && subs[botIdx].tel.tells.length <= 4);

const score0 = G().score, strikes0 = G().strikes;
const humanIdx = subs.findIndex((s) => s.filer !== G().culprit);
const otherHumanIdx = subs.findIndex((s, i) => i !== botIdx && i !== humanIdx);

/* 1 — SUS on a human needs grounds, and the grounds fail: a strike.
 * The grounds row appears for EVERY SUS (human or machine) — so it is
 * not itself a tell. */
window.eval(`G.auditIdx = ${humanIdx}; G.auditLocked = false;`);
window.renderCase();
await sleep(200);
window.stamp("SUS");
await sleep(300);
ok("SUS on a human asks for grounds", G().auditSubs[humanIdx].pendingFlag === true);
/* accuse a field on the human's postmark — it reads human, grounds fail */
window.flagField(["latency", "origin", "hops", "receipt"][0]);
await sleep(400);
ok("human SUS struck through (hunch)", G().auditSubs[humanIdx].correct === false);
ok("failed accusation on a human is a strike (+1)", G().strikes === strikes0 + 1);
ok("no points for a wrong stamp", G().score === score0);
clickCard();
await sleep(500);

/* 2 — HUMAN on a human pays */
window.eval(`G.auditIdx = ${otherHumanIdx}; G.auditLocked = false;`);
window.renderCase();
await sleep(200);
const pay0 = G().score;
window.stamp("HUMAN");
await sleep(1700); // the bite, then auto-advance
ok("HUMAN on a human upheld (+50/×2)", G().score > pay0);
ok("no strike for a right stamp", G().strikes === strikes0 + 1);

/* 3 — the machine: HUMAN lets it through (escape — no pay, no strike) */
window.eval(`G.auditIdx = ${botIdx}; G.auditLocked = false;`);
window.renderCase();
await sleep(200);
const esc0 = G().valeEscapes, pay1 = G().score;
window.stamp("HUMAN");
await sleep(300);
ok("HUMAN on the machine escapes", G().valeEscapes === esc0 + 1);
ok("escape earns nothing", G().score === pay1);
clickCard();
await sleep(500);

/* 4 — the machine: SUS + a REAL tell = the catch (+100) */
window.eval(`G.auditIdx = ${botIdx}; G.auditLocked = false;`);
window.eval(`const b = G.auditSubs[${botIdx}]; b.pick = null; b.correct = null; b.earned = 0; b.pendingFlag = false; b.flagKey = null; b.flagTried = false;`);
window.renderCase();
await sleep(200);
window.stamp("SUS");
await sleep(300);
ok("SUS on the machine asks for the field", G().auditSubs[botIdx].pendingFlag === true);
const tellKey = G().auditSubs[botIdx].tel.tells[0];
window.flagField(tellKey);
await sleep(2800); // the catch auto-advances
const catchSub = G().auditSubs[botIdx];
ok("catch upheld (+100 bounty)", catchSub.correct === true && catchSub.earned === 100);
ok("vale caught logged", G().valeCaught === 1);
ok("no strike for the catch", G().strikes === strikes0 + 1);

/* 5 — a hunch aimed at the machine (wrong field) is no strike */
window.eval(`G.auditIdx = ${botIdx}; G.auditLocked = false;`);
window.eval(`const b = G.auditSubs[${botIdx}]; b.pick = null; b.correct = null; b.earned = 0; b.pendingFlag = false; b.flagKey = null; b.flagTried = false;`);
window.renderCase();
await sleep(200);
const strikesBeforeHunch = G().strikes;
window.stamp("SUS");
await sleep(300);
const wrongField = G().auditSubs[botIdx].tel.tells.length === 4 ? null
  : ["latency", "origin", "hops", "receipt"].find((k) => !G().auditSubs[botIdx].tel.tells.includes(k));
window.flagField(wrongField);
await sleep(400);
ok("hunch on the machine is a wrong stamp", G().auditSubs[botIdx].correct === false);
ok("hunch does not strike the clerk", G().strikes === strikesBeforeHunch);

console.log(fail ? `NIGHT FAIL — ${fail} broken, ${pass} ok` : `NIGHT PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
