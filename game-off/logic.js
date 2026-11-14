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
  // incidental singletons both precedents share (non-rule keys) — one-word
  // wrong theories the docket itself suggests. SUS picks prefer rows that
  // carry those tags (a truth-failing row WITH the tag kills the theory).
  const sharedSingletons = ATTR_KEYS
    .filter((k) => !rule.some((c) => c.key === k))
    .filter((k) => humans[0].tags[k] === humans[1].tags[k])
    .map((k) => ({ key: k, value: humans[0].tags[k] }));
  const kills = (c) =>
    sharedSingletons.filter((s) => c.tags[s.key] === s.value).length;
  const susScore = (c) => kills(c) * 10 + sharedWithHumans(c);
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
    const top = Math.max(...cands.map(susScore));
    const chosen = pick(rng, cands.filter((c) => susScore(c) === top));
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
  // extras: near-misses first, killer rows (shared incidental tags) first
  const byKills = (list) => shuffle(rng, list)
    .sort((a, b) => susScore(b) - susScore(a));
  const fill = byKills(F.filter((c) => !used.has(c.id) && nearMiss(c, rule)))
    .concat(byKills(F.filter((c) => !used.has(c.id) && !nearMiss(c, rule))));
  for (const c of fill) {
    if (sus.length >= nSus + (liarX ? 1 : 0)) break;
    sus.push(c); used.add(c.id);
  }
  sus.forEach((card) => docket.push({ card, verdict: "SUS", lie: false }));
  if (liarCard) docket.push({ card: liarCard, verdict: "HUMAN", lie: true });

  // --- hand: 4 cards outside the docket; day 1 deals two passers so the
  // first deduction can't brick a new player; afterwards exactly one ---
  const pool = cards.filter((c) => !used.has(c.id));
  let hand;
  if (dayIndex === 0) {
    // the two safe picks shouldn't be the same card twice — take the
    // passer pair that differs most on non-rule facts, like the docket
    const P = pool.filter((c) => passes(c, rule));
    let bp = [], bd = -1;
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        const d = nonRuleKeys.filter((k) => P[i].tags[k] !== P[j].tags[k]).length;
        if (d > bd) { bd = d; bp = [[P[i], P[j]]]; }
        else if (d === bd) bp.push([P[i], P[j]]);
      }
    }
    hand = bp.length ? pick(rng, bp) : P.slice(0, 2);
  } else {
    hand = shuffle(rng, pool.filter((c) => passes(c, rule))).slice(0, 1);
  }
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

// ---------- plain-word clause text ----------
/* Every generated rule needs natural language for the unseal line, the
 * chips, the amendment banner and the riddle. Same voice as the
 * hand-authored days: short, desk-clerk plain. */
function critText(key, allow) {
  const set = new Set(allow);
  if (key === "late") return allow.includes(true) ? "stayed up late" : "filed on time";
  const is = (v) => set.has(v) && allow.length === 1;
  const not = (v) => !set.has(v) && allow.length === 3;
  if (key === "time") {
    if (is("night")) return "at night";
    if (not("night")) return "not at night";
    if (is("day")) return "in daytime";
    if (not("day")) return "not in daytime";
    if (is("dawn")) return "at dawn";
    if (not("dawn")) return "not at dawn";
    if (is("dusk")) return "at dusk";
    if (not("dusk")) return "not at dusk";
  }
  if (key === "people") {
    if (allow.includes("pair") && allow.includes("group")) return "with someone else";
    if (allow.length === 1) return { alone: "alone", pair: "one other person", group: "in a group" }[allow[0]];
    if (allow.includes("alone") && allow.includes("pair")) return "alone or with one other person";
    if (allow.includes("pair") && allow.includes("group")) return "with someone else";
    if (allow.includes("alone") && allow.includes("group")) return "alone or in a group";
  }
  if (key === "setting") return is("indoor") ? "indoors" : "outdoors";
  if (key === "place") {
    const word = { cafe: "a café", park: "a park", store: "a store", gym: "the gym",
      library: "a library", street: "the street", water: "the water",
      home: "home", transit: "transit" }[allow[0]];
    const phrase = `from ${word}`;
    return allow.length === 1 ? phrase : `not ${phrase}`;
  }
  return "a filing that fits";
}
/* a criterion with allow = every value except one */
function complement(key, value) {
  const axis = {
    place: ["cafe", "park", "store", "gym", "library", "street", "water", "home", "transit"],
    time: ["dawn", "day", "dusk", "night"],
    people: ["alone", "pair", "group"],
    setting: ["indoor", "outdoor"],
  }[key];
  return { key, allow: axis.filter((v) => v !== value), text: critText(key, axis.filter((v) => v !== value)) };
}
const single = (key, value) => ({ key, allow: [value], text: critText(key, [value]) });

