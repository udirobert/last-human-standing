/* NIGHT SHIFT — pure rule/deal logic. No DOM.
 * Exposes window.NIGHT_SHIFT_LOGIC in the browser and module.exports in
 * node (for test-logic). Verdicts are deterministic: a card passes iff it
 * meets EVERY criterion of the day's secret rule.
 *
 * All gameplay randomness flows through makeRng(seed): the caller builds
 * per-purpose streams `makeRng(seed + "|" + dayIndex + "|" + purpose)` so a
 * run's deals don't depend on the path taken through the game. */
(function (root) {

const ATTR_KEYS = ["place", "time", "people", "setting"];

// ---------- seeded rng ----------
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedString) { return mulberry32(xmur3(String(seedString))()); }

/** A card passes iff it satisfies every criterion in the rule. */
function passes(card, rule) {
  return rule.every((c) => c.allow.includes(card.tags[c.key]));
}

/** Per-fact verdict: { status: "pass"|"fail"|null, needed }.
 *  status null = that fact isn't part of the rule ("not checked").
 *  needed = the criterion's plain-words text, set only on fails. */
function check(card, rule) {
  const out = {};
  for (const k of ATTR_KEYS) out[k] = { status: null, needed: null };
  for (const c of rule) {
    const ok = c.allow.includes(card.tags[c.key]);
    out[c.key] = { status: ok ? "pass" : "fail", needed: ok ? null : c.text };
  }
  return out;
}

function failKeys(card, rule) {
  return rule.filter((c) => !c.allow.includes(card.tags[c.key])).map((c) => c.key);
}

/** Fails exactly one criterion — the most instructive kind of SUS. */
function nearMiss(card, rule) {
  return failKeys(card, rule).length === 1;
}

// rng helpers — every function takes rng, defaulting to Math.random
function ri(rng, n) { return Math.floor(rng() * n); }
function pick(rng, arr) { return arr[ri(rng, arr.length)]; }
function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = ri(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** The day's deal: ARIA's precedent rulings (docket) + the player's hand.
 *  Normal days: docket = 2 HUMAN precedents + max(2, rule.length) SUS
 *  near-misses. Liar days (index 3–4): additionally ONE extra true SUS
 *  failing only criterion X and ONE LIAR — a card failing only X but
 *  stamped HUMAN. X is chosen so the liar is always outvoted by ≥2
 *  truthful SUS rows on the same criterion — solvable, not guessable. */
function deal(cards, day, dayIndex, rng = Math.random) {
  const rule = day.rule;
  const P = cards.filter((c) => passes(c, rule));
  const F = cards.filter((c) => !passes(c, rule));
  const nonRuleKeys = ATTR_KEYS.filter((k) => !rule.some((c) => c.key === k));
  const liarDay = dayIndex >= 3;

  // --- docket humans: the pair of passers that differ on the most
  // non-rule facts (shows the rule's edges), random among ties ---
  let bestPairs = [], bestDiff = -1;
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      const d = nonRuleKeys.filter((k) => P[i].tags[k] !== P[j].tags[k]).length;
      if (d > bestDiff) { bestDiff = d; bestPairs = [[P[i], P[j]]]; }
      else if (d === bestDiff) bestPairs.push([P[i], P[j]]);
    }
  }
  const humans = bestPairs.length ? pick(rng, bestPairs) : P.slice(0, 2);
  const used = new Set(humans.map((c) => c.id));
  const docket = humans.map((card) => ({ card, verdict: "HUMAN", lie: false }));
  const sharedWithHumans = (c) =>
    ATTR_KEYS.filter((k) => humans.some((h) => h.tags[k] === c.tags[k])).length;
  const failsOnly = (c, key) =>
    failKeys(c, rule).length === 1 && failKeys(c, rule)[0] === key;

  // --- liar day setup: pick the contested criterion X ---
  let liarX = null, liarCard = null;
  if (liarDay) {
    const candX = rule
      .map((c) => c.key)
      .filter((k) => F.filter((c) => !used.has(c.id) && failsOnly(c, k)).length >= 3);
    if (candX.length) liarX = pick(rng, candX);
  }

  // --- docket sus: one fails-only-this-criterion card per criterion,
  // preferring maximal overlap with the precedents; then near-misses,
  // then any remaining failures ---
  const nSus = Math.max(2, rule.length);
  const sus = [];
  for (const crit of rule) {
    if (sus.length >= nSus) break;
    const cands = F.filter((c) => !used.has(c.id) && failsOnly(c, crit.key));
    if (!cands.length) continue;
    const top = Math.max(...cands.map(sharedWithHumans));
    const chosen = pick(rng, cands.filter((c) => sharedWithHumans(c) === top));
    sus.push(chosen); used.add(chosen.id);
  }
  // --- liar-day extras: a second true SUS on X, then the liar itself ---
  if (liarX) {
    const xPool = () => F.filter((c) => !used.has(c.id) && failsOnly(c, liarX));
    const extra = pick(rng, xPool());
    if (extra) { sus.push(extra); used.add(extra.id); }
    liarCard = pick(rng, xPool());
    if (liarCard) used.add(liarCard.id);
    else liarCard = null;
  }
  const fill = shuffle(rng, F.filter((c) => !used.has(c.id) && nearMiss(c, rule)))
    .concat(shuffle(rng, F.filter((c) => !used.has(c.id) && !nearMiss(c, rule))));
  for (const c of fill) {
    if (sus.length >= nSus + (liarX ? 1 : 0)) break;
    sus.push(c); used.add(c.id);
  }
  sus.forEach((card) => docket.push({ card, verdict: "SUS", lie: false }));
  if (liarCard) docket.push({ card: liarCard, verdict: "HUMAN", lie: true });

  // --- hand: 4 cards outside the docket; day 1 deals two passers so the
  // first deduction can't brick a new player; afterwards exactly one ---
  const pool = cards.filter((c) => !used.has(c.id));
  const wantPass = dayIndex === 0 ? 2 : 1;
  const hand = shuffle(rng, pool.filter((c) => passes(c, rule))).slice(0, wantPass);
  const fPool = shuffle(rng, pool.filter((c) => !passes(c, rule)));
  const near = fPool.filter((c) => nearMiss(c, rule));
  const rest = fPool.filter((c) => !nearMiss(c, rule));
  for (const c of near.concat(rest)) {
    if (hand.length >= 4) break;
    hand.push(c);
  }

  return { docket: shuffle(rng, docket), hand: shuffle(rng, hand) };
}

