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

  // ---- second shelf: dusk, night, pairs — the thin hours get their due ----
  { id: "laundromat-dusk", name: "Laundromat at dusk", glyph: "🧦",
    argument: "Fluorescent hum, one stranger folding two seats down. We nod every week. That's the whole friendship, and it holds.",
    tags: { place: "store", time: "dusk", people: "alone", setting: "indoor" } },
  { id: "ridge-dusk", name: "The ridge at last light", glyph: "🥾",
    argument: "The city's noise gives up halfway up. What's left up there is yours.",
    tags: { place: "park", time: "dusk", people: "alone", setting: "outdoor" } },
  { id: "call-home-dusk", name: "The long call home", glyph: "☎️",
    argument: "We talk about nothing until the streetlights come on. Nothing, twice a week, like a heartbeat.",
    tags: { place: "home", time: "dusk", people: "pair", setting: "indoor" } },
  { id: "diner-night", name: "The all-night diner", glyph: "🥞",
    argument: "Two truckers, one nurse, a writer on refill four. Night people keep their own hours — and each other's.",
    tags: { place: "cafe", time: "night", people: "group", setting: "indoor" } },
  { id: "radio-night", name: "The 2am radio host", glyph: "📻",
    argument: "He takes requests from nobody in particular. Tonight the nobody is me.",
    tags: { place: "home", time: "night", people: "alone", setting: "indoor" } },
  { id: "bridge-night", name: "The bridge at midnight", glyph: "🌃",
    argument: "We sit on the rail and say the things daylight won't carry. The water keeps them all.",
    tags: { place: "water", time: "night", people: "pair", setting: "outdoor" } },
  { id: "gym-night", name: "The 24-hour gym, 1am", glyph: "🏋️",
    argument: "One janitor, one rower, both pretending. The mirrors double the emptiness.",
    tags: { place: "gym", time: "night", people: "alone", setting: "indoor" } },
  { id: "night-drive", name: "The night drive, nowhere", glyph: "🚙",
    argument: "No destination. Dashboard glow, the same three cassettes, and someone to be quiet with.",
    tags: { place: "transit", time: "night", people: "pair", setting: "outdoor" } },
  { id: "kiosk-night", name: "The corner kiosk, last smoke", glyph: "🚬",
    argument: "Every night the same two regulars trade the weather. Someone's always leaving; someone stays.",
    tags: { place: "street", time: "night", people: "pair", setting: "outdoor" } },
  { id: "greenhouse-day", name: "The botanic greenhouse", glyph: "🌱",
    argument: "Wet heat in February. We read the plant plaques aloud like scripture.",
    tags: { place: "park", time: "day", people: "pair", setting: "indoor" } },
  { id: "archive-day", name: "The records basement", glyph: "🗃️",
    argument: "Fifty years of somebodies, filed and asleep. I'm the only heartbeat down here.",
    tags: { place: "library", time: "day", people: "alone", setting: "indoor" } },
  { id: "pool-dawn", name: "Lap swim before the city wakes", glyph: "🏊",
    argument: "Chlorine blue, black lane lines, my own breath for an echo. The day hasn't earned me yet.",
    tags: { place: "gym", time: "dawn", people: "alone", setting: "indoor" } },
  { id: "cornerstore-dusk", name: "Corner store, last run before close", glyph: "🛒",
    argument: "The clerk has my order memorized. Milk, bread, and someone who says 'night' at five in the evening.",
    tags: { place: "store", time: "dusk", people: "alone", setting: "indoor" } },
  { id: "ferry-dusk", name: "The ferry home at dusk", glyph: "⛴️",
    argument: "Commuters go quiet as the gulls take over. Nobody talks on the water. Everybody looks.",
    tags: { place: "water", time: "dusk", people: "group", setting: "outdoor" } },
  { id: "rooftop-two", name: "Two chairs on the fire escape", glyph: "🌆",
    argument: "Her folding chairs, my thermos, the whole city humming its evening hymn three floors down.",
    tags: { place: "street", time: "dusk", people: "pair", setting: "outdoor" } },
  { id: "garage-night", name: "The garage that never closes", glyph: "🔧",
    argument: "He passes the wrench without looking up. Thirty years of engines and one friendship, both still running.",
    tags: { place: "store", time: "night", people: "pair", setting: "indoor" } },
  { id: "loadin-dawn", name: "The dawn market load-in", glyph: "📦",
    argument: "Vans at 4am, crates, jokes nobody writes down. The city wakes up carried by night people.",
    tags: { place: "store", time: "dawn", people: "group", setting: "outdoor" } },

  // ---- the small hours, other lives ----
  { id: "night-market", name: "The night market, last lanterns", glyph: "🏮",
    argument: "Steam, skewers, and somebody's grandmother haggling in three languages. The city exhales here.",
    tags: { place: "store", time: "night", people: "group", setting: "outdoor" } },
  { id: "temple-dusk", name: "The temple bell at dusk", glyph: "🛕",
    argument: "One ring, then the garden goes back to being a garden. I was the only one who stayed for it.",
    tags: { place: "park", time: "dusk", people: "alone", setting: "outdoor" } },
  { id: "offshift-couch", name: "Off-shift, the couch wins", glyph: "🩺",
    argument: "Nurse, twenty years. The coffee's bad, the hours are worse, and I'd miss it if I slept through.",
    tags: { place: "home", time: "night", people: "alone", setting: "indoor" } },
  { id: "feeding-three", name: "The 3am feeding, both awake", glyph: "🍼",
    argument: "She hums, I pace, the neighbor's dog barks once and goes back to sleep. Nobody planned this. Everybody needed it.",
    tags: { place: "home", time: "night", people: "pair", setting: "indoor" } },
  { id: "last-route", name: "The last route of the night", glyph: "🚚",
    argument: "Fourteen stops, one thermos, and a porch light that comes on before I knock. People leave their doors unlocked for me.",
    tags: { place: "transit", time: "night", people: "alone", setting: "outdoor" } },
  { id: "the-scroll", name: "The 2am scroll, nobody home", glyph: "📱",
    argument: "Job listings, group chats, a video of a cat. Never felt more connected and more alone in the same thumb.",
    tags: { place: "home", time: "night", people: "alone", setting: "indoor" } },
  { id: "stockroom", name: "The stockroom inventory", glyph: "🧾",
    argument: "Counted beans and lightbulbs until the numbers behaved. The quiet in here is the good kind — the kind that counts you too.",
    tags: { place: "store", time: "night", people: "alone", setting: "indoor" } },
  { id: "microwave-fish", name: "Microwave fish, 1am", glyph: "🐟",
    argument: "I microwave fish at 1am. No further questions.",
    tags: { place: "home", time: "night", people: "alone", setting: "indoor" } },
  { id: "loading-screen", name: "The loading screen, day 4", glyph: "⏳",
    argument: "Day 4 loading screen. Filed under 'things that took too long.' The bar moved. Nobody told it not to.",
    tags: { place: "home", time: "night", people: "alone", setting: "indoor" } },
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
    valeLine: "Walked the long loop with my person after dinner. We counted the same three dogs, same as always.",
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