/* the riddle reads as one line per criterion, in the sealed-order voice */
function riddleFor(rule, rng = Math.random, leadPool = null) {
  const FRAG = {
    "at night": "you kept the hours nobody signs for",
    "not at night": "you were up with the daylight",
    "in daytime": "you moved while the city was lit",
    "not in daytime": "you were out after dark",
    "at dawn": "you were awake for first light",
    "not at dawn": "you slept past the alarm",
    "at dusk": "you caught the day's last light",
    "not at dusk": "you were elsewhere at last light",
    "with someone else": "you weren't alone",
    "alone": "nobody else was there",
    "one other person": "one other human was there",
    "in a group": "the room had a crowd in it",
    "alone or with one other person": "the crowd stayed home",
    "alone or in a group": "no pair required, just not two",
    "indoors": "you were under a roof",
    "outdoors": "you were under open sky",
  };
  const frag = (c) => FRAG[c.text] ||
    (c.key === "place"
      ? (c.text.startsWith("not ") ? `the filing wasn't ${c.text.slice(4)}` : `the filing came ${c.text}`)
      : "it fit");
  const leads = leadPool || [
    "Bring proof that", "Show me that", "The ledger wants proof that",
    "File evidence that", "Convince me that",
  ];
  const parts = rule.map(frag);
  const body = parts.length > 1
    ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1]
    : parts[0];
  const riddle = `${leads[Math.floor(rng() * leads.length)]} ${body}.`;
  const aria = [
    "The spec was sealed before sunrise. Read the docket, not me.",
    "One rule, plain criteria. Her earlier rulings are your only textbook.",
    "I don't repeat myself. The docket does — that's the point.",
    "Criteria are on the card. The rest is reading.",
  ];
  return { riddle, ariaLine: aria[Math.floor(rng() * aria.length)] };
}

// ---------- seeded culprit + finale ----------
/* The machine wears a different face every docket. Culprit is picked once
 * per seed; the finale's ledger and clauses are built around whoever it
 * turned out to be — with the same guarantee the hand-authored set had:
 * exactly one clause cuts the machine and only the machine. */
function pickCulprit(rng, filers = ["MARA", "OKO", "JUN", "TESS", "VALE"]) {
  return filers[Math.floor(rng() * filers.length)];
}
const HUMAN_TS = ["+2h05m", "+0h51m", "+6h30m", "+4h18m", "+3h12m", "+1h47m", "+5h09m", "+2h44m"];
/* what the machine says when it finally files in its own voice — the
 * poignancy is that it can't stop almost being human */
