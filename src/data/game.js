export const DAILY_THEMES = [
  { id: 1, theme: "AT A CAFÉ", emoji: "☕", description: "Find a café, grab a seat, take the shot", color: "#FFB800" },
  { id: 2, theme: "AT A PARK", emoji: "🌳", description: "Touch grass. Literally.", color: "#00FF94" },
  { id: 3, theme: "AT A GYM", emoji: "🏋️", description: "No pain, no staying in the game", color: "#FF6B00" },
  { id: 4, theme: "WITH A FRIEND", emoji: "🤝", description: "Prove you have at least one", color: "#FF1A1A" },
  { id: 5, theme: "OUTSIDE AT SUNRISE", emoji: "🌅", description: "Early humans get the prize pool", color: "#FFB800" },
  { id: 6, theme: "AT A BOOKSTORE", emoji: "📚", description: "Rare breed. Show yourself.", color: "#00C8FF" },
  { id: 7, theme: "EATING SOMETHING", emoji: "🍜", description: "Humans gotta eat. Prove it.", color: "#FF6B00" },
  { id: 8, theme: "ON PUBLIC TRANSIT", emoji: "🚇", description: "We see you, commuter", color: "#AA55FF" },
  { id: 9, theme: "AT A GROCERY STORE", emoji: "🛒", description: "Domestic. But make it survival", color: "#00FF94" },
  { id: 10, theme: "AT A BEACH OR WATER", emoji: "🌊", description: "Coastal humans only (for now)", color: "#00C8FF" },
];

export const TODAY_THEME = DAILY_THEMES[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DAILY_THEMES.length];

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
