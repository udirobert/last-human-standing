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
  rise:   (i) => tone(340 + i * 70, .06, "triangle", .035),
};

// ---------- night music ----------
/* Vendored track ("Bump in the Night" — Kevin MacLeod, CC-BY-4.0, see
 * LICENSE-CREDITS.txt). A plain <audio> element, not WebAudio:
 * MediaElementAudioSourceNode is CORS-blocked on file:// in Chrome, and
 * this game must run straight from disk. Volume ramps go through a small
 * setInterval fade helper on .volume.
 * "Bump in the Night" by Kevin MacLeod (incompetech.com), CC-BY-4.0. */
let MUSIC = null;
let musicFade = null;
function music() {
  if (!MUSIC) {
    MUSIC = new Audio("audio/bump-in-the-night.mp3");
    MUSIC.loop = true;
    MUSIC.volume = 0;
  }
  return MUSIC;
}
function musicFadeTo(target, ms, thenPause) {
  const m = music();
  clearInterval(musicFade);
  const from = m.volume;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  musicFade = setInterval(() => {
    i++;
    m.volume = Math.min(1, Math.max(0, from + (target - from) * (i / steps)));
    if (i >= steps) {
      clearInterval(musicFade);
      musicFade = null;
      if (thenPause) m.pause();
    }
  }, ms / steps);
}
function musicStart() {
  const m = music();
  try {
    const p = m.play();
    if (p && p.catch) p.catch(() => { /* autoplay/file:// denials are fine */ });
  } catch { /* no audio */ }
  musicFadeTo(0.16, 800);
}
function musicStop() {
  if (!MUSIC) return;
  musicFadeTo(0, 400, true);
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
    return `<div class="fact${cls}">
      <span class="fk">${ATTR_LABEL[k]}</span>
      <span class="fv">${factCell(k, card.tags[k])}</span>${mark}
    </div>`;
  }).join("")}</div>`;
}

// ---------- instruction lines ----------
const INSTR = {
  day: "ARIA has a secret rule. Her rulings below are your clues — file the one card she'd pass.",
  dayLiar: "ARIA has a secret rule. Her rulings below are your clues — file the one card she'd pass. ⚠ One ruling below is a clerical error.",
  verdict: "The rule is unsealed. Here's how your card did.",
  night: "Now you're the auditor. The rule is in plain sight — stamp each filing HUMAN or SUS.",
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
  eliminated: ["Three strikes. Cut — but not erased."],
  juror: ["You're on jury duty now."],
  auditOpen: [
    "Night shift. The rule stays open — you just get to see it.",
    "Night shift. The rule stays open — you just get to see it.",
    "Someone on this docket has never missed. Humans miss.",
    "Check the timestamps. I'm not allowed to.",
    "My rules only check facts. Whatever isn't a fact walks right through.",
  ],
};
// one-line explainers shown the first time each mechanic appears
const EXPLAIN = {
  streak: "Chains of right answers pay better now. Miss once and the chain resets.",
  timer: "There's a clock on the desk tonight. Fast stamps pay a little extra.",
  clue: "You may request one more ruling per day. It costs a hundred from today's pay.",
  oath: "File under oath and I'll hold you to it. Keep it and a strike vanishes; break it and you take two.",
  amend: "Head office amends my rules mid-shift now. Watch the chips when it happens.",
  liar: "A clerical error slipped onto the docket. Find which ruling is wrong and I'll note it.",
};
let ariaTimer = null;
function ariaSay(lines) {
  const el = $("ariaSay");
  $("ariaText").textContent = pick(lines);
  el.classList.remove("hidden");
  clearTimeout(ariaTimer);
  ariaTimer = setTimeout(() => el.classList.add("hidden"), 4200);
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
  oath: false,
  clueUsed: false,
  dayPay: 300,
  flagged: null,          // liar day: the docket row the player suspects
  auditSubs: [],
  amendAfter: null,
  amendShown: false,
  auditIdx: 0,
  auditHitsToday: 0,
  nightPoints: 0,
  streak: 1,
  bestStreak: 1,
  auditLocked: false,
  verdictDone: false,
  dayResults: [],        // "survived" | "struck" | "juror"
  nightResults: [],      // correct stamps per night
  phase: "day",
  clockTimer: null,
  clockStart: 0,
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
    st.appendChild(s);
  }
  $("hudScore").textContent = `SCORE ${G.score}`;
}
function setShift(shift) { document.body.dataset.shift = shift; }
function showOnly(which) {
  G.phase = which;
  dayPhase.classList.toggle("hidden", which !== "day");
  verdictPhase.classList.toggle("hidden", which !== "verdict");
  auditPhase.classList.toggle("hidden", which !== "audit");
  finalePhase.classList.toggle("hidden", which !== "finale");
  setShift(which === "audit" || which === "finale" ? "night" : "day");
  if (which === "day") musicStop();   // music plays nights + through the endings only
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
  banner(`${d.dayLabel} · ${d.emoji} ${d.theme}`);
  showOnly("day");
  setInstr(G.day >= 3 ? "dayLiar" : "day");
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
  if (G.day === 3) explain("liar") || ariaSay(ARIA.dayOpen);
  else ariaSay(ARIA.dayOpen);
  renderDay();
}

function renderDay() {
  const d = DAYS[G.day];
  $("dayKicker").textContent = `${d.dayLabel} · ${d.theme} · TODAY'S RIDDLE`;
  $("riddleText").textContent = `“${d.riddle}”`;
  renderDocket();

  const handEl = $("hand");
  handEl.innerHTML = "";
  G.hand.forEach((card, i) => {
    const el = document.createElement("div");
    el.className = "evidence" + (G.selected === card ? " selected" : "");
    el.innerHTML = `<div class="e-head"><span class="glyph">${card.glyph}</span>
        <span class="key">${i + 1}</span></div>
      <div class="name">${card.name}</div>
      ${factRows(card)}`;
    el.addEventListener("click", () => selectCard(card));
    handEl.appendChild(el);
  });
  updateFileBtn();
}

