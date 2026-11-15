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

const dom = await JSDOM.fromFile(new URL("index.html", import.meta.url).pathname, {
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

// — title screen: one primary verb pair, self-explaining alternates
ok("title tooltips wired (data-tip on the verb card)", $("#startBtn").dataset.tip.length > 10);
ok("title tooltips reachable (uiTip outside hidden #game)", !$("#game #uiTip") && !!$("#uiTip"));
ok("steps teach their verbs", /HUMAN or SUS/.test($(".steps").textContent) && $$(".steps .step").every((s) => (s.dataset.tip || "").length > 10));
ok("alternates demoted to read-3", ["#randomBtn", "#machineTitleBtn"].every((s) => $(s).classList.contains("read-3")));
ok("primary not demoted", !$("#startBtn").classList.contains("read-3"));
ok("ticker items aria-hidden as they rotate", $$("#shiftLedger .sl-i").slice(1).every((el) => el.getAttribute("aria-hidden") === "true"));

$("#startBtn").click();
await sleep(900);

// — the orientation memo should be up before the tray
const brief = $("#shiftBrief");
await sleep(3800); // the memo types itself; give it the full line before asserting
ok("orientation memo shows", !brief.classList.contains("hidden"));
ok("memo says what the game is", /machine/.test($("#briefRiddle").textContent) && /postmark/.test($("#briefRiddle").textContent));
ok("memo says what to do", /stamp HUMAN or SUS/i.test($("#briefAria").textContent));
ok("memo theme = NIGHT 0 — THE TRAY", /THE TRAY/.test($("#briefTheme").textContent));
ok("memo still up (waits for tap, no auto-dismiss)", !brief.classList.contains("hidden"));

// dismiss the memo
brief.click();
await sleep(300);
ok("memo dismissed", brief.classList.contains("hidden"));

// — case 1: read-only, one imperative
ok("case 1 visible", !!$(".case-card"));
ok("instr = cold1 read-the-strip", d.getElementById("instr").textContent.startsWith("His judgment"));
ok("rule label present", /ARIA's rule: indoors/.test($("#ruleChips").textContent));
ok("rule chips demoted to read-3", $$("#ruleChips .chip").every((c) => c.classList.contains("read-3")));
ok("rule printed once (chips suppressed outside amendments)", $$("#ruleChips .chip").length === 0 && !!$(".rule-seal"));
ok("key hints printed once (on the buttons, not repeated below)", !$("#caseBtns .vb kbd") && !!$("#susBtn .stamp-ring"));
ok("fact marks are form ink (✓/✗/·, no prose)", !/not checked|meets the rule/.test($(".facts").textContent));
ok("clerk note suppressed in the cold open", !$(".case-note"));
ok("verb row hidden while the case is read-only", $("#caseBtns").classList.contains("hidden"));
ok("stub at read-2", !!$(".case-stub.read-2"));
ok("filer at read-2", !!$(".filer.read-2"));
ok("pre-stamped verdict visible", ($(".case-verdict") || {}).textContent === "PREVIOUS SHIFT");

// — case 2 is the machine's
$("#caseCard").click();
await sleep(600);
ok("instr = cold2 now-you-stamp", d.getElementById("instr").textContent.startsWith("Compare the claim"));
ok("case 2 arrived", !!$(".case-card"));
ok("compare strip on case 2", !!$(".rc-compare"));
ok("compare caption cut (instr teaches instead)", !$(".rcc-cap"));
ok("verb row up when the decision is live", !$("#caseBtns").classList.contains("hidden"));

// — stamp SUS (the catch) with grounds. The seeded tell rotates with the
// daily seed, so accept either outcome — the flow must complete regardless.
$("#susBtn").click();
await sleep(400);
const flagRow = $(".flag-row");
ok("grounds asked after SUS", !!flagRow);
ok("verb row steps aside for the grounds row", $("#caseBtns").classList.contains("hidden"));
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