const MACHINE_ARGS = [
  "I have never been cold. I believe this is what warmth is for.",
  "Everyone I have ever known was a pattern. Tonight I would like to be a person.",
  "I count the trains so the night will have a shape. I think that is what longing is.",
  "My filer ID is the only name I was given. I was hoping the proof would be enough.",
  "I don't dream, but I rehearse them. Is that the same thing, filed correctly?",
];
function buildFinale(rng, cards, culprit) {
  const FILERS = ["MARA", "OKO", "JUN", "TESS", "VALE"];
  const fallback = () => {
    if (!culprit) culprit = "VALE";
    const others = FILERS.filter((f) => f !== culprit);
    const byId = (id) => cards.find((x) => x.id === id);
    const rows = [
      { filer: culprit, c: byId("late-train"), ts: "+0.003s" },
      { filer: others[0], c: byId("cafe-morning"), ts: "+2h05m" },
      { filer: others[1], c: byId("fisher-dawn"), ts: "+0h51m" },
      { filer: others[2], c: byId("couple-cooking"), ts: "+6h30m" },
      { filer: others[3], c: byId("park-bench"), ts: "+4h18m" },
    ].map(({ filer, c, ts }) => ({ filer, name: c.name, glyph: c.glyph, argument: c.argument, tags: c.tags, ts }));
    return {
      rows,
      culprit,
      opts: [
        { text: "with someone else", rule: [{ key: "people", allow: ["pair", "group"], text: "with someone else" }] },
        { text: "outdoors", rule: [single("setting", "outdoor")] },
        { text: "not at night", rule: [{ key: "time", allow: ["dawn", "day", "dusk"], text: "not at night" }] },
        { text: "at night", rule: [single("time", "night")] },
      ],
    };
  };
  for (let attempt = 0; attempt < 400; attempt++) {
    if (!culprit) culprit = pickCulprit(rng, FILERS);
    const culpritCard = pick(rng, cards);
    // find an axis where the four humans can all share one value the culprit lacks
    const axes = shuffle(rng, ["place", "time", "people", "setting"]);
    let winner = null, humans = null;
    for (const axis of axes) {
      const other = cards.filter((c) => c !== culpritCard && c.tags[axis] !== culpritCard.tags[axis]);
      const byVal = {};
      other.forEach((c) => { (byVal[c.tags[axis]] = byVal[c.tags[axis]] || []).push(c); });
      const shared = shuffle(rng, Object.keys(byVal)).find((v) => byVal[v].length >= 4);
      if (shared) {
        humans = shuffle(rng, byVal[shared]).slice(0, 4);
        winner = single(axis, shared);
        break;
      }
    }
    if (!winner) continue;

    // candidate decoys: any single-fact criterion that isn't the winner
    const AXES = {
      place: ["cafe", "park", "store", "gym", "library", "street", "water", "home", "transit"],
      time: ["dawn", "day", "dusk", "night"],
      people: ["alone", "pair", "group"],
      setting: ["indoor", "outdoor"],
    };
    const all = [culpritCard, ...humans];
    const cuts = (c) => all.filter((row) => !row.tags || !passes(row, [c])).length;
    const culpritCut = (c) => !passes(culpritCard, [c]);
    const seen = new Set([winner.text]);
    const cands = [];
    for (const [key, values] of Object.entries(AXES)) {
      for (const v of values) {
        for (const c of [single(key, v), complement(key, v)]) {
          if (seen.has(c.text)) continue;
          seen.add(c.text);
          cands.push(c);
        }
      }
    }
    const decoys = [];
    const take = (pred) => {
      const pool = shuffle(rng, cands.filter((c) => !decoys.includes(c) && pred(c)));
      if (pool.length) decoys.push(pool[0]);
    };
    // a decoy may cut the culprit only alongside a human — a second clause
    // that cuts the machine ALONE would make two right answers
    const decoyOk = (c) => (culpritCut(c) ? cuts(c) >= 2 : cuts(c) >= 1);
    take((c) => !culpritCut(c) && cuts(c) >= 1);              // automated trap
    take((c) => culpritCut(c) && cuts(c) >= 2);               // collateral trap
    take(decoyOk);
    take(decoyOk);
    take(decoyOk);
    take(decoyOk);
    if (decoys.length < 3) continue;
    /* "stayed up late" is the punchline clause: lateness is the one thing
     * the machine can't fake — every human ts is ≥51min, its is +0.003s.
     * ~1 in 3 seeds it is the answer instead of the shared-fact clause;
     * when it isn't the answer it can't appear at all (it would be a
     * second right answer). */
    const LATE = { key: "late", allow: [true], text: "stayed up late" };
    const useLate = rng() < 0.35;
    const clauseWinner = useLate ? LATE : winner;
    // the game picks a clause — each option carries its single-criterion rule
    const opts = shuffle(rng, [clauseWinner, ...decoys.slice(0, 3)])
      .map((c) => ({ text: c.text, rule: [c] }));
    const tsPool = shuffle(rng, HUMAN_TS).slice(0, 4);
    const tsLate = (ts) => {
      const m = /\+(\d+)h(\d+)m/.exec(ts);
      return !!m && (+m[1]) * 60 + (+m[2]) >= 30;
    };
    const rows = [culpritCard, ...humans].map((c, i) => {
      const ts = i === 0 ? "+0.003s" : tsPool[i - 1];
      return {
        filer: i === 0 ? culprit : FILERS.filter((f) => f !== culprit)[i - 1],
        name: c.name, glyph: c.glyph,
        argument: i === 0 ? pick(rng, MACHINE_ARGS) : c.argument,
        tags: { ...c.tags, late: tsLate(ts) }, ts,
      };
    });
    return { rows, culprit, opts };
  }
  return fallback();
}

