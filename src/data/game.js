export const DAILY_THEMES = [
  {
    id: 1,
    theme: "AT A CAFÉ",
    emoji: "☕",
    description: "Find a café anywhere in the world. Snap your answer.",
    color: "#FFB800",
    counts: ["Coffee shop, tea house, bakery with seating", "Your cup + the space in frame", "Outdoor café terrace"],
    doesnt: ["Just a mug at home with no café context", "Stock latte art with no you in it"],
  },
  {
    id: 2,
    theme: "AT A PARK",
    emoji: "🌳",
    description: "Touch grass. Literally. Any park, any country.",
    color: "#00FF94",
    counts: ["Public park, square, or green", "Trees / grass / playground visible", "You clearly outdoors in a park"],
    doesnt: ["Indoor plant corner", "Highway median grass", "A single potted plant"],
  },
  {
    id: 3,
    theme: "AT A GYM",
    emoji: "🏋️",
    description: "No pain, no staying in the game",
    color: "#FF6B00",
    counts: ["Gym floor, weights, machines, or studio", "Home gym if equipment is obvious", "Climbing wall / boxing gym"],
    doesnt: ["Yoga mat in a bedroom with no gear", "Just athletic clothes indoors"],
  },
  {
    id: 4,
    theme: "WITH A FRIEND",
    emoji: "🤝",
    description: "Prove you have at least one",
    color: "#FF1A1A",
    counts: ["Two+ real people clearly in frame", "Selfie with a friend / partner / kid", "Video-call mirror only if both faces show"],
    doesnt: ["Solo selfie", "Pet-only shot", "Mannequin / cardboard cutout"],
  },
  {
    id: 5,
    theme: "OUTSIDE AT SUNRISE",
    emoji: "🌅",
    description: "Early humans get the prize pool",
    color: "#FFB800",
    counts: ["Outdoor light near dawn", "Sky / horizon / street at sunrise", "You outside — golden or blue hour"],
    doesnt: ["Indoor lamp pretending to be sun", "Sunset labeled as sunrise", "Phone wallpaper of a sunrise"],
  },
  {
    id: 6,
    theme: "AT A BOOKSTORE",
    emoji: "📚",
    description: "Rare breed. Show yourself.",
    color: "#00C8FF",
    counts: ["Bookstore / library shelves in frame", "You + books as the place", "Indie shop or big chain — both fine"],
    doesnt: ["One book on your nightstand", "Amazon screenshot", "Kindle-only with no store"],
  },
  {
    id: 7,
    theme: "EATING SOMETHING",
    emoji: "🍜",
    description: "Humans gotta eat. Prove it.",
    color: "#FF6B00",
    counts: ["Real food in front of you", "Restaurant, street food, or home plate", "You mid-bite or clearly about to eat"],
    doesnt: ["Empty plate", "Unopened packaged snack only", "Food photo with no human presence"],
  },
  {
    id: 8,
    theme: "ON PUBLIC TRANSIT",
    emoji: "🚇",
    description: "We see you, commuter",
    color: "#AA55FF",
    counts: ["Bus, train, metro, tram, ferry", "Station platform / interior seats", "Ticket or map in context with you"],
    doesnt: ["Private car", "Uber backseat alone as 'transit'", "Bike unless it's a public bike-share dock"],
  },
  {
    id: 9,
    theme: "AT A GROCERY STORE",
    emoji: "🛒",
    description: "Domestic. But make it survival",
    color: "#00FF94",
    counts: ["Aisles, produce, checkout, or cart", "Corner shop / market / supermarket", "You shopping in the store"],
    doesnt: ["Fridge at home", "Delivery bag on the doorstep", "Receipt-only with no store"],
  },
  {
    id: 10,
    theme: "AT A BEACH OR WATER",
    emoji: "🌊",
    description: "Any water counts — a lake, a pond, even your bathtub. Coastal not required.",
    color: "#00C8FF",
    counts: ["Ocean, lake, river, pool, pond", "Bathtub / fountain if water is the subject", "You + the water clearly together"],
    doesnt: ["Glass of water on a desk", "Rain on a window only", "Desert with no water in frame"],
  },
];

export const TODAY_THEME = DAILY_THEMES[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DAILY_THEMES.length];

/**
 * Motif metadata for the cohort 1 riddle rounds (supabase/migrations/
 * 039_riddle_rounds.sql). Riddle PROMPTS intentionally stay server-side —
 * they drop with each round via the API, so the client bundle never leaks
 * them. Only the public names + painted motifs live here so home, check-in,
 * audit, and reveal resolve the right motif for a riddle round.
 */