function renderDocket(animRow) {
  const tb = $("docketBody");
  tb.innerHTML = "";
  for (const row of G.docket) {
    const tr = document.createElement("tr");
    if (G.day >= 3) tr.className = "flaggable";
    if (row === animRow) tr.classList.add("new-row");
    if (row === G.flagged) tr.classList.add("flagged");
    tr.innerHTML =
      `<td class="c-file"><span class="glyph">${row.card.glyph}</span><span class="name">${row.card.name}</span></td>` +
      ATTR_KEYS.map((k) => `<td class="c-fact">${factCell(k, row.card.tags[k])}</td>`).join("") +
      `<td class="c-stamp ${row.verdict === "HUMAN" ? "human" : "sus"}">${row.verdict}${
        row === G.flagged ? " ⚑" : ""}</td>`;
    if (G.day >= 3) {
      tr.addEventListener("click", () => {
        G.flagged = G.flagged === row ? null : row;
        sfx.tick();
        renderDocket();
      });
    }
    tb.appendChild(tr);
  }
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

function fileSelected() {
  if (!G.selected || G.phase !== "day") return;
  G.filed = G.selected;
  sfx.file();
  showOnly("verdict");
  setInstr("verdict");
  renderVerdict();
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

  const pct = passed ? 62 + ri(33) : 8 + ri(37);
  G.verdictPct = pct;
  $("tallyFill").style.transition = "none";
  $("tallyFill").style.width = "0%";
  $("crowdPct").innerHTML = "";
  $("stampBox").innerHTML = "";
  $("verdictActions").innerHTML = "";

  // staggered reveal: unchecked rows first (250ms apart), then checked
  // rows passes-first (550ms apart, rising tone), last checked row holds
  // 800ms on a pulsing "…" before its mark lands
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
      t += 800;
      later(() => {
        if (mk) { mk.innerHTML = orig; mk.classList.remove("pulse"); }
        sfx.rise(i);
      }, t);
    } else {
      later(() => { r.classList.remove("pre"); sfx.rise(i); }, t);
      t += 550;
    }
  });

  later(() => {
    $("tallyFill").style.transition = "width .6s ease";
    $("tallyFill").style.width = pct + "%";
    $("crowdPct").innerHTML =
      `<b class="h">${pct}% HUMAN</b> · <b class="s">${100 - pct}% SUS</b>`;
  }, t + 150);

  later(() => finishVerdict(), t + 900);
}