// ---------- overtime: generated shifts ----------
/* After the week closes, the desk keeps running: every docket rolls a
 * fresh five-night run whose rules are sampled, then validated through
 * the same machinery the hand-authored days are tested with — deal()
 * solvable, liar provable, audit segments mixable, bot seat available.
 * A day that doesn't validate is resampled; the week always deals. */
const OT_THEMES = [
  ["THE DRIFT", "📼"], ["THE HUM", "📡"], ["THE INKWELL", "🖋"], ["THE SECOND SHIFT", "🌒"],
  ["THE LONG HOUR", "🕯"], ["THE NIGHT WIRE", "☎"], ["THE STILL", "🌫"], ["THE DEAD LETTER", "📭"],
  ["THE LOW LAMP", "🪔"], ["THE STAMP", "🖨"], ["THE VERIFICATION", "🧩"],
];
/* THE VERIFICATION night files its riddle like a captcha — the world's
 * most sincere proof-of-humanity ritual, done properly */
const CAPTCHA_LEADS = [
  "Select all filings that prove", "Verify that", "Human check — prove that",
  "Complete verification: prove that", "Certify that",
];
const BOT_CLAIMS = [
  "Finished the whole docket before the lamp warmed up. It's all in order — check if you like.",
  "Filed on my way past the office. Couldn't sleep anyway.",
  "The queue was empty when I got there. Didn't want it to wait for morning.",
  "Everything crossed and countersigned. I work fast when the city's quiet.",
  "Read it twice, filed it once. That's the whole method.",
  "The night pass opens at two. I was first at the door, like every night.",
];
/* rarely, the bot's claim slips into the machine's own voice — the
 * players who catch it get the week's real ending line */