export const RIDDLE_META = {
  "THE GATHERING": { emoji: "☕", color: "#FFB800" },
  "THE WILD": { emoji: "🌳", color: "#00FF94" },
  "THE BOND": { emoji: "🤝", color: "#FF1A1A" },
  "THE QUIET": { emoji: "📚", color: "#00C8FF" },
  "THE DAWN": { emoji: "🌅", color: "#FFB800" },
};

/**
 * The cohort 1 schedule — 5 daily riddle rounds with their day number, date,
 * and survival cap. Used by DailyProofs (day-label overlay) and CountdownCard
 * (T-minus rotating copy) so the UI always reflects the real calendar.
 * Rounds open 18:00 UTC on the date; reveal + vote follows the 24h cycle
 * (migration 042).
 */
export const COHORT_SCHEDULE = [
  { day: 1, theme: "THE GATHERING", emoji: "☕", date: "2026-09-01", cap: 25, dayLabel: "TUE" },
  { day: 2, theme: "THE WILD",      emoji: "🌳", date: "2026-09-02", cap: 12, dayLabel: "WED" },
  { day: 3, theme: "THE BOND",      emoji: "🤝", date: "2026-09-03", cap: 6,  dayLabel: "THU" },
  { day: 4, theme: "THE QUIET",     emoji: "📚", date: "2026-09-04", cap: 3,  dayLabel: "FRI" },
  { day: 5, theme: "THE DAWN",      emoji: "🌅", date: "2026-09-05", cap: 1,  dayLabel: "SAT" },
];

/** Resolve theme metadata by round name / place type / id. */
export function findTheme(labelOrId) {
  if (labelOrId == null) return TODAY_THEME;
  if (typeof labelOrId === "number") {
    return DAILY_THEMES.find((t) => t.id === labelOrId) || TODAY_THEME;
  }
  const key = String(labelOrId).trim().toUpperCase();
  const riddle = RIDDLE_META[key];
  if (riddle) return { ...riddle, theme: key };
  return (
    DAILY_THEMES.find((t) => t.theme === key) ||
    DAILY_THEMES.find((t) => t.theme.includes(key) || key.includes(t.theme.replace(/^AT\s+/, ""))) ||
    TODAY_THEME
  );
}

/**
 * Single source of truth for the active round's theme label + motif.
 * Prefer the API round name over placeType / calendar TODAY_THEME so home,
 * check-in, audit, and reveal never drift from each other.
 */
export function resolveActiveTheme(round) {
  const name = typeof round?.name === "string" ? round.name.trim() : "";
  if (name) {
    const meta = findTheme(name);
    return { ...meta, theme: name.toUpperCase() };
  }
  const place = typeof round?.placeType === "string" ? round.placeType.trim() : "";
  if (place) return findTheme(place);
  return TODAY_THEME;
}

export const CHAT_MESSAGES = [
  { id: 1, user: "@marina_sol", msg: "let's gooo, who's still standing?", time: "2m" },
  { id: 2, user: "@kai_nomad", msg: "flagging everyone at a hotel pool. that ain't a beach", time: "5m" },
  { id: 3, user: "@ghost_protocol", msg: "my submission better not get flagged i literally walked 2km for this shot", time: "8m" },
  { id: 4, user: "@luna_waves", msg: "the prize pool is growing. i'm not sleeping", time: "11m" },
  { id: 5, user: "@spectre_x", msg: "anyone else think today's riddle was too easy? getting boring", time: "14m" },
  { id: 6, user: "@marina_sol", msg: "bro you have 31 sus votes lmaooo", time: "15m" },
  { id: 7, user: "@spectre_x", msg: "those are my enemies voting. i have enemies because i'm winning", time: "16m" },
  { id: 8, user: "@kai_nomad", msg: "tomorrow better be something hard. outside at sunrise let's goooo", time: "20m" },
];

export const GAME_STATS = {
  totalPlayers: 0,
  eliminated: 0,
  prizePool: "0 WLD",
  day: Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 10 + 1,
  hoursLeft: 6,
  minutesLeft: 23,
};

// Demo values shown in browser mode when no real players exist yet
export const DEMO_STATS = {
  totalPlayers: 1247,
  activePlayers: 892,
  eliminated: 355,
  prizePool: "4,200 WLD",
  prizePoolWld: 4200,
};