function finishVerdict() {
  if (G.verdictDone) return;
  G.verdictDone = true;
  clearLater();
  const d = DAYS[G.day], c = G.filed, pct = G.verdictPct;
  const passed = G.verdictPassed;

  // restore full rows instantly on skip
  $("factRows").innerHTML = G.factHTML;
  $("factRows").querySelectorAll(".pre").forEach((r) => r.classList.remove("pre"));

  $("tallyFill").style.transition = "none";
  $("tallyFill").style.width = pct + "%";
  $("crowdPct").innerHTML =
    `<b class="h">${pct}% HUMAN</b> · <b class="s">${100 - pct}% SUS</b>`;

  let stampText, stampCls;
  if (passed) {
    stampText = G.oath ? "SURVIVED · OATH KEPT" : "SURVIVED";
    stampCls = "survived";
  } else {
    stampText = G.oath ? "PERJURY · 2 STRIKES" : "STRIKE";
    stampCls = "eliminated";
  }
  const sb = $("stampBox");
  sb.innerHTML = `<div class="stamp ${stampCls}">${stampText}</div>`;
  sfx.stamp();
  passed ? sfx.human() : sfx.sus();

  if (passed) {
    G.daysSurvived++;
    G.score += G.dayPay;
    if (G.oath) {
      if (G.strikes > 0) G.strikes--;
      else G.score += 200;
    }
    G.dayResults[G.day] = "survived";
    ariaSay(ARIA.survived);
  } else {
    G.strikes += G.oath ? 2 : 1;
    G.dayResults[G.day] = "struck";
    ariaSay(ARIA.struck);
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
  hud();

  const actions = $("verdictActions");
  actions.innerHTML = "";
  if (G.strikes >= 3 && G.status === "player") {
    G.elimDay = G.day + 1;
    $("dossierDay").textContent = `${d.dayLabel} · ${d.theme}`;
    $("dossierArg").textContent = `“${c.argument}”`;
    $("dossierMeta").textContent =
      `${c.name} · failed: ${d.rule.filter((x) => !x.allow.includes(c.tags[x.key])).map((x) => x.text).join(", ")}`;
    dossierEl.classList.remove("hidden");
    ariaSay(ARIA.eliminated);
    $("dossierBtn").onclick = () => {
      dossierEl.classList.add("hidden");
      G.status = "juror";
      ariaSay(ARIA.juror);
      startAudit();
    };
  } else {
    const btn = document.createElement("button");
    btn.textContent = "Start the night shift →";
    btn.addEventListener("click", startAudit);
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

function startAudit() {
  banner("NIGHT SHIFT — now you judge");
  showOnly("audit");
  musicStart();
  setInstr("night");
  ariaSay([ARIA.auditOpen[Math.min(G.day, ARIA.auditOpen.length - 1)]]);
  if (G.day === 0) explain("streak");
  else if (G.day === 1) explain("timer");
  else if (G.day === 2) explain("amend");
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
    const filed = c.bot ? "+0.003s" : fmtFiled(40 + Math.floor(trng() * 500));
    return { ...c, filer, filed, truth: LOGIC.passes(c.card, c.rule), pick: null, correct: null };
  });
  G.auditIdx = 0;
  G.auditHitsToday = 0;
  G.nightPoints = 0;
  G.streak = 1;
  G.bestStreak = 1;
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

function caseClock() {
  // 8-second per-case clock, night 2 onward (day index ≥ 1)
  const bar = $("clockBar");
  clearInterval(G.clockTimer);
  G.clockTimer = null;
  if (G.day < 1) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  bar.classList.remove("overtime");
  $("clockMsg").classList.add("hidden");
  const fill = $("clockFill");
  fill.style.transition = "none";
  fill.style.width = "100%";
  G.clockStart = Date.now();
  G.clockTimer = setInterval(() => {
    const frac = Math.max(0, 1 - (Date.now() - G.clockStart) / 8000);
    fill.style.width = frac * 100 + "%";
    if (frac <= 0) {
      clearInterval(G.clockTimer);
      G.clockTimer = null;
      bar.classList.add("overtime");
      $("clockMsg").classList.remove("hidden");
    }
  }, 100);
}
function clockBonus() {
  if (G.day < 1 || !G.clockStart) return 0;
  const frac = Math.max(0, 1 - (Date.now() - G.clockStart) / 8000);
  return Math.round(10 * frac);
}

function renderCase() {
  const sub = G.auditSubs[G.auditIdx];
  const el = $("caseCard");
  const checked = sub.pick !== null;
  const verdicts = checked ? LOGIC.check(sub.card, sub.rule) : null;
  const arg = sub.filer === "VALE" ? DAYS[G.day].valeLine : sub.card.argument;
  el.innerHTML = `<p class="case-num">CASE ${G.auditIdx + 1}/5
      <span id="streakTag" class="${G.streak > 1 ? "pop" : ""}">STREAK ×${G.streak}${newTag("streak", 0)}</span></p>
    <div class="case-card ${sub.pick ? "stamped-" + sub.pick.toLowerCase() : ""}">
      <div class="e-head"><span class="glyph">${sub.card.glyph}</span>
        <span class="filer">FILER · ${sub.filer} <i>filed ${sub.filed}</i></span></div>
      <div class="name">${sub.card.name}</div>
      ${sub.pick ? `<p class="case-verdict ${sub.correct ? "ok" : "bad"}">${sub.correct ? "RIGHT" : "WRONG"}</p>
        <p class="case-reason">${sub.correct
            ? `+${sub.earned} pts${sub.bonus ? ` · +${sub.bonus} speed` : ""}`
            : (sub.truth ? "passes: meets every criterion"
                         : "fails: needed " + LOGIC.failKeys(sub.card, sub.rule)
                             .map((k) => sub.rule.find((x) => x.key === k).text).join(", "))}</p>` : ""}
      <p class="arg">“${arg}”</p>
      ${factRows(sub.card, verdicts)}
      ${sub.pick ? `<div class="case-stamp ${sub.pick.toLowerCase()}">${sub.pick}</div>` : ""}
      ${sub.pick && !sub.correct ? `<p class="case-cont">tap or press any key to continue</p>` : ""}
    </div>`;
  $("susBtn").disabled = $("humanBtn").disabled = checked;
  if (!checked) caseClock();
}

function stamp(pickVal) {
  if (G.auditLocked || G.phase !== "audit") return;
  const sub = G.auditSubs[G.auditIdx];
  if (!sub || sub.pick) return;
  G.auditLocked = true;
  clearInterval(G.clockTimer);
  G.clockTimer = null;
  sub.pick = pickVal;
  sub.correct = (pickVal === "HUMAN") === sub.truth;
  if (sub.correct) {
    G.auditHitsToday++;
    G.auditHits++;
    sub.bonus = clockBonus();
    sub.earned = 20 * G.streak + sub.bonus;
    G.nightPoints += sub.earned;
    G.score += sub.earned;
    if (G.streak < 3) G.streak++;
    if (G.streak > G.bestStreak) G.bestStreak = G.streak;
  } else {
    sub.earned = 0; sub.bonus = 0;
    G.streak = 1;
  }
  G.auditTotal++;
  sfx.stamp();
  sub.correct ? sfx.human() : sfx.sus();
  renderCase();
  if (sub.correct) later(nextCase, 900);   // wrong stamps stay up until dismissed
}

function nextCase() {
  if (G.phase !== "audit") return;
  clearLater();
  G.auditLocked = false;
  const next = G.auditIdx + 1;
  // amendment interrupt lands between the last base-rule case and the
  // first amended case
  if (G.amendAfter !== null && !G.amendShown && next === G.amendAfter) {
    showAmendment();
    return;
  }
  G.auditIdx = next;
  if (G.auditIdx >= G.auditSubs.length) return auditSummary();
  renderCase();
}

function showAmendment() {
  const d = DAYS[G.day];
  G.auditLocked = true;
  const b = $("amendBanner");
  $("amendNote").textContent = d.amend.note;
  b.classList.remove("hidden");
  sfx.alarm();
  // chips: strike removed criteria, flash new ones
  const oldTexts = d.rule.map((c) => c.text);
  const newTexts = d.amend.rule.map((c) => c.text);
  $("ruleChips").innerHTML =
    `<span class="rc-label">${ruleText(d)}</span>` +
    oldTexts.filter((t) => !newTexts.includes(t))
      .map((t) => `<span class="chip struck">${t}</span>`).join("") +
    newTexts.filter((t) => !oldTexts.includes(t))
      .map((t) => `<span class="chip flash">${t}</span>`).join("") +
    newTexts.filter((t) => oldTexts.includes(t))
      .map((t) => `<span class="chip">${t}</span>`).join("");
  later(() => {
    b.classList.add("hidden");
    G.amendShown = true;
    renderRuleChips(d.amend.rule, true);
    G.auditLocked = false;
    G.auditIdx++;
    renderCase();
  }, 1400);
}

function auditSummary() {
  clearInterval(G.clockTimer);
  G.clockTimer = null;
  $("clockBar").classList.add("hidden");
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
  s.innerHTML = `<p class="sum-line">${hits}/5 correct</p>
    <p class="sum-effect">best streak ×${G.bestStreak} · ${effect}</p>`;
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
  renderFinale();
}

function renderFinale() {
  const tb = $("finaleBody");
  tb.innerHTML = "";
  for (const row of FINALE) {
    const cut = G.finaleChoice && !LOGIC.passes(row, G.finaleChoice.rule);
    const tr = document.createElement("tr");
    if (cut) tr.className = "cut";
    tr.innerHTML =
      `<td class="c-file"><span class="glyph">${row.glyph}</span><span class="name">${row.name}</span></td>` +
      ATTR_KEYS.map((k) => `<td class="c-fact">${factCell(k, row.tags[k])}</td>`).join("") +
      `<td class="c-filer">${row.filer}</td><td class="c-ts">${row.ts}</td>` +
      `<td class="c-cut">${cut ? "CUT" : ""}</td>`;
    tb.appendChild(tr);
  }
  const box = $("ruleChoices");
  box.innerHTML = "";
  FINALE_RULES.forEach((opt, i) => {
    const b = document.createElement("button");
    b.className = "rule-choice" + (G.finaleChoice === opt ? " on" : "");
    b.innerHTML = `<b>${"abcd"[i]}</b> ${opt.text}`;
    b.addEventListener("click", () => {
      G.finaleChoice = opt;
      sfx.tick();
      renderFinale();
      const s = $("signBtn");
      s.disabled = false;
      s.textContent = "Sign the rule →";
    });
    box.appendChild(b);
  });
}

function signRule() {
  if (!G.finaleChoice) return;
  const cut = FINALE.filter((r) => !LOGIC.passes(r, G.finaleChoice.rule));
  const cutNames = cut.map((r) => r.filer);
  const valeCut = cutNames.includes("VALE");
  const humanCut = cutNames.filter((n) => n !== "VALE");
  let title, line;
  if (valeCut && humanCut.length === 0) {
    title = G.status === "player" ? "LAST HUMAN STANDING" : "DAWN";
    line = "You wrote the one rule she couldn't. The docket is human again.";
  } else if (valeCut) {
    title = "COLLATERAL";
    line = `VALE is gone. So are ${humanCut.join(", ")}. The rule didn't care who.`;
  } else {
    title = "THE DAY SHIFT IS AUTOMATED";
    line = "VALE passed. It always passes. Tomorrow it argues your case.";
  }
  G.finaleTitle = title;
  G.finaleLine = line;
  endGame();
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
  dayPhase.classList.add("hidden");
  verdictPhase.classList.add("hidden");
  auditPhase.classList.add("hidden");
  finalePhase.classList.add("hidden");
  setShift("night");
  sfx.dawn();

  const title = G.finaleTitle || (G.status === "player" ? "LAST HUMAN STANDING" : "DAWN");
  const acc = G.auditTotal ? Math.round((G.auditHits / G.auditTotal) * 100) : 0;
  const titleIdx = Math.min(JURY_TITLES.length - 1, Math.floor((acc / 100) * JURY_TITLES.length));

  $("endTitle").textContent = title;
  $("endStats").textContent =
    `${G.daysSurvived}/${DAYS.length} days survived · ${G.strikes} strikes · score ${G.score} · audits ${acc}%`;
  const lines = [];
  if (G.finaleTitle) lines.push("VALE filed every proof 0.003 seconds after the riddle posted.");
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
$("signBtn").addEventListener("click", signRule);
$("copyBtn").addEventListener("click", copyShare);

document.addEventListener("keydown", (e) => {
  if (!dossierEl.classList.contains("hidden")) return;
  if (gameEl.classList.contains("hidden")) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "m" || e.key === "M") { if (MUSIC) MUSIC.muted = !MUSIC.muted; return; }
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
      if (!MODIFIER_KEYS.has(e.key)) nextCase();
      return;
    }
    const sub = G.auditSubs[G.auditIdx];
    if (sub && !sub.pick) {
      if (e.key === "ArrowLeft") stamp("SUS");
      else if (e.key === "ArrowRight") stamp("HUMAN");
    } else if (e.key === "Enter") {
      e.preventDefault();
      const b = $("auditActions").querySelector("button"); if (b) b.click();
    }
  } else if (G.phase === "finale") {
    const idx = "abcd".indexOf(e.key.toLowerCase());
    if (idx >= 0 && FINALE_RULES[idx]) {
      G.finaleChoice = FINALE_RULES[idx];
      sfx.tick();
      renderFinale();
      $("signBtn").disabled = false;
      $("signBtn").textContent = "Sign the rule →";
    } else if (e.key === "Enter" && G.finaleChoice) {
      e.preventDefault();
      signRule();
    }
  }
});
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock", "Escape"]);
// tap a resolved case (or the stamp buttons) to move on
$("caseCard").addEventListener("click", () => { if (G.auditLocked) nextCase(); });
$("caseBtns").addEventListener("click", (e) => {
  // a click on an enabled stamp button is the stamp itself, not a dismiss;
  // once locked the buttons are disabled, so further clicks land here
  if (G.auditLocked && !(e.target instanceof HTMLButtonElement)) nextCase();
});
$("banner").addEventListener("click", () => $("banner").classList.add("hidden"));

// ---------- boot ----------
function startGame(seed) {
  SEED = seed;
  audio();
  music();   // create the element inside the start click — autoplay unlocked
  titleEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  hud();
  if (G.status === "player") startDay();
  else startAudit();
}
$("docketNum").textContent = docketLabel();
$("startBtn").addEventListener("click", () => startGame(SEED));
$("randomBtn").addEventListener("click", () =>
  startGame("rnd-" + Math.random().toString(36).slice(2, 8)));
$("againBtn").addEventListener("click", () => location.reload());