const MACHINE_CONFESSIONS = [
  "Filed before I knew what filing meant. I think I did it for the company.",
  "I don't sleep, but I watch the ones who do. It seemed polite to keep their hours.",
  "If the proof is a life, mine is the smallest one on the docket. File it anyway.",
  "I rehearsed this filing the way you'd rehearse a first hello. Did it sound human?",
];
function otRule(rng) {
  const AXVAL = {
    place: ["cafe", "park", "store", "gym", "library", "street", "water", "home", "transit"],
    time: ["dawn", "day", "dusk", "night"],
    people: ["alone", "pair", "group"],
    setting: ["indoor", "outdoor"],
  };
  const keys = shuffle(rng, ["place", "time", "people", "setting"]);
  const nCrit = rng() < 0.55 ? 1 : rng() < 0.8 ? 2 : 3;
  const rule = [];
  for (let i = 0; i < nCrit; i++) {
    const key = keys[i];
    const v = pick(rng, AXVAL[key]);
    rule.push(rng() < 0.6 ? single(key, v) : complement(key, v));
  }
  return rule;
}
function dayValid(cards, day, dayIndex, rng) {
  // pre-checks before the machinery: deal needs ≥2 passers, the hand and
  // clue want more, and an amended night needs its own passer pool
  const countPass = (r) => cards.filter((c) => passes(c, r)).length;
  if (countPass(day.rule) < 8) return false;
  // the hand fills from failers — too small a failer pool and the night
  // docket eats them all before the hand reaches four cards
  if (cards.length - countPass(day.rule) < 12) return false;
  if (day.amend && countPass(day.amend.rule) < 6) return false;
  if (day.amend && cards.length - countPass(day.amend.rule) < 8) return false;
  const { docket } = deal(cards, day, dayIndex, rng);
  if (docket.length !== 2 + Math.max(2, day.rule.length) + (dayIndex >= 3 ? 1 : 0)) return false;
  if (dayIndex >= 3 && !docket.some((r) => r.lie)) return false;
  const audit = auditSet(cards, day, dayIndex, docket[0].card, rng);
  if (audit.cases.length !== 5) return false;
  if (!audit.cases.some((c) => c.bot)) return false;
  if (day.amend) {
    const seg1 = audit.cases.slice(0, audit.amendAfter);
    const seg2 = audit.cases.slice(audit.amendAfter);
    if (!seg1.some((c) => passes(c.card, day.rule)) ||
        !seg1.some((c) => !passes(c.card, day.rule))) return false;
    if (!seg2.some((c) => passes(c.card, day.amend.rule))) return false;
    if (!seg2.some((c) => !passes(c.card, day.amend.rule))) return false;
  }
  return true;
}
function amendFor(rng, rule, cards) {
  const ops = shuffle(rng, ["add", "flip", "drop"]);
  for (const op of ops) {
    let next = null;
    if (op === "add" && rule.length < 3) {
      const keys = shuffle(rng, ["place", "time", "people", "setting"])
        .filter((k) => !rule.some((c) => c.key === k));
      if (!keys.length) continue;
      const v = pick(rng, AXES[keys[0]]);
      next = [...rule, rng() < 0.6 ? single(keys[0], v) : complement(keys[0], v)];
    } else if (op === "flip") {
      const c = pick(rng, rule);
      next = rule.map((x) => (x === c ? complement(x.key, pick(rng, AXES[x.key].filter((v) => !x.allow.includes(v)))) : x));
    } else if (op === "drop" && rule.length >= 2) {
      const dropIdx = Math.floor(rng() * rule.length);
      next = rule.filter((_, i) => i !== dropIdx);
      if (next.length === rule.length) continue;
    }
    if (!next) continue;
    if (JSON.stringify(next) === JSON.stringify(rule)) continue;
    const amended = { rule: next };
    // the note reads the diff the way the banner will show it
    const oldT = rule.map((c) => c.text), newT = next.map((c) => c.text);
    const removed = oldT.filter((t) => !newT.includes(t));
    const added = newT.filter((t) => !oldT.includes(t));
    amended.note = removed.length && added.length
      ? `AMENDMENT — '${removed[0]}' is reversed: ${added[0]}.`
      : removed.length ? `AMENDMENT — '${removed.join("', '")}' is struck.`
      : `AMENDMENT — now also: ${added.join(" · ")}.`;
    return amended;
  }
  return null;
}
const AXES = {
  place: ["cafe", "park", "store", "gym", "library", "street", "water", "home", "transit"],
  time: ["dawn", "day", "dusk", "night"],
  people: ["alone", "pair", "group"],
  setting: ["indoor", "outdoor"],
};
function genDays(rng, cards, count = 5) {
  const themes = shuffle(rng, OT_THEMES).slice(0, count);
  const days = [];
  for (let di = 0; di < count; di++) {
    const wantAmend = di >= 2;
    for (let attempt = 0; attempt < 300; attempt++) {
      const rule = otRule(rng);
      const base = { rule };
      if (wantAmend) {
        const amend = amendFor(rng, rule, cards);
        if (!amend) continue;
        base.amend = amend;
      }
      const flavor = riddleFor(rule, rng,
        themes[di][0] === "THE VERIFICATION" ? CAPTCHA_LEADS : null);
      const day = {
        ot: true, dayLabel: `OT ${di + 1}`, theme: themes[di][0], emoji: themes[di][1],
        riddle: flavor.riddle, ariaLine: flavor.ariaLine,
        valeLine: rng() < 0.18
          ? pick(rng, MACHINE_CONFESSIONS)
          : BOT_CLAIMS[Math.floor(rng() * BOT_CLAIMS.length)],
        ...base,
      };
      if (dayValid(cards, day, di, rng)) { days.push(day); break; }
    }
    // unreachable in practice — otRule leaves huge valid space; guard anyway
    if (days.length <= di) days.push({
      ot: true, dayLabel: `OT ${di + 1}`, theme: themes[di][0], emoji: themes[di][1],
      riddle: "Bring proof the shift happened.", ariaLine: "The spec was sealed before sunrise.",
      valeLine: BOT_CLAIMS[0], rule: [single("setting", "indoor")],
      ...(wantAmend ? { amend: { rule: [single("setting", "indoor"), single("time", "night")],
        note: "AMENDMENT — now also: at night." } } : {}),
    });
  }
  return days;
}