/** The "+ Request another ruling" clue: one more TRUTHFUL docket row from
 *  outside docket ∪ hand. Prefers a passer that differs from the true
 *  HUMAN rows on the most non-rule facts; falls back to a near-miss SUS,
 *  then anything left. */
function extraRuling(cards, day, dealResult, rng = Math.random) {
  const rule = day.rule;
  const used = new Set([
    ...dealResult.docket.map((r) => r.card.id),
    ...dealResult.hand.map((c) => c.id),
  ]);
  const pool = cards.filter((c) => !used.has(c.id));
  if (!pool.length) return null;
  const nonRuleKeys = ATTR_KEYS.filter((k) => !rule.some((c) => c.key === k));
  const humans = dealResult.docket.filter((r) => r.verdict === "HUMAN" && !r.lie).map((r) => r.card);
  const diff = (c) =>
    nonRuleKeys.filter((k) => humans.every((h) => h.tags[k] !== c.tags[k])).length;
  const passers = pool.filter((c) => passes(c, rule));
  let card;
  if (passers.length) {
    const top = Math.max(...passers.map(diff));
    card = pick(rng, passers.filter((c) => diff(c) === top));
  } else {
    const near = pool.filter((c) => nearMiss(c, rule));
    card = near.length ? pick(rng, near) : pick(rng, pool);
  }
  return { card, verdict: passes(card, rule) ? "HUMAN" : "SUS", lie: false };
}

