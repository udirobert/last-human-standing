/* audit-deduction.mjs — the Golden Idol loop, automated.
 *
 * For each day x N seeds: deal a docket, then ask what a perfect logician
 * could conclude from the stamps alone. Candidate theories = every
 * single-criterion rule (allow-sets of size 1-2, the shapes a player would
 * actually hypothesize) + every two-criterion combination + the true rule.
 * Sizes are capped at 2 deliberately: allow-sets of 3+ are shapes players
 * almost never hypothesize unprompted, and counting them would inflate
 * "ambiguity" with theories no human holds.
 *
 * Liar days are judged on TRUTHFUL rows only — the lie is fog, and fog is
 * the intended challenge. A separate cover metric tracks whether the lie
 * actually shelters an alternate theory.
 *
 * Reports per day:
 *  - pinned %: the true rule is the ONLY non-equivalent theory fitting
 *    the truthful stamps. (Equivalent theories — same extension on the
 *    card pool — always file safe, so they don't count against pinning.)
 *  - baited %: some fitting, non-equivalent theory admits a TRUE-FAILING
 *    card that is sitting in the player's HAND. A sound-reasoning player
 *    could file it and strike. This is unfairness, quantified.
 *  - rows-to-pin: docket rows needed (greedy) to pin the truth.
 *    size 1 = a SUPERFLUOUS CLUE — one row solves the day alone.
 *  - liar days: lie-covers % (an alternate fits even the lie's false
 *    stamp — the intended fog is present).
 *
 * Report-only (exit 0). Run: node audit-deduction.mjs
 */
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
const { CARDS, DAYS, ATTR_KEYS } = globalThis.window.NIGHT_SHIFT_DATA;

const N = 300;

// ---- candidate theories ----
const observed = {};
for (const k of ATTR_KEYS) observed[k] = [...new Set(CARDS.map((c) => c.tags[k]))];
const subsets12 = (vals) => {
  const out = vals.map((v) => [v]);
  for (let i = 0; i < vals.length; i++)
    for (let j = i + 1; j < vals.length; j++) out.push([vals[i], vals[j]]);
  return out;
};
const singleCands = [];
for (const k of ATTR_KEYS)
  for (const allow of subsets12(observed[k])) singleCands.push([{ key: k, allow }]);
const pairCands = [];
for (let a = 0; a < ATTR_KEYS.length; a++)
  for (let b = a + 1; b < ATTR_KEYS.length; b++)
    for (const aa of subsets12(observed[ATTR_KEYS[a]]))
      for (const bb of subsets12(observed[ATTR_KEYS[b]]))
        pairCands.push([
          { key: ATTR_KEYS[a], allow: aa },
          { key: ATTR_KEYS[b], allow: bb },
        ]);

const keyOf = (r) => JSON.stringify(r.map((c) => [c.key, [...c.allow].sort()]).sort());
const consistent = (rule, rows) =>
  rows.every((r) => LOGIC.passes(r.card, rule) === (r.verdict === "HUMAN"));

