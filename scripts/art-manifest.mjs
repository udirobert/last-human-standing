/* NIGHT SHIFT — painted key-art manifest (Game Off 2026 pivot 5, W3).
 *
 * Every asset of the MiniMax H3 pass lives here: id, kind, output size,
 * prompt, and reference images. `kind: "generate"` runs text-to-image;
 * `kind: "edit"` runs the edit endpoint with `refs` (earlier asset ids)
 * passed as Image 1..N so the whole set shares one painting style, one
 * palette, and — for the two room angles — one physical room.
 *
 * Style doctrine (locked 2026-11-14): painterly noir poster, painted
 * world BEHIND the crisp DOM/SVG paper UI. No text is ever painted;
 * every word in the game stays vector.
 *
 * Run:  node scripts/generate-art.mjs                # anchor group only
 *       node scripts/generate-art.mjs room-day vale   # named assets
 *       node scripts/generate-art.mjs --all           # everything
 */

const STYLE = "Painted like a 1950s noir detective poster: gouache over oil textures, confident visible brushwork, muted palette anchored in deep blue-black shadows, manila cream paper tones, warm amber lamplight, oxidized red accents; cinematic light falloff, soft film grain, dust motes floating in beams. Absolutely no text, no letters, no numbers, no logos, no watermarks anywhere in the image.";

/* One physical room, seen from the clerk's chair (anchor, night), in
 * daylight, and from behind ARIA's terminal looking back — the W4
 * perspective flip. Plus the close-crop cover base. */
const ROOM_PROMPT = "Key art for a noir deduction game called Night Shift. A small city records office at 2am, seen from the clerk's chair at the desk: a heavy wooden desk in the foreground strewn with manila file folders and stamped papers, a green-shaded desk lamp throwing a warm amber cone of light, an old punch-clock on the side wall, and across the room a tall dark terminal console glowing pale cyan — the auditor ARIA, a machine presence, its screen like a single watchful eye. Behind it a rain-streaked window with the dark city skyline beyond, raindrops catching the amber light. Dust motes drift in the lamp beam. Wide establishing shot, eye level, deep shadows swallowing the room's corners, the lit desk the only warm place in a cold blue room. " + STYLE;