/** The night shift's five filings.
 *  Returns { cases: [{card, rule, amended, bot}], amendAfter }.
 *  Unamended days: 5 cases under day.rule (2–3 pass, per-criterion
 *  near-misses), amendAfter null.
 *  Amended days: amendAfter ∈ {2,3}; the first amendAfter cases run under
 *  day.rule, the rest under day.amend.rule; each segment holds ≥1 pass and
 *  ≥1 fail under its own rule and prefers a "trap" card whose verdict
 *  differs between the two rules.
 *  Exactly one case is bot:true — chosen at random among slots whose card
 *  passes the rule in force (VALE never files a failing proof). */
function auditSet(cards, day, dayIndex, excludeCard, rng = Math.random) {
  const rule = day.rule;
  const pool = cards.filter((c) => c !== excludeCard);
  const used = new Set();
  const isTrap = day.amend
    ? (c) => passes(c, rule) !== passes(c, day.amend.rule)
    : () => false;

  const draw = (size, segRule, trapFirst, pre) => {
    const sel = pre ? [pre] : [];
    const prefer = (list) => {
      if (!trapFirst) return shuffle(rng, list);
      return shuffle(rng, list.filter(isTrap)).concat(shuffle(rng, list.filter((c) => !isTrap(c))));
    };
    const P = prefer(pool.filter((c) => !used.has(c.id) && passes(c, segRule)));
    const F = prefer(pool.filter((c) => !used.has(c.id) && !passes(c, segRule)));
    // guarantee the mix only where `pre` didn't already provide it
    if (P.length && !sel.some((c) => passes(c, segRule)) && sel.length < size) {
      sel.push(P[0]); used.add(P[0].id);
    }
    if (F.length && !sel.some((c) => !passes(c, segRule)) && sel.length < size) {
      sel.push(F[0]); used.add(F[0].id);
    }
    const rest = prefer(pool.filter((c) => !used.has(c.id)));
    while (sel.length < size && rest.length) { const c = rest.shift(); sel.push(c); used.add(c.id); }
    return shuffle(rng, sel);
  };

  let amendAfter = null, cases;
  if (!day.amend) {
    // original balance: 2–3 passers, near-miss per criterion where one exists
    const nPass = 2 + (rng() < 0.5 ? 1 : 0);
    const P = shuffle(rng, pool.filter((c) => passes(c, rule)));
    const set = P.slice(0, Math.min(nPass, P.length));
    set.forEach((c) => used.add(c.id));
    const F = pool.filter((c) => !passes(c, rule));
    for (const crit of rule) {
      if (set.length >= 5) break;
      const c = F.find((x) => !used.has(x.id) && failKeys(x, rule).length === 1 && failKeys(x, rule)[0] === crit.key);
      if (c) { set.push(c); used.add(c.id); }
    }
    for (const c of shuffle(rng, F.filter((x) => !used.has(x.id)))) {
      if (set.length >= 5) break;
      set.push(c); used.add(c.id);
    }
    cases = shuffle(rng, set).map((card) => ({ card, rule, amended: false, bot: false }));
  } else {
    amendAfter = 2 + (rng() < 0.5 ? 1 : 0);
    // reserve an amended-rule passer (traps first) before seg1 draws —
    // the amended pool can be tiny and seg1 would eat it as filler
    const P2 = pool.filter((c) => passes(c, day.amend.rule));
    const P2t = P2.filter(isTrap);
    const resPass = P2.length ? pick(rng, P2t.length ? P2t : P2) : null;
    if (resPass) used.add(resPass.id);
    const seg1 = draw(amendAfter, rule, false);
    const seg2 = draw(5 - amendAfter, day.amend.rule, true, resPass);
    cases = seg1.map((card) => ({ card, rule, amended: false, bot: false }))
      .concat(seg2.map((card) => ({ card, rule: day.amend.rule, amended: true, bot: false })));
  }

  // the bot (VALE) is a random slot whose card passes its rule in force
  const passSlots = cases.map((c, i) => (passes(c.card, c.rule) ? i : -1)).filter((i) => i >= 0);
  if (passSlots.length) cases[pick(rng, passSlots)].bot = true;
  return { cases, amendAfter };
}

const api = {
  makeRng, passes, check, nearMiss, failKeys,
  deal, extraRuling, auditSet, ATTR_KEYS,
};
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (root) root.NIGHT_SHIFT_LOGIC = api;
})(typeof window !== "undefined" ? window : null);
