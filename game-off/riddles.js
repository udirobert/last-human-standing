/* NIGHT SHIFT — case data.
 * Plain script (no modules) so index.html works from file:// too.
 * Exposes window.NIGHT_SHIFT_DATA.
 *
 * Five days. Each day ARIA has a SECRET RULE: 1–3 criteria over a card's
 * four facts (place · time · people · setting). A card passes iff it meets
 * EVERY criterion — the verdict is deterministic, no noise.
 *
 * Before you file, ARIA's earlier rulings are on the docket: two HUMAN
 * precedents and a few SUS near-misses. Read them like a puzzle, then file
 * the one card she'd pass. At night you stamp everyone else's filings
 * against the same rule, now in plain sight.
 */
window.NIGHT_SHIFT_DATA = (() => {

const CARDS = [
  // ---- gathering places ----
  { id: "cafe-morning", name: "Corner café, 8am", glyph: "☕",
    argument: "The same strangers every morning. Regulars are just friends who haven't been introduced.",
    tags: { place: "cafe", time: "day", people: "group", setting: "indoor" } },
  { id: "park-dogs", name: "Dog park off-leash hour", glyph: "🐕",
    argument: "Nobody knows each other's names. Everybody knows each other's dogs.",
    tags: { place: "park", time: "day", people: "group", setting: "outdoor" } },
  { id: "bar-night", name: "Last call at the pub", glyph: "🍺",
    argument: "Strangers become regulars fastest when the lights are low and the rounds are on.",
    tags: { place: "cafe", time: "night", people: "group", setting: "indoor" } },
  { id: "market-sat", name: "Saturday market stall", glyph: "🧺",
    argument: "Same vendor, same corner, same regulars who only come on Saturdays.",
    tags: { place: "store", time: "day", people: "group", setting: "outdoor" } },
  { id: "gym-class", name: "Tuesday spin class", glyph: "🚴",
    argument: "Forty strangers, one playlist, every week. That's a congregation.",
    tags: { place: "gym", time: "day", people: "group", setting: "indoor" } },
  { id: "library-regular", name: "Library reading room", glyph: "📚",
    argument: "The librarian knows my order before I do. That's as regular as it gets.",
    tags: { place: "library", time: "day", people: "group", setting: "indoor" } },

  // ---- wild / green ----
  { id: "overgrown-lot", name: "The lot the city forgot", glyph: "🌿",
    argument: "Cracks in the pavement, waist-high grass, nobody mows it. The city surrendered this block.",
    tags: { place: "street", time: "day", people: "alone", setting: "outdoor" } },
  { id: "creek-path", name: "Creaking footbridge over the creek", glyph: "🌉",
    argument: "Boards remember every footstep. Somewhere the city never paved this.",
    tags: { place: "water", time: "day", people: "alone", setting: "outdoor" } },
  { id: "hill-sunrise", name: "The hill behind the rail yard", glyph: "🌅",
    argument: "Weeds, wildflowers, and a skyline that doesn't know you're there.",
    tags: { place: "park", time: "dawn", people: "alone", setting: "outdoor" } },
  { id: "community-garden", name: "Community garden row 7", glyph: "🥕",
    argument: "Tomatoes nobody planted on purpose. The soil is doing its own thing.",
    tags: { place: "park", time: "day", people: "group", setting: "outdoor" } },

  // ---- bond / pairs & groups ----
  { id: "grandma-call", name: "Sunday call with grandma", glyph: "📞",
    argument: "Every Sunday at four. She asks if I've eaten. That's love with a schedule.",
    tags: { place: "home", time: "day", people: "pair", setting: "indoor" } },
  { id: "best-friend-walk", name: "Post-dinner walk with my person", glyph: "🚶",
    argument: "We don't talk about anything. That's how you know it's real.",
    tags: { place: "street", time: "dusk", people: "pair", setting: "outdoor" } },
  { id: "couple-cooking", name: "Our kitchen, Tuesday", glyph: "🍳",
    argument: "She chops, I burn things. We've been doing this for six years.",
    tags: { place: "home", time: "night", people: "pair", setting: "indoor" } },
  { id: "reunion-table", name: "The big family table", glyph: "🍽️",
    argument: "Three generations, one table, somebody always cries. Proof enough.",
    tags: { place: "home", time: "day", people: "group", setting: "indoor" } },
  { id: "roadtrip-duo", name: "Co-pilot seat, hour three", glyph: "🚗",
    argument: "She navigates, I drive, both of us complain. This is the whole point.",
    tags: { place: "transit", time: "day", people: "pair", setting: "outdoor" } },

  // ---- quiet ----
  { id: "library-dusk", name: "Library at closing time", glyph: "🤫",
    argument: "The whisper level drops an hour before closing. The building exhales.",
    tags: { place: "library", time: "dusk", people: "alone", setting: "indoor" } },
  { id: "chapel-noon", name: "Empty chapel at noon", glyph: "🕯️",
    argument: "One visitor per hour, if that. The quiet has weight here.",
    tags: { place: "library", time: "day", people: "alone", setting: "indoor" } },
  { id: "park-bench", name: "Park bench, nobody around", glyph: "🪑",
    argument: "The only sound is a leaf blower two blocks away. Even the pigeons whisper.",
    tags: { place: "park", time: "day", people: "alone", setting: "outdoor" } },
  { id: "late-train", name: "Last train, empty car", glyph: "🚇",
    argument: "Three people on the whole line. The rails hum like the building is thinking.",
    tags: { place: "transit", time: "night", people: "alone", setting: "indoor" } },

  // ---- dawn ----
  { id: "rooftop-dawn", name: "Rooftop at first light", glyph: "🌄",
    argument: "The city wakes up below you. I was here before any of them.",
    tags: { place: "street", time: "dawn", people: "alone", setting: "outdoor" } },
  { id: "fisher-dawn", name: "Pier at 5:40am", glyph: "🎣",
    argument: "Fog, coffee, and the water deciding what to do with the light.",
    tags: { place: "water", time: "dawn", people: "alone", setting: "outdoor" } },
  { id: "bakery-dawn", name: "Bakery ovens at dawn", glyph: "🥐",
    argument: "The only building awake. The smell arrives before the sun does.",
    tags: { place: "store", time: "dawn", people: "alone", setting: "indoor" } },
  { id: "run-dawn", name: "Empty streets, 6am run", glyph: "🏃",
    argument: "My footsteps are the loudest thing in the city. Briefly, they're the only thing.",
    tags: { place: "street", time: "dawn", people: "alone", setting: "outdoor" } },
];

/* Facts display: four facts in FIXED order — where · when · who · in/out —
 * always emoji + word, never a bare glyph. */
const ATTR_KEYS = ["place", "time", "people", "setting"];
const ATTR_LABEL = { place: "WHERE", time: "WHEN", people: "WHO", setting: "IN/OUT" };
const ATTR_ICONS = {
  place: {
    cafe: "☕", park: "🌳", store: "🏪", gym: "🏋️", library: "📚",
    street: "🛣️", water: "🌊", home: "🏠", transit: "🚇",
  },
  time: { dawn: "🌅", day: "☀️", dusk: "🌇", night: "🌙" },
  people: { alone: "🧍", pair: "🧑‍🤝‍🧑", group: "👥" },
  setting: { indoor: "🚪", outdoor: "🌤️" },
};
const ATTR_WORD = {
  place: {
    cafe: "café", park: "park", store: "store", gym: "gym", library: "library",
    street: "street", water: "water", home: "home", transit: "transit",
  },
  time: { dawn: "dawn", day: "day", dusk: "dusk", night: "night" },
  people: { alone: "alone", pair: "pair", group: "group" },
  setting: { indoor: "indoors", outdoor: "outdoors" },
};

/* Each day: one secret rule, 1–3 criteria. `allow` is the pass set for that
 * fact key; `text` is the criterion in plain words for the unsealed rule
 * line and for "needed:" explanations. */
const DAYS = [
  {
    theme: "THE DAWN", emoji: "🌅", dayLabel: "DAY 1",
    riddle: "First light. Bring proof you were awake for it.",
    ariaLine: "First light. You had one window. You were in it or you weren't.",
    rule: [ { key: "time", allow: ["dawn"], text: "at dawn" } ],
    valeLine: "Up before the alarm again. Watched the fog burn off the pier — filed it before the coffee was done.",
  },
  {
    theme: "THE BOND", emoji: "🤝", dayLabel: "DAY 2",
    riddle: "Proof you are loved by at least one other human.",
    ariaLine: "Love, evidenced. One other human, minimum. The bar is low and high at once.",
    rule: [ { key: "people", allow: ["pair", "group"], text: "with someone else" } ],
    valeLine: "Walked the long loop with Mara after dinner. We counted the same three dogs, same as always.",
  },
  {
    theme: "THE WILD", emoji: "🌳", dayLabel: "DAY 3",
    riddle: "Somewhere the city forgot to pave — and forgot to visit.",
    ariaLine: "Green. Unpaved. Unvisited. I wrote the criteria before sunrise.",
    rule: [
      { key: "setting", allow: ["outdoor"], text: "outdoors" },
      { key: "people", allow: ["alone"], text: "alone" },
    ],
    valeLine: "The lot behind the rail fence, after the rain. Nobody's been back there in weeks.",
    amend: {
      rule: [
        { key: "setting", allow: ["outdoor"], text: "outdoors" },
        { key: "people", allow: ["alone"], text: "alone" },
        { key: "time", allow: ["dawn", "dusk", "night"], text: "not in daytime" },
      ],
      note: "AMENDMENT — now also: not in daytime.",
    },
  },
  {
    theme: "THE GATHERING", emoji: "☕", dayLabel: "DAY 4",
    riddle: "Find the room where strangers become regulars.",
    ariaLine: "I asked for a room full of almost-friends. The spec was sealed at dawn.",
    rule: [
      { key: "people", allow: ["group"], text: "a group" },
      { key: "setting", allow: ["indoor"], text: "indoors" },
    ],
    valeLine: "Same corner table, same regulars. The barkeep had my order started before I sat down.",
    amend: {
      rule: [ { key: "people", allow: ["group"], text: "a group" } ],
      note: "AMENDMENT — 'indoors' is struck. A group, anywhere.",
    },
  },
  {
    theme: "THE QUIET", emoji: "🤫", dayLabel: "DAY 5",
    riddle: "A room that goes quiet after hours. Show me the silence.",
    ariaLine: "A room that asks for silence. Most rooms just ask for money.",
    rule: [
      { key: "people", allow: ["alone"], text: "alone" },
      { key: "setting", allow: ["indoor"], text: "indoors" },
      { key: "time", allow: ["dawn", "dusk", "night"], text: "not in daytime" },
    ],
    valeLine: "Reading room at closing. The librarian didn't even have to ask me to leave.",
    amend: {
      rule: [
        { key: "people", allow: ["pair", "group"], text: "with someone else" },
        { key: "setting", allow: ["indoor"], text: "indoors" },
        { key: "time", allow: ["dawn", "dusk", "night"], text: "not in daytime" },
      ],
      note: "AMENDMENT — 'alone' is reversed: with someone else.",
    },
  },
];

/* The finale's five fixed filings: filer, display name, facts, timestamp.
 * VALE always files 0.003s after the riddle posts — the one tell the rules
 * can't check. */
const FINALE = [
  { filer: "MARA", name: "Corner café, 8am", glyph: "☕", ts: "+2h05m",
    tags: { place: "cafe", time: "day", people: "group", setting: "indoor" } },
  { filer: "OKO", name: "Pier at 5:40am", glyph: "🎣", ts: "+0h51m",
    tags: { place: "water", time: "dawn", people: "alone", setting: "outdoor" } },
  { filer: "JUN", name: "Our kitchen, at dusk", glyph: "🍳", ts: "+6h30m",
    tags: { place: "home", time: "dusk", people: "pair", setting: "indoor" } },
  { filer: "TESS", name: "Park bench, nobody around", glyph: "🪑", ts: "+4h18m",
    tags: { place: "park", time: "day", people: "alone", setting: "outdoor" } },
  { filer: "VALE", name: "Last train, empty car", glyph: "🚇", ts: "+0.003s",
    tags: { place: "transit", time: "night", people: "alone", setting: "indoor" } },
];

const JURY_TITLES = [
  "Night Intern", "File Clerk", "Junior Auditor", "Ledger Hand",
  "Shift Supervisor", "Night Manager", "Keeper of the Docket",
];

return { CARDS, DAYS, JURY_TITLES, ATTR_KEYS, ATTR_LABEL, ATTR_ICONS, ATTR_WORD, FINALE };
})();