const ENTRIES = [
  // ---------- G1 · the room ----------
  { id: "room-night", group: "room", kind: "generate", size: [1536, 1024],
    prompt: ROOM_PROMPT },
  { id: "room-day", group: "room", kind: "edit", size: [1536, 1024], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and the physical layout of the same records office room. Repaint the identical room at 8am after the night shift ends: the desk lamp is switched off, pale morning daylight pours through the window instead of rain, the venetian blinds draw soft stripes across the desk, the papers lie neat and squared, the terminal screen is dark. Warm manila cream tones carry the frame instead of amber lamplight; same furniture, same punch-clock, same window and skyline. No text anywhere." },
  { id: "room-night-aria", group: "room", kind: "edit", size: [1536, 1024], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and the physical layout of the same records office room. Repaint the identical room from the OPPOSITE side: the camera now stands behind the tall dark terminal console looking back across the room at the clerk's wooden desk and empty chair, the green-shaded lamp glowing amber over the manila folders, the punch-clock and the rain-streaked window with the dark skyline now far behind the desk. The terminal's pale cyan light spills from the bottom of the frame, silhouetting a keyboard and cable. Same night, same rain, same amber-and-blue palette. No text anywhere." },
  { id: "cover-base", group: "room", kind: "edit", size: [1512, 1200], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style and palette. Paint a tighter close-up of the same night desk: one manila filing card lying centered on the dark wood under the amber lamp cone, a red rubber stamp resting beside it, a red grease-pencil circle drawn around a small postmark strip at the foot of the card, dust motes in the beam, deep blue-black shadows filling the edges of the frame. Portrait-leaning composition with generous dark space at the top. No text anywhere — the card and stamps are blank paper shapes." },

  // ---------- G2 · portraits (the recurring cast + ARIA) ----------
  { id: "aria", group: "portraits", kind: "edit", size: [832, 1040], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and lighting mood. Paint a portrait of the auditor ARIA — not a person but a machine presence: a tall dark terminal console with a single pale cyan eye-like light on its old CRT face, scanlines across the glass, a cable coiled like a resting snake, standing in the amber-lit records office. Portrait framing, the machine confrontational and calm at once, blue-black shadows behind. No text, no letters on the screen." },
  { id: "mara", group: "portraits", kind: "edit", size: [832, 1040], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and lighting mood. Paint a portrait of MARA, a middle-aged night-shift baker: flour dusting her rolled sleeves and apron, warm tired eyes, hair pinned back, standing at her bakery counter at dawn with ovens glowing behind her. Human, specific, kind. Portrait framing, amber lamplight against deep blue shadow. No text anywhere." },
  { id: "oko", group: "portraits", kind: "edit", size: [832, 1040], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and lighting mood. Paint a portrait of OKO, a young man in a wool beanie and canvas jacket, salt-wind weathered, standing on a foggy pier at first light with a fishing rod resting against the rail behind him. Human, specific, patient. Portrait framing, cold blue dawn with one warm amber rim light. No text anywhere." },
  { id: "jun", group: "portraits", kind: "edit", size: [832, 1040], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and lighting mood. Paint a portrait of JUN, a woman in her thirties in a soft kitchen apron, sleeves pushed up, faint burn scar on one forearm, standing in a small home kitchen at dusk with steam rising from a pot behind her, chopping knife resting on the counter. Human, specific, domestic. Portrait framing, warm amber window light against gathering blue dusk. No text anywhere." },
  { id: "tess", group: "portraits", kind: "edit", size: [832, 1040], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and lighting mood. Paint a portrait of TESS, a wiry older runner in a windbreaker, short grey hair damp with sweat, breath visible in the cold, standing on an empty city street at 6am with long dawn shadows behind her. Human, specific, stubborn. Portrait framing, cold blue street with amber sunrise catching one side of her face. No text anywhere." },
  { id: "vale", group: "portraits", kind: "edit", size: [832, 1040], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style, palette, and lighting mood. Paint a portrait of VALE, a person that is subtly, faintly wrong: an office clerk in an immaculate but slightly outdated suit, posture perfectly symmetrical, smile a half-beat too even, eyes with a faint glassy mismatch, skin lit with no pores at all, a single loose cable end slipping from a sleeve cuff like a dropped thread. Not monstrous, not a robot — just quietly off-model, like a painted figure among real people. Portrait framing, amber lamplight, deep blue-black behind. No text anywhere." },

  // ---------- G3 · evidence card vignettes (one per card) ----------
  ...Object.entries({
    "cafe-morning": "a corner café at 8am, morning regulars at the counter, steam off cups, sun through the front glass",
    "park-dogs": "an off-leash dog park mid-morning, dogs bounding through dew-wet grass, owners scattered on a slope",
    "bar-night": "last call at a small pub, low warm lamps, a handful of strangers leaning on the bar, glasses stacked",
    "market-sat": "a Saturday market stall with striped awning, same vendor weighing produce, regulars chatting in the crowd",
    "gym-class": "a spin class in a dim studio, rows of bikes facing one instructor, one shared playlist, forty strangers sweating in rhythm",
    "library-regular": "a library reading room in day light, long tables, one librarian shelving returns, dust in the window beams",
    "overgrown-lot": "a city lot the city forgot: cracked pavement, waist-high grass and wildflowers, no one mows it",
    "creek-path": "a creaking wooden footbridge over a creek at midday, boards weathered, water bright below, utterly empty",
    "hill-sunrise": "the hill behind a rail yard at sunrise, weeds and wildflowers, the skyline far off and unaware",
    "community-garden": "a community garden row at noon, tomatoes nobody planted, loose soil worked by one pair of gloved hands",
    "grandma-call": "a kitchen wall phone on a long cord, a Sunday-afternoon call, a folded note pad beside it, tea going cold",
    "best-friend-walk": "two people walking a dusk street after dinner, saying nothing, street lamps just coming on",
    "couple-cooking": "a small kitchen at night, one person chopping, one person burning something, six years of habit in the room",
    "reunion-table": "the big family table in day light, three generations, somebody mid-laugh, somebody mid-tears",
    "roadtrip-duo": "a co-pilot seat on hour three of a highway drive, one person navigating from a creased map, dashboard light",
    "library-dusk": "a library an hour before closing, whisper-level empty, the building itself seeming to exhale",
    "chapel-noon": "an empty chapel at noon, one long bench, one candle, dust motes and weight in the quiet",
    "park-bench": "a park bench at midday with nobody around, one leaf blower's sound implied two blocks off, pigeons still",
    "late-train": "the last train, one lit empty car, three passengers spread through it, the rails humming",
    "rooftop-dawn": "a rooftop at first light, one person alone above a waking city, cold air and quiet triumph",
    "fisher-dawn": "a pier at 5:40am, fog, coffee, the water deciding what to do with the light",
    "bakery-dawn": "a bakery's ovens at dawn, the only building awake, the smell arriving before the sun",
    "run-dawn": "an empty 6am street from a runner's height, footsteps the loudest sound in the city",
    "cold-vale": "a library's third-floor overnight reading room after close, one figure alone under a single green reading lamp, the quiet measured and complete",
    // ---- second shelf: the 40-card deck (W5) — the thin hours ----
    "laundromat-dusk": "a fluorescent laundromat at dusk, one stranger folding laundry two seats down, windows going blue outside",
    "ridge-dusk": "the last light on a high ridge trail, a lone hiker's silhouette, the city's noise given up halfway below",
    "call-home-dusk": "a phone held to the ear in a dim room at dusk, streetlights just flickering on outside the window",
    "diner-night": "an all-night diner at 2am, two truckers and a nurse at the counter, a writer over a fourth coffee refill",
    "radio-night": "a small home radio glowing on a nightstand at 2am, one listener half asleep, the dial lit amber",
    "bridge-night": "two figures sitting on a bridge railing at midnight, dark water far below holding the city lights",
    "gym-night": "a 24-hour gym at 1am, one rower and one janitor, mirrors doubling the emptiness",
    "night-drive": "a car interior at night, dashboard glow, two people saying nothing, no destination in the windshield",
    "kiosk-night": "a corner kiosk at midnight, two regulars trading the weather under one buzzing bulb",
    "greenhouse-day": "a botanic greenhouse in winter, wet heat on the glass, two people reading plant plaques like scripture",
    "archive-day": "a records basement in daylight, fifty years of filed boxes, one heartbeat under the fluorescent hum",
    "pool-dawn": "a swimming pool before the city wakes, black lane lines, chlorine blue, one swimmer's breath for an echo",
    "cornerstore-dusk": "a corner store at last light, a clerk who knows the order, milk and bread on the counter",
    "ferry-dusk": "a commuter ferry at dusk, everybody quiet and looking at the water, gulls taking over the noise",
    "rooftop-two": "two folding chairs on a fire escape at dusk, a thermos between them, the city humming three floors down",
    "garage-night": "an old garage that never closes, one mechanic passing a wrench without looking up, thirty years of engines",
    "loadin-dawn": "delivery vans at 4am outside a market, crates and night-shift jokes, the city waking up carried on shoulders",
  }).map(([id, scene]) => ({
    id: `card-${id}`, group: "cards", kind: "edit", size: [960, 720], refs: ["room-night"],
    prompt: `Use Image 1 only as the painting style, palette, and lighting mood. Paint a small narrative vignette: ${scene}. Landscape composition, one clear focal moment, painted like a memory pinned to a case file. No text anywhere.`,
  })),

  // ---------- G4 · endings ----------
  { id: "dawn", group: "endings", kind: "edit", size: [1536, 1024], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style and palette. Paint the end of the week: dawn breaking through the same records office window, the room lamp finally switched off, the skyline gold behind rain-cleaned glass, the desk cleared, one last manila folder squared on the wood. Quiet, earned, warm. No text anywhere." },
  { id: "dawn-automated", group: "endings", kind: "edit", size: [1536, 1024], refs: ["room-night"],
    prompt: "Use Image 1 only as the painting style and palette. Paint the bad ending: the same records office with the terminal's pale cyan light now the only light in the room, the clerk's chair pushed back and empty, papers stamped and stacked with inhuman neatness in ranks, the window showing a city gone blue and silent. Cold, orderly, no humans anywhere. No text anywhere." },
];

export const MANIFEST = ENTRIES;
export const GROUPS = {
  room: ["room-night", "room-day", "room-night-aria", "cover-base"],
  anchor: ["room-night", "room-day", "room-night-aria"],
  portraits: ["aria", "mara", "oko", "jun", "tess", "vale"],
  cards: ENTRIES.filter((e) => e.group === "cards").map((e) => e.id),
  endings: ["dawn", "dawn-automated"],
};