for (let di = 0; di < DAYS.length; di++) {
  const day = DAYS[di];
  const trueKey = keyOf(day.rule);
  const cands = [...singleCands, ...pairCands];
  if (!cands.some((c) => keyOf(c) === trueKey)) cands.push(day.rule);
  // extension of the truth on the card pool — equivalent theories file safe
  const trueExt = CARDS.map((c) => (LOGIC.passes(c, day.rule) ? 1 : 0)).join("");
  const equivalent = (c) =>
    CARDS.every((card) => LOGIC.passes(card, c) === LOGIC.passes(card, day.rule));
  void trueExt;
  const liarDay = di >= 3;

  let pinned = 0, baited = 0, cover = 0, truthErrors = 0;
  let singleConf = 0, pinTruthful = 0, oneWordHarmful = 0;
  // one-word theories: single VALUE rules, the shapes players actually hold.
  // Harmful = fits the truthful stamps AND admits a truth-failing hand card.
  const oneWord = [];
  for (const k of ATTR_KEYS)
    for (const v of observed[k]) oneWord.push([{ key: k, allow: [v] }]);
  const sizes = {};
  const singleRowWins = { HUMAN: 0, SUS: 0 };
  const confusers = {};

  for (let t = 0; t < N; t++) {
    const rng = LOGIC.makeRng(`s${t}|${di}|deal`);
    const { docket, hand } = LOGIC.deal(CARDS, day, di, rng);
    const truthful = docket.filter((r) => !r.lie);

    if (!consistent(day.rule, truthful)) { truthErrors++; continue; }
    const fits = cands.filter(
      (c) => keyOf(c) !== trueKey && !equivalent(c) && consistent(c, truthful));
    if (!fits.length) pinned++;
    else {
      if (oneWord.some((c) => keyOf(c) !== trueKey && !equivalent(c) &&
        consistent(c, truthful) && hand.some((h) =>
          LOGIC.passes(h, c) && !LOGIC.passes(h, day.rule)))) oneWordHarmful++;
      if (fits.some((c) => c.length === 1)) singleConf++;
      for (const c of fits) confusers[keyOf(c)] = (confusers[keyOf(c)] || 0) + 1;
      // baited: a fitting theory admits a true-failing card from the hand
      if (fits.some((c) => hand.some((h) =>
        LOGIC.passes(h, c) && !LOGIC.passes(h, day.rule)))) baited++;
    }

    // greedy sufficient subset of the truthful rows
    let remaining = [...fits];
    let used = 0;
    const pool = [...truthful];
    while (remaining.length && pool.length) {
      let bi = 0, bkill = -1;
      pool.forEach((row, i) => {
        const kill = remaining.filter((c) => !consistent(c, [row])).length;
        if (kill > bkill) { bkill = kill; bi = i; }
      });
      const [row] = pool.splice(bi, 1);
      used++;
      remaining = remaining.filter((c) => consistent(c, [row]));
      if (used === 1 && !remaining.length)
        singleRowWins[row.verdict === "HUMAN" ? "HUMAN" : "SUS"]++;
    }
    sizes[remaining.length ? "unpinned" : used] =
      (sizes[remaining.length ? "unpinned" : used] || 0) + 1;

    if (liarDay) {
      const fitsT = cands.filter((c) => consistent(c, truthful));
      if (fitsT.length === 1 && keyOf(fitsT[0]) === trueKey) pinTruthful++;
      if (cands.some((c) => keyOf(c) !== trueKey && !equivalent(c) &&
        consistent(c, docket))) cover++;
    }
  }

  const top = Object.entries(confusers).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, n]) => `${k} (${(100 * n / N).toFixed(0)}%)`).join(" | ");
  console.log(
    `${day.dayLabel} ${day.theme}` +
    ` · pinned ${(100 * pinned / N).toFixed(0)}%` +
    ` · BAITED ${(100 * baited / N).toFixed(0)}%` +
    ` · singleton-confuser ${(100 * singleConf / N).toFixed(0)}%` +
    ` · ONE-WORD-HARMFUL ${(100 * oneWordHarmful / N).toFixed(0)}%` +
    ` · rows-to-pin {` + Object.entries(sizes).map(([k, v]) =>
      `${k}:${(100 * v / N).toFixed(0)}%`).join(" ") + `}` +
    ` · single-row-wins H:${singleRowWins.HUMAN} S:${singleRowWins.SUS}` +
    (liarDay ? ` · truthful-pins ${(100 * pinTruthful / N).toFixed(0)}% · lie-covers ${(100 * cover / N).toFixed(0)}%` : "") +
    (truthErrors ? ` · TRUTH-ERRORS ${truthErrors}` : "") +
    (top ? `\n    top confusers: ${top}` : "")
  );
}
