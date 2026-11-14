/* test-logic.mjs — randomized deal/audit invariants for NIGHT SHIFT.
 * Loads riddles.js + logic.js the way index.html does (plain scripts on a
 * fake window) and hammers deal()/auditSet()/extraRuling() 2000 seeded
 * times per day. Run: node test-logic.mjs */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
globalThis.window = {};
const run = (f) => new Function("window", "module", readFileSync(join(dir, f), "utf8"));
run("riddles.js")(globalThis.window, { exports: {} });
const mod = { exports: {} };
new Function("window", "module", readFileSync(join(dir, "logic.js"), "utf8"))
  (globalThis.window, mod);
const LOGIC = mod.exports;
const { CARDS, DAYS, FINALE } = globalThis.window.NIGHT_SHIFT_DATA;

const N = 2000;
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; if (failures < 12) console.error("FAIL:", msg); } };
const J = (o) => JSON.stringify(o, (k, v) => v); // stable enough: insertion order is deterministic

function checkDay(day, di, verbose = true, n = N) {
  const rule = day.rule;
  const wantPass = di === 0 ? 2 : 1;
  const nSus = Math.max(2, rule.length);
  const liarDay = di >= 3;
  const cov = Object.fromEntries(rule.map((c) => [c.key, 0]));
  let detDeals = 0, detAudits = 0, detClues = 0, traps = 0, trapChecked = 0;

  for (let t = 0; t < n; t++) {
    const rngD = () => LOGIC.makeRng(`s${t}|${di}|deal`);
    const d1 = LOGIC.deal(CARDS, day, di, rngD());
    const d2 = LOGIC.deal(CARDS, day, di, rngD());
    if (J(d1) === J(d2)) detDeals++;
    const { docket, hand } = d1;

    const humans = docket.filter((r) => r.verdict === "HUMAN" && !r.lie).map((r) => r.card);
    const sus = docket.filter((r) => r.verdict === "SUS").map((r) => r.card);
    const lies = docket.filter((r) => r.lie);
    assert(humans.length === 2, `${day.dayLabel}: docket humans ${humans.length} != 2`);
    assert(humans.every((c) => LOGIC.passes(c, rule)), `${day.dayLabel}: true HUMAN row fails rule`);
    const expSus = nSus + (liarDay ? 1 : 0);
    assert(sus.length === expSus, `${day.dayLabel}: docket sus ${sus.length} != ${expSus}`);
    assert(sus.every((c) => !LOGIC.passes(c, rule)), `${day.dayLabel}: SUS row passes rule`);
    // every non-lie row's stamp equals truth
    assert(docket.filter((r) => !r.lie).every((r) =>
      (r.verdict === "HUMAN") === LOGIC.passes(r.card, rule)), `${day.dayLabel}: truthful stamp wrong`);
    if (liarDay) {
      assert(lies.length === 1, `${day.dayLabel}: ${lies.length} lies != 1`);
      const lx = LOGIC.failKeys(lies[0].card, rule);
      assert(lies[0].verdict === "HUMAN" && lx.length === 1, `${day.dayLabel}: liar malformed`);
      const xSus = sus.filter((c) =>
        LOGIC.failKeys(c, rule).length === 1 && LOGIC.failKeys(c, rule)[0] === lx[0]);
      assert(xSus.length >= 2, `${day.dayLabel}: only ${xSus.length} true SUS on liar criterion`);
    } else {
      assert(lies.length === 0, `${day.dayLabel}: unexpected lie row`);
    }
    const docketIds = new Set(docket.map((r) => r.card.id));
    assert(docketIds.size === docket.length, `${day.dayLabel}: dup docket card`);

    assert(hand.length === 4, `${day.dayLabel}: hand ${hand.length} != 4`);
    assert(new Set(hand.map((c) => c.id)).size === 4, `${day.dayLabel}: dup hand card`);
    assert(hand.every((c) => !docketIds.has(c.id)), `${day.dayLabel}: hand overlaps docket`);
    assert(hand.filter((c) => LOGIC.passes(c, rule)).length === wantPass,
      `${day.dayLabel}: hand passing != ${wantPass}`);

    for (const crit of rule) {
      if (sus.some((c) => LOGIC.failKeys(c, rule).length === 1 &&
                        LOGIC.failKeys(c, rule)[0] === crit.key)) cov[crit.key]++;
    }

    // clue
    const rC = () => LOGIC.makeRng(`s${t}|${di}|clue`);
    const c1 = LOGIC.extraRuling(CARDS, day, { docket, hand }, rC());
    const c2 = LOGIC.extraRuling(CARDS, day, { docket, hand }, rC());
    if (J(c1) === J(c2)) detClues++;
    if (c1) {
      assert(!docketIds.has(c1.card.id) && !hand.includes(c1.card),
        `${day.dayLabel}: clue overlaps docket/hand`);
      assert((c1.verdict === "HUMAN") === LOGIC.passes(c1.card, rule),
        `${day.dayLabel}: clue stamp untruthful`);
    }

    // audit
    const rA = () => LOGIC.makeRng(`s${t}|${di}|audit`);
    const a1 = LOGIC.auditSet(CARDS, day, di, hand[0], rA());
    const a2 = LOGIC.auditSet(CARDS, day, di, hand[0], rA());
    if (J(a1) === J(a2)) detAudits++;
    const { cases, amendAfter } = a1;
    assert(cases.length === 5, `${day.dayLabel}: audit ${cases.length} != 5`);
    assert(new Set(cases.map((c) => c.card.id)).size === 5, `${day.dayLabel}: dup audit card`);
    assert(cases.every((c) => c.card !== hand[0]), `${day.dayLabel}: audit includes excluded card`);
    const bots = cases.filter((c) => c.bot);
    assert(bots.length === 1 && LOGIC.passes(bots[0].card, bots[0].rule),
      `${day.dayLabel}: bot missing or fails its rule`);
    if (!day.amend) {
      assert(amendAfter === null, `${day.dayLabel}: unexpected amendAfter`);
      const ap = cases.filter((c) => LOGIC.passes(c.card, rule)).length;
      assert(ap >= 2 && ap <= 3, `${day.dayLabel}: audit passers ${ap} outside 2–3`);
    } else {
      assert(amendAfter === 2 || amendAfter === 3, `${day.dayLabel}: amendAfter ${amendAfter}`);
      const seg1 = cases.slice(0, amendAfter), seg2 = cases.slice(amendAfter);
      assert(seg1.every((c) => c.rule === rule && !c.amended), `${day.dayLabel}: seg1 not base rule`);
      assert(seg2.every((c) => c.rule === day.amend.rule && c.amended), `${day.dayLabel}: seg2 not amended`);
      const s1p = seg1.filter((c) => LOGIC.passes(c.card, rule)).length;
      const s1f = seg1.length - s1p;
      const s2p = seg2.filter((c) => LOGIC.passes(c.card, day.amend.rule)).length;
      const s2f = seg2.length - s2p;
      assert(s1p >= 1 && s1f >= 1, `${day.dayLabel}: seg1 lacks pass/fail mix`);
      assert(s2p >= 1 && s2f >= 1, `${day.dayLabel}: seg2 lacks pass/fail mix`);
      trapChecked++;
      if (seg2.some((c) => LOGIC.passes(c.card, rule) !== LOGIC.passes(c.card, day.amend.rule))) traps++;
    }
  }

  console.log(
    `${day.dayLabel} ${day.theme.padEnd(14)} — ${n} seeds OK` +
    ` · det ${detDeals}/${detAudits}/${detClues}` +
    ` · SUS coverage: ` + rule.map((c) => `${c.key} ${(100 * cov[c.key] / n).toFixed(0)}%`).join(" ·") +
    (day.amend ? ` · trap ${(100 * traps / trapChecked).toFixed(0)}%` : "")
  );
}
for (let di = 0; di < DAYS.length; di++) checkDay(DAYS[di], di);

