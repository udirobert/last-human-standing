/* test-finale.mjs — the "belong" finale: the machine's final proof arrives,
 * and the ending is a choice. Proves all three endings are reachable and
 * correctly titled:
 *   - LAST HUMAN STANDING  — the clause cuts only the machine
 *   - COLLATERAL          — the clause cuts the machine AND humans
 *   - THE DAY SHIFT IS AUTOMATED — the clause cuts only humans; it belongs
 * The clauses are seeded; the test works the same way a player does —
 * try each, read the title, and confirm the one that cuts only the
 * culprit is the good ending.
 * Run: node test-finale.mjs */
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

let seen = { clean: 0, collateral: 0, belong: 0 };
let goodClauseAlwaysUnique = true;

/* run many seeds: each finale has exactly one clause that cuts only the
 * machine; sign it and confirm the good ending, then sign a human-cutting
 * clause and confirm the belong/collateral endings are reachable */
for (let t = 0; t < 12; t++) {
  window.eval("G.day = 0; G.status = 'player';"); // a fresh clock-in, per seed
  window.startGame(`fin-${t}`);
  await sleep(300);
  window.eval("G.coldOpen = false;");
  /* skip straight to the finale (the week's end) */
  window.eval("G.day = 5;");
  window.startFinale();
  await sleep(300);

  const rows = G().finaleRows, culprit = G().culprit;
  const opts = G().finaleOpts;
  const passOf = (o) => rows.map((r) => LOGIC().passes(r, o.rule));
  const cutsOf = (o) => rows.filter((r) => !LOGIC().passes(r, o.rule)).map((r) => r.filer);

  const good = opts.filter((o) => {
    const c = cutsOf(o);
    return c.includes(culprit) && c.length === 1;
  });
  ok(`seed ${t}: exactly one clause cuts only the machine`, good.length === 1);
  if (good.length !== 1) goodClauseAlwaysUnique = false;

  // the machine's voice at the peak: its final proof carries the last
  // line of its week, set alone under the docket
  const VALE_ARC = window.eval("VALE_ARC");
  const valeLine = d.querySelector("#valeFinal").textContent;
  ok(`seed ${t}: the finale carries the machine's last words`,
    VALE_ARC.length > 0 && valeLine.includes(VALE_ARC[VALE_ARC.length - 1]) && valeLine.includes(culprit));

  // the machine wears a seeded face; on the finale night (night 4) it
  // carries exactly ONE residual tell — the field is seeded, so the test
  // must find it, not assume which one. The tell is an impossible value:
  // a zero-time packet, gate zero, zero relays, or a receipt before post.
  const crow = rows.find((r) => r.filer === culprit);
  const tells = (crow.tel.tells || []);
  const MACHINE = { latency: "0.0ms", origin: "GATE 0", hops: "0" };
  const isMachine = (k, v) =>
    (k === "receipt" ? /before post|\+0\.000s/.test(v) : MACHINE[k] === v);
  ok(`seed ${t}: the machine carries one impossible postmark field`,
    tells.length === 1 && isMachine(tells[0], crow.tel[tells[0]]));
  // and every OTHER field reads human, so the tell is what separates it
  const otherFields = ["latency", "origin", "hops", "receipt"].filter((k) => k !== tells[0]);
  ok(`seed ${t}: the machine's other fields read human`,
    otherFields.every((k) => !isMachine(k, crow.tel[k])));

  // sign the good clause → LAST HUMAN STANDING
  G().finaleChoice = good[0];
  window.signRule();
  await sleep(200);
  ok(`seed ${t}: cutting only the machine → LAST HUMAN STANDING`, G().finaleTitle === "LAST HUMAN STANDING");
  seen.clean++;
  window.clearLater(); // kill the pending endGame so it can't pollute the next seed
  G().day = 0; // reset the clock — the next seed deals night one again

  // sign a clause that cuts only humans → THE DAY SHIFT IS AUTOMATED (belong)
  const belong = opts.find((o) => {
    const c = cutsOf(o);
    return !c.includes(culprit) && c.length >= 1;
  });
  if (belong) {
    G().finaleChoice = belong;
    G().signing = false;
    window.signRule();
    await sleep(200);
    ok(`seed ${t}: cutting only humans → it belongs (automated)`, G().finaleTitle === "THE DAY SHIFT IS AUTOMATED");
    seen.belong++;
    window.clearLater();
    G().day = 0;
  }

  // sign a clause that cuts the machine + ≥1 human → COLLATERAL
  const coll = opts.find((o) => {
    const c = cutsOf(o);
    return c.includes(culprit) && c.length > 1;
  });
  if (coll) {
    G().finaleChoice = coll;
    G().signing = false;
    window.signRule();
    await sleep(200);
    ok(`seed ${t}: cutting machine + humans → COLLATERAL`, G().finaleTitle === "COLLATERAL");
    seen.collateral++;
    window.clearLater();
    G().day = 0;
  }
}

ok("the clean-cut ending was reached", seen.clean > 0);
ok("the belong ending was reached", seen.belong > 0);
ok("the collateral ending was reached", seen.collateral > 0);
ok("exactly one clause ever cut only the machine", goodClauseAlwaysUnique);

console.log(`  endings seen across ${12} seeds — clean:${seen.clean} belong:${seen.belong} collateral:${seen.collateral}`);
console.log(fail ? `FINALE FAIL — ${fail} broken, ${pass} ok` : `FINALE PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