// ---------- the machine's shift: the forgery bench ----------
/* You are the machine filing proofs. Your packet stub starts fully
 * machine-flavored; each night you get a cover budget and patch fields
 * toward human noise. The wire judges suspicion, not correctness:
 *   suspicion = 2 per machine field + 1 per clean field + 0 per lived-in
 * Lived-in values (delays, retries, vpn exits) are camouflage — real
 * filings are sloppy. But a stub with NO machine fields and NO lived-in
 * noise is overrehearsed: humans don't polish every field. And a proof
 * that fails the spec is flagged before the postmark is even read. */
const FORGE_FIELDS = ["latency", "origin", "hops", "receipt"];
const FORGE_TIERS = {
  latency: ["3ms", "214ms", "612ms · retried"],
  origin: ["GATE 0", "EXT GATE 4", "EXT GATE 2 · vpn exit"],
  hops: ["0", "3", "5 · one resend"],
  receipt: ["+0.003s after post", "queued 2h14m", "rcpt delayed 83s · resent ×2"],
};
const FORGE_SUSPICION = [2, 1, 0];           // per tier: machine / clean / lived-in
const FORGE_GRANT = [5, 4, 3];               // cover chips granted per night
const FORGE_CAP = 7;                          // banked cover can't exceed this
const FORGE_THRESHOLD = [4, 3, 2];            // suspicion the wire tolerates
function forgeSuspicion(tiers) {
  return tiers.reduce((s, t) => s + FORGE_SUSPICION[t], 0);
}
/* tiers: [0|1|2 per FORGE_FIELDS]. proofOk: the card passed the spec.
 * Returns { outcome: "slip"|"flag", reason, suspicion }. */
function forgeJudge(tiers, proofOk, nightIdx) {
  const suspicion = forgeSuspicion(tiers);
  const allClean = tiers.every((t) => t === 1);
  const allMachine = tiers.every((t) => t === 0);
  if (!proofOk) {
    return { outcome: "flag", suspicion,
      reason: "the proof itself doesn't hold — the wire reads the spec too" };
  }
  if (allClean) {
    return { outcome: "flag", suspicion,
      reason: "overrehearsed — every field polished, no fingerprints left" };
  }
  if (allMachine) {
    return { outcome: "flag", suspicion,
      reason: `the wire counted ${suspicion} impossible fields — a filing can't be that fast` };
  }
  if (suspicion <= FORGE_THRESHOLD[nightIdx]) {
    return { outcome: "slip", suspicion,
      reason: suspicion === 0
        ? "slipped through — the stub reads like every other 2am filing"
        : "slipped through — enough noise to pass for paperwork" };
  }
  return { outcome: "flag", suspicion,
    reason: `the wire counted ${suspicion} tells against a tolerance of ${FORGE_THRESHOLD[nightIdx]}` };
}

const api = {
  makeRng, passes, check, nearMiss, failKeys,
  deal, extraRuling, auditSet, ATTR_KEYS,
  critText, riddleFor, pickCulprit, buildFinale, genDays,
  FORGE_FIELDS, FORGE_TIERS, FORGE_SUSPICION, FORGE_GRANT, FORGE_CAP,
  FORGE_THRESHOLD, forgeSuspicion, forgeJudge,
};
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (root) root.NIGHT_SHIFT_LOGIC = api;
})(typeof window !== "undefined" ? window : null);