// ---- overtime: generated shifts must satisfy every hand-day invariant ----
const OT_N = 300;
let otWeeks = 0, otDetFail = 0;
for (let t = 0; t < OT_N; t++) {
  const rng1 = LOGIC.makeRng(`ot${t}`);
  const days = LOGIC.genDays(rng1, CARDS);
  assert(days.length === 5, `ot${t}: ${days.length} days != 5`);
  assert(J(days) === J(LOGIC.genDays(LOGIC.makeRng(`ot${t}`), CARDS)), `ot${t}: gen not deterministic`);
  days.forEach((day, di) => {
    assert(day.rule && day.rule.length >= 1 && day.rule.length <= 3, `ot${t} d${di}: bad rule`);
    assert(day.riddle && day.ariaLine && day.theme, `ot${t} d${di}: missing flavor`);
    assert(day.dayLabel === `OT ${di + 1}`, `ot${t} d${di}: label`);
    const before = failures;
    checkDay(day, di, false, 60);
    if (failures > before) otDetFail++;
  });
  otWeeks++;
}
console.log(`overtime: ${otWeeks} generated weeks × 5 days OK` + (otDetFail ? ` · ${otDetFail} day-level failures` : ""));

// ---- finale rotation: the machine wears a seeded face, exactly one clause cuts it alone ----
const FILERS = ["MARA", "OKO", "JUN", "TESS", "VALE"];
const FN = 2000;
for (let t = 0; t < FN; t++) {
  const rngF = LOGIC.makeRng(`fin${t}`);
  const a = LOGIC.buildFinale(rngF, CARDS);
  const b = LOGIC.buildFinale(LOGIC.makeRng(`fin${t}`), CARDS);
  assert(J(a) === J(b), `fin${t}: buildFinale not deterministic`);
  const { rows, culprit, opts } = a;
  assert(FILERS.includes(culprit), `fin${t}: culprit ${culprit} not a filer`);
  assert(rows.length === 5 && new Set(rows.map((r) => r.filer)).size === 5, `fin${t}: rows/filers`);
  assert(new Set(rows.map((r) => r.name)).size === 5, `fin${t}: duplicate finale cards`);
  const crow = rows.find((r) => r.filer === culprit);
  assert(crow && crow.ts === "+0.003s", `fin${t}: culprit ts wrong`);
  assert(rows.filter((r) => r !== crow).every((r) => r.ts !== "+0.003s"), `fin${t}: human carries machine ts`);
  assert(opts.length === 4 && new Set(opts.map((o) => o.text)).size === 4, `fin${t}: clause count`);
  const cutLists = opts.map((o) => rows.filter((row) => !LOGIC.passes(row, o.rule)).map((row) => row.filer));
  const winners = cutLists.filter((c) => c.length === 1 && c[0] === culprit).length;
  assert(winners === 1, `fin${t}: ${winners} clauses cut only ${culprit}`);
}
console.log(`finale rotation: ${FN} seeds OK · culprit assigned uniformly, one clause cuts it alone`);

// finale: exactly one option cuts only VALE; option d spares only VALE
const FOPT = [
  [{ key: "people", allow: ["pair", "group"], text: "with someone else" }],
  [{ key: "setting", allow: ["outdoor"], text: "outdoors" }],
  [{ key: "time", allow: ["dawn", "day", "dusk"], text: "not at night" }],
  [{ key: "time", allow: ["night"], text: "at night" }],
];
const cuts = FOPT.map((r) => FINALE.filter((f) => !LOGIC.passes(f, r)).map((f) => f.filer));
const onlyVale = cuts.filter((c) => c.length === 1 && c[0] === "VALE").length;
assert(onlyVale === 1, `finale: ${onlyVale} options cut only VALE`);
assert(cuts[3].length === FINALE.length - 1 && !cuts[3].includes("VALE"),
  "finale: option d doesn't spare only VALE");
console.log(`finale cuts: ${cuts.map((c) => c.join("+") || "none").join(" | ")}`);

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures ? 1 : 0);
