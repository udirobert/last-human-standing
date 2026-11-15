import { JSDOM } from "jsdom";

const param = () => ({
  value: 0,
  setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
  setTargetAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {},
});
const node = () => new Proxy({
  connect() {}, disconnect() {}, start() {}, stop() {},
}, {
  get(t, p) {
    if (p in t) return t[p];
    if (typeof p === "string") return param();
    return undefined;
  },
});
class FakeAC {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = "running"; this.destination = node(); }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() { return node(); }
  createOscillator() { return node(); }
  createBufferSource() { return node(); }
  createBiquadFilter() { return node(); }
  createDynamicsCompressor() { return node(); }
  createDelay() { return node(); }
  createWaveShaper() { return node(); }
  createAnalyser() { return node(); }
  createBuffer(ch, len, sr) { return { getChannelData: () => new Float32Array(len), duration: len / sr }; }
  createPeriodicWave() { return {}; }
}

const dom = await JSDOM.fromFile("/Users/udingethe/Dev/last-human-standing/game-off/index.html", {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = (q) => ({ matches: false, media: q, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener(){} });
    window.HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
    window.HTMLMediaElement.prototype.pause = function() {};
    window.AudioContext = FakeAC;
    window.webkitAudioContext = FakeAC;
    window.OfflineAudioContext = class extends FakeAC {
      constructor(ch, len, sr) { super(); this.length = len; }
      startRendering() { return Promise.resolve(this.createBuffer(1, this.length, this.sampleRate)); }
    };
  },
});
const { window } = dom;
const d = window.document;
const $ = (s) => d.querySelector(s);
const $$ = (s) => [...d.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗ FAIL:", name); } };

await sleep(700);
// opening credits may or may not show (sessionStorage); dismiss if present
const credits = d.getElementById("creditsIntro");
if (credits) credits.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
await sleep(500);

ok("title phase", d.body.dataset.phase === "title");
$("#startBtn").click();
await sleep(900);

// — the orientation memo should be up before the tray
const brief = $("#shiftBrief");
await sleep(3800); // the memo types itself; give it the full line before asserting
ok("orientation memo shows", !brief.classList.contains("hidden"));
ok("memo names the role", /night clerk/.test($("#briefRiddle").textContent));
ok("memo teaches 2 interactions", /Read his judgment\. Then make yours\./.test($("#briefRiddle").textContent));
ok("memo theme = THE TRAY", /THE TRAY/.test($("#briefTheme").textContent));
ok("memo still up (waits for tap, no auto-dismiss)", !brief.classList.contains("hidden"));

// dismiss the memo
brief.click();
await sleep(300);
ok("memo dismissed", brief.classList.contains("hidden"));

// — case 1: read-only, one imperative
ok("case 1 visible", !!$(".case-card"));
ok("instr = cold1 read-the-strip", d.getElementById("instr").textContent.startsWith("Read his strip"));
ok("rule label present", /ARIA's rule: indoors/.test($("#ruleChips").textContent));
ok("rule chips demoted to read-3", $$("#ruleChips .chip").every((c) => c.classList.contains("read-3")));
ok("hud strikes quiet during tray", $("#hudStrikes").className.includes("read-3"));
ok("hud score quiet during tray", $("#hudScore").className.includes("read-3"));
ok("clerk note demoted", !!$(".case-note.read-3"));
ok("stub at read-2", !!$(".case-stub.read-2"));
ok("filer at read-2", !!$(".filer.read-2"));
ok("pre-stamped verdict visible", ($(".case-verdict") || {}).textContent === "PREVIOUS SHIFT");

// — case 2 is the machine's
$("#caseCard").click();
await sleep(600);
ok("instr = cold2 now-you-stamp", d.getElementById("instr").textContent.startsWith("Now you stamp"));
ok("case 2 arrived", !!$(".case-card"));
ok("compare strip on case 2", !!$(".rc-compare"));

// — stamp SUS (the catch) with grounds. The seeded tell rotates with the
// daily seed, so accept either outcome — the flow must complete regardless.
$("#susBtn").click();
await sleep(400);
const flagRow = $(".flag-row");
ok("grounds asked after SUS", !!flagRow);
const fb = $('.flag-f[data-k="latency"]');
if (fb) fb.click();
await sleep(2600);
const reason = ($(".case-reason") || {}).textContent || "";
const caught = /ANOMALY QUARANTINED/.test(reason);
ok("verdict names its reason (catch: " + caught + ")",
  /ANOMALY QUARANTINED|reads within the norm|no grounds/.test(reason));
if (!caught && $(".case-cont")) { $("#caseCard").click(); await sleep(1800); }
ok("summary after tray", !$("#auditSummary").classList.contains("hidden"));

console.log(fail ? `SMOKE FAIL — ${fail} broken, ${pass} ok` : `SMOKE PASS — ${pass} checks`);
console.log("JS errors:", errors.length ? errors : "none");
process.exit(fail ? 1 : 0);
