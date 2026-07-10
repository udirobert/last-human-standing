export const DAILY_THEMES = [
  {
    id: 1,
    theme: "AT A CAFÉ",
    emoji: "☕",
    description: "Find a café anywhere in the world. Snap your proof.",
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

/** Resolve theme metadata by round name / place type / id. */
export function findTheme(labelOrId) {
  if (labelOrId == null) return TODAY_THEME;
  if (typeof labelOrId === "number") {
    return DAILY_THEMES.find((t) => t.id === labelOrId) || TODAY_THEME;
  }
  const key = String(labelOrId).trim().toUpperCase();
  return (
    DAILY_THEMES.find((t) => t.theme === key) ||
    DAILY_THEMES.find((t) => t.theme.includes(key) || key.includes(t.theme.replace(/^AT\s+/, ""))) ||
    TODAY_THEME
  );
}
export const MOCK_SUBMISSIONS = [
  {
    id: 1,
    user: "@marina_sol",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Marina&backgroundColor=b6e3f4",
    caption: "Double espresso, no mercy ☕ Day 4 and still standing",
    time: "14 min ago",
    votes: { real: 89, fake: 3 },
    fires: 24,
    status: "verified",
    accuracy: 91,
    location: "Lisbon, Portugal",
    gpsShared: true,
    mediaUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=400&fit=crop",
  },
  {
    id: 2,
    user: "@kai_nomad",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Kai&backgroundColor=c0aede",
    caption: "they said I wouldn't make it. still here. 🏖️",
    time: "31 min ago",
    votes: { real: 124, fake: 2 },
    fires: 67,
    status: "verified",
    accuracy: 84,
    infiltrator: true,
    location: "Tokyo, Japan",
    gpsShared: true,
    mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
  },
  {
    id: 3,
    user: "@ghost_protocol",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Ghost&backgroundColor=ffd5dc",
    caption: "Is this even a beach? Looks like someone's backyard pool 🤔",
    time: "52 min ago",
    votes: { real: 38, fake: 41 },
    fires: 3,
    status: "pending",
    accuracy: 72,
    location: null,
    gpsShared: false,
    mediaUrl: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&h=400&fit=crop",
  },
  {
    id: 4,
    user: "@luna_waves",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Luna&backgroundColor=d1d4f9",
    caption: "Sunrise swim while eliminating competition 🌊",
    time: "1h ago",
    votes: { real: 201, fake: 1 },
    fires: 112,
    status: "verified",
    accuracy: 95,
    location: "Nairobi, Kenya",
    gpsShared: true,
    mediaUrl: "https://images.unsplash.com/photo-1476673160081-cf065607f449?w=600&h=400&fit=crop",
  },
  {
    id: 5,
    user: "@spectre_x",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Spectre&backgroundColor=ffdfbf",
    caption: "This is my 3rd beach today. I am built different.",
    time: "2h ago",
    votes: { real: 44, fake: 31 },
    fires: 8,
    status: "flagged",
    accuracy: 58,
    infiltrator: true,
    location: "Berlin, Germany",
    gpsShared: false,
    mediaUrl: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=600&h=400&fit=crop",
  },
];

export const CHAT_MESSAGES = [
  { id: 1, user: "@marina_sol", msg: "let's gooo, who's still standing?", time: "2m" },
  { id: 2, user: "@kai_nomad", msg: "flagging everyone at a hotel pool. that ain't a beach", time: "5m" },
  { id: 3, user: "@ghost_protocol", msg: "my submission better not get flagged i literally walked 2km for this shot", time: "8m" },
  { id: 4, user: "@luna_waves", msg: "the prize pool is growing. i'm not sleeping", time: "11m" },
  { id: 5, user: "@spectre_x", msg: "anyone else think today's theme was too easy? getting boring", time: "14m" },
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
